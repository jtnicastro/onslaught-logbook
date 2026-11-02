# Onslaught Logbook

A phone-first workout logbook for weeks 5–12 of John Meadows' *Onslaught* program, run in repeating rounds.
It installs to the iPhone Home Screen and works offline.

**Install:** open https://jtnicastro.github.io/onslaught-logbook/ in Safari → Share → *Add to Home Screen*, open it from the new icon, then enter the program key.

- Workout logs are stored on the device only (back up from **More → Back up everything**).
- The program content is encrypted in `program.enc.json` (AES-GCM, PBKDF2 key) and is unlocked on the device with a private key; it is not published in readable form.
- Fonts: Archivo and Big Shoulders Display, SIL Open Font License 1.1 (see `fonts/`).
