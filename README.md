# Privacy Lens

A stealth-mode browser extension that creates a dynamic privacy shield. Work on sensitive content in public without exposing your entire screen.

## How it works

Activating "Privacy Mode" blurs the entire browser tab with a glassmorphism frosted-glass effect. A clear **Lens** rectangle follows your cursor, revealing only what you choose to look at. Everything outside the Lens stays blurred.

## Installing in Chrome (Developer Mode)

1. Run `npm run build` (or `npm run dev` for watch mode)
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `dist/` folder
5. The Privacy Lens icon appears in your toolbar

## Hotkeys

| Shortcut | Action |
|---|---|
| `Alt + X` | Panic toggle — instantly activate/deactivate |
| `Ctrl + Scroll` | Resize the lens |
| `Shift + Drag` | Draw a custom lens rectangle |

## Popup Controls

- **Privacy Mode toggle** — activate/deactivate the shield
- **Lens Presets** — Micro (60×60), Text Line (420×32), Social Square (320×320), Wide (700×400)
- **Blur Intensity** — 4px (light haze) → 40px (total blackout)
- **Lock Lens** — freeze the lens in place (stops following cursor)
- **Auto-Activate** — remembers Privacy Mode is on for this domain

## Development

```bash
npm install
npm run dev        # watch mode
npm run build      # production build → dist/
```

## Architecture

- **`src/content/content.js`** — Vanilla JS, injected into every page. Manages the 4-panel blur overlay, lens geometry, LERP-smoothed cursor tracking, and all hotkeys. Uses `backdrop-filter: blur()` + `saturate()` for a premium frosted-glass effect.
- **`src/popup/`** — React 18 popup UI for controls.
- **`src/background/background.js`** — MV3 service worker, relays messages between popup and content script.
- **`chrome.storage.local`** — Persists per-site lens size and auto-activate preference.
