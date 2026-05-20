import { useState, useEffect, useCallback, useRef } from 'react';
import './styles.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    id: 'micro', name: 'Micro', desc: '60×60',
    icon: <svg viewBox="0 0 28 22" fill="none"><rect x="9" y="6" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    id: 'textLine', name: 'Text', desc: '420×32',
    icon: <svg viewBox="0 0 28 22" fill="none"><rect x="2" y="9" width="24" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    id: 'socialSquare', name: 'Social', desc: '320×320',
    icon: <svg viewBox="0 0 28 22" fill="none"><rect x="5" y="2" width="18" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    id: 'wide', name: 'Wide', desc: '700×400',
    icon: <svg viewBox="0 0 28 22" fill="none"><rect x="2" y="5" width="24" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
];

const SHAPES = [
  {
    id: 'rect', label: 'Rectangle',
    icon: <svg viewBox="0 0 20 16" fill="none"><rect x="1" y="1" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    id: 'circle', label: 'Circle',
    icon: <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="9" ry="9" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
];

const EFFECTS = [
  { id: 'default', label: 'Cyan',  color: '#00D1FF' },
  { id: 'fire',    label: 'Fire',  color: '#ff6b00' },
  { id: 'neon',    label: 'Neon',  color: '#39ff14' },
  { id: 'ice',     label: 'Ice',   color: '#87ceeb' },
  { id: 'ghost',   label: 'Ghost', color: 'rgba(255,255,255,0.3)' },
];

// ─── Messaging ────────────────────────────────────────────────────────────────

async function sendToContent(msg) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    return await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    return null;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [active,       setActive]       = useState(false);
  const [blurAmount,   setBlurAmount]   = useState(20);
  const [locked,       setLocked]       = useState(false);
  const [autoActivate, setAutoActivate] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [shape,        setShape]        = useState('rect');
  const [effect,       setEffect]       = useState('default');
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);

  // Refs so callbacks always see latest value without stale closure
  const activeRef     = useRef(false);
  const blurRef       = useRef(20);
  const lockedRef     = useRef(false);
  const shapeRef      = useRef('rect');
  const effectRef     = useRef('default');

  function syncActive(v)  { setActive(v);      activeRef.current  = v; }
  function syncBlur(v)    { setBlurAmount(v);   blurRef.current    = v; }
  function syncLocked(v)  { setLocked(v);       lockedRef.current  = v; }
  function syncShape(v)   { setShape(v);        shapeRef.current   = v; }
  function syncEffect(v)  { setEffect(v);       effectRef.current  = v; }

  // Load state from content script on open
  useEffect(() => {
    sendToContent({ type: 'GET_STATE' }).then(res => {
      if (res) {
        syncActive(res.active ?? false);
        syncBlur(res.blurAmount ?? 20);
        syncLocked(res.locked ?? false);
        syncShape(res.shape ?? 'rect');
        syncEffect(res.effect ?? 'default');
      }
      setLoading(false);
    });

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) return;
      try {
        const host = new URL(tab.url).hostname;
        chrome.storage.local.get([`site:${host}`], result => {
          setAutoActivate(result[`site:${host}`]?.autoActivate ?? false);
        });
      } catch { /* non-http pages */ }
    });
  }, []);

  // Listen for state push from content (e.g. Alt+X)
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === 'STATE_CHANGED') syncActive(msg.active);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleToggle = useCallback(async () => {
    if (sending) return;
    setSending(true);
    const next = !activeRef.current;
    const res = await sendToContent(
      next
        ? { type: 'ACTIVATE', settings: { blurAmount: blurRef.current, locked: lockedRef.current, shape: shapeRef.current, effect: effectRef.current } }
        : { type: 'DEACTIVATE' }
    );
    if (res !== null) syncActive(next);
    setSending(false);
  }, [sending]);

  const handleBlurChange = useCallback(async (e) => {
    const val = Number(e.target.value);
    syncBlur(val);
    await sendToContent({ type: 'SET_BLUR', value: val });
  }, []);

  const handlePreset = useCallback(async (id) => {
    setActivePreset(id);
    await sendToContent({ type: 'SET_PRESET', preset: id });
  }, []);

  const handleShape = useCallback(async (id) => {
    syncShape(id);
    await sendToContent({ type: 'SET_SHAPE', shape: id });
  }, []);

  const handleEffect = useCallback(async (id) => {
    syncEffect(id);
    await sendToContent({ type: 'SET_EFFECT', effect: id });
  }, []);

  const handleLock = useCallback(async (e) => {
    const val = e.target.checked;
    syncLocked(val);
    await sendToContent({ type: 'SET_LOCK', locked: val });
  }, []);

  const handleAutoActivate = useCallback(async (e) => {
    const val = e.target.checked;
    setAutoActivate(val);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    try {
      const host = new URL(tab.url).hostname;
      const key  = `site:${host}`;
      chrome.storage.local.get([key], result => {
        chrome.storage.local.set({ [key]: { ...(result[key] || {}), autoActivate: val } });
      });
    } catch { /* non-http */ }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
    </div>
  );

  const blurPct = ((blurAmount - 4) / 36) * 100;

  return (
    <div>

      {/* ── Header ── */}
      <div className="header">
        <div className="logo">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#00D1FF" strokeWidth="1.2"/>
            <circle cx="8" cy="8" r="3.5" stroke="#00D1FF" strokeWidth="1"/>
            <line x1="8" y1="1" x2="8" y2="3" stroke="#00D1FF" strokeWidth="1" strokeLinecap="round"/>
            <line x1="8" y1="13" x2="8" y2="15" stroke="#00D1FF" strokeWidth="1" strokeLinecap="round"/>
            <line x1="1" y1="8" x2="3" y2="8" stroke="#00D1FF" strokeWidth="1" strokeLinecap="round"/>
            <line x1="13" y1="8" x2="15" y2="8" stroke="#00D1FF" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="header-text">
          <h1>Privacy Lens</h1>
          <p>Stealth viewing shield</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {active ? <div className="active-indicator" /> : <div className="inactive-indicator" />}
        </div>
      </div>

      {/* ── Main Toggle ── */}
      <div className={`toggle-section${active ? ' active' : ''}${sending ? ' sending' : ''}`} onClick={handleToggle}>
        <div className="toggle-info">
          <span className="toggle-label">Privacy Mode</span>
          <span className="toggle-status">
            {sending ? 'Applying…' : active ? 'Screen blurred — lens active' : 'Click to activate'}
          </span>
        </div>
        <label className="switch" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={active} onChange={handleToggle} disabled={sending} />
          <div className="switch-track" />
          <div className="switch-thumb" />
        </label>
      </div>

      {/* ── Shape Selector ── */}
      <div className="section">
        <div className="section-title">Lens Shape</div>
        <div className="shape-row">
          {SHAPES.map(s => (
            <button
              key={s.id}
              className={`shape-btn${shape === s.id ? ' active' : ''}`}
              onClick={() => handleShape(s.id)}
            >
              <span className="shape-icon" style={{ color: shape === s.id ? 'var(--cyan)' : 'var(--text-muted)' }}>
                {s.icon}
              </span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* ── Presets ── */}
      <div className="section">
        <div className="section-title">Size Presets</div>
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

      {/* ── Effects ── */}
      <div className="section">
        <div className="section-title">Lens Effect</div>
        <div className="effects-row">
          {EFFECTS.map(ef => (
            <button
              key={ef.id}
              className={`effect-btn${effect === ef.id ? ' active' : ''}`}
              onClick={() => handleEffect(ef.id)}
              title={ef.label}
            >
              <span className="effect-dot" style={{ background: ef.color, boxShadow: effect === ef.id ? `0 0 6px ${ef.color}` : 'none' }} />
              <span className="effect-label">{ef.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* ── Blur Slider ── */}
      <div className="section">
        <div className="section-title">Blur Intensity</div>
        <div className="slider-row">
          <span className="slider-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" opacity=".5"/>
              <circle cx="7" cy="7" r="3" fill="currentColor" opacity=".5"/>
            </svg>
          </span>
          <div className="slider-wrap">
            <input
              type="range" min="4" max="40" step="1"
              value={blurAmount}
              onChange={handleBlurChange}
              style={{
                background: `linear-gradient(to right, var(--cyan) 0%, var(--cyan) ${blurPct}%, var(--surface-2) ${blurPct}%, var(--surface-2) 100%)`,
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
            <span className="option-label">Lock Lens Position</span>
            <span className="option-desc">Stop lens following the cursor</span>
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

      {/* ── Hotkeys ── */}
      <div className="hotkeys-grid">
        <div className="hotkey-row">
          <span className="hotkey-label">Panic toggle</span>
          <div className="hotkey-badge"><span className="kbd">Alt</span><span className="kbd-sep">+</span><span className="kbd">X</span></div>
        </div>
        <div className="hotkey-row">
          <span className="hotkey-label">Resize</span>
          <div className="hotkey-badge"><span className="kbd">Ctrl</span><span className="kbd-sep">+</span><span className="kbd">Scroll</span></div>
        </div>
        <div className="hotkey-row">
          <span className="hotkey-label">Draw lens</span>
          <div className="hotkey-badge"><span className="kbd">Shift</span><span className="kbd-sep">+</span><span className="kbd">Drag</span></div>
        </div>
      </div>

    </div>
  );
}
