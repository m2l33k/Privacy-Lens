import { useState, useEffect } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function shortDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shortDay(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

const EFFECT_COLORS = {
  default:    '#00D1FF',
  fire:       '#ff6b00',
  neon:       '#39ff14',
  ice:        '#87ceeb',
  ghost:      'rgba(255,255,255,.45)',
  police:     '#FF1744',
  flashlight: '#FFF5CC',
  matrix:     '#00ff41',
  cctv:       '#00dc50',
};

// ─── Stats computation ────────────────────────────────────────────────────────

function computeStreak(sessions) {
  const uniqueDays = [...new Set(sessions.map(s => s.date))].sort();
  if (!uniqueDays.length) return 0;

  let today = isoToday();
  let check = today;

  // Allow streak to still count if today has no session yet (yesterday was the last)
  if (!uniqueDays.includes(today)) {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().slice(0, 10);
    if (!uniqueDays.includes(yStr)) return 0;
    check = yStr;
  }

  let streak = 0;
  while (uniqueDays.includes(check)) {
    streak++;
    const prev = new Date(check + 'T00:00:00');
    prev.setDate(prev.getDate() - 1);
    check = prev.toISOString().slice(0, 10);
  }
  return streak;
}

function computeStats(sessions) {
  const days7 = lastNDays(7);
  const today  = isoToday();

  const byDay = {};
  days7.forEach(d => { byDay[d] = 0; });

  let weekTotal = 0;
  let todayTotal = 0;
  const effectMins = {};
  const siteMins   = {};

  sessions.forEach(s => {
    const mins = s.minutes || 0;
    if (days7.includes(s.date)) {
      byDay[s.date] = (byDay[s.date] || 0) + mins;
      weekTotal += mins;
      if (s.date === today) todayTotal += mins;
    }
    effectMins[s.effect] = (effectMins[s.effect] || 0) + mins;
    if (s.site) siteMins[s.site] = (siteMins[s.site] || 0) + mins;
  });

  const maxDay = Math.max(...Object.values(byDay), 1);

  const topEffects = Object.entries(effectMins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topSites = Object.entries(siteMins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalMinutes = sessions.reduce((s, r) => s + (r.minutes || 0), 0);
  const streak = computeStreak(sessions);

  return { byDay, days7, maxDay, weekTotal, todayTotal, topEffects, topSites, totalMinutes, streak };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function StatsApp() {
  const [stats,    setStats]    = useState(null);
  const [count,    setCount]    = useState(0);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    chrome.storage.local.get(['__pl_sessions__'], res => {
      const all = res.__pl_sessions__ || [];
      setSessions(all);
      setCount(all.length);
      setStats(computeStats(all));
    });
  }, []);

  if (!stats) {
    return (
      <div className="loading">
        <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
      </div>
    );
  }

  const { byDay, days7, maxDay, weekTotal, todayTotal, topEffects, topSites, totalMinutes, streak } = stats;

  function fmtMins(m) {
    if (m < 60) return `${m}m`;
    return `${Math.floor(m/60)}h ${m%60}m`;
  }

  function handleExportCSV() {
    const header = 'Date,Site,Effect,Minutes\n';
    const rows = sessions
      .slice()
      .reverse()
      .map(s => `${s.date || ''},${s.site || ''},${s.effect || ''},${s.minutes || 0}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'privacy-lens-stats.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const recentSessions = sessions.slice().reverse().slice(0, 20);

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="logo">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#00D1FF" strokeWidth="1.2"/>
            <circle cx="8" cy="8" r="3.5" stroke="#00D1FF" strokeWidth="1"/>
            <line x1="8" y1="1" x2="8" y2="3" stroke="#00D1FF" strokeWidth="1" strokeLinecap="round"/>
            <line x1="8" y1="13" x2="8" y2="15" stroke="#00D1FF" strokeWidth="1" strokeLinecap="round"/>
            <line x1="1" y1="8" x2="3" y2="8" stroke="#00D1FF" strokeWidth="1" strokeLinecap="round"/>
            <line x1="13" y1="8" x2="15" y2="8" stroke="#00D1FF" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Privacy Lens</h1>
          <p className="page-sub">Usage Statistics</p>
        </div>
        {count > 0 && (
          <button className="export-btn" onClick={handleExportCSV} title="Export CSV">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v7M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 10h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="cards">
        <div className="card">
          <div className="card-value">{fmtMins(todayTotal)}</div>
          <div className="card-label">Today</div>
        </div>
        <div className="card">
          <div className="card-value">{fmtMins(weekTotal)}</div>
          <div className="card-label">This Week</div>
        </div>
        <div className="card">
          <div className="card-value">{fmtMins(totalMinutes)}</div>
          <div className="card-label">All Time</div>
        </div>
        <div className="card">
          <div className="card-value">{count}</div>
          <div className="card-label">Sessions</div>
        </div>
        <div className="card card-wide">
          <div className="card-value">{streak > 0 ? `${streak}🔥` : '—'}</div>
          <div className="card-label">Day Streak</div>
        </div>
      </div>

      {/* ── Daily bar chart ── */}
      <div className="section">
        <div className="section-title">Last 7 Days</div>
        <div className="bar-chart">
          {days7.map(day => {
            const mins    = byDay[day] || 0;
            const pct     = maxDay > 0 ? (mins / maxDay) * 100 : 0;
            const isToday = day === isoToday();
            return (
              <div key={day} className="bar-col">
                <div className="bar-wrap">
                  <div
                    className={`bar${isToday ? ' bar-today' : ''}`}
                    style={{ height: `${Math.max(pct, mins > 0 ? 4 : 0)}%` }}
                    title={`${shortDate(day)}: ${fmtMins(mins)}`}
                  />
                </div>
                <div className={`bar-label${isToday ? ' bar-label-today' : ''}`}>{shortDay(day)}</div>
                {mins > 0 && <div className="bar-mins">{fmtMins(mins)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Effect usage ── */}
      {topEffects.length > 0 && (
        <div className="section">
          <div className="section-title">Effect Usage</div>
          <div className="h-bars">
            {topEffects.map(([effect, mins]) => {
              const pct = (mins / (topEffects[0][1] || 1)) * 100;
              return (
                <div key={effect} className="h-bar-row">
                  <div className="h-bar-label">
                    <span className="effect-dot" style={{ background: EFFECT_COLORS[effect] || '#888' }} />
                    <span className="h-bar-name">{effect.charAt(0).toUpperCase() + effect.slice(1)}</span>
                  </div>
                  <div className="h-bar-track">
                    <div className="h-bar-fill" style={{ width: `${pct}%`, background: EFFECT_COLORS[effect] || '#888' }} />
                  </div>
                  <div className="h-bar-val">{fmtMins(mins)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top sites ── */}
      {topSites.length > 0 && (
        <div className="section">
          <div className="section-title">Top Sites</div>
          <div className="h-bars">
            {topSites.map(([site, mins]) => {
              const pct = (mins / (topSites[0][1] || 1)) * 100;
              return (
                <div key={site} className="h-bar-row">
                  <div className="h-bar-label" style={{ minWidth: 0 }}>
                    <span className="h-bar-name site-name">{site}</span>
                  </div>
                  <div className="h-bar-track">
                    <div className="h-bar-fill" style={{ width: `${pct}%`, background: 'var(--cyan)' }} />
                  </div>
                  <div className="h-bar-val">{fmtMins(mins)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Session history ── */}
      {recentSessions.length > 0 && (
        <div className="section">
          <div className="section-title">Recent Sessions</div>
          <div className="session-table-wrap">
            <div className="session-table">
              <div className="session-row session-header">
                <span>Date</span>
                <span>Site</span>
                <span>Effect</span>
                <span>Time</span>
              </div>
              {recentSessions.map((s, i) => (
                <div key={i} className="session-row">
                  <span className="session-date">{shortDate(s.date || isoToday())}</span>
                  <span className="session-site">{s.site || '—'}</span>
                  <span className="session-effect" style={{ color: EFFECT_COLORS[s.effect] || 'var(--text-muted)' }}>
                    {s.effect ? s.effect.charAt(0).toUpperCase() + s.effect.slice(1) : '—'}
                  </span>
                  <span className="session-mins">{fmtMins(s.minutes || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {count === 0 && (
        <div className="empty">
          <p>No sessions yet.</p>
          <p>Activate Privacy Mode and use it for at least a minute to see stats here.</p>
        </div>
      )}
    </div>
  );
}
