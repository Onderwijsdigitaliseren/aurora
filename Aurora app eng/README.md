# Maanlicht — Progressive Web App

Een installeerbare, offline-werkende versie van Maanlicht. Eén shell (`index.html`)
met vijf werelden, plus de PWA-laag eromheen.

## Inhoud

```
aurora-pwa/
├── index.html              ← de app (ongewijzigde werelden + opslaglaag + PWA-registratie)
├── manifest.webmanifest    ← naam, kleuren, iconen, "standalone" weergave
├── sw.js                   ← service worker: offline-cache + lettertypen
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
└── README.md
```

## Wat is een PWA — kort

Een Progressive Web App is een gewone website die zich kan gedragen als een app:
- **Installeerbaar** op het beginscherm, met eigen icoon, zónder app store.
- **Offline bruikbaar** dankzij een service worker die de bestanden cachet.
- **Schermvullend** (geen browserbalk) via het manifest (`display: standalone`).

Voor jouw bestand is dit een goede match: het is al één zelfstandig HTML-bestand
zonder backend. De PWA-laag voegt installatie + offline toe zonder de werelden aan
te raken.

## Belangrijk: serveren via https of localhost

Service workers en de installknop werken **niet** als je `index.html` dubbelklikt
(`file://`). Je hebt een (mini)server nodig. Lokaal testen:

```bash
cd aurora-pwa
python3 -m http.server 8080
# open http://localhost:8080
```

Online zetten (allemaal gratis, https inbegrepen):
- **GitHub Pages** — repo aanmaken, bestanden uploaden, Pages aanzetten.
- **Netlify / Cloudflare Pages** — map erin slepen, klaar.

Zet de hele map in de webroot. De paden zijn relatief (`./`), dus een submap mag ook.

## Opslag

De opslag draait nu op de browser (`localStorage`), niet meer op de
Claude-artifactopslag. Alle gegevens blijven op het apparaat; er is geen server.
De gegevensbeheer- en wis-knoppen in Instellingen blijven werken.

## Cache verversen na een update

Pas je `index.html` aan? Verhoog dan `CACHE_VERSION` boven in `sw.js`
(bijv. `maanlicht-v1` → `maanlicht-v2`). De oude cache wordt dan automatisch
opgeruimd en bezoekers krijgen de nieuwe versie.

## Later uitbreiden met login + cloud-sync

Het is met opzet zo opgezet dat dit één plek raakt. Bovenin `index.html` staat het
object `window.storage` met `get` / `set` / `delete` / `list`. Alle werelden praten
daar uitsluitend mee. Voor login + synchronisatie vervang je dat ene object door een
versie die — ná inloggen — naar je backend schrijft (bijv. Supabase, Firebase of een
eigen API), met `localStorage` als offline-buffer. De werelden zelf hoef je niet te
wijzigen.

Schets:

```js
window.storage = {
  async get(key)        { /* eerst lokaal, daarna/sync met server */ },
  async set(key, value) { /* lokaal opslaan + naar server sturen   */ },
  async delete(key)     { /* ... */ },
  async list(prefix)    { /* ... */ },
};
```
