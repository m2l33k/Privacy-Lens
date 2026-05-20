(() => {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────────

  const state = {
    active:     false,
    lensX: 0, lensY: 0, lensW: 300, lensH: 200,
    blurAmount: 20,
    locked:     false,
    shape:      'rect',    // 'rect' | 'circle'
    effect:     'default', // 'default'|'fire'|'neon'|'ice'|'ghost'|'police'|'flashlight'|'matrix'
    dragging:   false,
    dragStartX: 0, dragStartY: 0,
    animFrame:  null,
    pendingX:   0, pendingY:   0,
    hudX:       null, hudY: null, // saved HUD position
  };

  // ─── DOM refs ─────────────────────────────────────────────────────────────────

  let root, overlayEl, borderEl, sparksEl,
      blockTop, blockLeft, blockRight, blockBottom,
      dragOverlayEl, hudEl, styleEl;

  // ─── Injected CSS ─────────────────────────────────────────────────────────────

  const INJECTED_CSS = `
    /* ── Animations ── */
    @keyframes __pl_fire__ {
      0%  { box-shadow:0 0 10px #ff4500,0 0 28px #ff6b00,0 0 60px rgba(255,69,0,.5),0 0 110px rgba(255,69,0,.2); border-color:#ff6b00; }
      25% { box-shadow:0 0 14px #ff8c00,0 0 36px #ffaa00,0 0 80px rgba(255,140,0,.55),0 0 140px rgba(255,140,0,.22); border-color:#ffaa00; }
      50% { box-shadow:0 0 6px  #ff4500,0 0 18px #ff4500,0 0 40px rgba(255,69,0,.4), 0 0 80px rgba(255,69,0,.18); border-color:#ff4500; }
      75% { box-shadow:0 0 12px #ff6b00,0 0 30px #ff8c00,0 0 65px rgba(255,107,0,.5),0 0 120px rgba(255,107,0,.2); border-color:#ff8c00; }
      100%{ box-shadow:0 0 10px #ff4500,0 0 28px #ff6b00,0 0 60px rgba(255,69,0,.5),0 0 110px rgba(255,69,0,.2); border-color:#ff6b00; }
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
    @keyframes __pl_default_pulse__ {
      0%,100%{ box-shadow:0 0 0 1px rgba(0,209,255,.12),0 0 14px rgba(0,209,255,.3),inset 0 0 14px rgba(0,209,255,.07); }
      50%    { box-shadow:0 0 0 1px rgba(0,209,255,.2), 0 0 22px rgba(0,209,255,.45),inset 0 0 18px rgba(0,209,255,.12); }
    }
    @keyframes __pl_spark__ {
      0%  { transform:translateY(0) translateX(0) scale(1); opacity:.95; }
      60% { opacity:.6; }
      100%{ transform:translateY(-55px) translateX(var(--pl-sx,0px)) scale(.08); opacity:0; }
    }
    @keyframes __pl_police__ {
      0%,46% { box-shadow:0 0 10px #FF1744,0 0 28px #FF1744,0 0 65px rgba(255,23,68,.55),0 0 110px rgba(255,23,68,.2); border-color:#FF1744; }
      47%,49%{ box-shadow:none; border-color:transparent; }
      50%,96%{ box-shadow:0 0 10px #2979FF,0 0 28px #2979FF,0 0 65px rgba(41,121,255,.55),0 0 110px rgba(41,121,255,.2); border-color:#2979FF; }
      97%,99%{ box-shadow:none; border-color:transparent; }
      100%   { box-shadow:0 0 10px #FF1744,0 0 28px #FF1744,0 0 65px rgba(255,23,68,.55),0 0 110px rgba(255,23,68,.2); border-color:#FF1744; }
    }
    @keyframes __pl_police_bg__ {
      0%,46% { background:rgba(140,0,20,.13) !important; }
      47%,49%{ background:rgba(0,0,0,.28) !important; }
      50%,96%{ background:rgba(10,35,160,.13) !important; }
      97%,99%{ background:rgba(0,0,0,.28) !important; }
      100%   { background:rgba(140,0,20,.13) !important; }
    }
    @keyframes __pl_flashlight__ {
      0%,100%{ box-shadow:0 0 18px rgba(255,242,200,.55),0 0 40px rgba(255,228,160,.35),0 0 75px rgba(255,210,120,.18); border-color:rgba(255,242,200,.85); }
      50%    { box-shadow:0 0 24px rgba(255,248,220,.75),0 0 55px rgba(255,235,175,.5), 0 0 95px rgba(255,215,130,.25); border-color:rgba(255,252,235,1); }
    }
    @keyframes __pl_matrix__ {
      0%  { box-shadow:0 0 6px #00ff41,0 0 14px #00ff41,0 0 30px rgba(0,255,65,.5),0 0 60px rgba(0,255,65,.2); border-color:#00ff41; }
      40% { box-shadow:0 0 3px #00ff41,0 0 8px #00cc33,0 0 18px rgba(0,255,65,.3),0 0 40px rgba(0,200,50,.15); border-color:#00cc33; }
      70% { box-shadow:0 0 10px #00ff41,0 0 22px #39ff14,0 0 45px rgba(0,255,65,.6),0 0 80px rgba(0,255,65,.25); border-color:#39ff14; }
      100%{ box-shadow:0 0 6px #00ff41,0 0 14px #00ff41,0 0 30px rgba(0,255,65,.5),0 0 60px rgba(0,255,65,.2); border-color:#00ff41; }
    }

    /* ── Border element ── */
    .__pl_border__ {
      position: fixed !important;
      box-sizing: border-box !important;
      pointer-events: none !important;
      z-index: 2147483641 !important;
      transition: border-radius .25s ease;
    }
    .__pl_border__.pl-default    { border:1px solid rgba(0,209,255,.65) !important; animation:__pl_default_pulse__ 3s ease-in-out infinite !important; }
    .__pl_border__.pl-fire       { border:1.5px solid #ff6b00 !important; animation:__pl_fire__ .38s ease-in-out infinite !important; }
    .__pl_border__.pl-neon       { border:1px solid #39ff14 !important;   animation:__pl_neon__ 1.5s ease-in-out infinite !important; }
    .__pl_border__.pl-ice        { border:1px solid #87ceeb !important;   animation:__pl_ice__ 2.2s ease-in-out infinite !important; }
    .__pl_border__.pl-ghost      { border:1px solid rgba(255,255,255,.22) !important; box-shadow:none !important; animation:none !important; }
    .__pl_border__.pl-police     { border:2px solid #FF1744 !important;   animation:__pl_police__ .55s step-end infinite !important; }
    .__pl_border__.pl-flashlight { border:1.5px solid rgba(255,242,200,.85) !important; animation:__pl_flashlight__ 2.5s ease-in-out infinite !important; }
    .__pl_border__.pl-matrix     { border:1px solid #00ff41 !important;   animation:__pl_matrix__ 1.2s ease-in-out infinite !important; }

    /* ── Fire sparks ── */
    .__pl_spark__ {
      position:absolute !important; border-radius:60% 60% 40% 40% !important; pointer-events:none !important;
      animation:__pl_spark__ var(--pl-sd,.7s) ease-out infinite !important;
      animation-delay:var(--pl-sdelay,0s) !important;
      bottom:-1px !important; left:var(--pl-sleft,50%) !important;
    }
    .__pl_spark__:nth-child(odd) { width:3px !important; height:6px !important; background:linear-gradient(to top,#ff4500,#ffcc00) !important; }
    .__pl_spark__:nth-child(even){ width:2px !important; height:4px !important; background:linear-gradient(to top,#ff6b00,#ff4500) !important; }

    /* ── Police overlay pulse ── */
    .__pl_overlay_police__ { animation:__pl_police_bg__ .55s step-end infinite !important; }

    /* ── Matrix scanlines on overlay ── */
    .__pl_overlay_matrix__::after {
      content:'';
      position:absolute;
      inset:0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 3px,
        rgba(0,255,65,.04) 3px,
        rgba(0,255,65,.04) 4px
      );
      pointer-events:none;
    }

    /* ── Mini HUD ── */
    #__pl_hud__ {
      position: fixed !important;
      z-index: 2147483647 !important;
      background: rgba(12,12,18,.82) !important;
      border: 1px solid rgba(255,255,255,.1) !important;
      border-radius: 20px !important;
      padding: 4px 10px 4px 8px !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
      font-size: 10px !important;
      font-weight: 500 !important;
      letter-spacing: .04em !important;
      color: rgba(255,255,255,.7) !important;
      backdrop-filter: blur(14px) !important;
      -webkit-backdrop-filter: blur(14px) !important;
      user-select: none !important;
      cursor: move !important;
      pointer-events: all !important;
      white-space: nowrap !important;
      text-transform: uppercase !important;
      opacity: 0 !important;
      transition: opacity .35s !important;
    }
    #__pl_hud__.pl-hud-visible { opacity: 1 !important; }
    #__pl_hud__ .pl-hud-dot {
      width: 7px !important; height: 7px !important;
      border-radius: 50% !important; flex-shrink: 0 !important;
    }
    #__pl_hud__ .pl-hud-sep {
      opacity: .35 !important; font-size: 9px !important;
    }
  `;

  // ─── Effect metadata (color + display name for HUD) ──────────────────────────

  const EFFECT_META = {
    default:    { color: '#00D1FF', label: 'Cyan' },
    fire:       { color: '#ff6b00', label: 'Fire' },
    neon:       { color: '#39ff14', label: 'Neon' },
    ice:        { color: '#87ceeb', label: 'Ice'  },
    ghost:      { color: 'rgba(255,255,255,.4)', label: 'Ghost' },
    police:     { color: null,      label: 'Police' }, // special: split dot
    flashlight: { color: '#FFF5CC', label: 'Torch' },
    matrix:     { color: '#00ff41', label: 'Matrix' },
  };

  // ─── Build DOM ────────────────────────────────────────────────────────────────

  function buildDOM() {
    styleEl = document.createElement('style');
    styleEl.id = '__pl_style__';
    styleEl.textContent = INJECTED_CSS;
    (document.head || document.documentElement).appendChild(styleEl);

    root = document.createElement('div');
    root.id = '__pl_root__';
    root.setAttribute('data-privacy-lens', 'true');

    // ── Blur overlay (single div, CSS mask punches the lens hole) ──
    overlayEl = document.createElement('div');
    overlayEl.id = '__pl_overlay__';
    overlayEl.style.cssText = `
      position:fixed !important; inset:0 !important;
      z-index:2147483638 !important;
      background:rgba(8,8,14,.2) !important;
      pointer-events:none !important;
    `;
    overlayEl.style.setProperty('--lx', '0px');
    overlayEl.style.setProperty('--ly', '0px');
    overlayEl.style.setProperty('--lw', '300px');
    overlayEl.style.setProperty('--lh', '200px');

    // ── Lens border ──
    borderEl = document.createElement('div');
    borderEl.className = '__pl_border__ pl-default';

    // ── Fire sparks ──
    sparksEl = document.createElement('div');
    sparksEl.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;';
    const SPARK_CFG = [
      { left:'8%',  delay:0,   dur:.65, dx:-5 }, { left:'20%', delay:.18, dur:.80, dx: 4 },
      { left:'33%', delay:.07, dur:.55, dx:-3 }, { left:'46%', delay:.28, dur:.90, dx: 6 },
      { left:'59%', delay:.12, dur:.70, dx:-4 }, { left:'72%', delay:.38, dur:.60, dx: 3 },
      { left:'85%', delay:.22, dur:.75, dx:-6 },
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

    // ── 4 click-blocking panels (no blur, just pointer-event capture) ──
    // The lens center is uncovered → clicks reach the page NATIVELY, no synthetic events.
    const panelBase = `position:fixed !important; z-index:2147483642 !important; pointer-events:all !important;`;
    blockTop    = panel(panelBase);
    blockLeft   = panel(panelBase);
    blockRight  = panel(panelBase);
    blockBottom = panel(panelBase);

    [blockTop, blockLeft, blockRight, blockBottom].forEach(b => {
      b.addEventListener('wheel',       e => e.preventDefault(), { passive: false });
      b.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); }, true);
      b.addEventListener('mousedown',   e => { e.preventDefault(); e.stopPropagation(); }, true);
      b.addEventListener('click',       e => { e.preventDefault(); e.stopPropagation(); }, true);
    });

    // ── Drag capture overlay (Shift+Drag) ──
    dragOverlayEl = document.createElement('div');
    dragOverlayEl.style.cssText = `
      position:fixed !important; inset:0 !important;
      z-index:2147483643 !important;
      pointer-events:none !important; cursor:crosshair !important;
    `;
    dragOverlayEl.addEventListener('mousedown', onDragMouseDown, true);
    document.addEventListener('mousemove',      onDragMouseMove, true);
    document.addEventListener('mouseup',        onDragMouseUp,   true);

    // ── Mini HUD ──
    hudEl = document.createElement('div');
    hudEl.id = '__pl_hud__';
    hudEl.innerHTML = '<span class="pl-hud-dot"></span><span class="pl-hud-text"></span>';
    initHUDDrag();

    [overlayEl, borderEl, blockTop, blockLeft, blockRight, blockBottom, dragOverlayEl, hudEl]
      .forEach(n => root.appendChild(n));

    document.documentElement.appendChild(root);
  }

  function panel(css) {
    const d = document.createElement('div');
    d.style.cssText = css;
    return d;
  }

  // ─── Geometry ─────────────────────────────────────────────────────────────────

  const RECT_MASK_IMAGE = Array(4).fill('linear-gradient(black,black)').join(',');
  const RECT_MASK_SIZE  =
    '100% var(--ly),' +
    '100% calc(100vh - var(--ly) - var(--lh)),' +
    'var(--lx) var(--lh),' +
    'calc(100vw - var(--lx) - var(--lw)) var(--lh)';
  const RECT_MASK_POS   =
    '0 0,' +
    '0 calc(var(--ly) + var(--lh)),' +
    '0 var(--ly),' +
    'calc(var(--lx) + var(--lw)) var(--ly)';
  const CIRCLE_MASK     =
    'radial-gradient(ellipse calc(var(--lw)/2) calc(var(--lh)/2) ' +
    'at calc(var(--lx) + var(--lw)/2) calc(var(--ly) + var(--lh)/2),' +
    'transparent 98.5%,black 100%)';

  let lastShape = null;

  function clampedLens() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const lx = Math.round(Math.max(0, Math.min(state.lensX, vw - state.lensW)));
    const ly = Math.round(Math.max(0, Math.min(state.lensY, vh - state.lensH)));
    return { lx, ly, lw: state.lensW, lh: state.lensH };
  }

  function applyGeometry() {
    const { lx, ly, lw, lh } = clampedLens();
    const vw = window.innerWidth, vh = window.innerHeight;

    // CSS custom props → blur mask updates automatically
    overlayEl.style.setProperty('--lx', `${lx}px`);
    overlayEl.style.setProperty('--ly', `${ly}px`);
    overlayEl.style.setProperty('--lw', `${lw}px`);
    overlayEl.style.setProperty('--lh', `${lh}px`);

    // Swap mask-image only when shape changes
    if (state.shape !== lastShape) {
      lastShape = state.shape;
      const isCircle = state.shape === 'circle';
      overlayEl.style.maskImage          = isCircle ? CIRCLE_MASK : RECT_MASK_IMAGE;
      overlayEl.style.webkitMaskImage    = isCircle ? CIRCLE_MASK : RECT_MASK_IMAGE;
      overlayEl.style.maskRepeat         = 'no-repeat';
      overlayEl.style.webkitMaskRepeat   = 'no-repeat';
      if (!isCircle) {
        overlayEl.style.maskSize           = RECT_MASK_SIZE;
        overlayEl.style.webkitMaskSize     = RECT_MASK_SIZE;
        overlayEl.style.maskPosition       = RECT_MASK_POS;
        overlayEl.style.webkitMaskPosition = RECT_MASK_POS;
        overlayEl.style.maskComposite      = 'add';
        overlayEl.style.webkitMaskComposite= 'source-over';
      } else {
        overlayEl.style.maskSize           = 'cover';
        overlayEl.style.webkitMaskSize     = 'cover';
      }
    }

    // Blur filter (skipped for effect-owned overlays)
    if (state.effect !== 'flashlight' && state.effect !== 'police') {
      const base = `blur(${state.blurAmount}px) saturate(160%) brightness(.88)`;
      const filter = state.effect === 'matrix'
        ? `blur(${state.blurAmount}px) saturate(220%) brightness(.6) hue-rotate(88deg)`
        : base;
      overlayEl.style.backdropFilter       = filter;
      overlayEl.style.webkitBackdropFilter = filter;
    }

    // 4 click-blocking panels around the lens
    setRect(blockTop,    0,       0,        vw,           ly);
    setRect(blockLeft,   0,       ly,       lx,           lh);
    setRect(blockRight,  lx + lw, ly,       vw - lx - lw, lh);
    setRect(blockBottom, 0,       ly + lh,  vw,           vh - ly - lh);

    // Lens border
    Object.assign(borderEl.style, {
      left:         `${lx}px`, top:    `${ly}px`,
      width:        `${lw}px`, height: `${lh}px`,
      borderRadius: state.shape === 'circle' ? '50%' : '2px',
    });
  }

  function setRect(el, x, y, w, h) {
    el.style.left   = `${x}px`;
    el.style.top    = `${y}px`;
    el.style.width  = `${Math.max(0, w)}px`;
    el.style.height = `${Math.max(0, h)}px`;
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

  // ─── LERP tracking ────────────────────────────────────────────────────────────

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
    if (state.animFrame === null) state.animFrame = requestAnimationFrame(tick);
  }

  // ─── Mouse events ─────────────────────────────────────────────────────────────

  function onMouseMove(e) {
    if (!state.active || state.locked || state.dragging) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    state.pendingX = Math.max(0, Math.min(e.clientX - state.lensW / 2, vw - state.lensW));
    state.pendingY = Math.max(0, Math.min(e.clientY - state.lensH / 2, vh - state.lensH));
    scheduleFrame();
  }

  function onCtrlWheel(e) {
    if (!state.active || !e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -24 : 24;
    const vw = window.innerWidth, vh = window.innerHeight;
    state.lensW = Math.max(40,  Math.min(state.lensW + delta,       vw));
    state.lensH = Math.max(24,  Math.min(state.lensH + delta * .6,  vh));
    state.lensX = state.pendingX = Math.max(0, Math.min(e.clientX - state.lensW / 2, vw - state.lensW));
    state.lensY = state.pendingY = Math.max(0, Math.min(e.clientY - state.lensH / 2, vh - state.lensH));
    applyGeometry();
    persistSettings();
  }

  function onKeyDown(e) {
    if (e.key === 'Shift' && state.active) dragOverlayEl.style.pointerEvents = 'all';
    if (e.key === 'x' && e.altKey) toggle();
  }
  function onKeyUp(e) {
    if (e.key === 'Shift') { dragOverlayEl.style.pointerEvents = 'none'; state.dragging = false; }
  }

  function onDragMouseDown(e) {
    if (!e.shiftKey || !state.active) return;
    state.dragging = true;
    state.dragStartX = e.clientX; state.dragStartY = e.clientY;
    state.lensX = state.pendingX = e.clientX;
    state.lensY = state.pendingY = e.clientY;
    state.lensW = 2; state.lensH = 2;
    applyGeometry(); e.preventDefault();
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
    state.dragging = false; state.locked = true;
    dragOverlayEl.style.pointerEvents = 'none';
    persistSettings();
  }

  // ─── Effects ──────────────────────────────────────────────────────────────────

  function applyEffect(effect) {
    state.effect = effect;
    if (!borderEl) return;

    borderEl.className = `__pl_border__ pl-${effect}`;
    sparksEl.style.display = effect === 'fire' ? 'block' : 'none';

    // Overlay style per effect
    overlayEl.classList.remove('__pl_overlay_police__', '__pl_overlay_matrix__');
    overlayEl.style.position = 'fixed'; // force repaint hint

    if (effect === 'flashlight') {
      overlayEl.style.backdropFilter       = 'none';
      overlayEl.style.webkitBackdropFilter = 'none';
      overlayEl.style.background           = 'rgba(0,0,0,.94)';
    } else if (effect === 'police') {
      const f = `blur(${state.blurAmount}px) saturate(160%) brightness(.5)`;
      overlayEl.style.backdropFilter       = f;
      overlayEl.style.webkitBackdropFilter = f;
      overlayEl.style.background           = 'rgba(8,8,14,.2)';
      overlayEl.classList.add('__pl_overlay_police__');
    } else if (effect === 'matrix') {
      overlayEl.style.background = 'rgba(0,8,0,.12)';
      overlayEl.classList.add('__pl_overlay_matrix__');
      // backdrop-filter with hue-rotate set in applyGeometry
    } else {
      const f = `blur(${state.blurAmount}px) saturate(160%) brightness(.88)`;
      overlayEl.style.backdropFilter       = f;
      overlayEl.style.webkitBackdropFilter = f;
      overlayEl.style.background           = 'rgba(8,8,14,.2)';
    }

    updateHUD();
  }

  function setShape(shape) {
    state.shape = shape;
    lastShape   = null;
    if (state.active) applyGeometry();
    persistSettings();
  }

  function setBlur(amount) {
    state.blurAmount = amount;
    if (state.active) applyGeometry();
  }

  // ─── Mini HUD ─────────────────────────────────────────────────────────────────

  function updateHUD() {
    if (!hudEl) return;
    const meta = EFFECT_META[state.effect] || EFFECT_META.default;
    const dot  = hudEl.querySelector('.pl-hud-dot');
    const text = hudEl.querySelector('.pl-hud-text');
    if (dot) {
      if (state.effect === 'police') {
        dot.style.background = 'linear-gradient(90deg,#FF1744 50%,#2979FF 50%)';
      } else {
        dot.style.background = meta.color;
        dot.style.boxShadow  = `0 0 5px ${meta.color}`;
      }
    }
    if (text) {
      const shapeLabel = state.shape === 'circle' ? '◯' : '▭';
      text.textContent = `${meta.label} · ${shapeLabel}`;
    }
  }

  function showHUD() {
    if (!hudEl) return;
    // Restore saved position
    if (state.hudX !== null) {
      hudEl.style.left   = `${state.hudX}px`;
      hudEl.style.top    = `${state.hudY}px`;
      hudEl.style.right  = 'auto';
      hudEl.style.bottom = 'auto';
    } else {
      hudEl.style.right  = '20px';
      hudEl.style.bottom = '20px';
      hudEl.style.left   = 'auto';
      hudEl.style.top    = 'auto';
    }
    updateHUD();
    requestAnimationFrame(() => hudEl.classList.add('pl-hud-visible'));
  }

  function hideHUD() {
    if (hudEl) hudEl.classList.remove('pl-hud-visible');
  }

  function initHUDDrag() {
    let dragging = false, ox = 0, oy = 0;

    hudEl.addEventListener('mousedown', e => {
      dragging = true;
      const rect = hudEl.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(e.clientX - ox, window.innerWidth  - hudEl.offsetWidth));
      const y = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - hudEl.offsetHeight));
      hudEl.style.left   = `${x}px`;
      hudEl.style.top    = `${y}px`;
      hudEl.style.right  = 'auto';
      hudEl.style.bottom = 'auto';
      state.hudX = x; state.hudY = y;
    }, true);

    document.addEventListener('mouseup', () => {
      if (dragging) { dragging = false; persistSettings(); }
    }, true);
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
    state.hudX       = settings.hudX       ?? state.hudX;
    state.hudY       = settings.hudY       ?? state.hudY;

    lastShape = null;
    applyEffect(state.effect);
    root.style.display = 'block';
    showHUD();

    state.lensX = state.pendingX = Math.max(0, (window.innerWidth  - state.lensW) / 2);
    state.lensY = state.pendingY = Math.max(0, (window.innerHeight - state.lensH) / 2);
    applyGeometry();

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('wheel',     onCtrlWheel, { capture: true, passive: false });
    document.addEventListener('keydown',   onKeyDown,   true);
    document.addEventListener('keyup',     onKeyUp,     true);
  }

  function deactivate() {
    state.active = false;
    if (state.animFrame) { cancelAnimationFrame(state.animFrame); state.animFrame = null; }
    hideHUD();
    if (root) root.style.display = 'none';

    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('wheel',     onCtrlWheel, { capture: true });
    document.removeEventListener('keydown',   onKeyDown,   true);
    document.removeEventListener('keyup',     onKeyUp,     true);
  }

  function toggle() {
    if (state.active) {
      deactivate();
    } else {
      loadSettings().then(s => activate(s));
    }
    chrome.runtime.sendMessage({ type: 'STATE_CHANGED', active: state.active }).catch(() => {});
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
    state.lensW = p.w; state.lensH = p.h;
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
      hudX: state.hudX,  hudY:  state.hudY,
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

  // ─── Message bus ──────────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'TOGGLE':
        toggle(); sendResponse({ active: state.active }); break;
      case 'ACTIVATE':
        activate(msg.settings || {}); sendResponse({ active: true }); break;
      case 'DEACTIVATE':
        deactivate(); sendResponse({ active: false }); break;
      case 'SET_BLUR':
        setBlur(msg.value); persistSettings(); sendResponse({ ok: true }); break;
      case 'SET_PRESET':
        applyPreset(msg.preset); sendResponse({ lensW: state.lensW, lensH: state.lensH }); break;
      case 'SET_SHAPE':
        setShape(msg.shape); sendResponse({ ok: true }); break;
      case 'SET_EFFECT':
        applyEffect(msg.effect); persistSettings(); sendResponse({ ok: true }); break;
      case 'SET_LOCK':
        state.locked = msg.locked; sendResponse({ ok: true }); break;
      case 'GET_STATE':
        sendResponse({
          active: state.active, lensW: state.lensW, lensH: state.lensH,
          blurAmount: state.blurAmount, locked: state.locked,
          shape: state.shape, effect: state.effect,
        }); break;
    }
    return true;
  });

  // ─── Auto-activate ────────────────────────────────────────────────────────────

  chrome.storage.local.get([siteKey()], res => {
    const s = res[siteKey()];
    if (s?.autoActivate) activate(s);
  });

})();
