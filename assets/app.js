/* ============================================================
   Black Bird — behaviour.
   Three jobs, no framework:
   1. the day-strip, which is both the shop's real open state
      and the page's scroll position;
   2. the VI/EN switch, which reads both strings out of the
      markup so the owner can edit either one in place;
    3. the order: quantities against the real items, a running total,
       and Send order, which writes the order out and hands it to
       Telegram ready to send.
   ============================================================ */
(function () {
  'use strict';

  /* -- the shop's hours, as published -----------------------------
     Foody said 21:35, ShopeeFood said 21:00, Google said 21:30. The
     owner has now settled it: the shop closes at 8 PM. That is the
     page's value, and it came from the owner rather than a listing. */
  var OPEN_MIN = 7 * 60 + 30;   // 07:30
  var CLOSE_MIN = 20 * 60;      // 20:00
  var TZ = 'Asia/Ho_Chi_Minh';

  /* -- where orders go ---------------------------------------------
     Send order POSTs the order to the bot's Worker, which holds the
     Telegram token server-side and forwards it to the shop. The token is
     never in this file — it is a Worker secret, because every byte served
     from this page is downloadable and a bot token in client-side
     JavaScript is a public key to the bot.

     If the Worker is unreachable the button must not pretend the order
     arrived, so it falls back to copying the order, which at least leaves
     the customer with something. */
  var ORDER_API = 'https://blackbird-bot.maybeetube.workers.dev/order';
  var SHOP_PHONE = '038 226 4034';

  /* Vũng Tàu time, whatever time zone the visitor's phone is in.
     Formatting through Intl with an explicit zone does the maths. */
  function shopNow() {
    var d = new Date();
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(d);
    } catch (e) {
      parts = null; // no Intl zone support: fall back to the device clock
    }
    var hh, mm;
    if (parts) {
      hh = parseInt(parts.filter(function (p) { return p.type === 'hour'; })[0].value, 10);
      mm = parseInt(parts.filter(function (p) { return p.type === 'minute'; })[0].value, 10);
    } else {
      hh = d.getHours();
      mm = d.getMinutes();
    }
    return { mins: hh * 60 + mm, hh: hh, mm: mm };
  }

  function hhmm(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* Three languages, in the order the owner asked for them.
     English is the default: the name, the tagline and the whole
     printed menu board are in English, and the terrace regulars are
     mostly not Vietnamese speakers. */
  var LANGS = ['en', 'vi', 'ru'];
  var DEFAULT_LANG = 'en';

  var STRINGS = {
    en: {
      open: 'Open now', until: 'until', opensAt: 'Opens at', closed: 'Closed', today: 'today',
      total: 'Total',
      copied: 'Copied', less: 'One fewer', more: 'One more', add: 'Add',
      sending: 'Sending…', sent: 'Sent ·', notSent: 'Not sent — copied',
      notSentNoCopy: 'Not sent — copy failed',
      empty: 'Nothing to send yet',
      pickup: 'Pickup',
      size: ['Large', 'Medium'], sizeShort: ['L', 'M'],      items: function (c) { return c + (c === 1 ? ' item' : ' items') + ' in your order'; }
    },
    vi: {
      open: 'Đang mở cửa', until: 'đến', opensAt: 'Mở cửa lúc', closed: 'Đã đóng cửa', today: 'hôm nay',
      total: 'Tổng',
      copied: 'Đã chép', less: 'Bớt một', more: 'Thêm một', add: 'Thêm',
      sending: 'Đang gửi…', sent: 'Đã gửi ·', notSent: 'Chưa gửi — đã chép',
      notSentNoCopy: 'Chưa gửi — không chép được',
      empty: 'Chưa có món nào để gửi',
      pickup: 'Lấy tại quán',
      size: ['Lớn', 'Vừa'], sizeShort: ['L', 'V'],
      items: function (c) { return c + ' món trong đơn của bạn'; }
    },
    ru: {
      open: 'Открыто', until: 'до', opensAt: 'Открывается в', closed: 'Закрыто', today: 'сегодня',
      total: 'Итого',
      copied: 'Скопировано', less: 'На одну меньше', more: 'Добавить', add: 'Добавить',
      sending: 'Отправка…', sent: 'Отправлено ·', notSent: 'Не отправлено — скопировано',
      notSentNoCopy: 'Не отправлено — не удалось скопировать',
      empty: 'Пока нечего отправлять',
      pickup: 'Самовывоз',
      size: ['Большой', 'Средний'], sizeShort: ['Б', 'С'],
      // Russian takes three plural forms, not two
      items: function (c) {
        var n = Math.abs(c) % 100;
        var one = n === 1;
        var few = n >= 2 && n <= 4;
        return c + ' ' + (one ? 'позиция' : few ? 'позиции' : 'позиций') + ' в вашем заказе';
      }
    }
  };

  function T() {
    var l = document.documentElement.getAttribute('data-lang');
    return STRINGS[LANGS.indexOf(l) > -1 ? l : DEFAULT_LANG];
  }

  /* ---------------------------------------------------------
     1. Day-strip: open state, now-marker, and scroll position
     --------------------------------------------------------- */
  function isOpenNow(n) { return n.mins >= OPEN_MIN && n.mins < CLOSE_MIN; }

  function paintClock() {
    var n = shopNow();
    var t = T();
    var pct = Math.max(0, Math.min(1, (n.mins - OPEN_MIN) / (CLOSE_MIN - OPEN_MIN))) * 100;

    // the bar's clock: the one fact that has to be true at all times
    var clock = document.getElementById('stripClock');
    var clockBox = document.getElementById('clock');
    if (clock) clock.textContent = hhmm(n.mins);
    if (clockBox) clockBox.setAttribute('data-open', isOpenNow(n) ? 'true' : 'false');

    // the day's programme. pct is 0-100 for the marker's `left`,
    // but scaleX() takes a 0-1 factor — feeding it the percentage
    // stretched the fill ~100x past the track.
    var dFill = document.getElementById('dayFill');
    var dNow = document.getElementById('dayNow');
    if (dFill) dFill.style.transform = 'scaleX(' + (pct / 100) + ')';
    if (dNow) dNow.style.left = pct + '%';

    // the readout: one readout, one truth
    var state = document.getElementById('state');
    var word = document.getElementById('stateWord');
    var until = document.getElementById('stateUntil');
    var live = document.getElementById('stateLive');
    if (!state || !word) return;

    var isOpen = isOpenNow(n);
    if (isOpen) {
      state.setAttribute('data-state', 'open');
      word.textContent = t.open;
      until.textContent = t.until + ' ' + hhmm(CLOSE_MIN);
    } else {
      state.setAttribute('data-state', 'closed');
      word.textContent = t.closed;
      // before opening: say when it opens; after closing: it opens tomorrow
      var next = n.mins < OPEN_MIN ? OPEN_MIN : CLOSE_MIN;
      until.textContent = t.opensAt + ' ' + hhmm(next) + (n.mins >= CLOSE_MIN ? ' (' + t.today + ')' : '');
    }
    if (live) {
      live.textContent = isOpen
        ? t.open + ', ' + t.until + ' ' + hhmm(CLOSE_MIN)
        : t.closed + ', ' + until.textContent;
    }
  }

  /* The bar's own hairline is the page's scroll position: the
     day-strip and the progress bar are one line doing two jobs. */
  function paintProgress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
    var bar = document.getElementById('prog');
    if (bar) bar.style.transform = 'scaleX(' + p + ')';
  }

  function paintDock() {
    var dock = document.getElementById('dock');
    if (!dock) return;
    var y = window.scrollY;
    var show = y > 520 || y + window.innerHeight > document.documentElement.scrollHeight - 120;
    if (window.innerWidth <= 760 && show) dock.setAttribute('data-show', '');
    else dock.removeAttribute('data-show');
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      paintProgress();
      paintDock();
      ticking = false;
    });
  }

  /* ---------------------------------------------------------
     2. EN / VI / RU — all three strings live in the markup
     --------------------------------------------------------- */
  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = DEFAULT_LANG;
    var root = document.documentElement;
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);

    var nodes = document.querySelectorAll('[data-vi],[data-en],[data-ru]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var want = el.getAttribute('data-' + lang);
      if (want == null) want = el.getAttribute('data-en');
      if (want == null) want = el.getAttribute('data-vi');
      if (want == null) continue;

      var ph = el.getAttribute('data-' + lang + '-ph') || el.getAttribute('data-en-ph') || el.getAttribute('data-vi-ph');
      if (ph != null) el.setAttribute('placeholder', ph);

      if (el.tagName === 'META') el.setAttribute('content', want);
      else if (el.hasAttribute('alt')) el.setAttribute('alt', want);
      else el.textContent = want;
    }

    // the toggle
    var btns = document.querySelectorAll('[data-setlang]');
    for (var b = 0; b < btns.length; b++) {
      btns[b].setAttribute('aria-pressed', btns[b].getAttribute('data-setlang') === lang ? 'true' : 'false');
    }

      try { localStorage.setItem('bb-lang', lang); } catch (e) {}
      paintClock();
      // the picker is built in JS, so the switch has to be told
      if (typeof labelChips === 'function' && document.getElementById('orderList')) {
        labelChips();
        var sel = document.querySelector('#orderList .ptab[aria-selected="true"]');
        if (sel) showGroup(parseInt(sel.dataset.g, 10));
        paintOrder();
      }
    }

  function wireLang() {
    var btns = document.querySelectorAll('[data-setlang]');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          applyLang(btn.getAttribute('data-setlang'));
        });
      })(btns[i]);
    }
  }

  /* ---------------------------------------------------------
     3. The order: quantities against the same real items and
        prices as the board, a running total in đồng, and an
        itemised list to read down the phone. No server, and no
        pretence of one — the shop is a walk-in counter and the
        phone is the channel. Payment (Telegram + VietQR) is
        a later step; see PRODUCT.md.
     --------------------------------------------------------- */
  var ITEMS = [
    // pitas: two sizes, and the size changes the price
    { g: 1, price: 120000, sizes: [120000, 80000], en: 'Salted Salmon Pita',       vi: 'Bánh cá hồi muối tươi lạnh', ru: 'Пита с солёным лососем' },
    { g: 1, price: 120000, sizes: [120000, 80000], en: 'Grilled Pork Pita',        vi: 'Bánh thịt heo nướng thơm',   ru: 'Пита с жареной свининой' },
    { g: 1, price: 120000, sizes: [120000, 80000], en: 'Roast Beef Pita',          vi: 'Bánh thịt bò nướng mọng',    ru: 'Пита с жареной говядиной' },
    { g: 1, price: 120000, sizes: [120000, 80000], en: 'Camembert Cheese Pita',    vi: 'Bánh Camembert Cheese Ý',   ru: 'Пита с камамбером' },
    { g: 1, price: 120000, sizes: [120000, 80000], en: 'Grilled Chicken Pita',     vi: 'Bánh thịt gà nướng thơm',    ru: 'Пита с жареной курицей' },

    { g: 2, price: 120000, en: 'Fresh Salted Salmon',            vi: 'Cá hồi muối tươi',          ru: 'Солёный лосось, 100 г' },
    { g: 2, price: 90000,  en: 'Marinated Roast Beef',            vi: 'Bò nướng mọng kiểu Âu',     ru: 'Говядина копчёная, 100 г' },
    { g: 2, price: 90000,  en: 'Juicy Grilled Pork Belly',        vi: 'Thịt heo ba rọt nướng',    ru: 'Жареная свинина, 100 г' },
    { g: 2, price: 90000,  en: 'Grilled Chicken',                vi: 'Gà nướng thơm',              ru: 'Жареная курица, 100 г' },

    { g: 3, price: 180000, en: 'Berries Pie',                    vi: 'Bánh nướng quả mọng',       ru: 'Пирог с ягодами' },
    { g: 3, price: 180000, en: 'Apples Pie',                     vi: 'Bánh nướng táo',             ru: 'Пирог с яблоками' },
    { g: 3, price: 180000, en: 'Peaches Pie',                    vi: 'Bánh nướng đào',             ru: 'Пирог с персиками' },
    { g: 3, price: 180000, en: 'Cheeses & Green Mixed Pie',      vi: 'Bánh nướng phô mai và rau',  ru: 'Пирог с сыром и зеленью' },
    { g: 3, price: 180000, en: 'Mushrooms Mixed Pie',            vi: 'Bánh nướng nấm',            ru: 'Пирог с грибами' },

    { g: 4, price: 70000,  en: 'Napoleon Cake',                  vi: 'Bánh Napoleon',              ru: 'Наполеон' },
    { g: 4, price: 500000, en: 'Full Napoleon Cake',            vi: 'Bánh Napoleon nguyên cái',   ru: 'Наполеон целый' },

    { g: 5, price: 20000,  en: 'Hand Made Pita Bread',           vi: 'Vỏ bánh Pitas thủ công',     ru: 'Питный хлеб' },
    { g: 5, price: 50000,  en: 'Home-made Pickle Cucumber',      vi: 'Dưa chuột muối chua',       ru: 'Домашние соленья' },

    { g: 6, price: 45000,  en: 'Hand-made Sour Cream',           vi: 'Sốt chua',                   ru: 'Сметана' },
    { g: 6, price: 40000,  en: 'Hand-made Mayonnaise',           vi: 'Sốt mayonnaise',             ru: 'Майонез' },
    { g: 6, price: 50000,  en: 'Honey Mustard Sauce',            vi: 'Sốt mật ong mù tạng',       ru: 'Медово-горчичный соус' },
    { g: 6, price: 55000,  en: 'Creamy Tzatziki Sauce',          vi: 'Sốt tzatziki',              ru: 'Соус цатцики' },
    { g: 6, price: 55000,  en: 'Hand-made Berry Sauce',          vi: 'Sốt quả mọng',              ru: 'Ягодный соус' },
    { g: 6, price: 40000,  en: 'Hand-made Pesto Sauce',          vi: 'Sốt pesto',                 ru: 'Соус песто' },

    { g: 7, price: 25000,  en: 'Russian Apple Tea',              vi: 'Nước đun táo giãi nhiệt',    ru: 'Русский яблочный чай' },
    { g: 7, price: 25000,  en: 'Kvas',                           vi: 'Nước lúa mạch lên men',     ru: 'Квас' },
    { g: 7, price: 55000,  en: 'Berry Milk-shakes',              vi: 'Sữa lắc trái cây',          ru: 'Ягодный молочный коктейль' },
    { g: 7, price: 50000,  en: 'Vanilla Milk-shakes',            vi: 'Kem sữa đánh vanilla',      ru: 'Ванильный молочный коктейль' },
    { g: 7, price: 55000,  en: 'Oreo Milk-shakes',               vi: 'Sữa lắc Oreo',              ru: 'Молочный коктейль Oreo' },
    { g: 7, price: 15000,  en: 'Coca Zero',                      vi: 'Coca Zero',                  ru: 'Coca Zero' },
    { g: 7, price: 15000,  en: 'Aquafina Soda',                  vi: 'Aquafina',                   ru: 'Aquafina' }
  ];

  var GROUPS = [
    { en: 'Pitas',           vi: 'Bánh mì pita',  ru: 'Питы' },
    { en: 'Cold Platters',   vi: 'Mâm lạnh',      ru: 'Холодные закуски' },
    { en: 'Pies',            vi: 'Bánh nướng',    ru: 'Пироги' },
    { en: 'Sweet',           vi: 'Bánh ngọt',     ru: 'Сладкое' },
    { en: 'Bread and pickles', vi: 'Vỏ bánh và dưa muối', ru: 'Тесто и соленья' },
    { en: 'Hand-made sauces', vi: 'Sốt làm tại quán', ru: 'Соусы' },
    { en: 'Drinks',          vi: 'Đồ uống',       ru: 'Напитки' }
  ];

  var MAX_QTY = 99;

  /* 85.000đ — the way the board prints it, not 85,000. */
  function vnd(n) {
    var s = String(Math.round(n));
    var out = '';
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 === 0) out += '.';
      out += s[i];
    }
    return out + 'đ';
  }

  /* A cart keyed by ITEM:SIZE, not by item. That is what lets someone
     order two medium salmon pitas and one large of the same pita — they
     are three separate lines, and the line total is q × the size's
     price. Items with no size choice are just ITEMS[i]:0. */
  var cart = {};

  function vkey(i, s) { return i + ':' + s; }

  function priceOf(i, s) {
    var it = ITEMS[i];
    return (it.sizes && it.sizes[s]) || it.price;
  }

  function qtyOf(key) { return cart[key] || 0; }

  function bump(i, s, delta) {
    var k = vkey(i, s);
    var q = Math.max(0, Math.min(MAX_QTY, qtyOf(k) + delta));
    if (q === 0) delete cart[k]; else cart[k] = q;
    return q;
  }

  function cartTotal() {
    var t = 0;
    for (var k in cart) {
      if (!cart.hasOwnProperty(k)) continue;
      var p = k.split(':');
      t += cart[k] * priceOf(parseInt(p[0], 10), parseInt(p[1], 10));
    }
    return t;
  }

  function cartCount() {
    var n = 0;
    for (var k in cart) if (cart.hasOwnProperty(k)) n += cart[k];
    return n;
  }

  /* The picker is category-first. Thirty rows in one column is a wall, so
     the seven groups become tabs and only the chosen group is listed.

     Every row carries a real stepper: minus, count, plus. An earlier
     version made the price chip itself a toggle — tap to add, tap again to
     remove. That could never reach a quantity above one, and a control that
     means two different things depending on its state is not a control
     anyone can predict. A stepper says what it does. */
  function buildOrderList() {
    var host = document.getElementById('orderList');
    if (!host) return;
    var t = T();

    GROUPS.forEach(function (g, gi) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'ptab';
      tab.dataset.g = String(gi + 1);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('data-vi', g.vi);
      tab.setAttribute('data-en', g.en);
      tab.setAttribute('data-ru', g.ru);
      tab.textContent = g.en;
      host.appendChild(tab);
    });

    var pane = document.createElement('div');
    pane.className = 'ppane';
    pane.id = 'orderPane';
    pane.setAttribute('role', 'tabpanel');
    host.parentNode.insertBefore(pane, host.nextSibling);

    GROUPS.forEach(function (g, gi) {
      var list = document.createElement('ul');
      list.className = 'plist';
      list.dataset.g = String(gi + 1);
      // NOT data-vi/en/ru: the language switcher treats any element
      // carrying those as a translatable leaf and replaces its
      // textContent, which would wipe every row in this list.
      list.setAttribute('data-gen', g.en);
      list.setAttribute('data-gvi', g.vi);
      list.setAttribute('data-gru', g.ru);
      list.setAttribute('aria-label', g.en);

      ITEMS.forEach(function (it, ix) {
        if (it.g !== gi + 1) return;

        var li = document.createElement('li');
        li.className = 'pline';

        var name = document.createElement('p');
        name.className = 'pline__name';
        name.setAttribute('data-vi', it.vi);
        name.setAttribute('data-en', it.en);
        name.setAttribute('data-ru', it.ru);
        name.textContent = it.en;

        var vars = document.createElement('div');
        vars.className = 'pline__vars';

        // a two-size pita gets one stepper per size, so the sizes are
        // separate things you can count, not a hidden mode
        var sizes = it.sizes ? [0, 1] : [0];
        sizes.forEach(function (si) {
          var v = document.createElement('div');
          v.className = 'pvar';
          v.dataset.i = String(ix);
          v.dataset.s = String(si);

          var lab = document.createElement('span');
          lab.className = 'pvar__lab';
          lab.textContent = it.sizes ? t.sizeShort[si] : '';

          var price = document.createElement('span');
          price.className = 'pvar__price num';
          price.textContent = vnd(priceOf(ix, si));

          var qty = document.createElement('div');
          qty.className = 'oqty';

          var minus = document.createElement('button');
          minus.type = 'button';
          minus.className = 'oqty__b';
          minus.dataset.act = 'minus';
          minus.setAttribute('aria-label', t.less + ' ' + it.en);
          minus.textContent = '−';

          var out = document.createElement('output');
          out.className = 'oqty__n num';
          out.textContent = '0';

          var plus = document.createElement('button');
          plus.type = 'button';
          plus.className = 'oqty__b';
          plus.dataset.act = 'plus';
          plus.setAttribute('aria-label', t.more + ' ' + it.en);
          plus.textContent = '+';

          qty.appendChild(minus);
          qty.appendChild(out);
          qty.appendChild(plus);
          v.appendChild(lab);
          v.appendChild(price);
          v.appendChild(qty);
          vars.appendChild(v);
        });

        li.appendChild(name);
        li.appendChild(vars);
        list.appendChild(li);
      });

      pane.appendChild(list);
    });

    showGroup(1);
  }

  function showGroup(g) {
    var tabs = document.querySelectorAll('#orderList .ptab');
    for (var i = 0; i < tabs.length; i++) {
      var on = parseInt(tabs[i].dataset.g, 10) === g;
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
      tabs[i].setAttribute('tabindex', on ? '0' : '-1');
    }
    var lists = document.querySelectorAll('#orderPane .plist');
    for (var j = 0; j < lists.length; j++) {
      lists[j].hidden = parseInt(lists[j].dataset.g, 10) !== g;
    }
  }

  function labelChips() {
    // labels are set at build time from the item name; nothing to redo
  }

  function paintOrder() {
    var sum = document.getElementById('orderSum');
    var lang = document.documentElement.getAttribute('data-lang') || 'en';
    var t = T();
    var any = cartCount() > 0;

    var vars = document.querySelectorAll('#orderPane .pvar');
    for (var v = 0; v < vars.length; v++) {
      var i = parseInt(vars[v].dataset.i, 10);
      var s = parseInt(vars[v].dataset.s, 10);
      var n = qtyOf(vkey(i, s));
      vars[v].setAttribute('data-on', n ? 'true' : 'false');
      vars[v].querySelector('.oqty__n').textContent = String(n);
    }

    // the order itself, rebuilt from scratch each time
    var ol = document.getElementById('orderLines');
    if (ol) {
      ol.innerHTML = '';
      for (var key in cart) {
        if (!cart.hasOwnProperty(key)) continue;
        var parts = key.split(':');
        var i = parseInt(parts[0], 10);
        var s = parseInt(parts[1], 10);
        var it = ITEMS[i];
        var nm = (lang === 'vi' ? it.vi : lang === 'ru' ? it.ru : it.en);

        var li = document.createElement('li');
        li.className = 'oline';
        li.setAttribute('data-k', key);

        var label = document.createElement('span');
        label.className = 'oline__name';
        label.textContent = nm + (it.sizes ? ' · ' + t.size[s] : '');

        var step = document.createElement('div');
        step.className = 'oqty';
        var minus = document.createElement('button');
        minus.type = 'button';
        minus.className = 'oqty__b';
        minus.dataset.act = 'minus';
        minus.dataset.k = key;
        minus.setAttribute('aria-label', t.less + ' ' + nm);
        minus.textContent = '−';
        var out = document.createElement('output');
        out.className = 'oqty__n num';
        out.textContent = String(cart[key]);
        var plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'oqty__b';
        plus.dataset.act = 'plus';
        plus.dataset.k = key;
        plus.setAttribute('aria-label', t.more + ' ' + nm);
        plus.textContent = '+';
        step.appendChild(minus);
        step.appendChild(out);
        step.appendChild(plus);

        var sum_ = document.createElement('span');
        sum_.className = 'oline__sum num';
        sum_.textContent = vnd(priceOf(i, s) * cart[key]);

        li.appendChild(label);
        li.appendChild(step);
        li.appendChild(sum_);
        ol.appendChild(li);
      }
    }

    if (sum) sum.hidden = !any;
    var total = document.getElementById('orderTotal');
    if (total) total.textContent = vnd(cartTotal());
    var count = document.getElementById('orderCount');
    if (count) count.textContent = t.items(cartCount());
  }

  function orderText() {
    var lang = document.documentElement.getAttribute('data-lang') || 'en';
    var t = T();
    var lines = ['Black Bird — order'];
    for (var key in cart) {
      if (!cart.hasOwnProperty(key)) continue;
      var p = key.split(':');
      var i = parseInt(p[0], 10);
      var s = parseInt(p[1], 10);
      var it = ITEMS[i];
      var nm = (lang === 'vi' ? it.vi : lang === 'ru' ? it.ru : it.en);
      lines.push(cart[key] + ' × ' + nm + (it.sizes ? ' · ' + t.size[s] : '') +
        ' — ' + vnd(priceOf(i, s) * cart[key]));
    }
    lines.push(t.total + ': ' + vnd(cartTotal()));
    var n = shopNow();
    lines.push(T().pickup + ' ' + hhmm(n.mins) + ' · ' + SHOP_PHONE);
    return lines.join('\n');
  }

  function orderLines() {
    var lang = document.documentElement.getAttribute('data-lang') || 'en';
    var t = T();
    var out = [];
    for (var key in cart) {
      if (!cart.hasOwnProperty(key)) continue;
      var p = key.split(':');
      var i = parseInt(p[0], 10);
      var s = parseInt(p[1], 10);
      var it = ITEMS[i];
      var nm = (lang === 'vi' ? it.vi : lang === 'ru' ? it.ru : it.en);
      out.push(cart[key] + ' × ' + nm + (it.sizes ? ' · ' + t.size[s] : '') +
        ' — ' + vnd(priceOf(i, s) * cart[key]));
    }
    return out;
  }

  function sendOrder(btn) {
    var busy = function (msg) { flash(btn, msg); };

    // An empty order cannot be sent, and returning in silence is the same
    // thing to the person pressing the button as a send that failed. Say so.
    if (cartCount() === 0) {
      busy(T().empty);
      return;
    }
    var text = orderText();
    var lines = orderLines();

    if (!ORDER_API) {
      fallbackCopy(text, function (ok) { busy(ok ? T().copied : T().notSentNoCopy); });
      return;
    }

    busy(T().sending);

    // A request that never settles leaves the button reading "Sending…"
    // forever, which reads as though the order is on its way. Give it a
    // deadline and say so if it passes. 12s: the bot call is one round
    // trip to Telegram, so anything slower is a failure, not a wait.
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);

    fetch(ORDER_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({
        lines: lines,
        total: vnd(cartTotal()),
        pickup: T().pickup + ' ' + hhmm(shopNow().mins),
        customer_chat_id: null,
      })
    }).then(function (r) {
      clearTimeout(timer);
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (res.ok && res.j && res.j.ok) {
        busy(T().sent + ' ' + res.j.ref);
      } else {
        // The order did not reach the shop. Say so, and still hand the
        // customer something they can read out or paste.
        var err = (res.j && res.j.error) || 'unknown';
        fallbackCopy(text, function (ok) {
          busy(ok ? T().notSent : T().notSentNoCopy);
        });
        if (window.console) console.warn('order not delivered:', err);
      }
    }).catch(function (e) {
      clearTimeout(timer);
      fallbackCopy(text, function (ok) { busy(ok ? T().notSent : T().notSentNoCopy); });
      if (window.console) console.warn('order request failed:', e);
    });
  }

  function wireOrder() {
    buildOrderList();
    var host = document.getElementById('orderList');
    if (!host) return;
    labelChips();

    // category tabs
    var cur = 1;
    host.addEventListener('click', function (e) {
      var tab = e.target.closest('.ptab');
      if (!tab) return;
      cur = parseInt(tab.dataset.g, 10);
      showGroup(cur);
    });

    // left/right arrows move between tabs, as a tablist should
    host.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var d = e.key === 'ArrowRight' ? 1 : -1;
      cur = ((cur - 1 + d + GROUPS.length) % GROUPS.length) + 1;
      showGroup(cur);
      var t = host.querySelector('.ptab[data-g="' + cur + '"]');
      if (t) t.focus();
      e.preventDefault();
    });

    // the pane: a plain minus / plus on whichever row was pressed
    var pane = document.getElementById('orderPane');
    if (pane) {
      pane.addEventListener('click', function (e) {
        var b = e.target.closest('.oqty__b');
        if (!b) return;
        var v = b.closest('.pvar');
        bump(parseInt(v.dataset.i, 10), parseInt(v.dataset.s, 10),
             b.dataset.act === 'plus' ? 1 : -1);
        paintOrder();
      });
    }

    var lines = document.getElementById('orderLines');
    if (lines) {
      lines.addEventListener('click', function (e) {
        var b = e.target.closest('.oqty__b');
        if (!b) return;
        var parts = b.dataset.k.split(':');
        bump(parseInt(parts[0], 10), parseInt(parts[1], 10),
             b.dataset.act === 'plus' ? 1 : -1);
        paintOrder();
      });
    }

    var copy = document.getElementById('copyOrder');
    if (copy) {
      copy.addEventListener('click', function () {
        if (cartCount() === 0) return;
        var text = orderText();
        var done = function (ok) { flash(copy, ok ? T().copied : T().notSentNoCopy); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
        } else {
          fallbackCopy(text, done);
        }
      });
    }

    var send = document.getElementById('sendOrder');
    if (send) {
      send.addEventListener('click', function () { sendOrder(send); });
    }

    paintOrder();
  }

  /* clipboard API needs a secure context, which file:// and plain
     http are not — so there is a selection-based path behind it.

     done(ok) is always called, true or false. When this fell out of the
     failure branch silently, a browser that refused both copy paths left
     the button reading "Sending…" forever: the order had not arrived, the
     clipboard had nothing, and the page said neither. */
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    done(ok);
  }

  var flashTimer = null;
  function flash(el, msg) {
    if (!el) return;
    var prev = el.getAttribute('data-label');
    if (prev) el.textContent = prev;
    el.setAttribute('data-label', el.textContent);
    el.textContent = msg;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      el.textContent = el.getAttribute('data-label') || el.textContent;
      el.removeAttribute('data-label');
    }, 2200);
  }


  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  function init() {
    var saved = null;
    try { saved = localStorage.getItem('bb-lang'); } catch (e) {}
    applyLang(LANGS.indexOf(saved) > -1 ? saved : DEFAULT_LANG);

    wireLang();
    wireOrder();
    paintProgress();
    paintDock();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('focus', paintClock);
    // keep the state honest if the page is left open across closing time
    setInterval(paintClock, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
