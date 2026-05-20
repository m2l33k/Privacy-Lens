import { useState, useEffect, useCallback } from 'react';
import './styles.css';

// ─── Preset Definitions ───────────────────────────────────────────────────────

const PRESETS = [
  {
    id: 'micro',
    name: 'Micro',
    desc: '60×60',
    icon: (
      <svg viewBox="0 0 28 22" fill="none">
        <rect x="9" y="6" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'textLine',
    name: 'Text',
    desc: '420×32',
    icon: (
      <svg viewBox="0 0 28 22" fill="none">
        <rect x="2" y="9" width="24" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'socialSquare',
    name: 'Social',
    desc: '320×320',
    icon: (
      <svg viewBox="0 0 28 22" fill="none">
        <rect x="5" y="2" width="18" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'wide',
    name: 'Wide',
    desc: '700×400',
    icon: (
      <svg viewBox="0 0 28 22" fill="none">
        <rect x="2" y="5" width="24" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

// ─── Messaging Helpers ────────────────────────────────────────────────────────

async function sendToContent(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    return null;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [active,      setActive]      = useState(false);
  const [blurAmount,  setBlurAmount]  = useState(20);
  const [locked,      setLocked]      = useState(false);
  const [autoActivate, setAutoActivate] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [loading,     setLoading]     = useState(true);

  // Load current state from content script on mount
  useEffect(() => {
    sendToContent({ type: 'GET_STATE' }).then(res => {
      if (res) {
        setActive(res.active);
        setBlurAmount(res.blurAmount ?? 20);
        setLocked(res.locked ?? false);
      }
      setLoading(false);
    });

    // Also load auto-activate preference from storage
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) return;
      const host = new URL(tab.url).hostname;
      chrome.storage.local.get([`site:${host}`], result => {
        setAutoActivate(result[`site:${host}`]?.autoActivate ?? false);
      });
    });
  }, []);

  // Listen for state changes pushed from content script (e.g., Alt+X)
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === 'STATE_CHANGED') {
        setActive(msg.active);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleToggle = useCallback(async () => {
    const next = !active;
    setActive(next);
    if (next) {
      await sendToContent({ type: 'ACTIVATE', settings: { blurAmount, locked } });
    } else {
      await sendToContent({ type: 'DEACTIVATE' });
    }
  }, [active, blurAmount, locked]);

  const handleBlurChange = useCallback(async (e) => {
    const val = Number(e.target.value);
    setBlurAmount(val);
    await sendToContent({ type: 'SET_BLUR', value: val });
  }, []);

  const handlePreset = useCallback(async (preset) => {
    setActivePreset(preset);
    await sendToContent({ type: 'SET_PRESET', preset });
  }, []);

  const handleLock = useCallback(async (e) => {
    const val = e.target.checked;
    setLocked(val);
    await sendToContent({ type: 'SET_LOCK', locked: val });
  }, []);

  const handleAutoActivate = useCallback(async (e) => {
    const val = e.target.checked;
    setAutoActivate(val);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    const host = new URL(tab.url).hostname;
    const key  = `site:${host}`;
    const existing = await new Promise(r => chrome.storage.local.get([key], r));
    chrome.storage.local.set({ [key]: { ...(existing[key] || {}), autoActivate: val } });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Connecting…</div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="header">
        <div className="logo">🔍</div>
        <div className="header-text">
          <h1>Privacy Lens</h1>
          <p>Stealth viewing shield</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {active
            ? <div className="active-indicator" title="Active" />
            : <div className="inactive-indicator" title="Inactive" />
          }
        </div>
      </div>

      {/* ── Main Toggle ── */}
      <div className={`toggle-section${active ? ' active' : ''}`} onClick={handleToggle}>
        <div className="toggle-info">
          <span className="toggle-label">Privacy Mode</span>
          <span className="toggle-status">
            {active ? 'Screen blurred — lens active' : 'Click to activate'}
          </span>
        </div>
        <label className="switch" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={active} onChange={handleToggle} />
          <div className="switch-track" />
          <div className="switch-thumb" />
        </label>
      </div>

      {/* ── Presets ── */}
      <div className="section">
        <div className="section-title">Lens Presets</div>
        <div className="presets-grid">
          {PRESETS.map(p => (
            <button
              key={p.id}
              className={`preset-btn${activePreset === p.id ? ' active' : ''}`}
              onClick={() => handlePreset(p.id)}
              title={p.desc}
            >
              <div className="preset-icon" style={{ color: activePreset === p.id ? 'var(--cyan)' : 'var(--text-muted)' }}>
                {p.icon}
              </div>
              <span className="preset-name">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* ── Blur Intensity ── */}
      <div className="section">
        <div className="section-title">Blur Intensity</div>
        <div className="slider-row">
          <span className="slider-icon">☁</span>
          <div className="slider-wrap">
            <input
              type="range"
              min="4"
              max="40"
              step="1"
              value={blurAmount}
              onChange={handleBlurChange}
              style={{
                background: `linear-gradient(to right, var(--cyan) 0%, var(--cyan) ${((blurAmount - 4) / 36) * 100}%, var(--surface-2) ${((blurAmount - 4) / 36) * 100}%, var(--surface-2) 100%)`,
              }}
            />
          </div>
          <span className="slider-value">{blurAmount}px</span>
        </div>
      </div>

      <div className="divider" />

      {/* ── Options ── */}
      <div className="section">
        <div className="section-title">Options</div>

        <div className="option-row">
          <div className="option-info">
            <span className="option-label">Lock Lens in Place</span>
            <span className="option-desc">Lens stays fixed — doesn't follow cursor</span>
          </div>
          <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={locked} onChange={handleLock} />
            <div className="switch-track" />
            <div className="switch-thumb" />
          </label>
        </div>

        <div className="option-row">
          <div className="option-info">
            <span className="option-label">Auto-Activate on This Site</span>
            <span className="option-desc">Remembers Privacy Mode for this domain</span>
          </div>
          <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={autoActivate} onChange={handleAutoActivate} />
            <div className="switch-track" />
            <div className="switch-thumb" />
          </label>
        </div>
      </div>

      <div className="divider" />

      {/* ── Hotkey Reference ── */}
      <div className="hotkey-section">
        <span className="hotkey-label">Panic toggle</span>
        <div className="hotkey-badge">
          <span className="kbd">Alt</span>
          <span className="kbd-sep">+</span>
          <span className="kbd">X</span>
        </div>
      </div>
      <div className="hotkey-section" style={{ marginTop: -4 }}>
        <span className="hotkey-label">Resize lens</span>
        <div className="hotkey-badge">
          <span className="kbd">Ctrl</span>
          <span className="kbd-sep">+</span>
          <span className="kbd">Scroll</span>
        </div>
      </div>
      <div className="hotkey-section" style={{ marginTop: -4, marginBottom: 0 }}>
        <span className="hotkey-label">Draw custom lens</span>
        <div className="hotkey-badge">
          <span className="kbd">Shift</span>
          <span className="kbd-sep">+</span>
          <span className="kbd">Drag</span>
        </div>
      </div>
    </div>
  );
}
