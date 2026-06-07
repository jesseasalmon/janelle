# Hormone Phase Tracker

A beautiful, private daily wellness tracker inspired by the hormone phase journal. Tracks sleep, energy & mood, food & blood sugar, and cycle signs — all stored locally in your browser with no account or server required.

## Features

- **Four cycle phases** — Menstruation, Follicular, Ovulation, Luteal — each with its own intention
- **Daily logging** — sleep times, energy/mood/fog/anxiety ratings, meals, cycle signs
- **Cervical mucus & period flow** selectors
- **Daily task checklist**
- **Persistent storage** — entries saved in `localStorage`, survives page refresh
- **Past entries** — browse, load, and delete previous days
- **Responsive** — works on mobile and desktop
- **No backend, no account, no data leaves your device**

## Files

```
hormone-tracker/
├── index.html   — app structure
├── style.css    — all styling
├── app.js       — logic & localStorage
└── README.md    — this file
```

## Hosting on GitHub Pages

1. Create a new GitHub repository (e.g. `hormone-tracker`)
2. Upload all four files (`index.html`, `style.css`, `app.js`, `README.md`)
3. Go to **Settings → Pages**
4. Under **Source**, select `Deploy from a branch` → `main` → `/ (root)`
5. Click **Save**
6. Your app will be live at `https://YOUR-USERNAME.github.io/hormone-tracker/`

> **Privacy note:** GitHub Pages is public by default. Since all data stays in your browser's localStorage, no one else can see your entries — but the app code itself is publicly visible. If you want the app private, use a private repo with GitHub Pages (requires GitHub Pro) or run it locally by just opening `index.html` in your browser.

## Running locally

No build step needed. Just open `index.html` in any modern browser:

```bash
open index.html       # macOS
start index.html      # Windows
xdg-open index.html   # Linux
```

Or serve with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Customisation

- **Colors** — all in `:root` variables at the top of `style.css`
- **Phases** — edit the `phaseData` object in `app.js`
- **Fields** — add new `<input>` elements in `index.html` and include them in `readFields()` / `writeFields()` in `app.js`
