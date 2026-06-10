# Manifestation — Progressive Web App

An installable, offline-capable version of Manifestation. One shell (`index.html`)
that loads five worlds, plus the PWA layer around it.

## Contents

```
aurora/
├── index.html              ← the shell: navigation, iframes, PWA registration
├── manifest.webmanifest    ← name, colours, icons, "standalone" display
├── sw.js                   ← service worker: offline cache + fonts
├── js/
│   ├── storage.js          ← storage layer (host side) + bridge handler
│   └── bridge.js           ← storage bridge, loaded by every world
├── worlds/
│   ├── aurora.html         ← the five worlds, as plain readable files
│   ├── contact.html
│   ├── reis.html
│   ├── kaarten.html
│   └── kompas.html         ← dormant: not linked in the navigation yet
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
└── README.md
```

## How the worlds load

Each world is a normal HTML file. The shell does not load them with a direct
iframe `src`. Instead it fetches the file, injects the world's saved data
(`window.__INITIAL_CACHE__`) into the `<head>`, and then loads it via
`srcdoc`. This way the synchronous `localStorage` shim inside each world has
its data ready *before* the world's own scripts run.

Because of this, the worlds are meant to be opened **through the shell**, not
as standalone pages (the `js/bridge.js` path resolves relative to the shell).

## Editing a world

Open the file in `worlds/`, edit, save. No escaping rules, no string
replacements — they are plain HTML files now. After any change:

1. Raise `CACHE_VERSION` at the top of `sw.js`
   (e.g. `manifestation-v3` → `manifestation-v4`).
2. Upload the changed files. The old cache is cleaned up automatically and
   visitors get the new version.

## Serving over https or localhost

Service workers and the install button do **not** work when you double-click
`index.html` (`file://`). The fetched worlds also need a server. To test
locally:

```bash
cd aurora
python3 -m http.server 8080
# open http://localhost:8080
```

Hosting (all free, https included):
- **GitHub Pages** — create a repo, upload the files, enable Pages.
- **Netlify / Cloudflare Pages** — drag the folder in, done.

Put the whole folder in the web root. Paths are relative (`./`), so a
subfolder also works.

## Storage

All data lives in the browser (`localStorage`), on the device. There is no
server. Keys are namespaced `maanlicht::<world>:<key>`, so worlds can never
touch each other's data. The data management and clear buttons in Settings
keep working.

## Adding login + cloud sync later

This is set up so that it touches one place only: the `window.storage` object
at the top of `js/storage.js` (with `get` / `set` / `delete` / `list`). All
worlds talk to storage exclusively through that object. For login + sync,
replace that single object with a version that — after signing in — writes to
your backend (e.g. Supabase, Firebase or your own API), with `localStorage` as
an offline buffer. The worlds themselves need no changes.

Sketch:

```js
window.storage = {
  async get(key)        { /* local first, then sync with server */ },
  async set(key, value) { /* save locally + send to server      */ },
  async delete(key)     { /* ... */ },
  async list(prefix)    { /* ... */ },
};
```

## Activating the kompas world

`worlds/kompas.html` is complete but not linked. To activate it: add an
`<iframe class="frame" id="fr-kompas">` to the stage in `index.html`, and add
an entry for it in the `SECTIONS` object (or add it as a sub-view of an
existing section). The storage bridge already knows it.

## Known limitation

On Android, the installed app name only updates after uninstalling and
reinstalling the app — a platform limitation, not a bug.
