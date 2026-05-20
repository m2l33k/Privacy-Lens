# Privacy Lens

> A dynamic privacy shield for Chrome — work on sensitive content in public without exposing your screen.

Activating **Privacy Mode** blurs the entire browser tab with a glassmorphism frosted-glass overlay. A clear **Lens** follows your cursor, revealing only what you choose to look at. Everything outside the Lens stays blurred. Panic-toggle it instantly with a hotkey when someone walks behind you.

---

## Install (Developer Mode)

1. `npm install && npm run build`
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `dist/` folder
5. Privacy Lens icon appears in your toolbar

---

## Features

### Lens

| Feature | Description |
|---|---|
| **9 visual effects** | Cyan, Fire, Neon, Ice, Ghost, Police, Torch, Matrix, CCTV |
| **2 lens shapes** | Rectangle, Circle |
| **4 size presets** | Micro 60×60, Text 420×32, Social 320×320, Wide 700×400 |
| **Free resize** | 8 corner/edge drag handles on the lens border |
| **Blur intensity** | Adjustable 4px–40px slider |
| **LERP tracking** | Smooth 60fps cursor follow (factor 0.16) |
| **Shift + Drag** | Draw a custom lens area with the mouse |
| **Ctrl + Scroll** | Resize the lens without opening the popup |
| **Lock Lens** | Freeze the lens in place, stops following cursor |

### Effects

| Effect | Style |
|---|---|
| **Cyan** | Default cyan glow, customizable color via color picker |
| **Fire** | Animated orange flame glow + spark particles |
| **Neon** | Pulsing green/purple neon border |
| **Ice** | Cool blue crystalline shimmer |
| **Ghost** | Subtle translucent white border |
| **Police** | Alternating red/blue strobe light |
| **Torch** | Warm flashlight — darkens everything, lens is the light source |
| **Matrix** | Green scanlines + digital rain tint |
| **CCTV** | Surveillance-style scanlines + blinking REC dot + live timestamp |

### Security & Automation

| Feature | Description |
|---|---|
| **Screen Guard** | Auto-activates when tab is hidden or screen sharing starts |
| **Work Hours Scheduler** | Auto-activate on configurable days + time range |
| **Auto-Activate per Site** | Remembers Privacy Mode is on for a domain |
| **Panic Hotkey** | Remappable keyboard shortcut (default `Alt+X`) |
| **Panic Sound** | Web Audio API tone on activate/deactivate (toggleable) |

### Stats

- **Weekly stats page** — opens in a new tab from the popup header
- Session tracking: today, this week, all-time minutes + session count
- Daily bar chart (last 7 days)
- Effect usage breakdown with color-coded bars
- Top sites ranked by time protected

---

## Popup — 3-Tab Layout

### Lens tab
Privacy Mode toggle → Shape selector → Size presets → Effect picker → Blur slider → Lock option → Hotkey reference

### Schedule tab
Enable/disable work hours auto-activation, pick active days (Mon–Sun), set start and end time.

### Settings tab
- **Lens Color** — color picker to customize the Cyan effect accent
- **Panic Hotkey** — click Change, press any key combo to remap
- **Panic Sound** — toggle the activation tone
- **Screen Guard** — auto-activate on screen share / tab hide
- **Auto-Activate** — remember Privacy Mode for the current domain

---

## Hotkeys

| Shortcut | Action |
|---|---|
| `Alt + X` | Panic toggle (remappable in Settings) |
| `Ctrl + Scroll` | Resize lens |
| `Shift + Drag` | Draw custom lens area |

---

## Development

```bash
npm install
npm run dev        # watch mode (webpack --watch)
npm run build      # production build → dist/
```

When reloading changes, go to `chrome://extensions` and click the **refresh icon** on the Privacy Lens card. You do not need to re-add the extension — just reload it.

---

## Architecture

```
src/
├── content/
│   └── content.js        Vanilla JS — blur overlay, lens geometry, LERP tracking,
│                         8 resize handles, all effects, CCTV, scheduler, stats tracking
├── popup/
│   ├── index.jsx          React 18 entry
│   ├── App.jsx            3-tab popup UI (Lens / Schedule / Settings)
│   └── styles.css         Dark glassmorphism design system
├── stats/
│   ├── stats.html         Standalone stats page
│   ├── index.jsx          React 18 entry
│   ├── App.jsx            Session charts and summaries
│   └── stats.css          Stats page styles
└── background/
    └── background.js      MV3 service worker — message relay
```

**Blur rendering** uses `backdrop-filter: blur()` + CSS `mask-image` with multiple `linear-gradient` layers (rect) or `radial-gradient` (circle) and CSS custom properties (`--lx`, `--ly`, `--lw`, `--lh`) updated every animation frame. SVG masks were tested and abandoned due to CSP/compositing issues in Chrome extensions.

**Click passthrough** is achieved by four transparent blocking panels surrounding the lens area, with no overlay element over the lens center itself — clicks reach the page natively.

**Persistence** via `chrome.storage.local` — settings are saved per-hostname and as `globalSettings` fallback.

**Stats** are stored as a `__pl_sessions__` array (max 200 entries) with `{ site, effect, date, minutes }` per session.
