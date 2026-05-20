(() => {
  'use strict';

  // Rect mask: 4 opaque gradient panels leave the lens area transparent.
  // Circle mask: radial-gradient with transparent centre.
  // Both use CSS custom properties so only 4 setProperty() calls per frame.

  // ─── State ────────────────────────────────────────────────────────────────────

  const state = {
    active:     false,
    lensX:      0,
    lensY:      0,
    lensW:      300,
    lensH:      200,
    blurAmount: 20,
    locked:     false,
    shape:      'rect',    // 'rect' | 'circle'
    effect:     'default', // 'default' | 'fire' | 'neon' | 'ice' | 'ghost'
    dragging:   false,
    dragStartX: 0,
    dragStartY: 0,
    animFrame:  null,
    pendingX:   0,
    pendingY:   0,
  };

  // ─── DOM Refs ─────────────────────────────────────────────────────────────────

  let root, overlayEl, borderEl, sparksEl, clickBlockerEl, dragOverlayEl, styleEl;

  // ─── Effect CSS ───────────────────────────────────────────────────────────────

  const EFFECTS_CSS = `
    @keyframes __pl_fire__ {
      0%  { box-shadow: 0 0 6px #ff4500,0 0 14px #ff6b00,0 0 32px #ff4500,0 0 64px rgba(255,69,0,.3); border-color:#ff6b00; }
      25% { box-shadow: 0 0 10px #ff8c00,0 0 24px #ffaa00,0 0 50px #ff6b00,0 0 90px rgba(255,140,0,.35); border-color:#ffaa00; }
      50% { box-shadow: 0 0 4px #ff4500,0 0 10px #ff4500,0 0 24px #ff8c00,0 0 50px rgba(255,69,0,.25); border-color:#ff4500; }
      75% { box-shadow: 0 0 8px #ff6b00,0 0 18px #ff8c00,0 0 40px #ffaa00,0 0 80px rgba(255,107,0,.3); border-color:#ff8c00; }
      100%{ box-shadow: 0 0 6px #ff4500,0 0 14px #ff6b00,0 0 32px #ff4500,0 0 64px rgba(255,69,0,.3); border-color:#ff6b00; }
    }
    @keyframes __pl_neon__ {
      0%  { box-shadow:0 0 5px #39ff14,0 0 12px #39ff14,0 0 28px #39ff14,0 0 56px rgba(57,255,20,.4); border-color:#39ff14; }
      50% { box-shadow:0 0 8px #bf00ff,0 0 18px #bf00ff,0 0 40px #bf00ff,0 0 80px rgba(191,0,255,.45); border-color:#bf00ff; }
      100%{ box-shadow:0 0 5px #39ff14,0 0 12px #39ff14,0 0 28px #39ff14,0 0 56px rgba(57,255,20,.4); border-color:#39ff14; }
    }
    @keyframes __pl_ice__ {
      0%  { box-shadow:0 0 6px #00d4ff,0 0 14px #00bfff,0 0 30px #87ceeb,0 0 60px rgba(0,212,255,.3); border-color:#87ceeb; }
      50% { box-shadow:0 0 12px #fff,0 0 26px #00d4ff,0 0 52px #00bfff,0 0 90px rgba(135,206,235,.4); border-color:#fff; }
      100%{ box-shadow:0 0 6px #00d4ff,0 0 14px #00bfff,0 0 30px #87ceeb,0 0 60px rgba(0,212,255,.3); border-color:#87ceeb; }
    }
    @keyframes __pl_spark__ {
      0%   { transform:translateY(0) translateX(0) scale(1); opacity:.95; }
      60%  { opacity:.6; }
      100% { transform:translateY(-55px) translateX(var(--pl-sx,0px)) scale(.08); opacity:0; }
    }
    @keyframes __pl_default_pulse__ {
      0%,100%{ box-shadow:0 0 0 1px rgba(0,209,255,.12),0 0 14px rgba(0,209,255,.3),inset 0 0 14px rgba(0,209,255,.07); }
      50%    { box-shadow:0 0 0 1px rgba(0,209,255,.2), 0 0 22px rgba(0,209,255,.45),inset 0 0 18px rgba(0,209,255,.12); }
    }
    .__pl_border__ {
      position: fixed !important;
      box-sizing: border-box !important;
      pointer-events: none !important;
      z-index: 2147483641 !important;
      transition: border-radius .25s ease;
    }
    .__pl_border__.pl-default {
      border: 1px solid rgba(0,209,255,.65) !important;
      animation: __pl_default_pulse__ 3s ease-in-out infinite !important;
    }
    .__pl_border__.pl-fire {
      border: 1.5px solid #ff6b00 !important;
      animation: __pl_fire__ .38s ease-in-out infinite !important;
    }
    .__pl_border__.pl-neon {
      border: 1px solid #39ff14 !important;
      animation: __pl_neon__ 1.5s ease-in-out infinite !important;
    }
    .__pl_border__.pl-ice {
      border: 1px solid #87ceeb !important;
      animation: __pl_ice__ 2.2s ease-in-out infinite !important;
    }
    .__pl_border__.pl-ghost {
      border: 1px solid rgba(255,255,255,.22) !important;
      box-shadow: none !important;
      animation: none !important;
    }
    .__pl_spark__ {
      position: absolute !important;
      border-radius: 60% 60% 40% 40% !important;
      pointer-events: none !important;
      animation: __pl_spark__ var(--pl-sd,.7s) ease-out infinite !important;
      animation-delay: var(--pl-sdelay,0s) !important;
      bottom: -1px !important;
      left: var(--pl-sleft,50%) !important;
    }
    .__pl_spark__:nth-child(odd)  { width:3px!important;height:6px!important;background:linear-gradient(to top,#ff4500,#ffcc00)!important; }
    .__pl_spark__:nth-child(even) { width:2px!important;height:4px!important;background:linear-gradient(to top,#ff6b00,#ff4500)!important; }
  `;

  // ─── Build DOM ────────────────────────────────────────────────────────────────

  function buildDOM() {
    styleEl = document.createElement('style');
    styleEl.id = '__pl_style__';
    styleEl.textContent = EFFECTS_CSS;
    (document.head || document.documentElement).appendChild(styleEl);

    root = document.createElement('div');
    root.id = '__pl_root__';
    root.setAttribute('data-privacy-lens', 'true');

    // ── Single full-screen blur overlay ──
    // CSS mask-image punches a transparent hole where the lens is.
    // For rect: 4 opaque linear-gradient panels (union via mask-composite:add).
    // For circle: 1 radial-gradient with transparent centre.
    // Only --lx/--ly/--lw/--lh custom props update each frame — no string rebuild.
    overlayEl = document.createElement('div');
    overlayEl.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483638 !important;
      background: rgba(8,8,14,.2) !important;
      pointer-events: none !important;
    `;
    // CSS custom props will be set by applyGeometry()
    overlayEl.style.setProperty('--lx', '0px');
    overlayEl.style.setProperty('--ly', '0px');
    overlayEl.style.setProperty('--lw', '300px');
    overlayEl.style.setProperty('--lh', '200px');

    // ── Lens border ──
    borderEl = document.createElement('div');
    borderEl.className = '__pl_border__ pl-default';

    // ── Fire sparks (visible only with fire effect) ──
    sparksEl = document.createElement('div');
    sparksEl.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;';

    const SPARK_CFG = [
      { left: '8%',  delay: 0,    dur: .65, dx: -5 },
      { left: '20%', delay: .18,  dur: .80, dx:  4 },
      { left: '33%', delay: .07,  dur: .55, dx: -3 },
      { left: '46%', delay: .28,  dur: .90, dx:  6 },
      { left: '59%', delay: .12,  dur: .70, dx: -4 },
      { left: '72%', delay: .38,  dur: .60, dx:  3 },
      { left: '85%', delay: .22,  dur: .75, dx: -6 },
    ];
    SPARK_CFG.forEach(cfg => {
      const s = document.createElement('div');
      s.className = '__pl_spark__';
      s.style.setProperty('--pl-sleft',  cfg.left);
      s.style.setProperty('--pl-sdelay', `${cfg.delay}s`);
      s.style.setProperty('--pl-sd',     `${cfg.dur}s`);
      s.style.setProperty('--pl-sx',     `${cfg.dx}px`);
      sparksEl.appendChild(s);
    });
    sparksEl.style.display = 'none';
    borderEl.appendChild(sparksEl);

    // ── Click blocker (captures all pointer events outside the lens) ──
    clickBlockerEl = document.createElement('div');
    clickBlockerEl.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483642 !important;
      pointer-events: all !important;
    `;

    // ── Drag overlay (activated while Shift is held) ──
    dragOverlayEl = document.createElement('div');
    dragOverlayEl.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483643 !important;
      pointer-events: none !important;
      cursor: crosshair !important;
    `;

    [overlayEl, borderEl, clickBlockerEl, dragOverlayEl].forEach(n => root.appendChild(n));
    document.documentElement.appendChild(root);

    // Blocker events
    clickBlockerEl.addEventListener('click',       onBlockerClick,       true);
    clickBlockerEl.addEventListener('mousedown',   onBlockerMousedown,   true);
    clickBlockerEl.addEventListener('mouseup',     onBlockerMouseup,     true);
    clickBlockerEl.addEventListener('wheel',       onBlockerWheel,       { capture: true, passive: false });
    clickBlockerEl.addEventListener('contextmenu', onBlockerContextMenu, true);

    // Drag events
    dragOverlayEl.addEventListener('mousedown', onDragMouseDown, true);
    document.addEventListener('mousemove',      onDragMouseMove, true);
    document.addEventListener('mouseup',        onDragMouseUp,   true);
  }

  // ─── Geometry ─────────────────────────────────────────────────────────────────

  function clampedLens() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const lx = Math.round(Math.max(0, Math.min(state.lensX, vw - state.lensW)));
    const ly = Math.round(Math.max(0, Math.min(state.lensY, vh - state.lensH)));
    return { lx, ly, lw: state.lensW, lh: state.lensH };
  }

  // Rect mask strings — static, reference CSS custom props on the overlay element.
  const RECT_MASK_IMAGE = [
    'linear-gradient(black,black)',
    'linear-gradient(black,black)',
    'linear-gradient(black,black)',
    'linear-gradient(black,black)',
  ].join(',');

  const RECT_MASK_SIZE =
    '100% var(--ly),' +
    '100% calc(100vh - var(--ly) - var(--lh)),' +
    'var(--lx) var(--lh),' +
    'calc(100vw - var(--lx) - var(--lw)) var(--lh)';

  const RECT_MASK_POS =
    '0 0,' +
    '0 calc(var(--ly) + var(--lh)),' +
    '0 var(--ly),' +
    'calc(var(--lx) + var(--lw)) var(--ly)';

  const CIRCLE_MASK_IMAGE =
    'radial-gradient(' +
      'ellipse calc(var(--lw) / 2) calc(var(--lh) / 2) ' +
      'at calc(var(--lx) + var(--lw) / 2) calc(var(--ly) + var(--lh) / 2),' +
      'transparent 98.5%, black 100%)';

  let lastShape = null;

  function applyGeometry() {
    const { lx, ly, lw, lh } = clampedLens();

    // Update the 4 CSS custom properties — only cheap setProperty calls each frame
    overlayEl.style.setProperty('--lx', `${lx}px`);
    overlayEl.style.setProperty('--ly', `${ly}px`);
    overlayEl.style.setProperty('--lw', `${lw}px`);
    overlayEl.style.setProperty('--lh', `${lh}px`);

    // Swap mask style only when shape changes (not every frame)
    if (state.shape !== lastShape) {
      lastShape = state.shape;
      if (state.shape === 'circle') {
        overlayEl.style.maskImage         = CIRCLE_MASK_IMAGE;
        overlayEl.style.webkitMaskImage   = CIRCLE_MASK_IMAGE;
        overlayEl.style.maskSize          = 'cover';
        overlayEl.style.webkitMaskSize    = 'cover';
        overlayEl.style.maskPosition      = '0 0';
        overlayEl.style.webkitMaskPosition= '0 0';
        overlayEl.style.maskRepeat        = 'no-repeat';
        overlayEl.style.webkitMaskRepeat  = 'no-repeat';
      } else {
        overlayEl.style.maskImage          = RECT_MASK_IMAGE;
        overlayEl.style.webkitMaskImage    = RECT_MASK_IMAGE;
        overlayEl.style.maskSize           = RECT_MASK_SIZE;
        overlayEl.style.webkitMaskSize     = RECT_MASK_SIZE;
        overlayEl.style.maskPosition       = RECT_MASK_POS;
        overlayEl.style.webkitMaskPosition = RECT_MASK_POS;
        overlayEl.style.maskRepeat         = 'no-repeat';
        overlayEl.style.webkitMaskRepeat   = 'no-repeat';
        overlayEl.style.maskComposite      = 'add';
        overlayEl.style.webkitMaskComposite= 'source-over';
      }
    }

    // Update blur filter
    const blurFilter = `blur(${state.blurAmount}px) saturate(160%) brightness(.88)`;
    overlayEl.style.backdropFilter       = blurFilter;
    overlayEl.style.webkitBackdropFilter = blurFilter;

    // Update lens border
    Object.assign(borderEl.style, {
      left:         `${lx}px`,
      top:          `${ly}px`,
      width:        `${lw}px`,
      height:       `${lh}px`,
      borderRadius: state.shape === 'circle' ? '50%' : '2px',
    });
  }

  function isInLens(cx, cy) {
    const { lx, ly, lw, lh } = clampedLens();
    if (state.shape === 'circle') {
      const dx = (cx - (lx + lw / 2)) / (lw / 2);
      const dy = (cy - (ly + lh / 2)) / (lh / 2);
      return dx * dx + dy * dy <= 1;
    }
    return cx >= lx && cx <= lx + lw && cy >= ly && cy <= ly + lh;
  }

  // ─── Smooth Tracking (LERP) ───────────────────────────────────────────────────

  const LERP = 0.16;

  function tick() {
    state.animFrame = null;
    if (!state.active || state.locked) return;
    const dx = state.pendingX - state.lensX;
    const dy = state.pendingY - state.lensY;
    if (Math.abs(dx) > .4 || Math.abs(dy) > .4) {
      state.lensX += dx * LERP;
      state.lensY += dy * LERP;
      applyGeometry();
      state.animFrame = requestAnimationFrame(tick);
    } else {
      state.lensX = state.pendingX;
      state.lensY = state.pendingY;
      applyGeometry();
    }
  }

  function scheduleFrame() {
    if (state.animFrame === null) {
      state.animFrame = requestAnimationFrame(tick);
    }
  }

  // ─── Mouse Events ─────────────────────────────────────────────────────────────

  function onMouseMove(e) {
    if (!state.active || state.locked || state.dragging) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    state.pendingX = Math.max(0, Math.min(e.clientX - state.lensW / 2, vw - state.lensW));
    state.pendingY = Math.max(0, Math.min(e.clientY - state.lensH / 2, vh - state.lensH));
    scheduleFrame();
  }

  // ─── Passthrough helpers ──────────────────────────────────────────────────────

  function passthroughEvent(e, type, extra = {}) {
    // Synchronously hide blocker, find real target, restore
    clickBlockerEl.style.pointerEvents = 'none';
    const target = document.elementFromPoint(e.clientX, e.clientY);
    clickBlockerEl.style.pointerEvents = 'all';
    if (!target || root.contains(target)) return;
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, view: window,
      clientX: e.clientX, clientY: e.clientY,
      screenX: e.screenX, screenY: e.screenY,
      button: e.button, buttons: e.buttons,
      ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
      altKey: e.altKey, metaKey: e.metaKey,
      ...extra,
    }));
  }

  function onBlockerClick(e) {
    if (isInLens(e.clientX, e.clientY)) {
      passthroughEvent(e, 'click');
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function onBlockerMousedown(e) {
    if (isInLens(e.clientX, e.clientY)) {
      passthroughEvent(e, 'mousedown');
    } else {
      e.preventDefault();
    }
    e.stopPropagation();
  }

  function onBlockerMouseup(e) {
    if (isInLens(e.clientX, e.clientY)) {
      passthroughEvent(e, 'mouseup');
    }
    e.stopPropagation();
  }

  function onBlockerWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isInLens(e.clientX, e.clientY)) return;
    // Pass scroll through to the element under the cursor
    clickBlockerEl.style.pointerEvents = 'none';
    const target = document.elementFromPoint(e.clientX, e.clientY);
    clickBlockerEl.style.pointerEvents = 'all';
    if (target && !root.contains(target)) {
      target.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true, cancelable: true,
        deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ,
        deltaMode: e.deltaMode,
        clientX: e.clientX, clientY: e.clientY,
      }));
    }
  }

  function onBlockerContextMenu(e) {
    if (!isInLens(e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ─── Resize via Ctrl+Scroll ───────────────────────────────────────────────────

  function onCtrlWheel(e) {
    if (!state.active || !e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -24 : 24;
    state.lensW = Math.max(40,  Math.min(state.lensW + delta,          window.innerWidth));
    state.lensH = Math.max(24,  Math.min(state.lensH + delta * .6,     window.innerHeight));
    // Re-center on cursor
    const vw = window.innerWidth, vh = window.innerHeight;
    state.lensX = state.pendingX = Math.max(0, Math.min(e.clientX - state.lensW / 2, vw - state.lensW));
    state.lensY = state.pendingY = Math.max(0, Math.min(e.clientY - state.lensH / 2, vh - state.lensH));
    applyGeometry();
    persistSettings();
  }

  // ─── Shift+Drag to draw custom rectangle ─────────────────────────────────────

  function onKeyDown(e) {
    if (e.key === 'Shift' && state.active) {
      dragOverlayEl.style.pointerEvents = 'all';
    }
    if (e.key === 'x' && e.altKey) toggle();
  }

  function onKeyUp(e) {
    if (e.key === 'Shift') {
      dragOverlayEl.style.pointerEvents = 'none';
      state.dragging = false;
    }
  }

  function onDragMouseDown(e) {
    if (!e.shiftKey || !state.active) return;
    state.dragging   = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.lensX = state.pendingX = e.clientX;
    state.lensY = state.pendingY = e.clientY;
    state.lensW = 2;
    state.lensH = 2;
    applyGeometry();
    e.preventDefault();
  }

  function onDragMouseMove(e) {
    if (!state.dragging) return;
    state.lensX = state.pendingX = Math.min(e.clientX, state.dragStartX);
    state.lensY = state.pendingY = Math.min(e.clientY, state.dragStartY);
    state.lensW = Math.max(10, Math.abs(e.clientX - state.dragStartX));
    state.lensH = Math.max(10, Math.abs(e.clientY - state.dragStartY));
    applyGeometry();
  }

  function onDragMouseUp() {
    if (!state.dragging) return;
    state.dragging = false;
    state.locked   = true;
    dragOverlayEl.style.pointerEvents = 'none';
    persistSettings();
  }

  // ─── Activate / Deactivate ────────────────────────────────────────────────────

  function activate(settings = {}) {
    if (!root) buildDOM();

    state.active     = true;
    state.blurAmount = settings.blurAmount ?? state.blurAmount;
    state.lensW      = settings.lensW      ?? state.lensW;
    state.lensH      = settings.lensH      ?? state.lensH;
    state.locked     = settings.locked     ?? state.locked;
    state.shape      = settings.shape      ?? state.shape;
    state.effect     = settings.effect     ?? state.effect;

    lastShape = null; // force mask-image swap on first applyGeometry
    applyEffect(state.effect);

    root.style.display = 'block';

    // Center lens initially
    state.lensX = state.pendingX = Math.max(0, (window.innerWidth  - state.lensW) / 2);
    state.lensY = state.pendingY = Math.max(0, (window.innerHeight - state.lensH) / 2);
    applyGeometry();

    document.addEventListener('mousemove', onMouseMove,  true);
    document.addEventListener('wheel',     onCtrlWheel,  { capture: true, passive: false });
    document.addEventListener('keydown',   onKeyDown,    true);
    document.addEventListener('keyup',     onKeyUp,      true);
  }

  function deactivate() {
    state.active = false;
    if (state.animFrame) { cancelAnimationFrame(state.animFrame); state.animFrame = null; }
    if (root) root.style.display = 'none';

    document.removeEventListener('mousemove', onMouseMove,  true);
    document.removeEventListener('wheel',     onCtrlWheel,  { capture: true });
    document.removeEventListener('keydown',   onKeyDown,    true);
    document.removeEventListener('keyup',     onKeyUp,      true);
  }

  function toggle() {
    if (state.active) {
      deactivate();
    } else {
      loadSettings().then(s => activate(s));
    }
    chrome.runtime.sendMessage({ type: 'STATE_CHANGED', active: state.active }).catch(() => {});
  }

  // ─── Shape ────────────────────────────────────────────────────────────────────

  function setShape(shape) {
    state.shape = shape;
    lastShape = null; // force mask-image swap on next applyGeometry
    if (state.active) applyGeometry();
    persistSettings();
  }

  // ─── Effects ──────────────────────────────────────────────────────────────────

  function applyEffect(effect) {
    state.effect = effect;
    if (!borderEl) return;
    borderEl.className = `__pl_border__ pl-${effect}`;
    // Sparks only for fire
    if (sparksEl) sparksEl.style.display = effect === 'fire' ? 'block' : 'none';
  }

  // ─── Blur ─────────────────────────────────────────────────────────────────────

  function setBlur(amount) {
    state.blurAmount = amount;
    if (state.active) applyGeometry();
  }

  // ─── Presets ──────────────────────────────────────────────────────────────────

  const PRESETS = {
    micro:       { w: 60,  h: 60  },
    textLine:    { w: 420, h: 32  },
    socialSquare:{ w: 320, h: 320 },
    wide:        { w: 700, h: 400 },
  };

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    state.lensW = p.w;
    state.lensH = p.h;
    if (state.active) {
      state.lensX = state.pendingX = Math.max(0, (window.innerWidth  - p.w) / 2);
      state.lensY = state.pendingY = Math.max(0, (window.innerHeight - p.h) / 2);
      applyGeometry();
    }
    persistSettings();
  }

  // ─── Persistence ──────────────────────────────────────────────────────────────

  function siteKey() { return `site:${location.hostname}`; }

  function persistSettings() {
    const s = {
      lensW: state.lensW, lensH: state.lensH,
      blurAmount: state.blurAmount, locked: state.locked,
      shape: state.shape, effect: state.effect,
    };
    chrome.storage.local.set({ [siteKey()]: s, globalSettings: s }).catch(() => {});
  }

  function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get([siteKey(), 'globalSettings'], res => {
        resolve(res[siteKey()] || res.globalSettings || {});
      });
    });
  }

  // ─── Message Bus ──────────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'TOGGLE':
        toggle();
        sendResponse({ active: state.active });
        break;
      case 'ACTIVATE':
        activate(msg.settings || {});
        sendResponse({ active: true });
        break;
      case 'DEACTIVATE':
        deactivate();
        sendResponse({ active: false });
        break;
      case 'SET_BLUR':
        setBlur(msg.value);
        persistSettings();
        sendResponse({ ok: true });
        break;
      case 'SET_PRESET':
        applyPreset(msg.preset);
        sendResponse({ lensW: state.lensW, lensH: state.lensH });
        break;
      case 'SET_SHAPE':
        setShape(msg.shape);
        sendResponse({ ok: true });
        break;
      case 'SET_EFFECT':
        applyEffect(msg.effect);
        persistSettings();
        sendResponse({ ok: true });
        break;
      case 'SET_LOCK':
        state.locked = msg.locked;
        sendResponse({ ok: true });
        break;
      case 'GET_STATE':
        sendResponse({
          active: state.active, lensW: state.lensW, lensH: state.lensH,
          blurAmount: state.blurAmount, locked: state.locked,
          shape: state.shape, effect: state.effect,
        });
        break;
    }
    return true;
  });

  // ─── Auto-activate ────────────────────────────────────────────────────────────

  chrome.storage.local.get([siteKey()], res => {
    const s = res[siteKey()];
    if (s?.autoActivate) activate(s);
  });

})();
