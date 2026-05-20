(() => {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────────

  const state = {
    active: false,
    lensX: 0,
    lensY: 0,
    lensW: 300,
    lensH: 200,
    blurAmount: 20,
    locked: false,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    animFrame: null,
    pendingX: 0,
    pendingY: 0,
    dirty: false,
  };

  // ─── DOM Nodes ────────────────────────────────────────────────────────────────

  let root = null;
  let panelTop = null;
  let panelLeft = null;
  let panelRight = null;
  let panelBottom = null;
  let lensBorder = null;
  let clickBlocker = null;
  let dragOverlay = null;

  // ─── Build DOM ────────────────────────────────────────────────────────────────

  function buildDOM() {
    root = document.createElement('div');
    root.id = '__privacy-lens-root__';
    root.setAttribute('data-privacy-lens', 'true');

    const panelStyle = `
      position: fixed;
      z-index: 2147483640;
      pointer-events: all;
      background: rgba(10, 10, 15, 0.12);
      backdrop-filter: blur(${state.blurAmount}px) saturate(180%);
      -webkit-backdrop-filter: blur(${state.blurAmount}px) saturate(180%);
      transition: backdrop-filter 0.15s ease;
    `;

    panelTop    = el('div', panelStyle);
    panelLeft   = el('div', panelStyle);
    panelRight  = el('div', panelStyle);
    panelBottom = el('div', panelStyle);

    lensBorder = el('div', `
      position: fixed;
      z-index: 2147483641;
      pointer-events: none;
      border: 1px solid rgba(0, 209, 255, 0.6);
      border-radius: 2px;
      box-shadow:
        0 0 0 1px rgba(0, 209, 255, 0.15),
        0 0 12px 0 rgba(0, 209, 255, 0.25),
        inset 0 0 12px 0 rgba(0, 209, 255, 0.05);
      box-sizing: border-box;
    `);

    // Transparent overlay that blocks clicks outside the lens
    clickBlocker = el('div', `
      position: fixed;
      inset: 0;
      z-index: 2147483642;
      pointer-events: all;
      cursor: default;
    `);

    // Invisible overlay to capture Shift+Drag anywhere
    dragOverlay = el('div', `
      position: fixed;
      inset: 0;
      z-index: 2147483643;
      pointer-events: none;
      cursor: crosshair;
    `);

    [panelTop, panelLeft, panelRight, panelBottom, lensBorder, clickBlocker, dragOverlay]
      .forEach(n => root.appendChild(n));

    document.documentElement.appendChild(root);

    clickBlocker.addEventListener('click',      onBlockerClick,  true);
    clickBlocker.addEventListener('mousedown',  onBlockerMousedown, true);
    clickBlocker.addEventListener('wheel',      onBlockerWheel,  { capture: true, passive: false });
    clickBlocker.addEventListener('contextmenu', onBlockerContextMenu, true);
  }

  function el(tag, cssText) {
    const node = document.createElement(tag);
    node.style.cssText = cssText;
    return node;
  }

  // ─── Geometry ─────────────────────────────────────────────────────────────────

  function applyGeometry() {
    const { lensX, lensY, lensW, lensH } = state;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const lx = Math.max(0, Math.min(lensX, vw - lensW));
    const ly = Math.max(0, Math.min(lensY, vh - lensH));
    const lx2 = lx + lensW;
    const ly2 = ly + lensH;

    // Top panel
    setRect(panelTop,    0,   0,    vw,      ly);
    // Left panel
    setRect(panelLeft,   0,   ly,   lx,      lensH);
    // Right panel
    setRect(panelRight,  lx2, ly,   vw - lx2, lensH);
    // Bottom panel
    setRect(panelBottom, 0,   ly2,  vw,      vh - ly2);
    // Lens border
    setRect(lensBorder,  lx,  ly,   lensW,   lensH);
  }

  function setRect(node, x, y, w, h) {
    node.style.left   = `${x}px`;
    node.style.top    = `${y}px`;
    node.style.width  = `${Math.max(0, w)}px`;
    node.style.height = `${Math.max(0, h)}px`;
  }

  function isInLens(cx, cy) {
    const { lensX, lensY, lensW, lensH } = state;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const lx = Math.max(0, Math.min(lensX, vw - lensW));
    const ly = Math.max(0, Math.min(lensY, vh - lensH));
    return cx >= lx && cx <= lx + lensW && cy >= ly && cy <= ly + lensH;
  }

  // ─── Smooth Lens Tracking ─────────────────────────────────────────────────────

  const LERP_FACTOR = 0.18;

  function scheduleFrame() {
    if (state.animFrame !== null) return;
    state.animFrame = requestAnimationFrame(tick);
  }

  function tick() {
    state.animFrame = null;
    if (!state.active || state.locked) return;

    const dx = state.pendingX - state.lensX;
    const dy = state.pendingY - state.lensY;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      state.lensX += dx * LERP_FACTOR;
      state.lensY += dy * LERP_FACTOR;
      applyGeometry();
      scheduleFrame();
    } else {
      state.lensX = state.pendingX;
      state.lensY = state.pendingY;
      applyGeometry();
    }
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────────

  function onMouseMove(e) {
    if (!state.active || state.locked || state.dragging) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    state.pendingX = Math.max(0, Math.min(e.clientX - state.lensW / 2, vw - state.lensW));
    state.pendingY = Math.max(0, Math.min(e.clientY - state.lensH / 2, vh - state.lensH));
    scheduleFrame();
  }

  function onBlockerClick(e) {
    if (isInLens(e.clientX, e.clientY)) {
      // Pass click through to the page beneath
      clickBlocker.style.pointerEvents = 'none';
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target && target !== clickBlocker) {
        target.dispatchEvent(new MouseEvent('click', {
          bubbles: true, cancelable: true,
          clientX: e.clientX, clientY: e.clientY,
          screenX: e.screenX, screenY: e.screenY,
          button: e.button, buttons: e.buttons,
          ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
          altKey: e.altKey, metaKey: e.metaKey,
        }));
      }
      requestAnimationFrame(() => {
        if (state.active) clickBlocker.style.pointerEvents = 'all';
      });
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function onBlockerMousedown(e) {
    if (isInLens(e.clientX, e.clientY)) {
      clickBlocker.style.pointerEvents = 'none';
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target && target !== clickBlocker) {
        target.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true, cancelable: true,
          clientX: e.clientX, clientY: e.clientY,
          button: e.button, buttons: e.buttons,
        }));
      }
      requestAnimationFrame(() => {
        if (state.active) clickBlocker.style.pointerEvents = 'all';
      });
    }
    e.stopPropagation();
  }

  function onBlockerWheel(e) {
    if (isInLens(e.clientX, e.clientY)) {
      // Pass scroll through to the underlying element
      clickBlocker.style.pointerEvents = 'none';
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target) {
        target.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true, cancelable: true,
          deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          clientX: e.clientX, clientY: e.clientY,
        }));
      }
      requestAnimationFrame(() => {
        if (state.active) clickBlocker.style.pointerEvents = 'all';
      });
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function onBlockerContextMenu(e) {
    if (!isInLens(e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onWheel(e) {
    if (!state.active) return;
    if (!e.ctrlKey) return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? -20 : 20;
    state.lensW = Math.max(50, Math.min(state.lensW + delta, window.innerWidth));
    state.lensH = Math.max(30, Math.min(state.lensH + (delta * 0.6), window.innerHeight));

    // Re-center on cursor
    state.pendingX = Math.max(0, Math.min(
      e.clientX - state.lensW / 2, window.innerWidth - state.lensW
    ));
    state.pendingY = Math.max(0, Math.min(
      e.clientY - state.lensH / 2, window.innerHeight - state.lensH
    ));
    state.lensX = state.pendingX;
    state.lensY = state.pendingY;
    applyGeometry();
    persistSettings();
  }

  // Shift+Drag to draw a custom lens rectangle
  function onKeyDown(e) {
    if (e.key === 'Shift' && state.active) {
      dragOverlay.style.pointerEvents = 'all';
    }
  }

  function onKeyUp(e) {
    if (e.key === 'Shift') {
      dragOverlay.style.pointerEvents = 'none';
      state.dragging = false;
    }
    // Alt+X panic toggle
    if (e.key === 'x' && e.altKey) {
      toggle();
    }
  }

  function onDragMouseDown(e) {
    if (!e.shiftKey || !state.active) return;
    state.dragging    = true;
    state.dragStartX  = e.clientX;
    state.dragStartY  = e.clientY;
    state.lensX       = e.clientX;
    state.lensY       = e.clientY;
    state.lensW       = 1;
    state.lensH       = 1;
    applyGeometry();
    e.preventDefault();
  }

  function onDragMouseMove(e) {
    if (!state.dragging) return;
    const x1 = Math.min(e.clientX, state.dragStartX);
    const y1 = Math.min(e.clientY, state.dragStartY);
    const x2 = Math.max(e.clientX, state.dragStartX);
    const y2 = Math.max(e.clientY, state.dragStartY);
    state.lensX = x1;
    state.lensY = y1;
    state.lensW = Math.max(10, x2 - x1);
    state.lensH = Math.max(10, y2 - y1);
    applyGeometry();
  }

  function onDragMouseUp(e) {
    if (!state.dragging) return;
    state.dragging = false;
    state.locked   = true;
    dragOverlay.style.pointerEvents = 'none';
    persistSettings();
  }

  // ─── Activation ───────────────────────────────────────────────────────────────

  function activate(settings = {}) {
    if (state.active) return;
    state.active     = true;
    state.locked     = settings.locked      ?? false;
    state.blurAmount = settings.blurAmount  ?? 20;
    state.lensW      = settings.lensW       ?? 300;
    state.lensH      = settings.lensH       ?? 200;

    if (!root) buildDOM();

    root.style.display = 'block';
    updateBlur();

    // Center lens in viewport initially
    state.lensX = state.pendingX = (window.innerWidth  - state.lensW) / 2;
    state.lensY = state.pendingY = (window.innerHeight - state.lensH) / 2;
    applyGeometry();

    document.addEventListener('mousemove',  onMouseMove,     true);
    document.addEventListener('wheel',      onWheel,         { capture: true, passive: false });
    document.addEventListener('keydown',    onKeyDown,       true);
    document.addEventListener('keyup',      onKeyUp,         true);
    dragOverlay.addEventListener('mousedown', onDragMouseDown, true);
    document.addEventListener('mousemove',  onDragMouseMove, true);
    document.addEventListener('mouseup',    onDragMouseUp,   true);
  }

  function deactivate() {
    if (!state.active) return;
    state.active = false;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    state.animFrame = null;

    if (root) root.style.display = 'none';

    document.removeEventListener('mousemove',  onMouseMove,     true);
    document.removeEventListener('wheel',      onWheel,         { capture: true });
    document.removeEventListener('keydown',    onKeyDown,       true);
    document.removeEventListener('keyup',      onKeyUp,         true);
    if (dragOverlay) {
      dragOverlay.removeEventListener('mousedown', onDragMouseDown, true);
    }
    document.removeEventListener('mousemove',  onDragMouseMove, true);
    document.removeEventListener('mouseup',    onDragMouseUp,   true);
  }

  function toggle() {
    if (state.active) {
      deactivate();
    } else {
      loadSettings().then(s => activate(s));
    }
    // Notify popup so its UI stays in sync
    chrome.runtime.sendMessage({ type: 'STATE_CHANGED', active: state.active }).catch(() => {});
  }

  // ─── Blur Update ──────────────────────────────────────────────────────────────

  function updateBlur() {
    const filter = `blur(${state.blurAmount}px) saturate(180%)`;
    [panelTop, panelLeft, panelRight, panelBottom].forEach(p => {
      p.style.backdropFilter         = filter;
      p.style.webkitBackdropFilter   = filter;
    });
  }

  // ─── Persistence ──────────────────────────────────────────────────────────────

  function getHostKey() {
    return `site:${location.hostname}`;
  }

  function persistSettings() {
    const s = {
      lensW:       state.lensW,
      lensH:       state.lensH,
      blurAmount:  state.blurAmount,
      locked:      state.locked,
    };
    chrome.storage.local.set({ [getHostKey()]: s, globalSettings: s }).catch(() => {});
  }

  async function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get([getHostKey(), 'globalSettings'], result => {
        resolve(result[getHostKey()] || result.globalSettings || {});
      });
    });
  }

  // ─── Message Handling ─────────────────────────────────────────────────────────

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
        state.blurAmount = msg.value;
        if (state.active) updateBlur();
        persistSettings();
        sendResponse({});
        break;

      case 'SET_PRESET':
        applyPreset(msg.preset);
        sendResponse({ lensW: state.lensW, lensH: state.lensH });
        break;

      case 'SET_LOCK':
        state.locked = msg.locked;
        sendResponse({});
        break;

      case 'GET_STATE':
        sendResponse({
          active:      state.active,
          lensW:       state.lensW,
          lensH:       state.lensH,
          blurAmount:  state.blurAmount,
          locked:      state.locked,
        });
        break;
    }
    return true; // keep channel open for async
  });

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

  // ─── Auto-activate for remembered sites ──────────────────────────────────────

  chrome.storage.local.get([getHostKey()], result => {
    const siteData = result[getHostKey()];
    if (siteData?.autoActivate) {
      activate(siteData);
    }
  });

})();
