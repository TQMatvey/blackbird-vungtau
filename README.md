# Black Bird — Brunch & Bites

The site for **Black Bird**, N4/4 Hoàng Hữu Nam, P.2, Vũng Tàu.

Pitas and sandwiches, pies made to order, and roast meats sold by the 100 gram.
Open **07:30 – 20:00** daily. Call **038 226 4034**.

## Running it

There is no build step. Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

## Deploying

The live site is **https://blackbird-vungtau.pages.dev**, deployed to Cloudflare
Pages from `dist/`.

**From the command line**, for an immediate push:

```
bash build.sh
npx wrangler pages deploy dist --project-name blackbird-vungtau --branch main
```

This needs `CLOUDFLARE_API_TOKEN` in the environment, with `Cloudflare Pages:
Edit` and `Account Settings: Read` on the account.

**For automatic deploys**, connect the repository in the Cloudflare dashboard
(Workers & Pages → Create → Pages → Connect to Git) and set:

| Setting | Value |
|---|---|
| Build command | `bash build.sh` |
| Build output directory | `dist` |
| Production branch | `main` |

### Why the build exists

The site needs no compiling. The build exists because the repository root also
holds `README.md`, `DESIGN.md`, `PRODUCT.md` and **32 MB of source
photography** — none of which should be publicly served. `build.sh` copies
exactly the six public files into `dist/`, which is the output directory. Cache
headers ride along in `_headers`.

Never put the Cloudflare token, or the Telegram bot token, anywhere the page can
read them. This is a static frontend: every byte shipped is downloadable.


## What's here

| | |
|---|---|
| `index.html` | the whole site — markup, all three languages, all copy |
| `assets/style.css` | the design system |
| `assets/app.js` | the Vũng Tàu clock, the EN/VI/RU switch, the order builder |
| `assets/img/` | the two logo files the page actually loads |
| `DESIGN.md` | the design record: why it looks like this |
| `PRODUCT.md` | the verified facts, what is still unconfirmed, and what the owner must change |
| `restaurant_assets/` | the source material: the menu boards, the shop's own photographs, and the processed versions that are parked but not yet on the page |

## Editing it

The site is meant to be editable by a non-technical owner, so most changes are
text edits in `index.html`.

**Change a price.** Prices live in two places and both must change together:
the `.board` cards in `index.html`, and the `ITEMS` table in `assets/app.js`.
The order picker is built from `ITEMS`, so if only the menu changes, the two
disagree.

**Change the opening hours.** `OPEN_MIN` and `CLOSE_MIN` at the top of
`assets/app.js` — minutes from midnight. The day-strip, the open/closed readout
and the `HH:MM – HH:MM` line in the markup all follow from these.

**Add or remove a menu item.** Again, both files. Copy an existing `<li class="row">`
in `index.html`, then add the matching entry to `ITEMS` in `assets/app.js` with
the same price.

**Change a language.** Every translatable string carries `data-vi`, `data-en` and
`data-ru` attributes, with the English also as the element's text. Edit the
attribute, not the text.

## Languages

English first, Vietnamese second, Russian third — the order the room's regulars
actually arrive in. The switch is instant, no reload, and remembers your choice.

## Two things that are not finished

- **The order builder does not take payment.** *Send order* writes the order out
  and hands it to Telegram, ready to send. There is no server, so the page never
  claims the shop received anything. The owner's plan is a Telegram bot plus
  VietQR; `ORDER_BOT` in `assets/app.js` is wired and waiting.
- **The photographs are parked.** The shop's own images were placed, reviewed
  and then pulled at the owner's request. The processed files sit in
  `restaurant_assets/processed/`; copying them back into `assets/img/` and
  adding the `<img>` tags brings them back.

`PRODUCT.md` has the full list, including the one question worth the owner's
eye: the board prints the pork name against *Grilled Chicken Pita*.
