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

function computeStats(sessions) {
  const days7 = lastNDays(7);
  const today  = isoToday();

  // Minutes per day (last 7)
  const byDay = {};
  days7.forEach(d => { byDay[d] = 0; });

  // Week totals
  let weekTotal = 0;
  let todayTotal = 0;

  // Effect usage (all time)
  const effectMins = {};
  // Site usage (all time)
  const siteMins = {};

  sessions.forEach(s => {
    const mins = s.minutes || 0;
    if (days7.includes(s.date)) {
      byDay[s.date] = (byDay[s.date] || 0) + mins;
      weekTotal += mins;
      if (s.date === today) todayTotal += mins;
    }
    effectMins[s.effect] = (effectMins[s.effect] || 0) + mins;
    if (s.site) {
      siteMins[s.site] = (siteMins[s.site] || 0) + mins;
    }
  });

  const maxDay = Math.max(...Object.values(byDay), 1);

  const topEffects = Object.entries(effectMins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topSites = Object.entries(siteMins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalMinutes = sessions.reduce((s, r) => s + (r.minutes || 0), 0);

  return { byDay, days7, maxDay, weekTotal, todayTotal, topEffects, topSites, totalMinutes };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function StatsApp() {
  const [stats, setStats] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    chrome.storage.local.get(['__pl_sessions__'], res => {
      const sessions = res.__pl_sessions__ || [];
      setCount(sessions.length);
      setStats(computeStats(sessions));
    });
  }, []);

  if (!stats) {
    return (
      <div className="loading">
        <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
      </div>
    );
  }

  const { byDay, days7, maxDay, weekTotal, todayTotal, topEffects, topSites, totalMinutes } = stats;

  function fmtMins(m) {
    if (m < 60) return `${m}m`;
    return `${Math.floor(m/60)}h ${m%60}m`;
  }

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
      </div>

      {/* ── Daily bar chart ── */}
      <div className="section">
        <div className="section-title">Last 7 Days</div>
        <div className="bar-chart">
          {days7.map(day => {
            const mins   = byDay[day] || 0;
            const pct    = maxDay > 0 ? (mins / maxDay) * 100 : 0;
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
                    <span
                      className="effect-dot"
                      style={{ background: EFFECT_COLORS[effect] || '#888' }}
                    />
                    <span className="h-bar-name">{effect.charAt(0).toUpperCase() + effect.slice(1)}</span>
                  </div>
                  <div className="h-bar-track">
                    <div
                      className="h-bar-fill"
                      style={{ width: `${pct}%`, background: EFFECT_COLORS[effect] || '#888' }}
                    />
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
                    <div
                      className="h-bar-fill"
                      style={{ width: `${pct}%`, background: 'var(--cyan)' }}
                    />
                  </div>
                  <div className="h-bar-val">{fmtMins(mins)}</div>
                </div>
              );
            })}
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
