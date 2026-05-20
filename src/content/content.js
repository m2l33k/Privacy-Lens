(() => {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────────

  const state = {
    active: false,
    lensX: 0, lensY: 0, lensW: 300, lensH: 200,
    blurAmount:   20,
    locked:       false,
    shape:        'rect',
    effect:       'default',
    customColor:  '#00D1FF',
    soundEnabled: true,
    screenGuard:  false,
    hotkey:       { key: 'x', altKey: true, ctrlKey: false, shiftKey: false },
    scheduler:    null,
    scheduledActive: false,
    hudX: null, hudY: null,
    // runtime only
    dragging: false, dragStartX: 0, dragStartY: 0,
    animFrame: null, pendingX: 0, pendingY: 0,
    sessionStart: null, sessionEffect: null, sessionSite: null,
    cctvTimer: null, schedulerTimer: null,
    handleDrag: null, // { handleId, startX, startY, origX, origY, origW, origH }
  };

  // ─── DOM refs ─────────────────────────────────────────────────────────────────

  let root, overlayEl, borderEl, sparksEl,
      blockTop, blockLeft, blockRight, blockBottom,
      dragOverlayEl, hudEl, cctvEl, styleEl, customColorStyleEl;

  const handles = []; // 8 handle elements

  // ─── CSS ──────────────────────────────────────────────────────────────────────

  const BASE_CSS = `
    @keyframes __pl_fire__        { 0%  {box-shadow:0 0 10px #ff4500,0 0 28px #ff6b00,0 0 60px rgba(255,69,0,.5);border-color:#ff6b00} 25% {box-shadow:0 0 14px #ff8c00,0 0 36px #ffaa00,0 0 80px rgba(255,140,0,.55);border-color:#ffaa00} 50% {box-shadow:0 0 6px #ff4500,0 0 18px #ff4500,0 0 40px rgba(255,69,0,.4);border-color:#ff4500} 75% {box-shadow:0 0 12px #ff6b00,0 0 30px #ff8c00,0 0 65px rgba(255,107,0,.5);border-color:#ff8c00} 100%{box-shadow:0 0 10px #ff4500,0 0 28px #ff6b00,0 0 60px rgba(255,69,0,.5);border-color:#ff6b00} }
    @keyframes __pl_neon__        { 0%,100%{box-shadow:0 0 5px #39ff14,0 0 12px #39ff14,0 0 28px #39ff14;border-color:#39ff14} 50%{box-shadow:0 0 8px #bf00ff,0 0 18px #bf00ff,0 0 40px #bf00ff;border-color:#bf00ff} }
    @keyframes __pl_ice__         { 0%,100%{box-shadow:0 0 6px #00d4ff,0 0 14px #00bfff,0 0 30px #87ceeb;border-color:#87ceeb} 50%{box-shadow:0 0 12px #fff,0 0 26px #00d4ff,0 0 52px #00bfff;border-color:#fff} }
    @keyframes __pl_default_p__   { 0%,100%{box-shadow:0 0 0 1px rgba(0,209,255,.12),0 0 14px rgba(0,209,255,.3),inset 0 0 14px rgba(0,209,255,.07)} 50%{box-shadow:0 0 0 1px rgba(0,209,255,.22),0 0 22px rgba(0,209,255,.46),inset 0 0 18px rgba(0,209,255,.13)} }
    @keyframes __pl_spark__       { 0%{transform:translateY(0) scale(1);opacity:.95} 60%{opacity:.6} 100%{transform:translateY(-55px) translateX(var(--pl-sx,0px)) scale(.08);opacity:0} }
    @keyframes __pl_police__      { 0%,46%{box-shadow:0 0 10px #FF1744,0 0 28px #FF1744,0 0 65px rgba(255,23,68,.55);border-color:#FF1744} 47%,49%{box-shadow:none;border-color:transparent} 50%,96%{box-shadow:0 0 10px #2979FF,0 0 28px #2979FF,0 0 65px rgba(41,121,255,.55);border-color:#2979FF} 97%,99%{box-shadow:none;border-color:transparent} 100%{box-shadow:0 0 10px #FF1744,0 0 28px #FF1744,0 0 65px rgba(255,23,68,.55);border-color:#FF1744} }
    @keyframes __pl_police_bg__   { 0%,46%{background:rgba(140,0,20,.13)!important} 47%,49%{background:rgba(0,0,0,.28)!important} 50%,96%{background:rgba(10,35,160,.13)!important} 97%,99%{background:rgba(0,0,0,.28)!important} 100%{background:rgba(140,0,20,.13)!important} }
    @keyframes __pl_flashlight__  { 0%,100%{box-shadow:0 0 18px rgba(255,242,200,.55),0 0 40px rgba(255,228,160,.35),0 0 75px rgba(255,210,120,.18);border-color:rgba(255,242,200,.85)} 50%{box-shadow:0 0 24px rgba(255,248,220,.75),0 0 55px rgba(255,235,175,.5),0 0 95px rgba(255,215,130,.25);border-color:rgba(255,252,235,1)} }
    @keyframes __pl_matrix__      { 0%,100%{box-shadow:0 0 6px #00ff41,0 0 14px #00ff41,0 0 30px rgba(0,255,65,.5);border-color:#00ff41} 40%{box-shadow:0 0 3px #00ff41,0 0 8px #00cc33,0 0 18px rgba(0,255,65,.3);border-color:#00cc33} 70%{box-shadow:0 0 10px #00ff41,0 0 22px #39ff14,0 0 45px rgba(0,255,65,.6);border-color:#39ff14} }
    @keyframes __pl_rec_blink__   { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    @keyframes __pl_hud_pulse__   { 0%,100%{opacity:1} 50%{opacity:.65} }

    .__pl_border__ { position:fixed!important;box-sizing:border-box!important;pointer-events:none!important;z-index:2147483641!important;transition:border-radius .25s ease }
    .__pl_border__.pl-default    { border:1px solid rgba(0,209,255,.65)!important; animation:__pl_default_p__ 3s ease-in-out infinite!important }
    .__pl_border__.pl-fire       { border:1.5px solid #ff6b00!important; animation:__pl_fire__ .38s ease-in-out infinite!important }
    .__pl_border__.pl-neon       { border:1px solid #39ff14!important;   animation:__pl_neon__ 1.5s ease-in-out infinite!important }
    .__pl_border__.pl-ice        { border:1px solid #87ceeb!important;   animation:__pl_ice__ 2.2s ease-in-out infinite!important }
    .__pl_border__.pl-ghost      { border:1px solid rgba(255,255,255,.22)!important; box-shadow:none!important; animation:none!important }
    .__pl_border__.pl-police     { border:2px solid #FF1744!important;   animation:__pl_police__ .55s step-end infinite!important }
    .__pl_border__.pl-flashlight { border:1.5px solid rgba(255,242,200,.85)!important; animation:__pl_flashlight__ 2.5s ease-in-out infinite!important }
    .__pl_border__.pl-matrix     { border:1px solid #00ff41!important;   animation:__pl_matrix__ 1.2s ease-in-out infinite!important }
    .__pl_border__.pl-cctv       { border:1px dashed rgba(0,220,80,.7)!important; box-shadow:0 0 8px rgba(0,220,80,.25),inset 0 0 8px rgba(0,220,80,.05)!important; animation:none!important }

    .__pl_spark__ { position:absolute!important;border-radius:60% 60% 40% 40%!important;pointer-events:none!important;animation:__pl_spark__ var(--pl-sd,.7s) ease-out infinite!important;animation-delay:var(--pl-sdelay,0s)!important;bottom:-1px!important;left:var(--pl-sleft,50%)!important }
    .__pl_spark__:nth-child(odd) { width:3px!important;height:6px!important;background:linear-gradient(to top,#ff4500,#ffcc00)!important }
    .__pl_spark__:nth-child(even){ width:2px!important;height:4px!important;background:linear-gradient(to top,#ff6b00,#ff4500)!important }

    .__pl_overlay_police__ { animation:__pl_police_bg__ .55s step-end infinite!important }
    .__pl_overlay_matrix__::after { content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,65,.04) 3px,rgba(0,255,65,.04) 4px);pointer-events:none }
    .__pl_overlay_cctv__::after   { content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.14) 2px,rgba(0,0,0,.14) 3px);pointer-events:none }

    .__pl_handle__ { position:fixed!important;width:10px!important;height:10px!important;background:rgba(0,209,255,.88)!important;border:1px solid rgba(255,255,255,.65)!important;border-radius:2px!important;z-index:2147483645!important;pointer-events:all!important;box-shadow:0 0 6px rgba(0,209,255,.45)!important;transform:translate(-50%,-50%)!important;transition:background .15s,box-shadow .15s!important }
    .__pl_handle__:hover { background:rgba(0,209,255,1)!important;box-shadow:0 0 10px rgba(0,209,255,.8)!important }

    #__pl_cctv__ { position:fixed!important;top:16px!important;left:16px!important;z-index:2147483644!important;pointer-events:none!important;font-family:'Courier New',Courier,monospace!important;color:#ff3333!important;text-shadow:0 0 8px rgba(255,51,51,.65)!important;display:none!important;flex-direction:column!important;gap:3px!important }
    #__pl_cctv__.pl-cctv-on { display:flex!important }
    #__pl_cctv__ .pl-rec-row { display:flex!important;align-items:center!important;gap:5px!important;font-size:11px!important;font-weight:700!important;letter-spacing:.08em!important }
    #__pl_cctv__ .pl-rec-dot { width:8px!important;height:8px!important;border-radius:50%!important;background:#ff3333!important;box-shadow:0 0 6px #ff3333!important;animation:__pl_rec_blink__ 1s step-end infinite!important;flex-shrink:0!important }
    #__pl_cctv__ .pl-cctv-ts  { font-size:10px!important;opacity:.7!important;letter-spacing:.06em!important }
    #__pl_cctv__ .pl-cam-id   { font-size:9px!important;opacity:.5!important;letter-spacing:.04em!important }

    #__pl_hud__ { position:fixed!important;z-index:2147483647!important;background:rgba(12,12,18,.82)!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:20px!important;padding:4px 10px 4px 8px!important;display:flex!important;align-items:center!important;gap:6px!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif!important;font-size:10px!important;font-weight:500!important;letter-spacing:.04em!important;color:rgba(255,255,255,.7)!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important;user-select:none!important;cursor:move!important;pointer-events:all!important;white-space:nowrap!important;text-transform:uppercase!important;opacity:0!important;transition:opacity .35s!important }
    #__pl_hud__.pl-hud-visible { opacity:1!important }
    #__pl_hud__ .pl-hud-dot { width:7px!important;height:7px!important;border-radius:50%!important;flex-shrink:0!important }
  `;

  const EFFECT_META = {
    default:    { color: '#00D1FF', label: 'Cyan'   },
    fire:       { color: '#ff6b00', label: 'Fire'   },
    neon:       { color: '#39ff14', label: 'Neon'   },
    ice:        { color: '#87ceeb', label: 'Ice'    },
    ghost:      { color: 'rgba(255,255,255,.4)', label: 'Ghost' },
    police:     { color: null,      label: 'Police' },
    flashlight: { color: '#FFF5CC', label: 'Torch'  },
    matrix:     { color: '#00ff41', label: 'Matrix' },
    cctv:       { color: '#00dc50', label: 'CCTV'   },
  };

  // ─── Build DOM ────────────────────────────────────────────────────────────────

  function buildDOM() {
    styleEl = document.createElement('style');
    styleEl.id = '__pl_style__';
    styleEl.textContent = BASE_CSS;
    (document.head || document.documentElement).appendChild(styleEl);

    customColorStyleEl = document.createElement('style');
    customColorStyleEl.id = '__pl_color_style__';
    (document.head || document.documentElement).appendChild(customColorStyleEl);

    root = document.createElement('div');
    root.id = '__pl_root__';

    // ── Blur overlay ──
    overlayEl = mkDiv('', `position:fixed!important;inset:0!important;z-index:2147483638!important;background:rgba(8,8,14,.2)!important;pointer-events:none!important;`);
    overlayEl.id = '__pl_overlay__';
    overlayEl.style.setProperty('--lx', '0px');
    overlayEl.style.setProperty('--ly', '0px');
    overlayEl.style.setProperty('--lw', '300px');
    overlayEl.style.setProperty('--lh', '200px');

    // ── Lens border + sparks ──
    borderEl = mkDiv('__pl_border__ pl-default', '');
    sparksEl = mkDiv('', 'position:absolute;inset:0;overflow:visible;pointer-events:none;');
    [{ l:'8%',d:0,dur:.65,dx:-5},{ l:'20%',d:.18,dur:.80,dx:4},{ l:'33%',d:.07,dur:.55,dx:-3},
     { l:'46%',d:.28,dur:.90,dx:6},{ l:'59%',d:.12,dur:.70,dx:-4},{ l:'72%',d:.38,dur:.60,dx:3},
     { l:'85%',d:.22,dur:.75,dx:-6}].forEach(c => {
      const s = mkDiv('__pl_spark__','');
      s.style.setProperty('--pl-sleft', c.l);
      s.style.setProperty('--pl-sdelay', `${c.d}s`);
      s.style.setProperty('--pl-sd', `${c.dur}s`);
      s.style.setProperty('--pl-sx', `${c.dx}px`);
      sparksEl.appendChild(s);
    });
    sparksEl.style.display = 'none';
    borderEl.appendChild(sparksEl);

    // ── 8 resize handles ──
    // order: NW N NE E SE S SW W
    const CURSORS = ['nw-resize','n-resize','ne-resize','e-resize','se-resize','s-resize','sw-resize','w-resize'];
    CURSORS.forEach((cursor, i) => {
      const h = mkDiv('__pl_handle__', `cursor:${cursor}!important;`);
      h.dataset.hid = i;
      h.addEventListener('mousedown', onHandleMouseDown, true);
      handles.push(h);
      root.appendChild(h);
    });

    // ── 4 click-blocking panels ──
    const panelCss = 'position:fixed!important;z-index:2147483642!important;pointer-events:all!important;';
    blockTop    = mkDiv('', panelCss);
    blockLeft   = mkDiv('', panelCss);
    blockRight  = mkDiv('', panelCss);
    blockBottom = mkDiv('', panelCss);
    [blockTop,blockLeft,blockRight,blockBottom].forEach(b => {
      b.addEventListener('wheel',       e => e.preventDefault(), { passive:false });
      b.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); }, true);
      b.addEventListener('mousedown',   e => { e.preventDefault(); e.stopPropagation(); }, true);
      b.addEventListener('click',       e => { e.preventDefault(); e.stopPropagation(); }, true);
    });

    // ── Drag overlay (Shift+draw) ──
    dragOverlayEl = mkDiv('', 'position:fixed!important;inset:0!important;z-index:2147483643!important;pointer-events:none!important;cursor:crosshair!important;');
    dragOverlayEl.addEventListener('mousedown', onDragMouseDown, true);

    // ── CCTV overlay ──
    cctvEl = document.createElement('div');
    cctvEl.id = '__pl_cctv__';
    cctvEl.innerHTML = `
      <div class="pl-rec-row"><div class="pl-rec-dot"></div><span>● REC</span></div>
      <div class="pl-cctv-ts">00:00:00</div>
      <div class="pl-cam-id">CAM-01 · PRIVACY LENS</div>`;

    // ── Mini HUD ──
    hudEl = document.createElement('div');
    hudEl.id = '__pl_hud__';
    hudEl.innerHTML = '<span class="pl-hud-dot"></span><span class="pl-hud-text"></span>';
    initHUDDrag();

    [overlayEl, borderEl, blockTop, blockLeft, blockRight, blockBottom,
     dragOverlayEl, cctvEl, hudEl].forEach(n => root.appendChild(n));

    document.documentElement.appendChild(root);
    document.addEventListener('mousemove',  onDragMouseMove, true);
    document.addEventListener('mouseup',    onDragMouseUp,   true);
    document.addEventListener('mousemove',  onHandleMouseMove, true);
    document.addEventListener('mouseup',    onHandleMouseUp,   true);
  }

  function mkDiv(cls, css) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (css) d.style.cssText = css;
    return d;
  }

  // ─── CSS mask geometry ────────────────────────────────────────────────────────

  const RECT_MI  = Array(4).fill('linear-gradient(black,black)').join(',');
  const RECT_MS  = '100% var(--ly),100% calc(100vh - var(--ly) - var(--lh)),var(--lx) var(--lh),calc(100vw - var(--lx) - var(--lw)) var(--lh)';
  const RECT_MP  = '0 0,0 calc(var(--ly) + var(--lh)),0 var(--ly),calc(var(--lx) + var(--lw)) var(--ly)';
  const CIRCLE_M = 'radial-gradient(ellipse calc(var(--lw)/2) calc(var(--lh)/2) at calc(var(--lx) + var(--lw)/2) calc(var(--ly) + var(--lh)/2),transparent 98.5%,black 100%)';
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

    overlayEl.style.setProperty('--lx', `${lx}px`);
    overlayEl.style.setProperty('--ly', `${ly}px`);
    overlayEl.style.setProperty('--lw', `${lw}px`);
    overlayEl.style.setProperty('--lh', `${lh}px`);

    if (state.shape !== lastShape) {
      lastShape = state.shape;
      const isCircle = state.shape === 'circle';
      overlayEl.style.maskImage          = isCircle ? CIRCLE_M : RECT_MI;
      overlayEl.style.webkitMaskImage    = isCircle ? CIRCLE_M : RECT_MI;
      overlayEl.style.maskRepeat         = 'no-repeat';
      overlayEl.style.webkitMaskRepeat   = 'no-repeat';
      if (!isCircle) {
        overlayEl.style.maskSize           = RECT_MS;
        overlayEl.style.webkitMaskSize     = RECT_MS;
        overlayEl.style.maskPosition       = RECT_MP;
        overlayEl.style.webkitMaskPosition = RECT_MP;
        overlayEl.style.maskComposite      = 'add';
        overlayEl.style.webkitMaskComposite= 'source-over';
      } else {
        overlayEl.style.maskSize = 'cover';
        overlayEl.style.webkitMaskSize = 'cover';
      }
    }

    if (!['flashlight','police'].includes(state.effect)) {
      const f = state.effect === 'matrix'
        ? `blur(${state.blurAmount}px) saturate(220%) brightness(.6) hue-rotate(88deg)`
        : state.effect === 'cctv'
          ? `blur(${state.blurAmount}px) saturate(80%) brightness(.65) sepia(50%) hue-rotate(80deg)`
          : `blur(${state.blurAmount}px) saturate(160%) brightness(.88)`;
      overlayEl.style.backdropFilter       = f;
      overlayEl.style.webkitBackdropFilter = f;
    }

    // 4 click-blocking panels
    setRect(blockTop,    0,       0,       vw,          ly);
    setRect(blockLeft,   0,       ly,      lx,          lh);
    setRect(blockRight,  lx + lw, ly,      vw - lx - lw, lh);
    setRect(blockBottom, 0,       ly + lh, vw,          vh - ly - lh);

    // Lens border
    Object.assign(borderEl.style, {
      left: `${lx}px`, top: `${ly}px`,
      width: `${lw}px`, height: `${lh}px`,
      borderRadius: state.shape === 'circle' ? '50%' : '2px',
    });

    // 8 handles — positions: NW N NE E SE S SW W
    const hx = [lx, lx+lw/2, lx+lw, lx+lw, lx+lw, lx+lw/2, lx,    lx];
    const hy = [ly, ly,       ly,    ly+lh/2,ly+lh, ly+lh,   ly+lh, ly+lh/2];
    handles.forEach((h, i) => {
      h.style.left = `${hx[i]}px`;
      h.style.top  = `${hy[i]}px`;
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
      const dx = (cx - (lx+lw/2)) / (lw/2);
      const dy = (cy - (ly+lh/2)) / (lh/2);
      return dx*dx + dy*dy <= 1;
    }
    return cx >= lx && cx <= lx+lw && cy >= ly && cy <= ly+lh;
  }

  // ─── LERP tracking ────────────────────────────────────────────────────────────

  const LERP = 0.16;

  function tick() {
    state.animFrame = null;
    if (!state.active || state.locked || state.handleDrag) return;
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

  // ─── Mouse: tracking, Ctrl+scroll, Shift+drag ────────────────────────────────

  function onMouseMove(e) {
    if (!state.active || state.locked || state.dragging || state.handleDrag) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    state.pendingX = Math.max(0, Math.min(e.clientX - state.lensW/2, vw - state.lensW));
    state.pendingY = Math.max(0, Math.min(e.clientY - state.lensH/2, vh - state.lensH));
    scheduleFrame();
  }

  function onCtrlWheel(e) {
    if (!state.active || !e.ctrlKey) return;
    e.preventDefault();
    const d = e.deltaY > 0 ? -24 : 24;
    const vw = window.innerWidth, vh = window.innerHeight;
    state.lensW = Math.max(40, Math.min(state.lensW + d,      vw));
    state.lensH = Math.max(24, Math.min(state.lensH + d*.6,   vh));
    state.lensX = state.pendingX = Math.max(0, Math.min(e.clientX - state.lensW/2, vw - state.lensW));
    state.lensY = state.pendingY = Math.max(0, Math.min(e.clientY - state.lensH/2, vh - state.lensH));
    applyGeometry(); persistSettings();
  }

  function onKeyDown(e) {
    if (e.key === 'Shift' && state.active) dragOverlayEl.style.pointerEvents = 'all';
    const hk = state.hotkey;
    if (e.key.toLowerCase() === hk.key.toLowerCase() &&
        !!e.altKey   === hk.altKey &&
        !!e.ctrlKey  === hk.ctrlKey &&
        !!e.shiftKey === hk.shiftKey) {
      toggle();
    }
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

  // ─── Corner handles ───────────────────────────────────────────────────────────
  // Handle IDs: 0=NW 1=N 2=NE 3=E 4=SE 5=S 6=SW 7=W

  function onHandleMouseDown(e) {
    e.stopPropagation(); e.preventDefault();
    const hid = Number(e.currentTarget.dataset.hid);
    state.locked = true; // auto-lock when dragging a handle
    state.handleDrag = {
      hid,
      startX: e.clientX, startY: e.clientY,
      origX: state.lensX, origY: state.lensY,
      origW: state.lensW, origH: state.lensH,
    };
  }

  function onHandleMouseMove(e) {
    if (!state.handleDrag) return;
    const { hid, startX, startY, origX, origY, origW, origH } = state.handleDrag;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const MIN = 40;
    let lx = origX, ly = origY, lw = origW, lh = origH;

    // Apply deltas per handle
    if ([0,6,7].includes(hid)) { lx = origX + dx; lw = Math.max(MIN, origW - dx); if (lw === MIN) lx = origX + origW - MIN; } // W side
    if ([2,3,4].includes(hid)) { lw = Math.max(MIN, origW + dx); }  // E side
    if ([0,1,2].includes(hid)) { ly = origY + dy; lh = Math.max(MIN, origH - dy); if (lh === MIN) ly = origY + origH - MIN; } // N side
    if ([4,5,6].includes(hid)) { lh = Math.max(MIN, origH + dy); }  // S side

    state.lensX = state.pendingX = lx;
    state.lensY = state.pendingY = ly;
    state.lensW = lw; state.lensH = lh;
    applyGeometry();
  }

  function onHandleMouseUp() {
    if (!state.handleDrag) return;
    state.handleDrag = null;
    persistSettings();
  }

  // ─── Effects ──────────────────────────────────────────────────────────────────

  function applyEffect(effect) {
    state.effect = effect;
    if (!borderEl) return;

    borderEl.className = `__pl_border__ pl-${effect}`;
    sparksEl.style.display = effect === 'fire' ? 'block' : 'none';

    overlayEl.classList.remove('__pl_overlay_police__','__pl_overlay_matrix__','__pl_overlay_cctv__');
    if (cctvEl) cctvEl.classList.remove('pl-cctv-on');

    switch (effect) {
      case 'flashlight':
        overlayEl.style.backdropFilter       = 'none';
        overlayEl.style.webkitBackdropFilter = 'none';
        overlayEl.style.background           = 'rgba(0,0,0,.94)';
        break;
      case 'police':
        overlayEl.style.backdropFilter       = `blur(${state.blurAmount}px) saturate(160%) brightness(.5)`;
        overlayEl.style.webkitBackdropFilter = `blur(${state.blurAmount}px) saturate(160%) brightness(.5)`;
        overlayEl.style.background           = 'rgba(8,8,14,.2)';
        overlayEl.classList.add('__pl_overlay_police__');
        break;
      case 'matrix':
        overlayEl.style.background = 'rgba(0,8,0,.12)';
        overlayEl.classList.add('__pl_overlay_matrix__');
        break;
      case 'cctv':
        overlayEl.style.background = 'rgba(4,12,4,.15)';
        overlayEl.classList.add('__pl_overlay_cctv__');
        if (cctvEl) cctvEl.classList.add('pl-cctv-on');
        startCCTVClock();
        break;
      default:
        overlayEl.style.backdropFilter       = `blur(${state.blurAmount}px) saturate(160%) brightness(.88)`;
        overlayEl.style.webkitBackdropFilter = `blur(${state.blurAmount}px) saturate(160%) brightness(.88)`;
        overlayEl.style.background           = 'rgba(8,8,14,.2)';
    }

    if (effect !== 'cctv' && state.cctvTimer) {
      clearInterval(state.cctvTimer); state.cctvTimer = null;
    }

    applyCustomColor();
    updateHUD();
  }

  // ─── CCTV clock ───────────────────────────────────────────────────────────────

  function startCCTVClock() {
    if (state.cctvTimer) return;
    const ts = cctvEl?.querySelector('.pl-cctv-ts');
    const tick = () => {
      if (ts) ts.textContent = new Date().toLocaleTimeString('en-GB');
    };
    tick();
    state.cctvTimer = setInterval(tick, 1000);
  }

  // ─── Custom color ─────────────────────────────────────────────────────────────

  function applyCustomColor() {
    if (!customColorStyleEl) return;
    const c = state.customColor || '#00D1FF';
    const a = (hex, alpha) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    };
    // Override Default border color if current effect is default
    if (state.effect === 'default') {
      customColorStyleEl.textContent = `
        .__pl_border__.pl-default {
          border-color: ${c} !important;
          animation: none !important;
          box-shadow: 0 0 0 1px ${a(c,.12)}, 0 0 14px ${a(c,.32)}, inset 0 0 14px ${a(c,.08)} !important;
        }
        .__pl_handle__ {
          background: ${a(c,.88)} !important;
          box-shadow: 0 0 6px ${a(c,.5)} !important;
          border-color: rgba(255,255,255,.65) !important;
        }
      `;
    } else {
      customColorStyleEl.textContent = '';
    }
  }

  // ─── Panic sound (Web Audio API) ──────────────────────────────────────────────

  function playPanicSound(activating) {
    if (!state.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (activating) {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + .18);
        gain.gain.setValueAtTime(.28, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + .22);
      } else {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + .1);
        gain.gain.setValueAtTime(.2, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + .14);
      }
      osc.start(now); osc.stop(now + .25);
      osc.onended = () => ctx.close();
    } catch { /* AudioContext blocked */ }
  }

  // ─── Screen guard ─────────────────────────────────────────────────────────────

  function initScreenGuard() {
    document.addEventListener('visibilitychange', () => {
      if (!state.screenGuard) return;
      if (document.hidden && !state.active) {
        loadSettings().then(s => activate({ ...s, _screenGuard: true }));
      }
    });

    // Hook getDisplayMedia to detect screen sharing
    try {
      const orig = navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);
      if (orig) {
        navigator.mediaDevices.getDisplayMedia = async (...args) => {
          if (state.screenGuard && !state.active) {
            loadSettings().then(s => activate({ ...s, _screenGuard: true }));
          }
          return orig(...args);
        };
      }
    } catch { /* read-only in some contexts */ }
  }

  // ─── Scheduler ────────────────────────────────────────────────────────────────

  function checkScheduler() {
    const s = state.scheduler;
    if (!s?.enabled) return;
    const now  = new Date();
    const day  = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const startMins = s.startHour * 60 + (s.startMin || 0);
    const endMins   = s.endHour   * 60 + (s.endMin   || 0);
    const inSchedule = s.days.includes(day) && mins >= startMins && mins < endMins;

    if (inSchedule && !state.active) {
      state.scheduledActive = true;
      loadSettings().then(settings => activate(settings));
    } else if (!inSchedule && state.active && state.scheduledActive) {
      state.scheduledActive = false;
      deactivate();
    }
  }

  function startScheduler() {
    if (state.schedulerTimer) clearInterval(state.schedulerTimer);
    state.schedulerTimer = setInterval(checkScheduler, 60_000);
    checkScheduler();
  }

  // ─── Stats tracking ───────────────────────────────────────────────────────────

  function trackActivation() {
    state.sessionStart  = Date.now();
    state.sessionEffect = state.effect;
    state.sessionSite   = location.hostname;
  }

  function trackDeactivation() {
    if (!state.sessionStart) return;
    const minutes = Math.round((Date.now() - state.sessionStart) / 60_000);
    state.sessionStart = null;
    if (minutes < 1) return;
    const session = {
      site:    state.sessionSite,
      effect:  state.sessionEffect,
      date:    new Date().toISOString().slice(0, 10),
      minutes,
    };
    chrome.storage.local.get(['__pl_sessions__'], res => {
      const sessions = (res.__pl_sessions__ || []).slice(-199);
      sessions.push(session);
      chrome.storage.local.set({ __pl_sessions__: sessions }).catch(() => {});
    });
  }

  // ─── Mini HUD ─────────────────────────────────────────────────────────────────

  function updateHUD() {
    if (!hudEl) return;
    const meta = EFFECT_META[state.effect] || EFFECT_META.default;
    const dot  = hudEl.querySelector('.pl-hud-dot');
    const text = hudEl.querySelector('.pl-hud-text');
    if (dot) {
      dot.style.background = state.effect === 'police'
        ? 'linear-gradient(90deg,#FF1744 50%,#2979FF 50%)'
        : (state.effect === 'default' ? state.customColor : meta.color);
      dot.style.boxShadow = `0 0 5px ${meta.color || '#fff'}`;
    }
    if (text) text.textContent = `${meta.label} · ${state.shape === 'circle' ? '◯' : '▭'}`;
  }

  function showHUD() {
    if (!hudEl) return;
    if (state.hudX !== null) {
      hudEl.style.left = `${state.hudX}px`; hudEl.style.top  = `${state.hudY}px`;
      hudEl.style.right = 'auto';           hudEl.style.bottom = 'auto';
    } else {
      hudEl.style.right = '20px'; hudEl.style.bottom = '20px';
      hudEl.style.left  = 'auto'; hudEl.style.top    = 'auto';
    }
    updateHUD();
    requestAnimationFrame(() => hudEl.classList.add('pl-hud-visible'));
  }

  function hideHUD() { hudEl?.classList.remove('pl-hud-visible'); }

  function initHUDDrag() {
    let dragging = false, ox = 0, oy = 0;
    hudEl.addEventListener('mousedown', e => {
      dragging = true;
      const r = hudEl.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      e.preventDefault(); e.stopPropagation();
    }, true);
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(e.clientX - ox, window.innerWidth  - hudEl.offsetWidth));
      const y = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - hudEl.offsetHeight));
      hudEl.style.left = `${x}px`; hudEl.style.top  = `${y}px`;
      hudEl.style.right = 'auto';  hudEl.style.bottom = 'auto';
      state.hudX = x; state.hudY = y;
    }, true);
    document.addEventListener('mouseup', () => {
      if (dragging) { dragging = false; persistSettings(); }
    }, true);
  }

  // ─── Activate / Deactivate ────────────────────────────────────────────────────

  function activate(settings = {}) {
    if (!root) buildDOM();

    const was = state.active;
    state.active      = true;
    state.blurAmount  = settings.blurAmount  ?? state.blurAmount;
    state.lensW       = settings.lensW       ?? state.lensW;
    state.lensH       = settings.lensH       ?? state.lensH;
    state.locked      = settings.locked      ?? state.locked;
    state.shape       = settings.shape       ?? state.shape;
    state.effect      = settings.effect      ?? state.effect;
    state.customColor = settings.customColor  ?? state.customColor;
    state.soundEnabled= settings.soundEnabled ?? state.soundEnabled;
    state.screenGuard = settings.screenGuard  ?? state.screenGuard;
    state.hotkey      = settings.hotkey       ?? state.hotkey;
    state.scheduler   = settings.scheduler    ?? state.scheduler;
    state.hudX        = settings.hudX         ?? state.hudX;
    state.hudY        = settings.hudY         ?? state.hudY;

    if (!was) playPanicSound(true);

    lastShape = null;
    applyEffect(state.effect);
    root.style.display = 'block';
    showHUD();

    state.lensX = state.pendingX = Math.max(0, (window.innerWidth  - state.lensW) / 2);
    state.lensY = state.pendingY = Math.max(0, (window.innerHeight - state.lensH) / 2);
    applyGeometry();

    if (!was) trackActivation();

    document.addEventListener('mousemove', onMouseMove,  true);
    document.addEventListener('wheel',     onCtrlWheel,  { capture: true, passive: false });
    document.addEventListener('keydown',   onKeyDown,    true);
    document.addEventListener('keyup',     onKeyUp,      true);
  }

  function deactivate() {
    if (!state.active) return;
    state.active = false;
    if (state.animFrame)  { cancelAnimationFrame(state.animFrame); state.animFrame = null; }
    if (state.cctvTimer)  { clearInterval(state.cctvTimer); state.cctvTimer = null; }
    trackDeactivation();
    playPanicSound(false);
    hideHUD();
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
      customColor: state.customColor, soundEnabled: state.soundEnabled,
      screenGuard: state.screenGuard, hotkey: state.hotkey,
      scheduler: state.scheduler, hudX: state.hudX, hudY: state.hudY,
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
      case 'TOGGLE':    toggle();              sendResponse({ active: state.active }); break;
      case 'ACTIVATE':  activate(msg.settings||{}); sendResponse({ active: true }); break;
      case 'DEACTIVATE':deactivate();          sendResponse({ active: false }); break;
      case 'SET_BLUR':
        state.blurAmount = msg.value;
        if (state.active) applyGeometry();
        persistSettings(); sendResponse({ ok:true }); break;
      case 'SET_PRESET':  applyPreset(msg.preset); sendResponse({ lensW:state.lensW,lensH:state.lensH }); break;
      case 'SET_SHAPE':
        state.shape = msg.shape; lastShape = null;
        if (state.active) applyGeometry();
        persistSettings(); sendResponse({ ok:true }); break;
      case 'SET_EFFECT':  applyEffect(msg.effect); persistSettings(); sendResponse({ ok:true }); break;
      case 'SET_LOCK':    state.locked = msg.locked; sendResponse({ ok:true }); break;
      case 'SET_CUSTOM_COLOR':
        state.customColor = msg.color;
        applyCustomColor(); updateHUD(); persistSettings(); sendResponse({ ok:true }); break;
      case 'SET_SOUND':
        state.soundEnabled = msg.enabled; persistSettings(); sendResponse({ ok:true }); break;
      case 'SET_HOTKEY':
        state.hotkey = msg.hotkey; persistSettings(); sendResponse({ ok:true }); break;
      case 'SET_SCREEN_GUARD':
        state.screenGuard = msg.enabled; persistSettings(); sendResponse({ ok:true }); break;
      case 'SET_SCHEDULER':
        state.scheduler = msg.scheduler;
        startScheduler(); persistSettings(); sendResponse({ ok:true }); break;
      case 'GET_STATE':
        sendResponse({
          active: state.active, lensW: state.lensW, lensH: state.lensH,
          blurAmount: state.blurAmount, locked: state.locked,
          shape: state.shape, effect: state.effect,
          customColor: state.customColor, soundEnabled: state.soundEnabled,
          screenGuard: state.screenGuard, hotkey: state.hotkey,
          scheduler: state.scheduler,
        }); break;
    }
    return true;
  });

  // ─── Boot ─────────────────────────────────────────────────────────────────────

  chrome.storage.local.get([siteKey(), 'globalSettings'], res => {
    const s = res[siteKey()] || res.globalSettings || {};
    // Restore transient state fields that don't activate
    if (s.hotkey)      state.hotkey      = s.hotkey;
    if (s.soundEnabled !== undefined) state.soundEnabled = s.soundEnabled;
    if (s.screenGuard !== undefined)  state.screenGuard  = s.screenGuard;
    if (s.scheduler)   state.scheduler   = s.scheduler;
    if (s.customColor) state.customColor = s.customColor;

    if (s.autoActivate) activate(s);
    initScreenGuard();
    startScheduler();
  });

})();
