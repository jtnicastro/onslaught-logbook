# Onslaught Logbook — maintenance notes

Static installable web app (PWA) served by GitHub Pages from the `gh-pages` branch
(https://jtnicastro.github.io/onslaught-logbook/). `main` holds the same files; push both.

- `app.js` / `app.css` / `index.html`: the whole app (vanilla JS, no build step). `window.__PLATFORM__ = 'pwa'`.
- Workout logs live only in the phone's localStorage (`onslaught-logbook-v1`); never change that key or the
  session/set shape without a migration, or installed copies lose data.
- `program.enc.json`: John Meadows' Onslaught weeks 5–12, AES-GCM encrypted (PBKDF2-SHA256). The repo is public,
  so never commit the plaintext. Tyler has the key. Edit flow: `tools/build.py decrypt` → edit JSON outside the repo →
  `tools/build.py encrypt` (also refreshes sw.js). Keep exercise `id`s stable: logs are keyed by them.
- After changing any shipped file run `python3 tools/build.py sw` so installed apps see an update
  (they show a "New version ready" button).
