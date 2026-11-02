# Black Bird agent notes

The approved redesign is the active site. Read README.md and DESIGN.md. Archive branch `archive/classic-2026-11-02` preserves the complete previous version.

Verified facts and historical owner instructions remain in PRODUCT.md. A wrong fact is worse than a missing fact. Do not invent descriptions, amenities, delivery fees, preparation times or payment confirmation.

Current menu source: assets/catalog.js, 31 items, EN/VI/RU, whole Napoleon 560000 VND. There is no duplicated HTML board. Keep every menu name translated. Owner instructions supersede old board prices.

Slogan is English in every locale. Hours 07:30–20:00 Asia/Ho_Chi_Minh. Address N4/4 Hoàng Hữu Nam, P.2, Vũng Tàu. Phone 038 226 4034.

Build with bash build.sh. Test with the four commands in README. Orders go to the existing Worker and Telegram; use mock responses, never submit a real test order. Never report success on a failed request. Tokens and merchant credentials belong only in Worker secrets.

Production: https://blackbird-vungtau.pages.dev. Worker: https://blackbird-bot.maybeetube.workers.dev. Existing Cloudflare token is in user environment. Never print secrets. Preserve audience and existing services during deployment.
