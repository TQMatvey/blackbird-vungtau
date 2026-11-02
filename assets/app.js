(function () {
  "use strict";
  var lang = "en",
    cart = {},
    busy = false,
    sentRef = null;
  try {
    var saved = localStorage.getItem("bb-lang");
    if (["en", "vi", "ru"].indexOf(saved) >= 0) lang = saved;
  } catch (e) {}
  var text = {
    en: {
      menu: "The menu",
      yourOrder: "Your order",
      intro:
        "Pitas baked on the spot. Pies made to order. Come hungry, leave happy.",
      browse: "Find your next bite",
      daily: "daily",
      pitas: "Salted Salmon Pita",
      menuNote:
        "Choose your food. Add it here. We’ll keep your order together.",
      checkoutIntro:
        "Everything you’ve picked, all in one place. Check your items and leave your details.",
      preview: "Design preview — orders and payments are not sent.",
      call: "Or call the shop ↗",
      total: "Total",
      name: "Your name",
      phone: "Phone number",
      address: "Address (optional)",
      review: "Preview your order",
      visit: "Find us",
      directions: "Get directions ↗",
      contact: "Say hello",
      empty: "Your order is empty. Add something from the menu above.",
      add: "Add",
      less: "Remove one",
      more: "Add one",
      items: "items",
      item: "item",
      open: "Open now · until 20:00",
      closed: "Closed now · opens at 07:30",
      result:
        "Your order is ready to review. This preview has not sent it to the shop.",
      need: "Add an item from the menu first.",
    },
    vi: {
      menu: "Thực đơn",
      yourOrder: "Đơn của bạn",
      intro: "Bánh pita nướng tại chỗ. Bánh nướng làm theo yêu cầu.",
      browse: "Chọn món ngon",
      daily: "hằng ngày",
      pitas: "Bánh pita cá hồi muối",
      menuNote: "Chọn món và thêm vào đơn ngay tại đây.",
      checkoutIntro: "Xem lại các món đã chọn và điền thông tin liên hệ.",
      preview: "Bản xem thử — không gửi đơn hoặc thanh toán.",
      call: "Hoặc gọi cho quán ↗",
      total: "Tổng cộng",
      name: "Tên của bạn",
      phone: "Số điện thoại",
      address: "Địa chỉ (không bắt buộc)",
      review: "Xem thử đơn hàng",
      visit: "Ghé quán",
      directions: "Chỉ đường ↗",
      contact: "Liên hệ",
      empty: "Chưa có món nào. Hãy chọn món từ thực đơn bên trên.",
      add: "Thêm",
      less: "Bớt một",
      more: "Thêm một",
      items: "món",
      item: "món",
      open: "Đang mở cửa · đến 20:00",
      closed: "Đã đóng cửa · mở lúc 07:30",
      result: "Đơn đã sẵn sàng để xem lại. Bản xem thử chưa gửi đơn đến quán.",
      need: "Hãy thêm món từ thực đơn trước.",
    },
    ru: {
      menu: "Меню",
      yourOrder: "Ваш заказ",
      intro: "Питы пекут на месте. Пироги готовят на заказ.",
      browse: "Выбрать блюда",
      daily: "ежедневно",
      pitas: "Пита с солёным лососем",
      menuNote: "Выбирайте блюда и добавляйте их в заказ прямо здесь.",
      checkoutIntro:
        "Все выбранные блюда в одном месте. Проверьте заказ и оставьте контакты.",
      preview: "Предпросмотр — заказы и платежи не отправляются.",
      call: "Или позвоните нам ↗",
      total: "Итого",
      name: "Ваше имя",
      phone: "Номер телефона",
      address: "Адрес (необязательно)",
      review: "Посмотреть заказ",
      visit: "Приходите",
      directions: "Как добраться ↗",
      contact: "Связаться",
      empty: "В заказе пока ничего нет. Выберите блюда в меню выше.",
      add: "Добавить",
      less: "Убрать одну",
      more: "Добавить одну",
      items: "позиций",
      item: "позиция",
      open: "Открыто · до 20:00",
      closed: "Закрыто · открываемся в 07:30",
      result:
        "Заказ готов к просмотру. Предпросмотр не отправляет его в заведение.",
      need: "Сначала добавьте блюда из меню.",
    },
  };
  function t(key) {
    return text[lang][key] || text.en[key] || key;
  }
  function money(n) {
    return n.toLocaleString("vi-VN") + "₫";
  }
  function node(tag, cls, content) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (content != null) e.textContent = content;
    return e;
  }
  function price(i, s) {
    return ITEMS[i].sizes ? ITEMS[i].sizes[s] : ITEMS[i].price;
  }
  function count() {
    return Object.keys(cart).reduce(function (n, k) {
      return n + cart[k];
    }, 0);
  }
  function total() {
    return Object.keys(cart).reduce(function (n, k) {
      var p = k.split(":");
      return n + price(+p[0], +p[1]) * cart[k];
    }, 0);
  }
  function step(i, s) {
    var key = i + ":" + s,
      q = cart[key] || 0,
      wrap = node("div", "step" + (q ? " selected" : ""));
    function button(label, delta, cls) {
      var b = node("button", cls, label);
      b.type = "button";
      b.setAttribute(
        "aria-label",
        (delta > 0 ? t("more") : t("less")) +
          " " +
          ITEMS[i][lang] +
          (ITEMS[i].sizes ? " " + ["L", "M"][s] : ""),
      );
      b.onclick = function () {
        if (busy) return;
        sentRef = null;
        document.getElementById("payBox").hidden = true;
        document.getElementById("status").textContent = "";
        var inReceipt = !!b.closest(".cart-line");
        var active = document.activeElement;
        cart[key] = Math.max(0, Math.min(99, (cart[key] || 0) + delta));
        if (!cart[key]) delete cart[key];
        render();
        var target = document.querySelector(
          (inReceipt ? "#cartLines " : "#catalog ") +
            '[data-step="' +
            key +
            '"] button:last-child',
        );
        if (target && active) target.focus({ preventScroll: true });
      };
      return b;
    }
    wrap.setAttribute("data-step", key);
    if (q) {
      wrap.appendChild(button("−", -1));
      wrap.appendChild(node("output", "", q));
      wrap.appendChild(button("+", 1));
    } else wrap.appendChild(button(t("add"), 1, "add"));
    return wrap;
  }
  function render() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-en]").forEach(function (el) {
      el.textContent =
        el.getAttribute("data-" + lang) || el.getAttribute("data-en");
    });
    document.querySelectorAll("[data-t]").forEach(function (el) {
      el.textContent = t(el.dataset.t);
    });
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        b.dataset.lang === lang ? "true" : "false",
      );
    });
    var mins;
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .format(new Date())
        .split(":");
      mins = +parts[0] * 60 + +parts[1];
    } catch (e) {
      mins = 0;
    }
    document.getElementById("open").textContent = t(
      mins >= 450 && mins < 1200 ? "open" : "closed",
    );
    var nav = document.getElementById("categories"),
      catalog = document.getElementById("catalog");
    nav.textContent = "";
    catalog.textContent = "";
    GROUPS.forEach(function (g, gi) {
      var a = node("a", "", g[lang]);
      a.href = "#group-" + (gi + 1);
      nav.appendChild(a);
      var section = node("section", "menu-section");
      section.id = "group-" + (gi + 1);
      var heading = node("div", "group-heading");
      heading.appendChild(node("h3", "", g[lang]));
      section.appendChild(heading);
      var list = node("div", "items");
      ITEMS.forEach(function (it, i) {
        if (it.g !== gi + 1) return;
        var dish = node("article", "dish");
        var photo = node("div", "dish-photo"),
          img = node("img");
        img.src = "assets/img/menu/" + GALLERY[it.en] + ".webp";
        img.alt = it[lang];
        img.loading = "lazy";
        photo.tabIndex = 0;
        photo.setAttribute("role", "button");
        photo.setAttribute("aria-label", it[lang]);
        function view() {
          document.getElementById("fullPhoto").src =
            "assets/img/menu/" + GALLERY[it.en] + "@2x.webp";
          document.getElementById("fullPhoto").alt = it[lang];
          document.getElementById("photoCaption").textContent = it[lang];
          document.getElementById("photoDialog").showModal();
        }
        photo.onclick = view;
        photo.onkeydown = function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            view();
          }
        };
        photo.appendChild(img);
        dish.appendChild(photo);
        var info = node("div", "dish-info");
        info.appendChild(node("h4", "", it[lang]));
        var variants = node("div", "variants");
        (it.sizes ? [0, 1] : [0]).forEach(function (s) {
          var v = node("div", "variant");
          if (it.sizes) v.appendChild(node("span", "size", ["L", "M"][s]));
          v.appendChild(node("span", "price", money(price(i, s))));
          v.appendChild(step(i, s));
          variants.appendChild(v);
        });
        info.appendChild(variants);
        dish.appendChild(info);
        list.appendChild(dish);
      });
      section.appendChild(list);
      catalog.appendChild(section);
    });
    var lines = document.getElementById("cartLines");
    lines.textContent = "";
    if (!count()) lines.appendChild(node("p", "empty", t("empty")));
    Object.keys(cart).forEach(function (k) {
      var p = k.split(":"),
        i = +p[0],
        s = +p[1],
        line = node("div", "cart-line"),
        label = node(
          "div",
          "",
          ITEMS[i][lang] + (ITEMS[i].sizes ? " · " + ["L", "M"][s] : ""),
        );
      label.appendChild(node("small", "", money(price(i, s) * cart[k])));
      line.appendChild(label);
      line.appendChild(step(i, s));
      lines.appendChild(line);
    });
    document.getElementById("total").textContent = money(total());
    document.getElementById("basket").hidden = !count();
    document.getElementById("basketCount").textContent =
      count() +
      " " +
      t(count() === 1 ? "item" : "items") +
      " · " +
      t("yourOrder");
    document.getElementById("basketTotal").textContent = money(total());
  }
  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.onclick = function () {
      lang = b.dataset.lang;
      try {
        localStorage.setItem("bb-lang", lang);
      } catch (e) {}
      render();
    };
  });
  var messages = {
    en: {
      send: "Send order",
      copy: "Copy order",
      sending: "Sending…",
      sent: "Sent to the shop. Order reference: ",
      failed: "Not sent. Please copy your order or call the shop.",
      copied: "Order copied.",
      copyFailed: "Could not copy. Please call 038 226 4034.",
      phoneError: "Enter a valid phone number, for example 091 234 56 78.",
    },
    vi: {
      send: "Gửi đơn",
      copy: "Sao chép đơn",
      sending: "Đang gửi…",
      sent: "Đã gửi đến quán. Mã đơn: ",
      failed: "Chưa gửi được. Vui lòng sao chép đơn hoặc gọi cho quán.",
      copied: "Đã sao chép đơn.",
      copyFailed: "Không sao chép được. Vui lòng gọi 038 226 4034.",
      phoneError: "Nhập số điện thoại hợp lệ, ví dụ 091 234 56 78.",
    },
    ru: {
      send: "Отправить заказ",
      copy: "Скопировать заказ",
      sending: "Отправка…",
      sent: "Отправлено в заведение. Номер заказа: ",
      failed: "Не отправлено. Скопируйте заказ или позвоните нам.",
      copied: "Заказ скопирован.",
      copyFailed: "Не удалось скопировать. Позвоните 038 226 4034.",
      phoneError: "Введите корректный номер телефона, например 091 234 56 78.",
    },
  };
  Object.keys(messages).forEach(function (l) {
    Object.assign(text[l], messages[l]);
  });
  function T() {
    return text[lang];
  }
  function vnd(n) {
    return money(n);
  }
  function fallbackCopy(value, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(
        function () {
          done(true);
        },
        function () {
          legacy();
        },
      );
    } else legacy();
    function legacy() {
      var a = document.createElement("textarea");
      a.value = value;
      a.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(a);
      a.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {}
      a.remove();
      done(ok);
    }
  }
  function lines(l) {
    return Object.keys(cart).map(function (k) {
      var p = k.split(":"),
        i = +p[0],
        s = +p[1];
      return (
        cart[k] +
        " × " +
        ITEMS[i][l] +
        (ITEMS[i].sizes
          ? " · " + (l === "en" ? ["Large", "Medium"][s] : ["L", "M"][s])
          : "") +
        " — " +
        money(price(i, s) * cart[k])
      );
    });
  }
  function customer() {
    var f = document.getElementById("orderForm");
    return {
      name: f.elements.name.value.trim(),
      phone: f.elements.phone.value.trim(),
      address: f.elements.address.value.trim(),
    };
  }
  document.getElementById("copyOrder").onclick = function () {
    var c = customer();
    fallbackCopy(
      ["Black Bird", c.name, c.phone, c.address]
        .concat(lines(lang), [t("total") + ": " + money(total())])
        .filter(Boolean)
        .join("\n"),
      function (ok) {
        document.getElementById("status").textContent = t(
          ok ? "copied" : "copyFailed",
        );
      },
    );
  };
  document.getElementById("orderForm").onsubmit = function (e) {
    e.preventDefault();
    if (busy) return;
    var status = document.getElementById("status");
    if (!count()) {
      status.textContent = t("need");
      return;
    }
    if (sentRef) {
      status.textContent = t("sent") + sentRef;
      return;
    }
    document.getElementById("payBox").hidden = true;
    var who = customer();
    var digits = who.phone.replace(/[^0-9]/g, "");
    if (digits.length < 8 || digits.length > 15) {
      status.textContent = t("phoneError");
      document.getElementById("custPhone").focus();
      return;
    }
    busy = true;
    var button = document.getElementById("sendOrder");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    status.textContent = t("sending");
    fetch("https://blackbird-bot.maybeetube.workers.dev/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: lines("en"),
        total: money(total()),
        amount: total(),
        customer: who,
        customer_chat_id: null,
      }),
    })
      .then(function (r) {
        return r.json().then(function (body) {
          if (!r.ok || !body.ok) throw new Error("not sent");
          return body;
        });
      })
      .then(function (body) {
        sentRef = body.ref;
        status.textContent = t("sent") + body.ref;
        showPay(body.ref, body.pay);
      })
      .catch(function () {
        status.textContent = t("failed");
      })
      .then(function () {
        busy = false;
        button.disabled = false;
        button.removeAttribute("aria-busy");
      });
  };
  document.getElementById("photoClose").onclick = function () {
    document.getElementById("photoDialog").close();
  };
  function loadBankApps(select) {
    var fallback = [
      ["vcb", "VCB Digibank"],
      ["mb", "MB Bank"],
      ["tcb", "Techcombank Mobile"],
      ["bidv", "BIDV SmartBanking"],
      ["icb", "VietinBank iPay"],
      ["acb", "ACB ONE"],
      ["vpb", "VPBank NEO"],
      ["tpb", "TPBank Mobile"],
      ["ocb", "OCB OMNI"],
      ["vba", "Agribank Plus"],
    ];
    function populate(apps) {
      var selected = select.value;
      while (select.options.length > 1) select.remove(1);
      apps.forEach(function (app) {
        var option = document.createElement("option");
        option.value = app[0];
        option.textContent = app[1];
        select.appendChild(option);
      });
      select.value = selected;
      if (select.value !== selected && select.onchange) select.onchange();
    }
    populate(fallback);
    var os =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
        ? "ios"
        : "android";
    fetch("https://api.vietqr.io/v2/" + os + "-app-deeplinks")
      .then(function (r) {
        if (!r.ok) throw new Error("bank list unavailable");
        return r.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.apps)) return;
        var apps = data.apps
          .filter(function (app) {
            return (
              app &&
              typeof app.appId === "string" &&
              /^[a-z0-9-]+$/.test(app.appId) &&
              typeof app.appName === "string" &&
              app.appName.length > 0
            );
          })
          .map(function (app) {
            return [app.appId, app.appName];
          });
        if (apps.length) populate(apps);
      })
      .catch(function () {
        /* fallback and QR remain available */
      });
  }

  function showPay(ref, pay) {
    var box = document.getElementById("payBox");
    if (!box) return;
    if (!pay || !pay.url) {
      box.hidden = true;
      return;
    }
    var t = T();
    // the static labels switch with the interface through data-vi/en/ru
    // attributes; only the values the server produced are set here.
    document.getElementById("payQr").src = pay.url;
    var open = document.getElementById("payOpen");
    var bank = document.getElementById("payBank");
    if (open && bank) {
      open.hidden = true;
      bank.value = "";
      bank.onchange = function () {
        if (!bank.value) {
          open.hidden = true;
          open.removeAttribute("href");
          return;
        }
        // The receiving bank and the customer's app are separate choices.
        var params =
          "app=" +
          encodeURIComponent(bank.value) +
          "&ba=" +
          encodeURIComponent(pay.account + "@" + pay.bank.toLowerCase()) +
          "&am=" +
          encodeURIComponent(pay.amount) +
          "&tn=" +
          encodeURIComponent(ref) +
          "&bn=" +
          encodeURIComponent(pay.accountName) +
          "&url=" +
          encodeURIComponent(window.location.origin + window.location.pathname);
        open.href = "https://dl.vietqr.io/pay?" + params;
        open.hidden = false;
      };
      loadBankApps(bank);
    }
    document.getElementById("payQr").alt = "VietQR " + ref;
    document.getElementById("payMemoVal").textContent = ref;
    document.getElementById("payAmount").textContent = vnd(pay.amount);
    document.getElementById("payAcctVal").textContent = pay.account;
    document.getElementById("payHolderVal").textContent = pay.accountName;
    box.hidden = false;
    if (box.scrollIntoView) {
      var reduce = false;
      try {
        reduce =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (err) {
        reduce = false;
      }
      box.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
      });
    }
    // the memo is the one thing a wrong copy ruins, so offer it as a button
    var btn = document.getElementById("payMemoCopy");
    if (btn) {
      btn.onclick = function () {
        fallbackCopy(ref, function (ok) {
          btn.textContent = ok ? t.copied : ref;
        });
      };
    }
  }

  render();
  setInterval(function () {
    if (!busy) renderClock();
  }, 60000);
  function renderClock() {
    var p = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(new Date())
      .split(":");
    var m = +p[0] * 60 + +p[1];
    document.getElementById("open").textContent = t(
      m >= 450 && m < 1200 ? "open" : "closed",
    );
  }
})();
