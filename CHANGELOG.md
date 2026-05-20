# Changelog

All notable changes to Privacy Lens are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-05-20

### Added

#### Lens
- 6 lens shapes: Rect, Circle, Spotlight, Hexagon, Diamond, Star
- Spotlight mode — soft radial vignette with no hard edge or border
- Polygon shapes (Hexagon, Diamond, Star) via `clip-path: path(evenodd, ...)`
- Overlay darkness slider — controls how opaque the blurred area is
- Border thickness slider — 1–6px, hairline to bold frame
- Film grain toggle — animated SVG turbulence noise on the blur area
- 8 resize handles on the lens border for free resizing
- `Shift + Drag` to draw a custom lens area
- `Ctrl + Scroll` to resize the lens without opening the popup

#### Effects
- 9 visual effects: Cyan, Fire, Neon, Ice, Ghost, Police, Torch, Matrix, CCTV
- CCTV effect — scanlines, blinking REC indicator, live timestamp
- Custom color picker for the Cyan effect accent

#### Interaction
- Middle-click to lock / unlock the lens
- Right-click context menu "Toggle Privacy Lens" on any page
- Timer mode — auto-deactivate after N minutes with HUD countdown
- Idle detection — auto-activate after cursor inactivity for N seconds
- LERP-smoothed 60fps cursor tracking (factor 0.16)
- Lock Lens option — freezes the lens in place

#### Security & Automation
- Screen Guard — auto-activates on screen share or tab hide
- Webcam Guard — auto-activates when camera or microphone access begins
- Clipboard Guard — brief 10-second activation on paste
- Work Hours Scheduler — auto-activate on configurable days and time range
- Auto-Activate per Site — remembers Privacy Mode state per domain
- Panic Sound — Web Audio API tone on activate / deactivate
- Remappable panic hotkey (default `Alt + X`)

#### Profiles & Settings
- Quick Profiles — Work, Cafe, Meeting presets (save and restore full configuration)
- Export settings as JSON backup
- Import settings from JSON backup

#### Stats page
- Weekly stats — today, this week, all-time minutes, session count
- Day streak — consecutive days Privacy Mode was used
- Daily bar chart (last 7 days)
- Effect usage breakdown with color-coded bars
- Top sites ranked by time protected
- Scrollable session history (last 20 sessions)
- Export stats as CSV

#### Developer
- MV3 service worker with context menu and message relay
- Webpack 5 build pipeline with React 18
- `scripts/gen-icons.js` — regenerate PNG icons from `src/icons/logo.png` via sharp
