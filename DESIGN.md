# Design

Black Bird — Brunch & Bites, N4/4 Bầu Sen 6, P.2, Vũng Tàu.
A static single-page site: one HTML file, one stylesheet, one script. No build
step, no framework, no CMS.

## The idea

The shop is a walk-in counter, not a brunch café, and the one artefact that
says so is the printed boards: pitas and pies grouped into sections, prices in
plain đồng, no adjectives. The site is that board rebuilt as a **live all-day
clock**.

The board prints a single span, 07:30 to 20:00. The page draws that span as a
track and writes the visitor's own Vũng Tàu clock onto it, so the first thing
the hero shows is a fact about right now rather than a claim about the place.

The five labels on that track — Open, Mid-morning, Lunch, Evening, Close — are
**clock positions, not a production schedule.** An earlier version claimed
"pies from the oven" at 07:30 and a "private room" shift at 18:00. The boards
give no per-item times, the pies are made to order rather than baked on a
morning round, and the private room is an unconfirmed Foody amenity. A timeline
that invents its own schedule is a timeline that can be disproved by walking
into the shop.
The hero's lower third is already the first rows of the real menu, so a real
price is visible before any scroll.

The category default — a centred photo, a serif welcome, a rounded booking
button, adjectives about cosy — is refused deliberately. Where photographs
appear, they are the shop's own and there are six of them. An earlier image set
was wrong, and was deleted rather than patched; a page that says nothing beats
a page that says something false. The photography was cut after a trial; the
logos stayed.

## Colour

Read off the shop's own printed board and storefront at full strength:

| token | value | role |
|---|---|---|
| `--cream` | `#F4F0E6` | bone-cream plaster ground |
| `--paper` | `#FBF8F1` | raised surfaces, and all text on crimson |
| `--crimson` | `#A8232B` | the board's red; owns whole regions |
| `--black` | `#141110` | board-black, the bar and the day section |
| `--marigold` | `#C98A1B` | spent only on "open right now" |
| `--marigold-ink` | `#8A5E0E` | marigold darkened for text on light ground |

Crimson owns regions rather than accenting. Marigold is rationed to one signal.
Rules are 1px. Corners are square. There is exactly one shadow, a soft
deep-plaster drop.

**Contrast rule applied:** nothing carries marigold as text on cream — it
measures about 2:1. On the cream ground, accent text uses `--marigold-ink` or
crimson. On the crimson ground, only `--paper` clears 4.5:1, so the footer
wordmark and the crow are monochrome paper there rather than the two-tone
hero split.

## Type

Be Vietnam Pro, four weights (400/500/700/800), loaded from Google Fonts with
`preconnect` and `display=swap`. It is the typeface drawn for Vietnamese, which
is the only reason no other face could serve a page that carries Vietnamese.

Scale is fluid via `clamp()`. Prices and times use tabular figures. The
wordmark is set enormous and stacked, exactly as the board sets it: `Black` in
board-black over `Bird` in crimson, tight leading, negative tracking.

## The mark

The shop's own lockup, used as supplied: `Black` in board-black over `Bird` in
crimson, the crow standing on a fork, and "We don't chirp · We chew". An earlier
version of this design drew the crow on a fork as inline SVG. That was an
invention, and the real mark is stronger than anything redrawn by hand. Two
variants ship, because one does not work everywhere:

- **cream ground** — the footer, the favicon
- **crimson ground** — the 40px mark in the black bar

The crimson variant is the wrong choice on the crimson footer: its "Black" is
set in black on crimson, which is a low-contrast pairing by design, and on a
crimson ground it has nothing left to read against. It was tried there first
and had to be pulled.

## Photography

**The logos stay. The photography is out**, at the owner's instruction for now.
The processed files are parked in `restaurant_assets/processed/` — the
frontage, the cold platters, a pie, the terrace and the visit card — so putting
them back is a copy, not a re-crop.

What ships: the logo in the footer, and the wordmark set as type in the bar.

The bar mark is the **wordmark as live text**, not the logo file. At 40px the
raster is soft, and the lockup reads sharper as type — while keeping the
logo's own colour split, `Black` on the bar's ground and `Bird` in crimson. The
footer takes the cream logo file, because the crimson variant is wrong there:
its `Black` is set in black on crimson by design, and on a crimson ground it has
nothing to read against.

## Component grammar

The grammar is the menu board: a crimson bar, then rows of
**English name / Vietnamese ticket / dotted leader / price in tabular figures**,
numbered 1–9 in crimson, exactly as the board prints them. Prices are VND in
the Vietnamese format (`85.000đ`) because that is what the board shows.

## Sections

1. **Bar** — 56px, sticky, board-black. Mark and wordmark left, the Vũng Tàu
   clock centre, the EN/VI/RU toggle and a crimson call button right. A hairline
   along its bottom edge is the page's scroll position.
2. **Hero** — the stacked wordmark, the shop's own tagline on a crimson rule,
   one paragraph of what it actually is, call and order. To the right, the
   **readout constellation**: live open/closed with the closing time, hours,
   phone, address, Google rating. Below, the **day-strip** — the track, the
   fill, the now-marker, and five clock labels.
3. **Menu** — the 30 real items as **seven category cards** in a responsive
   grid: Pitas, Cold Platters, Pies, Sweet, Bread and pickles, Hand-made
   sauces, Drinks. Three columns on desktop, two on tablet, one on a phone.

   Thirty items in one column was about 2,100px of scroll and it asked the
   reader to remember which group a dish belonged to from the last crimson bar
   they had scrolled past. Cards bring the group to the item: 1,349px at
   desktop, three columns wide.

   The cards **stretch to their row's height** rather than floating at the top
   of it — a one-item card beside a six-item card otherwise leaves bare cream
   beneath it, which reads as a mistake rather than as a grid.
   - **Pitas** carry two prices, each on its own line with its own label, so
     `120.000 LARGE / 80.000 MEDIUM` is never read as one ambiguous figure.
   - **Pies** all cost 180.000, and each row says so. An attempt to hoist that
     single price into the group header was reverted: it read as a caption
     rather than a price, and a customer scanning the list wants the number
     next to the item, not above it.
4. **Room** — board-black, the amenity tags.
5. **Order** — a **category-first picker**. The seven groups are tabs and only
   the chosen group is listed, so the box shows four to ten rows instead of
   thirty. Every row has a real stepper, and a two-size pita gets one row *per
   size*, so the sizes are two countable things rather than one line with a
   hidden mode. A row turns crimson when it holds a quantity.
   - **Send order** is the primary action. It writes the whole order out and
     hands it to Telegram, ready to send. An earlier version made the phone
     primary — "set the quantities, then call and read out your order" — which
     is a button labelled *Send order* that does not send an order. Copy and
     phone are now fallbacks, not the path.
6. **Foot** — crimson, the cream logo, visit/call/follow columns, and the
   sourcing line naming the boards and the owner's confirmation.
7. **Dock** — a fixed black bar on phones only: call, and directions.

## Language

English first, Vietnamese second, Russian third, matching the room's actual mix
of regulars. Switching is in-place with no reload and persists in
`localStorage`; English is the default on first load.

Copy lives in the markup as `data-vi` / `data-en` / `data-ru` attributes with
the English also as element text, so the file is readable and hand-editable by
a non-technical owner with no build step. `data-*-ph` carries per-language
placeholders. Image `alt` text is translated the same way. The meta description
carries all three.

Russian runs longer than either other language, so its tracked caps labels drop
the uppercase and loosen their letter-spacing rather than wrapping.

## Motion

Deliberately almost none. The authored motion is the day-strip: the fill scales
`0 → pct` over 0.6s on load and repaints each minute, and the now-marker
tracks the clock. The scroll hairline is the second. Everything else is
instant, and `prefers-reduced-motion` collapses all of it.

Both animated bars use `transform: scaleX()` rather than an animated `width`,
so they stay off the layout path.

## Accessibility

- Skip link to the menu.
- Visible 3px focus ring in crimson, switching to marigold on the dark
  surfaces where crimson would not read.
- The live open state is mirrored into an `aria-live="polite"` region in the
  active language.
- All controls are real `<button>` and `<a>` elements; the language toggle is a
  `role="group"` with `aria-pressed`.
- Tap-to-call in the bar, hero, order section, footer, and mobile dock.
- Decorative SVGs are `aria-hidden` with `focusable="false"`.
- Body text, placeholders and small print meet 4.5:1 on every surface.

## Performance

No webfont on the critical path, and no external script. One image ships —
the footer logo, 28 KB. The only other network request is the Google Fonts
stylesheet, preconnected and `display=swap`.

## Verification

Checked in headless Chrome at 320, 360, 390, 480, 600, 768, 1024, 1280 and
1440 CSS px in all three languages — 27 combinations — with zero horizontal
overflow and zero elements crossing the viewport edge at every one.

Defects found and fixed by that pass:

- `paintClock()` fed a 0–100 percentage to `scaleX()`, stretching the day-strip
  fill up to 63,000px wide and overflowing the document at every width. The bar's
  own progress bar was already correct, which is what made the two look alike
  in review.
- The picker lists carried `data-vi/en/ru` so the language switcher could
  relabel them. The switcher treats **any** element with those attributes as a
  translatable leaf and overwrites its `textContent` — so switching to
  Vietnamese or Russian wiped the entire list. English worked, which is why it
  looked fine. Group labels now live on attributes the switcher ignores.
- Every photograph rule set `width:100%` but not `height:auto`. The `height`
  attribute therefore won, and each image rendered at its intrinsic height with
  the CSS crop doing nothing. Found by measuring computed boxes rather than
  looking at crops, which had sent me round the loop twice.

Note that headless Chrome's `--window-size` clamps its own minimum viewport, so
true 390px review was done by loading `index.html` in a 390px iframe harness.

## Provenance

Six images were placed, reviewed and then cut at the owner's instruction, apart
from the logos. The processed files — the frontage, the cold platters, a pie,
the terrace and the visit card — are parked in `restaurant_assets/processed/`
so putting them back is a copy, not a re-crop. The 32 MB of originals sit
untouched in `restaurant_assets/`.

Withdrawn and deleted: an earlier set of nine JPEGs pulled from the public
Google Maps listing. The owner confirmed it was wrong — it included a burger the
shop does not sell, and other mismatched subjects. It is not used, not
referenced, and not recoverable from this repository.

The menu and prices were read from the owner's own photographs of the shop's
boards, now also kept in `restaurant_assets/`.
Those four files are the source of truth for the menu and are not loaded by the
page.

## Known limits

- **No payment, and orders do not reach the shop automatically.** Send order
  writes the order and hands it to Telegram for the visitor to send. The owner's
  stated plan is a Telegram bot plus VietQR; neither is built, and a bot needs
  a server because Telegram's `/start` payload caps at 64 characters.
- The amenity tags come from Foody, whose list the owner has already shown to
  contain two false entries. Treat the remainder as unconfirmed.
- The board prints the pork name against *Grilled Chicken Pita*; the site uses
  the chicken name. Worth an owner's glance.
- The full owner action list is in `PRODUCT.md`.

**Settled by the owner, and no longer open:** the address is N4/4 Hoàng Hữu
Nam, P.2, and the shop closes at 20:00. Both replace values read from public
listings, which had disagreed with each other.
