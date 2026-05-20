import { useState, useEffect, useCallback, useRef } from 'react';
import './styles.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [
  { id: 'micro',        name: 'Micro',  desc: '60×60',
    icon: <svg viewBox="0 0 28 22" fill="none"><rect x="9" y="6" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: 'textLine',     name: 'Text',   desc: '420×32',
    icon: <svg viewBox="0 0 28 22" fill="none"><rect x="2" y="9" width="24" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: 'socialSquare', name: 'Social', desc: '320×320',
    icon: <svg viewBox="0 0 28 22" fill="none"><rect x="5" y="2" width="18" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: 'wide',         name: 'Wide',   desc: '700×400',
    icon: <svg viewBox="0 0 28 22" fill="none"><rect x="2" y="5" width="24" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg> },
];

const SHAPES = [
  { id: 'rect',      label: 'Rect',
    icon: <svg viewBox="0 0 20 16" fill="none"><rect x="1" y="1" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: 'circle',    label: 'Circle',
    icon: <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="9" ry="9" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: 'spotlight', label: 'Lens',
    icon: <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="9" ry="9" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/><circle cx="10" cy="10" r="4" fill="currentColor" opacity=".3"/></svg> },
  { id: 'hexagon',   label: 'Hex',
    icon: <svg viewBox="0 0 20 20" fill="none"><polygon points="10,1 17.7,5 17.7,15 10,19 2.3,15 2.3,5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: 'diamond',   label: 'Diamond',
    icon: <svg viewBox="0 0 20 20" fill="none"><polygon points="10,1 19,10 10,19 1,10" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: 'star',      label: 'Star',
    icon: <svg viewBox="0 0 20 20" fill="none"><polygon points="10,1 12.4,7.4 19,7.4 13.8,11.5 15.9,18 10,14 4.1,18 6.2,11.5 1,7.4 7.6,7.4" stroke="currentColor" strokeWidth="1.5"/></svg> },
];

const EFFECTS = [
  { id: 'default',    label: 'Cyan',   color: '#00D1FF' },
  { id: 'fire',       label: 'Fire',   color: '#ff6b00' },
  { id: 'neon',       label: 'Neon',   color: '#39ff14' },
  { id: 'ice',        label: 'Ice',    color: '#87ceeb' },
  { id: 'ghost',      label: 'Ghost',  color: 'rgba(255,255,255,0.3)' },
  { id: 'police',     label: 'Police', color: 'police' },
  { id: 'flashlight', label: 'Torch',  color: '#FFF5CC' },
  { id: 'matrix',     label: 'Matrix', color: '#00ff41' },
  { id: 'cctv',       label: 'CCTV',   color: '#00dc50' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_SCHEDULER = { enabled: false, days: [1,2,3,4,5], startHour: 9, startMin: 0, endHour: 18, endMin: 0 };
const DEFAULT_HOTKEY    = { key: 'x', altKey: true, ctrlKey: false, shiftKey: false };

const TIMER_OPTIONS = [
  { value: 0,   label: 'Off'  },
  { value: 60,  label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1800,label: '30 min' },
];

const IDLE_OPTIONS = [
  { value: 0,   label: 'Off'  },
  { value: 30,  label: '30 s' },
  { value: 60,  label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
];

const PROFILES = ['Work', 'Cafe', 'Meeting'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hotkeyLabel(hk) {
  const parts = [];
  if (hk.ctrlKey)  parts.push('Ctrl');
  if (hk.altKey)   parts.push('Alt');
  if (hk.shiftKey) parts.push('Shift');
  parts.push(hk.key.toUpperCase());
  return parts.join(' + ');
}

function pad2(n) { return String(n).padStart(2, '0'); }

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
  const [tab,            setTab]            = useState('lens');
  const [active,         setActive]         = useState(false);
  const [blurAmount,     setBlurAmount]     = useState(20);
  const [overlayOpacity, setOverlayOpacity] = useState(0.2);
  const [borderThickness,setBorderThickness]= useState(1);
  const [grainEnabled,   setGrainEnabled]   = useState(false);
  const [locked,         setLocked]         = useState(false);
  const [autoActivate,   setAutoActivate]   = useState(false);
  const [activePreset,   setActivePreset]   = useState(null);
  const [shape,          setShape]          = useState('rect');
  const [effect,         setEffect]         = useState('default');
  const [customColor,    setCustomColor]    = useState('#00D1FF');
  const [soundEnabled,   setSoundEnabled]   = useState(true);
  const [screenGuard,    setScreenGuard]    = useState(false);
  const [webcamGuard,    setWebcamGuard]    = useState(false);
  const [clipboardGuard, setClipboardGuard] = useState(false);
  const [hotkey,         setHotkey]         = useState(DEFAULT_HOTKEY);
  const [scheduler,      setScheduler]      = useState(DEFAULT_SCHEDULER);
  const [timerDuration,  setTimerDuration]  = useState(0);
  const [idleDelay,      setIdleDelay]      = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [sending,        setSending]        = useState(false);
  const [recording,      setRecording]      = useState(false);

  const activeRef    = useRef(false);
  const blurRef      = useRef(20);
  const lockedRef    = useRef(false);
  const shapeRef     = useRef('rect');
  const effectRef    = useRef('default');
  const recordingRef = useRef(false);

  function syncActive(v)  { setActive(v);      activeRef.current  = v; }
  function syncBlur(v)    { setBlurAmount(v);   blurRef.current    = v; }
  function syncLocked(v)  { setLocked(v);       lockedRef.current  = v; }
  function syncShape(v)   { setShape(v);        shapeRef.current   = v; }
  function syncEffect(v)  { setEffect(v);       effectRef.current  = v; }

  // ── Load state ───────────────────────────────────────────────────────────────

  useEffect(() => {
    sendToContent({ type: 'GET_STATE' }).then(res => {
      if (res) {
        syncActive(res.active ?? false);
        syncBlur(res.blurAmount ?? 20);
        syncLocked(res.locked ?? false);
        syncShape(res.shape ?? 'rect');
        syncEffect(res.effect ?? 'default');
        if (res.overlayOpacity  !== undefined) setOverlayOpacity(res.overlayOpacity);
        if (res.borderThickness !== undefined) setBorderThickness(res.borderThickness);
        if (res.grainEnabled    !== undefined) setGrainEnabled(res.grainEnabled);
        if (res.customColor)    setCustomColor(res.customColor);
        if (res.soundEnabled    !== undefined) setSoundEnabled(res.soundEnabled);
        if (res.screenGuard     !== undefined) setScreenGuard(res.screenGuard);
        if (res.webcamGuard     !== undefined) setWebcamGuard(res.webcamGuard);
        if (res.clipboardGuard  !== undefined) setClipboardGuard(res.clipboardGuard);
        if (res.hotkey)         setHotkey(res.hotkey);
        if (res.scheduler)      setScheduler({ ...DEFAULT_SCHEDULER, ...res.scheduler });
        if (res.timerDuration   !== undefined) setTimerDuration(res.timerDuration);
        if (res.idleDelay       !== undefined) setIdleDelay(res.idleDelay);
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
      } catch { /* non-http */ }
    });
  }, []);

  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === 'STATE_CHANGED') syncActive(msg.active);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // ── Hotkey recording ─────────────────────────────────────────────────────────

  useEffect(() => { recordingRef.current = recording; }, [recording]);

  useEffect(() => {
    const onKey = (e) => {
      if (!recordingRef.current) return;
      e.preventDefault(); e.stopPropagation();
      if (['Control','Alt','Shift','Meta'].includes(e.key)) return;
      const hk = { key: e.key.toLowerCase(), altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey };
      setHotkey(hk);
      setRecording(false);
      sendToContent({ type: 'SET_HOTKEY', hotkey: hk });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

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

  const handleBlurChange    = useCallback(async (e) => { const v = Number(e.target.value); syncBlur(v);    await sendToContent({ type: 'SET_BLUR',      value: v    }); }, []);
  const handleOpacity       = useCallback(async (e) => { const v = Number(e.target.value); setOverlayOpacity(v);  await sendToContent({ type: 'SET_OPACITY',   value: v    }); }, []);
  const handleThickness     = useCallback(async (e) => { const v = Number(e.target.value); setBorderThickness(v); await sendToContent({ type: 'SET_THICKNESS', value: v    }); }, []);
  const handleGrain         = useCallback(async (e) => { const v = e.target.checked;       setGrainEnabled(v);    await sendToContent({ type: 'SET_GRAIN',     enabled: v  }); }, []);
  const handlePreset        = useCallback(async (id) => { setActivePreset(id);              await sendToContent({ type: 'SET_PRESET',   preset: id }); }, []);
  const handleShape         = useCallback(async (id) => { syncShape(id);                    await sendToContent({ type: 'SET_SHAPE',    shape: id  }); }, []);
  const handleEffect        = useCallback(async (id) => { syncEffect(id);                   await sendToContent({ type: 'SET_EFFECT',   effect: id }); }, []);
  const handleLock          = useCallback(async (e) => { const v = e.target.checked; syncLocked(v); await sendToContent({ type: 'SET_LOCK',         locked: v  }); }, []);
  const handleCustomColor   = useCallback(async (e) => { const v = e.target.value;   setCustomColor(v);   await sendToContent({ type: 'SET_CUSTOM_COLOR', color: v   }); }, []);
  const handleSound         = useCallback(async (e) => { const v = e.target.checked; setSoundEnabled(v);  await sendToContent({ type: 'SET_SOUND',         enabled: v }); }, []);
  const handleScreenGuard   = useCallback(async (e) => { const v = e.target.checked; setScreenGuard(v);   await sendToContent({ type: 'SET_SCREEN_GUARD',   enabled: v }); }, []);
  const handleWebcamGuard   = useCallback(async (e) => { const v = e.target.checked; setWebcamGuard(v);   await sendToContent({ type: 'SET_WEBCAM_GUARD',   enabled: v }); }, []);
  const handleClipboardGuard= useCallback(async (e) => { const v = e.target.checked; setClipboardGuard(v);await sendToContent({ type: 'SET_CLIPBOARD_GUARD', enabled: v }); }, []);

  const handleTimer = useCallback(async (val) => {
    const v = Number(val);
    setTimerDuration(v);
    await sendToContent({ type: 'SET_TIMER', seconds: v });
  }, []);

  const handleIdle = useCallback(async (val) => {
    const v = Number(val);
    setIdleDelay(v);
    await sendToContent({ type: 'SET_IDLE', seconds: v });
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

  const handleSchedulerChange = useCallback(async (patch) => {
    const next = { ...scheduler, ...patch };
    setScheduler(next);
    await sendToContent({ type: 'SET_SCHEDULER', scheduler: next });
  }, [scheduler]);

  const toggleSchedulerDay = useCallback((dayIndex) => {
    const days = scheduler.days.includes(dayIndex)
      ? scheduler.days.filter(d => d !== dayIndex)
      : [...scheduler.days, dayIndex].sort((a,b) => a-b);
    handleSchedulerChange({ days });
  }, [scheduler, handleSchedulerChange]);

  const handleLoadProfile = useCallback(async (name) => {
    const res = await sendToContent({ type: 'LOAD_PROFILE', name });
    if (res?.profile) {
      const p = res.profile;
      if (p.blurAmount      !== undefined) syncBlur(p.blurAmount);
      if (p.overlayOpacity  !== undefined) setOverlayOpacity(p.overlayOpacity);
      if (p.borderThickness !== undefined) setBorderThickness(p.borderThickness);
      if (p.grainEnabled    !== undefined) setGrainEnabled(p.grainEnabled);
      if (p.shape)  syncShape(p.shape);
      if (p.effect) syncEffect(p.effect);
      if (p.customColor) setCustomColor(p.customColor);
    }
  }, []);

  const handleSaveProfile = useCallback(async (name) => {
    await sendToContent({ type: 'SAVE_PROFILE', name });
  }, []);

  const handleExportSettings = useCallback(() => {
    chrome.storage.local.get(['globalSettings'], res => {
      const blob = new Blob([JSON.stringify(res.globalSettings || {}, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'privacy-lens-settings.json'; a.click();
      URL.revokeObjectURL(url);
    });
  }, []);

  const handleImportSettings = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const settings = JSON.parse(ev.target.result);
        chrome.storage.local.set({ globalSettings: settings });
        sendToContent({ type: 'ACTIVATE', settings });
        if (settings.blurAmount      !== undefined) syncBlur(settings.blurAmount);
        if (settings.overlayOpacity  !== undefined) setOverlayOpacity(settings.overlayOpacity);
        if (settings.borderThickness !== undefined) setBorderThickness(settings.borderThickness);
        if (settings.grainEnabled    !== undefined) setGrainEnabled(settings.grainEnabled);
        if (settings.shape)   syncShape(settings.shape);
        if (settings.effect)  syncEffect(settings.effect);
      } catch { /* invalid JSON */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const openStats = useCallback(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('stats/stats.html') });
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
    </div>
  );

  const blurPct    = ((blurAmount - 4) / 36) * 100;
  const opPct      = ((overlayOpacity - 0.05) / 0.8) * 100;
  const thickPct   = ((borderThickness - 1) / 5) * 100;

  return (
    <div>
      {/* ── Header ── */}
      <div className="header">
        <div className="logo">
          <img src={chrome.runtime.getURL('icons/icon48.png')} width="20" height="20" alt="Privacy Lens" style={{ objectFit: 'contain' }} />
        </div>
        <div className="header-text">
          <h1>Privacy Lens</h1>
          <p>Stealth viewing shield</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="stats-btn" onClick={openStats} title="Weekly Stats">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="6" width="2" height="5" rx=".5" fill="currentColor"/>
              <rect x="5" y="3" width="2" height="8" rx=".5" fill="currentColor"/>
              <rect x="9" y="1" width="2" height="10" rx=".5" fill="currentColor"/>
            </svg>
          </button>
          {active ? <div className="active-indicator" /> : <div className="inactive-indicator" />}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="tab-bar">
        {[['lens','Lens'],['schedule','Schedule'],['settings','Settings']].map(([id,label]) => (
          <button key={id} className={`tab-btn${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ TAB: LENS ══ */}
      {tab === 'lens' && (
        <div>
          {/* Toggle */}
          <div className={`toggle-section${active ? ' active' : ''}${sending ? ' sending' : ''}`} onClick={handleToggle}>
            <div className="toggle-info">
              <span className="toggle-label">Privacy Mode</span>
              <span className="toggle-status">{sending ? 'Applying…' : active ? 'Screen blurred — lens active' : 'Click to activate'}</span>
            </div>
            <label className="switch" onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={active} onChange={handleToggle} disabled={sending} />
              <div className="switch-track" /><div className="switch-thumb" />
            </label>
          </div>

          {/* Shape */}
          <div className="section">
            <div className="section-title">Lens Shape</div>
            <div className="shape-grid">
              {SHAPES.map(s => (
                <button key={s.id} className={`shape-btn${shape === s.id ? ' active' : ''}`} onClick={() => handleShape(s.id)}>
                  <span className="shape-icon" style={{ color: shape === s.id ? 'var(--cyan)' : 'var(--text-muted)' }}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Presets */}
          <div className="section">
            <div className="section-title">Size Presets</div>
            <div className="presets-grid">
              {PRESETS.map(p => (
                <button key={p.id} className={`preset-btn${activePreset === p.id ? ' active' : ''}`} onClick={() => handlePreset(p.id)} title={p.desc}>
                  <div className="preset-icon" style={{ color: activePreset === p.id ? 'var(--cyan)' : 'var(--text-muted)' }}>{p.icon}</div>
                  <span className="preset-name">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Effects */}
          <div className="section">
            <div className="section-title">Lens Effect</div>
            <div className="effects-row">
              {EFFECTS.map(ef => (
                <button key={ef.id} className={`effect-btn${effect === ef.id ? ' active' : ''}`} onClick={() => handleEffect(ef.id)} title={ef.label}>
                  {ef.color === 'police'
                    ? <span className="effect-dot effect-dot-police" style={{ boxShadow: effect === ef.id ? '0 0 6px #FF1744' : 'none' }} />
                    : <span className="effect-dot" style={{ background: ef.id === 'default' ? customColor : ef.color, boxShadow: effect === ef.id ? `0 0 6px ${ef.color}` : 'none' }} />
                  }
                  <span className="effect-label">{ef.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Sliders */}
          <div className="section">
            <div className="section-title">Lens Controls</div>

            <div className="slider-label-row">
              <span className="slider-caption">Blur</span>
              <span className="slider-value">{blurAmount}px</span>
            </div>
            <div className="slider-row">
              <div className="slider-wrap">
                <input type="range" min="4" max="40" step="1" value={blurAmount} onChange={handleBlurChange}
                  style={{ background: `linear-gradient(to right,var(--cyan) 0%,var(--cyan) ${blurPct}%,var(--surface-2) ${blurPct}%,var(--surface-2) 100%)` }} />
              </div>
            </div>

            <div className="slider-label-row">
              <span className="slider-caption">Darkness</span>
              <span className="slider-value">{Math.round(overlayOpacity * 100)}%</span>
            </div>
            <div className="slider-row">
              <div className="slider-wrap">
                <input type="range" min="0.05" max="0.85" step="0.05" value={overlayOpacity} onChange={handleOpacity}
                  style={{ background: `linear-gradient(to right,var(--cyan) 0%,var(--cyan) ${opPct}%,var(--surface-2) ${opPct}%,var(--surface-2) 100%)` }} />
              </div>
            </div>

            <div className="slider-label-row">
              <span className="slider-caption">Border</span>
              <span className="slider-value">{borderThickness}px</span>
            </div>
            <div className="slider-row">
              <div className="slider-wrap">
                <input type="range" min="1" max="6" step="1" value={borderThickness} onChange={handleThickness}
                  style={{ background: `linear-gradient(to right,var(--cyan) 0%,var(--cyan) ${thickPct}%,var(--surface-2) ${thickPct}%,var(--surface-2) 100%)` }} />
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Options */}
          <div className="section" style={{ paddingBottom: 6 }}>
            <div className="section-title">Options</div>
            <div className="option-row">
              <div className="option-info">
                <span className="option-label">Lock Lens</span>
                <span className="option-desc">Stop following cursor (or middle-click)</span>
              </div>
              <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={locked} onChange={handleLock} />
                <div className="switch-track" /><div className="switch-thumb" />
              </label>
            </div>
            <div className="option-row" style={{ borderBottom: 'none' }}>
              <div className="option-info">
                <span className="option-label">Film Grain</span>
                <span className="option-desc">Subtle noise texture on blur area</span>
              </div>
              <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={grainEnabled} onChange={handleGrain} />
                <div className="switch-track" /><div className="switch-thumb" />
              </label>
            </div>
          </div>

          <div className="divider" />

          {/* Hotkeys */}
          <div className="hotkeys-grid">
            {[
              ['Panic toggle', hotkeyLabel(hotkey).split(' + ')],
              ['Resize',       ['Ctrl','Scroll']],
              ['Draw lens',    ['Shift','Drag']],
              ['Lock',         ['Middle','Click']],
            ].map(([label, keys]) => (
              <div key={label} className="hotkey-row">
                <span className="hotkey-label">{label}</span>
                <div className="hotkey-badge">
                  {keys.map((k, i) => (
                    <span key={i}><span className="kbd">{k}</span>{i < keys.length-1 && <span className="kbd-sep">+</span>}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ TAB: SCHEDULE ══ */}
      {tab === 'schedule' && (
        <div className="tab-content">
          <div className="section">
            <div className="option-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div className="option-info">
                <span className="option-label">Work Hours Auto-Activate</span>
                <span className="option-desc">Auto-enable Privacy Mode on a schedule</span>
              </div>
              <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={scheduler.enabled} onChange={e => handleSchedulerChange({ enabled: e.target.checked })} />
                <div className="switch-track" /><div className="switch-thumb" />
              </label>
            </div>
          </div>

          <div className="divider" />

          <div className={`section${!scheduler.enabled ? ' disabled-section' : ''}`}>
            <div className="section-title">Active Days</div>
            <div className="day-row">
              {DAYS.map((d, i) => (
                <button key={i} className={`day-btn${scheduler.days.includes(i) ? ' active' : ''}`}
                  onClick={() => toggleSchedulerDay(i)} disabled={!scheduler.enabled}>{d}</button>
              ))}
            </div>
          </div>

          <div className="divider" />

          <div className={`section${!scheduler.enabled ? ' disabled-section' : ''}`}>
            <div className="section-title">Time Range</div>
            <div className="time-row">
              <div className="time-group">
                <span className="time-label">From</span>
                <div className="time-inputs">
                  <input type="number" min="0" max="23" className="time-input" value={pad2(scheduler.startHour)} disabled={!scheduler.enabled}
                    onChange={e => handleSchedulerChange({ startHour: Math.max(0, Math.min(23, Number(e.target.value))) })} />
                  <span className="time-sep">:</span>
                  <input type="number" min="0" max="59" step="5" className="time-input" value={pad2(scheduler.startMin)} disabled={!scheduler.enabled}
                    onChange={e => handleSchedulerChange({ startMin: Math.max(0, Math.min(59, Number(e.target.value))) })} />
                </div>
              </div>
              <div className="time-arrow">→</div>
              <div className="time-group">
                <span className="time-label">To</span>
                <div className="time-inputs">
                  <input type="number" min="0" max="23" className="time-input" value={pad2(scheduler.endHour)} disabled={!scheduler.enabled}
                    onChange={e => handleSchedulerChange({ endHour: Math.max(0, Math.min(23, Number(e.target.value))) })} />
                  <span className="time-sep">:</span>
                  <input type="number" min="0" max="59" step="5" className="time-input" value={pad2(scheduler.endMin)} disabled={!scheduler.enabled}
                    onChange={e => handleSchedulerChange({ endMin: Math.max(0, Math.min(59, Number(e.target.value))) })} />
                </div>
              </div>
            </div>
            {scheduler.enabled && (
              <p className="schedule-hint">
                {scheduler.days.map(d => DAYS[d]).join(', ')} · {pad2(scheduler.startHour)}:{pad2(scheduler.startMin)}–{pad2(scheduler.endHour)}:{pad2(scheduler.endMin)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: SETTINGS ══ */}
      {tab === 'settings' && (
        <div className="tab-content">

          {/* Custom color */}
          <div className="section">
            <div className="section-title">Lens Color (Cyan Effect)</div>
            <div className="color-row">
              <div className="color-preview" style={{ background: customColor, boxShadow: `0 0 10px ${customColor}66` }} />
              <div className="color-info">
                <span className="option-label">Accent Color</span>
                <span className="option-desc">Border and handle color</span>
              </div>
              <label className="color-swatch-wrap">
                <input type="color" value={customColor} onChange={handleCustomColor} className="color-picker-input" />
                <span className="color-pick-btn">Pick</span>
              </label>
            </div>
          </div>

          <div className="divider" />

          {/* Hotkey */}
          <div className="section">
            <div className="section-title">Panic Hotkey</div>
            <div className="option-row" style={{ borderBottom: 'none' }}>
              <div className="option-info">
                <span className="option-label">Toggle Shortcut</span>
                <span className="option-desc">{recording ? 'Press any key combo…' : hotkeyLabel(hotkey)}</span>
              </div>
              <button className={`record-btn${recording ? ' recording' : ''}`} onClick={() => setRecording(r => !r)}>
                {recording ? 'Cancel' : 'Change'}
              </button>
            </div>
          </div>

          <div className="divider" />

          {/* Timer + Idle */}
          <div className="section">
            <div className="section-title">Automation</div>
            <div className="option-row">
              <div className="option-info">
                <span className="option-label">Auto-Deactivate Timer</span>
                <span className="option-desc">Turns off after selected time</span>
              </div>
              <select className="mini-select" value={timerDuration} onChange={e => handleTimer(e.target.value)}>
                {TIMER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="option-row" style={{ borderBottom: 'none' }}>
              <div className="option-info">
                <span className="option-label">Idle Auto-Activate</span>
                <span className="option-desc">Activates after cursor inactivity</span>
              </div>
              <select className="mini-select" value={idleDelay} onChange={e => handleIdle(e.target.value)}>
                {IDLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="divider" />

          {/* Guards */}
          <div className="section">
            <div className="section-title">Privacy Guards</div>
            <div className="option-row">
              <div className="option-info">
                <span className="option-label">Screen Guard</span>
                <span className="option-desc">Auto-activate on screen share / tab hide</span>
              </div>
              <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={screenGuard} onChange={handleScreenGuard} />
                <div className="switch-track" /><div className="switch-thumb" />
              </label>
            </div>
            <div className="option-row">
              <div className="option-info">
                <span className="option-label">Webcam Guard</span>
                <span className="option-desc">Auto-activate when camera activates</span>
              </div>
              <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={webcamGuard} onChange={handleWebcamGuard} />
                <div className="switch-track" /><div className="switch-thumb" />
              </label>
            </div>
            <div className="option-row">
              <div className="option-info">
                <span className="option-label">Clipboard Guard</span>
                <span className="option-desc">Brief activate on paste (10 sec)</span>
              </div>
              <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={clipboardGuard} onChange={handleClipboardGuard} />
                <div className="switch-track" /><div className="switch-thumb" />
              </label>
            </div>
            <div className="option-row" style={{ borderBottom: 'none' }}>
              <div className="option-info">
                <span className="option-label">Panic Sound</span>
                <span className="option-desc">Tone on activate / deactivate</span>
              </div>
              <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={soundEnabled} onChange={handleSound} />
                <div className="switch-track" /><div className="switch-thumb" />
              </label>
            </div>
          </div>

          <div className="divider" />

          {/* Profiles */}
          <div className="section">
            <div className="section-title">Quick Profiles</div>
            {PROFILES.map(name => (
              <div key={name} className="profile-row">
                <span className="profile-name">{name}</span>
                <div className="profile-actions">
                  <button className="profile-btn" onClick={() => handleLoadProfile(name)}>Load</button>
                  <button className="profile-btn" onClick={() => handleSaveProfile(name)}>Save</button>
                </div>
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Auto-activate + Import/Export */}
          <div className="section">
            <div className="section-title">Site & Data</div>
            <div className="option-row">
              <div className="option-info">
                <span className="option-label">Auto-Activate on This Site</span>
                <span className="option-desc">Remember Privacy Mode for this domain</span>
              </div>
              <label className="switch switch-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={autoActivate} onChange={handleAutoActivate} />
                <div className="switch-track" /><div className="switch-thumb" />
              </label>
            </div>
            <div className="import-export-row">
              <button className="ie-btn" onClick={handleExportSettings}>Export Settings</button>
              <label className="ie-btn ie-btn-import">
                Import Settings
                <input type="file" accept=".json" onChange={handleImportSettings} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
