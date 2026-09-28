# Product

<!-- impeccable:product-schema 1 -->

> **Revision 3 — 2026-09-28.** Revision 2 replaced the inferred brief with
> evidence read from the business's own links. This revision records what the
> owner changed:
> 1. **The reservation form is gone.** It had no backend anyway, so it was a
>    form that could not receive a booking. It is replaced by a real **order**
>    flow.
> 2. **The menu is rebuilt from the owner's own menu photographs**
>    (`menu1.jpg`, `menu2.jpg`, `menu_pies.jpg`, `napoleon.jpg`). The previous
>    nine items were read off a different, older board and were wrong: most
>    prices had moved, and several items did not exist. The new menu is
>    **30 items in 7 groups**, exactly as the boards print them. **Tofu Pita is
>    excluded, and Beetroot-Apple Mixed Smoothie is removed, both at the owner's
>    instruction.**
> 3. **All photographs are removed from the page.** The earlier image set was
>    wrong — a burger the shop does not sell, and other mismatches. The page
>    now ships with no images. `assets/img/` is empty and waiting.
> 4. **Payment is planned, not built.** The owner intends to integrate a
>    **Telegram bot** and **VietQR** for taking payment. Nothing of that is
>    built yet; the order builder is the groundwork for it.

> 5. **The address and the closing time are settled by the owner.**
>    The address is **N4/4 Hoàng Hữu Nam, P.2, Vũng Tàu** — which is what
>    Foody and ShopeeFood listed and what the shop's own visit card prints;
>    the older menu boards said N4/4 Bầu Sen 6 and the page now names that only
>    as the older wording. **The shop closes at 8 PM**, so hours are
>    `07:30 – 20:00`. This closes the hours question the public listings could
>    not: Foody said 21:35, ShopeeFood 21:00, Google 21:30. The page now
>    carries the owner's answer rather than a guess from a listing.
> 6. **The logos are on the page; the photography is not.** The shop's own
>    images were placed, reviewed and then cut at the owner's instruction. The
>    processed files are parked in `restaurant_assets/processed/`, so putting
>    them back is a copy rather than a re-crop.
> 7. **The menu is category cards, not a long list.** Thirty items in one column
>    was about 2,100px of scroll. Seven cards in a responsive grid is 1,349px at
>    desktop, and it puts the group next to the dish instead of making the
>    reader remember it.

> Facts are marked **[verified]** with their source. Facts still unknown are
> marked **[open]**. Nothing on the shipped page is invented unless it is
> explicitly labelled as a placeholder.

## Platform

web

## Stack

static HTML + CSS + vanilla JS, no build step, no framework, no webfont on the
critical path. Deployable to any Vietnamese host. The page is hand-editable by
a non-technical owner: real text in real HTML, both language versions sitting in
the markup as `data-vi` / `data-en` attributes. **[verified: owner requirement
— "the page is editable by a non-technical owner", and the owner's audience is
a phone on mobile data]**

## The business — verified

Read from the shop's own printed menu board, the shop's own storefront
photograph, Google Maps, Foody.vn and ShopeeFood.vn.

- **Name:** Black Bird. Full listing name "Black Bird Brunch & Bites — Pitas &
  Sandwiches". **[verified: menu board, Google Maps, Foody]**
- **Wordmark as printed:** `Black` in black over `Bird` in crimson, with a black
  crow standing on a fork. **[verified: menu board, storefront]**
- **Tagline, the shop's own words:** **"We don't chirp • We chew"**, printed on
  the fascia above the name. **[verified: storefront photograph]**
- **Second brand:** the terrace canopy reads **"NHÀ HÀNG OFFSHORE"**. Both names
  refer to the same shop. **[verified: terrace photograph]**
- **Address:** `N4/4 Hoàng Hữu Nam, P.2, Vũng Tàu`. **Confirmed by the owner**,
  and printed on the shop's own visit card. The older menu boards say
  `N4/4 Bầu Sen 6`; the page names that only as the older wording, so a search
  for either still finds the shop. **[verified: owner's own statement, visit
  card, Foody, ShopeeFood]**
- **Phone:** `038 226 4034`. Matches Google Maps `+84 382 264 034`. **[verified:
  menu board, Google Maps, visit card]**
- **Google Maps:** rating **4.9**, category *Deli*, coordinates
  `10.3363636, 107.0844276`, plus code `83PM+GQ`. **[verified: Google Maps]**
- **Opening hours:** `07:30 – 20:00` daily. **Confirmed by the owner.** This
  overrides the public listings, which disagreed with each other: Foody
  `07:30–21:35`, ShopeeFood `08:00–21:00`, Google "closes 9:30 PM". The open/closed
  readout, the day-strip and the footer all use 20:00. **[verified: owner's own
  statement]**
- **What it actually is:** a deli that bakes and fills pitas, sells by the
  100 gram, and bakes pies — not a brunch café. Its own board prints a flat 3×3
  grid of nine items and no section headings. **[verified: menu board]**
- **Amenities.** Foody records: wifi, delivery, air conditioning, takeaway,
  card payment, car parking, **"nên đặt trước" — advance booking advised**,
  outdoor seating, private room, children's area, karaoke, free motorbike
  parking, staff tipping, smoking area, red VAT invoice, event support, heating,
  disabled access, football on TV, live music.
  **The owner has confirmed that "football on TV" and "live music" are not
  true of this business, and they have been struck from the page. The whole
  Foody amenity block is therefore unverified marketing fill rather than fact;
  the remaining entries (private room, karaoke, children's area, event support)
  are still unconfirmed and are flagged for the owner. The only amenities with
  photographic proof are the outdoor terrace and its canopy, which appear in the
  shop's own Google Maps photographs.**
- **Real presence:** 543 views, 0 reviews and 0 photos on Foody; 10+ ratings on
  ShopeeFood. There is no other discoverable web footprint. **[verified: Foody,
  ShopeeFood]**

### The real menu, read off the owner's own menu boards

**31 items in 7 groups, prices exactly as printed.** Source: the owner's
photographs of the shop's boards — `menu1.jpg`, `menu2.jpg`, `menu_pies.jpg` —
plus the Napoleon price given directly (70.000 per piece).

**30 ship on the site.** Tofu Pita and Beetroot-Apple Mixed Smoothie are
excluded at the owner's instruction and are listed below for completeness.

This replaces the nine-item list from Revision 2, which was read off a different,
older board. Most of those prices were wrong, and two items in it (Hand-made
Pita Skin at 10.000, Beetroot Apple Juice) are priced quite differently now.

**Pitas** — each sold Large and Medium

| # | English | Tiếng Việt | Large | Medium |
|---|---|---|---|---|
| 1 | Salted Salmon Pita (tzatziki) | Bánh cá hồi muối tươi lạnh | 120.000 | 80.000 |
| 2 | Grilled Pork Pita (fresh mayo) | Bánh thịt heo nướng thơm | 120.000 | 80.000 |
| 3 | Roast Beef Pita (honey mustard) | Bánh thịt bò nướng mọng | 120.000 | 80.000 |
| 4 | Camembert Cheese Pita (berry) | Bánh Camembert Cheese Ý | 120.000 | 80.000 |
| 5 | Grilled Chicken Pita (tzatziki) | Bánh thịt gà nướng thơm | 120.000 | 80.000 |

*Tofu Pita (vegetarian), 80.000 / 65.000, is printed on the board but is excluded
from the site at the owner's instruction.*

**Cold Platters — per 100 gram**, the owner's name for the by-weight group
(was "Sold by weight")

| # | English | Tiếng Việt | Price |
|---|---|---|---|
| 6 | Fresh Salted Salmon | Cá hồi muối tươi | 120.000 |
| 7 | Marinated Roast Beef | Bò nướng mọng kiểu Âu | 90.000 |
| 8 | Juicy Grilled Pork Belly | Thịt heo ba rọt nướng | 90.000 |
| 9 | Grilled Chicken | Gà nướng thơm | 90.000 |

**Pies — all 180.000**

| # | English | Tiếng Việt |
|---|---|---|
| 10 | Berries Pie | Bánh nướng quả mọng |
| 11 | Apples Pie | Bánh nướng táo |
| 12 | Peaches Pie | Bánh nướng đào |
| 13 | Cheeses & Green Mixed Pie | Bánh nướng phô mai và rau mix |
| 14 | Mushrooms Mixed Pie | Bánh nướng nấm mix |

**Sweet**

| # | English | Tiếng Việt | Price |
|---|---|---|---|
| 15 | Napoleon Cake | Bánh Napoleon | 70.000 / piece |

**Bread and pickles**

| # | English | Tiếng Việt | Price |
|---|---|---|---|
| 16 | Hand Made Pita Bread | Vỏ bánh Pitas thủ công | 20.000 / piece |
| 17 | Home-made Pickle Cucumber | Dưa chuột muối chua | 50.000 / 100 gr |

**Hand-made sauces — per 100 ml**

| # | English | Price |
|---|---|---|
| 18 | Hand-made Sour Cream | 45.000 |
| 19 | Hand-made Mayonnaise | 40.000 |
| 20 | Honey Mustard Sauce | 50.000 |
| 21 | Creamy Tzatziki Sauce | 55.000 |
| 22 | Hand-made Berry Sauce | 55.000 |
| 23 | Hand-made Pesto Sauce | 40.000 |

**Drinks**

| # | English | Tiếng Việt | Price |
|---|---|---|---|
| 24 | Russian Apple Tea | Nước đun táo giãi nhiệt | 25.000 |
| 25 | Kvas | Nước lúa mạch lên men | 25.000 |
| 26 | Berry Milk-shakes | Sữa Lắc Trái Cây | 55.000 |
| 27 | Vanilla Milk-shakes | Kem Sữa Đánh Vanilla | 50.000 |
| 28 | Oreo Milk-shakes | Sữa Lắc Oreo | 55.000 |
| 29 | Coca Zero | Coca Zero | 15.000 |
| 30 | Aquafina Soda | Aquafina | 15.000 |

**Removed at the owner's instruction:** Beetroot-Apple Mixed Smoothie, 45.000
(Nước ép củ dền táo). It is printed on the board but is not offered on the
site.

**[verified: the owner's own photographs of the shop's boards, read at full
resolution; Napoleon price given directly by the owner]**

**One discrepancy worth noting.** On `menu2.jpg` the board labels *Grilled
Chicken Pita* with the Vietnamese name for grilled pork. The English name, the
photograph, and the separate 100 g "Grilled Chicken" line all say chicken, so
the Vietnamese on the board is a printing slip. The site uses **Bánh thịt gà
nướng thơm**. Worth a glance from the owner.

**A tagline found on the pie board:** the footer strip reads "BlackBird —
Appreciates your taste". **[verified: menu_pies.jpg]** Not currently used.

## Users

- Vietnamese locals in Vũng Tàu, on a phone, deciding where to eat in a few
  minutes. **[verified audience: Foody lists 543 views, ShopeeFood 10+ ratings —
  the existing audience is small and local]**
- Long-stay expat residents and holiday visitors. The terrace photograph shows
  the actual regulars: mostly European men and mixed Vietnamese groups, seated
  outdoors under the canopy from morning onward. **[verified: terrace
  photograph]**
- Families — a children's area and a private room are both recorded amenities,
  and "advance booking advised" is recorded too. **[verified: Foody]**

## Product Purpose

Get a hungry person in Vũng Tàu to N4/4 Bầu Sen 6, or onto the phone to
`038 226 4034`. Success is a first-time visitor knowing what the place is, what
it serves, what it costs, when it is open, and being able to act in seconds.

## Positioning

The one room that changes shift four times a day, 07:30 to 21:30 — pies out of
the oven in the morning, then pitas and roast meats by the hundred grams, the
lunch shift on the terrace, and a long evening close in the private room. The
business is a deli with an all-day programme, and the only artefact that says so
is the printed board on the counter.

## Operating Context

- Vũng Tàu: coastal city, fishing port, weekend and holiday destination.
- The shop is a compact white shophouse with crimson window frames, a
  cream-and-crimson striped awning, a timber door, and a marigold-and-chrysanthemum
  flower stand at the entrance. Inside: a pink-and-cream chequered floor and a
  whole wall of caps in red, black and pink hung in rows. **[verified:
  photographs]**
- Daylight phone use in glare, outside, often mid-decision.

## Capabilities and Constraints

- Menu: the nine real items, in VND, bilingual, with the Vietnamese name and the
  measure set as a small ticket beside each English name and price.
- Live open/closed state computed from the visitor's own clock — a fact, not a
  claim.
- Two phone numbers to tap, the address, a map link to the exact pin, opening
  hours, and the amenities the listing actually records.
- Order builder over the same nine real items, with a running total and a
  readable order code. No payment, no server; the phone places the order.

## Ordering — what the page actually does

The owner does not want reservations. Black Bird is a walk-in deli that sells
by the 100 gram, so a booking form was the wrong shape for the business. The
page now takes an **order** instead:

- All 30 real items are orderable. The picker is **category-first**: the seven
  groups are tabs, and only the chosen group is listed. Thirty rows in one
  column was a wall; this shows five to eight rows with every group one tap
  away. Tabs respond to ← / → as a tablist should.
- Every row carries a **real stepper — minus, count, plus — and one row per
  size**, so a pita is two countable lines (`L 120.000đ` and `M 80.000đ`) rather
  than one line with a hidden mode. A row turns crimson when it holds a
  quantity.

  Two earlier attempts were reverted at the owner's instruction, and both are
  worth recording because the reasons generalise:
  - **A stepper on all thirty rows at once** read as clutter. The fix was not
    to remove the stepper but to show one category at a time.
  - **Making the price chip itself a toggle** — tap to add, tap again to
    remove — was rejected because it could never reach a quantity above one,
    and a control that means two different things depending on its state is not
    a control anyone can predict.- The five pitas have **two chips each** (`L 120.000đ` / `M 80.000đ`), so the
  sizes are never ambiguous, and the two are independently removable.
- The cart is keyed by **item *and* size** (`"0:1"`), not by item. That is what
  lets someone order two medium salmon pitas and one large of the same pita:
  they are three separate lines, and each line totals quantity × its own size's
  price. An earlier version keyed by item alone, which made a second size on
  the same pita impossible.
- A running total is shown in đồng, in the same `85.000đ` format as the board.
- **Send order** is the primary action. It writes the order out — every line,
  quantity, size, line total, the grand total, the current Vũng Tàu time as the
  pickup time, and the phone — and hands it to Telegram, ready to send. The
  visitor picks the shop's chat and presses send. **Copy order** and the phone
  number sit below it as fallbacks, not as the main path.

  An earlier version made the phone the primary action: "set the quantities,
  then call and read out your order." The owner rejected it — *"what's the
  point of calling and reading out your order? the whole point of the website
  is to make an order."* It was the right objection. A button that says Send
  order and then asks you to phone in is not sending an order.

- The page never claims the order arrived. It has no server and no way to hear
  back, so it says nothing on that point. There is deliberately **no "order
  received" success state**, because nothing was received.

**What this cannot do yet.** Telegram has no way to pre-fill text into a plain
username chat, so a shop contact always goes through the share sheet — the
visitor picks the chat. A real bot could take the order directly, but the
`/start` payload is capped at **64 characters**, far too small for a whole
order, so a bot integration needs a server holding the bot token. `ORDER_BOT`
is wired and waiting at the top of `app.js` for when that exists. **[open]** —
owner's call on credentials and hosting.
- The page states that **ordering direct is cheaper than the delivery apps,
  which add a service fee**. The old line pointing at Foody and ShopeeFood for
  delivery has been removed at the owner's request.

**This is not a checkout, and it does not pretend to be.** There is no payment
processing and no confirmation comes back. The order is written and handed to
Telegram; sending it is the visitor's last action, and the page never says the
shop received anything.

**Planned, not built — the owner's stated direction:** a **Telegram bot** to
receive orders, and **VietQR** to take payment. Neither exists in the code yet.
When it is, `ITEMS` in `assets/app.js` is the order payload, `orderText()` is
the message body, and the share-sheet hop disappears. **[open]** — the owner's
call on the bot token, the VietQR merchant details, and where the server that
holds them runs.
- Must work on a mid-range Android on mobile data. No build step, one font
  family, images sized for a phone.
- Bilingual Vietnamese and English, Vietnamese as the default, switched without a
  reload.

## Evidence on Hand

**Real, and owned by the business.** The shop's own menu boards; the brand
lockup, the crow-and-fork mark and the tagline "We don't chirp · We chew"; the
visit card; the shop's own photographs of the frontage, the terrace, a cold
platter and a pie; the Google Maps place record; the Foody amenity list. The
address and hours are now the owner's own statements rather than any listing.

**Withdrawn by the owner's instruction.** The photograph set pulled from the
public Google Maps listing. It was not the business's own photography, and the
owner has confirmed it was wrong — it included a burger the shop does not sell
and other mismatched subjects. All of it has been deleted. It is not used, not
referenced, and not on the page in any form.

### The photographs on the page

**Two, both logos.** The cream logo in the footer; the wordmark set as live type
in the bar, which at 40px reads sharper than the raster and keeps the logo's own
colour split. The favicon is the crimson logo.

**Placed, reviewed, then cut** at the owner's instruction. The frontage, the
cold platters, a pie and the terrace were all on the page and working; the
photography was removed and the logos kept. The processed files are parked in
`restaurant_assets/processed/` so putting them back is a copy, not a re-crop,
and the 32 MB of originals sit untouched in `restaurant_assets/`.

Two things worth knowing about the source files, whichever way it goes. They
arrived as 32 MB of PNG — `Outside.png` alone was 7.4 MB and the visit card
8.9 MB — and re-encode to about 1 MB of JPEG at the sizes a phone needs. And
the visit card independently printed the address as **N4/4 Hoàng Hữu Nam**,
matching what the owner has since confirmed, so the old board's `Bầu Sen 6` is
the stale one.

`visit-card.jpg` was never on the page even during the trial: it duplicates the
footer columns and reads as a stock brand element.

**Not on hand.** A second phone number (a mobile appears on an older version of
the board but is too faint to read reliably — **[open]**). A per-day hours
table (only a single daily span is published anywhere — **[open]**). Any written
menu description beyond the item names. Any way for an order placed on this page
to reach the shop's kitchen — **[open]**, see Ordering above.

**Placeholders still on the page.** Nothing about the day's programme beyond the
amenities Foody records. `ORDER_BOT` in `app.js` is empty by design.

## Product Principles

1. The phone is the primary screen. Every fact reachable without a hover, a wide
   viewport, or a horizontal scroll.
2. The offer legible in one glance before any scrolling: what it is, whether it
   is open right now, a real price, and a way to act.
3. A real restaurant's specificity beats a template's polish — and here the
   specificity is already printed on the counter, so the page must not be softer
   than the board.
4. Editable by a non-technical owner: real text in real HTML, no CMS, no locked
   values.
5. **A wrong fact is worse than a missing one.** Every image on this site was
   deleted on the strength of one confirmed mismatch, rather than corrected one
   by one. A page that says nothing is honest; a page that says something false
   costs the customer their trust and the shop a customer.

## Accessibility & Inclusion

Bilingual copy with correct Vietnamese diacritics; body text and placeholders
at 4.5:1 or better on every surface; full keyboard operability with a visible
focus ring; tap-to-call on every phone; the live open state announced to
assistive technology; motion respects `prefers-reduced-motion`.

---

## Replacement list — what the owner must change before publishing

1. ~~**Closing time.**~~ **Settled — the page ships `07:30–20:00`, confirmed
   by the owner.** Worth correcting the public listings to match, so a customer
   does not arrive at 20:30 from a Google result.
2. ~~**Address wording.**~~ **Settled — `N4/4 Hoàng Hữu Nam, P.2, Vũng Tàu`**,
   confirmed by the owner and printed on the shop's own visit card. The page
   shows it as the address and names `N4/4 Bầu Sen 6` as the older board
   wording.
3. **The menu is 30 items because the boards have 31, less the two excluded.**
   If the kitchen sells more, they must be added in **two places**: the `.board`
   list in `index.html` and the `ITEMS` table in `assets/app.js`. The order
   builder carries its own copy of the items and prices, and the two will drift
   if only one is edited.
4. **Orders do not reach the shop, and there is no payment.** The builder
   composes an order and hands the visitor a phone number. The owner's stated
   plan is a **Telegram bot** plus **VietQR**; nothing of that is built. Owner
   action: supply the bot token, the VietQR merchant details, and decide
   whether the bot or the site is the system of record. **[open]**.
5. **Photographs.** `assets/img/` is **empty** and the page ships with no
   images. Drop the owner's own pictures in that folder. Until then the page is
   text, board and numbers — which is honest, and better than shipping pictures
   of the wrong food.
6. **Check the chicken pita's Vietnamese name.** The board prints the pork name
   against *Grilled Chicken Pita*; the site uses *Bánh thịt gà nướng thơm*.
6. **Amenities.** The list on the page is Foody's, and it has already been shown
   to contain two false entries: "football on TV" and "live music" were struck
   at the owner's instruction. **Treat the rest as unverified** — the private
   room, the children's area, karaoke and event support all come from the same
   unproven block. Confirm or delete each one.
7. **Rating.** `4.9` is Google's figure at the time of writing and will drift.
   It is not hard-coded into the copy as a boast; confirm it is still current
   before launch.
