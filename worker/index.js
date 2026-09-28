/**
 * Black Bird orders — Telegram bridge.
 *
 * The site is static. It cannot hold the bot token, and must not: every byte
 * it serves is downloadable. So the token lives here, as a Worker secret, and
 * the site posts orders to this Worker instead of handing them to a chat.
 *
 *   POST /order    { lines: string[], total: string, pickup: string }
 *                  -> forwards the order to the shop's Telegram chat
 *                  -> returns { ok: true, ref: "BB-1234" }
 *
 *   POST /telegram Telegram webhook: replies to /start and to any other
 *                  inbound message, so the bot answers in the shop's own chat
 *
 *   GET  /health   -> { ok: true }
 *
 * Secrets (never in this file, never in git):
 *   TELEGRAM_BOT_TOKEN  the bot token
 *   SHOP_CHAT_ID        the Telegram chat that receives orders
 */

const BOT = '@tqblackbirdbot';

// A short human-readable reference the customer can quote back. Not a
// security token — it exists so the shop and the customer can talk about the
// same order without a 64-character code.
function makeRef() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return 'BB-' + n;
}

function esc(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

async function telegram(token, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!body || body.ok === false) {
    throw new Error(`telegram ${method}: ${JSON.stringify(body && body.description)}`);
  }
  return body.result;
}

function helpText() {
  return [
    `<b>${esc(BOT)}</b> — orders for Black Bird.`,
    '',
    'N4/4 Hoàng Hữu Nam, P.2, Vũng Tàu',
    'Open 07:30–20:00 daily. Call 038 226 4034.',
    '',
    'To order, use the site: build your order there and press Send order.',
    'It arrives here, in this chat, and the shop confirms from there.',
  ].join('\n');
}

function orderText(o, ref) {
  const lines = Array.isArray(o.lines) ? o.lines.filter(Boolean) : [];
  const head = [
    `<b>New order ${esc(ref)}</b>`,
    '',
    ...lines.map(l => '• ' + esc(l)),
  ];
  if (o.total) head.push('', `<b>Total: ${esc(o.total)}</b>`);
  if (o.pickup) head.push(`Pickup: ${esc(o.pickup)}`);
  return head.join('\n');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, bot: BOT, now: new Date().toISOString() });
    }

    // ---- one-time / re-deploy bootstrap ---------------------------
    // Telegram webhooks are lost when the Worker is redeployed, and the
    // setup call is a POST that cannot conveniently be made from a
    // laptop, so the Worker does it for itself. Idempotent.
    if (request.method === 'GET' && url.pathname === '/setup') {
      if (!env.WEBHOOK_URL) {
        return json({ ok: false, error: 'WEBHOOK_URL secret is not set' }, 500);
      }
      const hook = env.WEBHOOK_URL + '/telegram';
      try {
        const info = await telegram(env.TELEGRAM_BOT_TOKEN, 'setWebhook', {
          url: hook,
          drop_pending_updates: 'false',
        });
        return json({ ok: true, webhook: hook, result: info });
      } catch (err) {
        return json({ ok: false, error: String(err && err.message || err) }, 502);
      }
    }

    // ---- order in -------------------------------------------------
    if (request.method === 'POST' && url.pathname === '/order') {
      let order;
      try {
        order = await request.json();
      } catch {
        return json({ ok: false, error: 'bad json' }, 400);
      }
      const lines = Array.isArray(order.lines) ? order.lines.filter(Boolean) : [];
      if (!lines.length) return json({ ok: false, error: 'order has no lines' }, 400);

      const ref = makeRef();

      // A dead token or wrong chat id must not look like a lost order, so
      // fail loudly and say so rather than reporting success.
      try {
        await telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: env.SHOP_CHAT_ID,
          text: orderText(order, ref),
          parse_mode: 'HTML',
        });
      } catch (err) {
        return json({ ok: false, error: String(err && err.message || err) }, 502);
      }

      // A copy to the customer, so they have the reference too.
      const customer = order.customer_chat_id;
      if (customer) {
        ctx.waitUntil(
          telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
            chat_id: customer,
            text: `Your order <b>${esc(ref)}</b> is with the shop. They will confirm here.`,
            parse_mode: 'HTML',
          }).catch(() => null)
        );
      }

      return json({ ok: true, ref });
    }

    // ---- Telegram webhook ----------------------------------------
    if (request.method === 'POST' && url.pathname === '/telegram') {
      let update;
      try {
        update = await request.json();
      } catch {
        return new Response('ok');
      }
      const msg = update && update.message;
      if (!msg || !msg.text) return new Response('ok');

      const text = msg.text.trim();
      // keep it small: /start is a greeting, anything else gets the same
      // answer, because the shop runs this by hand
      await telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
        chat_id: msg.chat.id,
        text: text.startsWith('/start') ? helpText() : helpText(),
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id,
      }).catch(() => null);
      return new Response('ok');
    }

    return json({ ok: false, error: 'not found' }, 404);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
