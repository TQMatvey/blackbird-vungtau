# Black Bird

Production source: the approved food-led redesign. The prior complete site is preserved on branch `archive/classic-2026-11-02` (commit 4291339).

- `index.html`: structure and payment labels.
- `assets/catalog.js`: all 31 menu items, prices, names in EN/VI/RU, categories and image mapping. This is the only current menu data source. Whole Napoleon: 560000 VND.
- `assets/app.js`: inline ordering, localization, checkout, Telegram Worker request and payment picker.
- `assets/style.css`: responsive design.
- `worker/`: existing Telegram and payment service.

Run `python -m http.server 8765` locally. Local ordering uses the production Worker endpoint; use mocked fetch responses for tests. Never send test orders to the shop.

Build: `bash build.sh`. Publish: `npx wrangler pages deploy dist --project-name blackbird-vungtau --branch main`. Worker: `npx wrangler deploy` from worker/.

Checks: `node scripts/check-board-vs-items.mjs`, `node scripts/test-payment-picker.mjs`, `node worker/order.test.mjs`, `node worker/md5.test.mjs`.

Slogan stays English in every locale: “We don’t chirp. We chew.” Secrets remain in Cloudflare, never in static assets. Payment is shown only after a successful Worker response and only when the Worker returns payment details. Sent does not mean accepted or paid.
