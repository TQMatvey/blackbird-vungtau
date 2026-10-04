# Black Bird — agent notes

Vũng Tàu deli site (pitas, pies, roast meats by the 100 g). Static, no framework,
hand-editable by a non-technical owner.

**Read `PRODUCT.md` first** — it is the record of verified facts, and of what the
owner has explicitly rejected. `DESIGN.md` is the design record. Neither is
decoration: several of the constraints below exist because an earlier version
was shipped, reviewed and cut.

---

## The one rule that outranks the rest

**A wrong fact is worse than a missing one.** Every photograph on the site was
deleted on the strength of a single confirmed mismatch rather than corrected
one by one. Prices, hours and menu items come off the owner's own board and
nowhere else. Do not "improve" copy, do not infer an item, do not fill a gap
with something plausible. If a fact is unverified, it stays out or carries an
explicit `[open]` in `PRODUCT.md`. This has already cost real rework twice.

## Duplicated state — the main source of bugs

Prices and menu items live in **two** places. Change one, change both, or the
menu and the order builder disagree:

| What | Where |
|---|---|
| Menu rows shown on the page | `.board` → `<section class="grp">` → `<li class="row">` in `index.html` |
| Order builder's item table | `ITEMS` in `assets/app.js` |
| Opening hours | `OPEN_MIN` / `CLOSE_MIN` in `assets/app.js` (minutes from midnight) |
| Order endpoint | `ORDER_API` in `assets/app.js` |
| All page copy, in 3 languages | `data-en` / `data-vi` / `data-ru` attributes in `index.html` |

The day-strip, the open/closed readout and the `HH:MM – HH:MM` line all derive
from `OPEN_MIN` / `CLOSE_MIN`. Never hard-code a time in the markup.

Three languages are shipped: **en, vi, ru**. Every user-facing string needs all
three attributes. Missing one silently falls back to English at runtime.

## Deploying

Cloudflare Pages, project `blackbird-vungtau`, output dir `dist/`. The build is
not a compiler — it exists to keep `README.md`, `DESIGN.md`, `PRODUCT.md` and
32 MB of source photography out of the served tree:

```sh
bash build.sh
npx wrangler pages deploy dist --project-name blackbird-vungtau --branch main
```

Automatic deploys come from connecting the repo in the Cloudflare dashboard
(build command `bash build.sh`, output dir `dist`, production branch `main`).
Live: https://blackbird-vungtau.pages.dev

## Secrets — never in the repo, never in the page

This is a static site: every byte shipped is downloadable. The Telegram token
lives **only** as a Cloudflare Worker secret (`worker/`, deployed as
`blackbird-bot`). Same for `SHOP_CHAT_ID`, `WEBHOOK_URL`, `VIETQR_*` and
`SITE_URL`. If you find yourself writing a token, chat id or merchant
credential into `index.html`, `assets/` or the repo, stop — it goes in the
Worker, and the page talks to the Worker.

Live Worker: https://blackbird-bot.maybeetube.workers.dev (`GET /health` is the
liveness check; its root lists the routes).

## Verifying a change

- **Always `bash build.sh` before declaring a change done** — a file that is
  correct in the repo but not copied into `dist/` does not ship.
- `node worker/md5.test.mjs` — Worker known-answer tests. The MD5 exists only to
  verify VietQR callback signatures, and a broken signature check is worse than
  none: it either rejects every real payment or accepts forged ones.
- **The order path is money.** `POST /order` failing must never read as a
  successful order — the page already falls back to "Not sent — copied" in the
  active language. Preserve that; do not add a success state the site cannot
  actually observe. There is deliberately no "order received" message.
- Check all three languages on a narrow viewport. The audience is a phone, in
  daylight, on mobile data.

## Style

- Vanilla JS, ES5-ish syntax in `assets/app.js` (`var`, no arrow functions) —
  keep it consistent with the rest of the file.
- Text files are LF everywhere (`.gitattributes`), including shell scripts.
- No webfont on the critical path, no framework, no build step beyond
  `build.sh`. This is a constraint from the owner, not an accident.
- The page must stay editable by a non-technical owner: real text in real HTML.

## Open items

`PRODUCT.md` → **"Replacement list — what the owner must change before
publishing"** is the live list: unconfirmed amenities, the chicken pita's
Vietnamese name, photographs, and payment (VietQR planned, not finished). Do
not invent answers to any of them; ask the owner.