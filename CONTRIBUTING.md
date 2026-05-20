# Contributing to Privacy Lens

Thanks for taking the time to contribute! Here's everything you need to get started.

---

## Setup

**Requirements:** Node.js 18+, Chrome

```bash
git clone https://github.com/m2l33k/Privacy-Lens.git
cd Privacy-Lens
npm install
```

---

## Development workflow

```bash
npm run dev      # webpack watch mode — rebuilds on every file save
npm run build    # production build → dist/
```

### Loading the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder
4. The Privacy Lens icon appears in your toolbar

After any code change, click the **refresh icon** on the Privacy Lens card in `chrome://extensions`. You do not need to re-add it.

---

## Project structure

```
src/
├── content/content.js      All lens logic (blur, shapes, effects, guards, stats)
├── popup/                  React 18 popup UI (3-tab layout)
├── stats/                  React 18 stats page
├── background/             MV3 service worker
└── icons/                  PNG icons + source logo

scripts/
└── gen-icons.js            Regenerate icon PNGs from src/icons/logo.png
```

---

## Regenerating icons

If you update `src/icons/logo.png`, run:

```bash
node scripts/gen-icons.js
npm run build
```

---

## Submitting a pull request

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run `npm run build` and confirm it compiles without errors
4. Open a PR against `main` with a clear description of what changed and why

For large changes, open an issue first to discuss the approach.

---

## Reporting bugs

Use the [bug report template](https://github.com/m2l33k/Privacy-Lens/issues/new?template=bug_report.md).  
Please include your Chrome version, extension version, and the site where the issue occurs.
