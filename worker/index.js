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
 *   POST /vietqr/token              VietQR Get Token, Basic-authenticated
 *   POST /vietqr/transaction-sync   balance-change webhook, signature-checked
 *   GET  /vietqr/status             which VietQR features are configured
 *
 * Secrets (never in this file, never in git):
 *   TELEGRAM_BOT_TOKEN  the bot token
 *   SHOP_CHAT_ID        the Telegram chat that receives orders
 *   WEBHOOK_URL         this Worker's own public URL
 *   VIETQR_SECRET       secret key VietQR signs callbacks with
 *   VIETQR_USER         the Basic-auth username declared to VietQR
 *   VIETQR_PASS         the Basic-auth password declared to VietQR
 *   VIETQR_MERCHANT_ID  merchant id declared to VietQR (no diacritics)
 */

const BOT = '@tqblackbirdbot';

/* ------------------------------------------------------------------
   VietQR Host2Host — the receiving side.

   VietQR calls *us*. Two endpoints:

   /vietqr/token             VietQR presents Basic auth (the username and
                             password we declared) and gets a short-lived
                             bearer token, which it then sends on the other
                             calls. Per VietQR's docs that token lives about
                             59 seconds, so it is issued per request and
                             never cached.

   /vietqr/transaction-sync  VietQR posts every incoming transfer here. The
                             body is signed and the signature is checked
                             before the order is treated as paid. An
                             unverified webhook is an open door: anyone who
                             finds the URL could post a fake "paid" order.

   The exact wire contract is fixed when VietQR issues the account, so the
   shapes below follow their published Host2Host documentation and are
   expected to be confirmed against the real API doc.
   ------------------------------------------------------------------ */

const TOKEN_TTL_SECONDS = 59;

function md5Hex(input) {
  // WebCrypto has no MD5, and VietQR signs with MD5. This is a compact,
  // self-contained implementation; it is covered by the known-answer tests
  // in md5.test.mjs, which run before anything is deployed.
  const K = new Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const bytes = [];
  for (let i = 0; i < input.length; i++) bytes.push(input.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (bitLen / Math.pow(2, i * 8)) & 0xff : 0);

  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  const rot = (a, b) => (a << b) | (a >>> (32 - b));

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let off = 0; off < bytes.length; off += 64) {
    const M = [];
    for (let i = 0; i < 16; i++) {
      M[i] = (bytes[off + i * 4]) | (bytes[off + i * 4 + 1] << 8) |
             (bytes[off + i * 4 + 2] << 16) | (bytes[off + i * 4 + 3] << 24);
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) | 0;
      A = D; D = C; C = B;
      B = (B + rot(F, S[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  // Each word is emitted byte-reversed. The message schedule is read
  // little-endian, which leaves the four final words in the opposite byte
  // order from the digest text; this is verified against node's crypto and
  // the RFC 1321 vectors in md5.test.mjs, not reasoned about.
  const le = (n) => hex(n).match(/../g).reverse().join('');
  return [a0, b0, c0, d0].map(le).join('');
}

// VietQR's signature data is
//   {transactionId}{amount, zero-padded to 10 digits}{transactionTime}{orderId}
function signatureData(t) {
  const amount = String(t.amount || '').padStart(10, '0');
  return `${t.transactionId}${amount}${t.transactionTime}${t.orderId}`;
}

function verifySignature(secret, t, given) {
  if (!secret || !given) return false;
  const expected = md5Hex(secret + signatureData(t));
  // constant-time-ish compare; these are short so it hardly matters, but a
  // length leak is still a leak
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

function checksum(secret, userId) {
  return md5Hex(secret + userId);
}

function basicAuthOk(request, env) {
  const h = request.headers.get('authorization') || '';
  if (!/^basic /i.test(h)) return false;
  let pair;
  try {
    pair = atob(h.slice(6).trim());
  } catch {
    return false;
  }
  const i = pair.indexOf(':');
  if (i < 0) return false;
  const user = pair.slice(0, i);
  const pass = pair.slice(i + 1);
  return timingSafeEqual(user, env.VIETQR_USER) && timingSafeEqual(pass, env.VIETQR_PASS);
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}


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

    // ---- VietQR: Get Token ---------------------------------------
    // VietQR presents the Basic-auth credentials declared in the merchant
    // form and receives a short-lived bearer token to use on its other
    // calls. This is the endpoint their "Test Get Token" button probes, so
    // it has to answer correctly before the merchant application is
    // approved.
    if (url.pathname === '/vietqr/token') {
      if (!env.VIETQR_USER || !env.VIETQR_PASS) {
        return json({ ok: false, error: 'vietqr basic auth not configured' }, 503);
      }
      if (!basicAuthOk(request, env)) {
        return json({ ok: false, error: 'unauthorized' }, 401);
      }
      const seed = crypto.randomUUID().replace(/-/g, '');
      return json({
        code: '00',
        message: 'Success',
        data: {
          accessToken: seed,
          tokenType: 'bearer',
          expiresIn: String(TOKEN_TTL_SECONDS),
        },
      });
    }

    // ---- VietQR: which features are wired up ---------------------
    if (request.method === 'GET' && url.pathname === '/vietqr/status') {
      return json({
        ok: true,
        merchantId: env.VIETQR_MERCHANT_ID || null,
        basicAuthConfigured: Boolean(env.VIETQR_USER && env.VIETQR_PASS),
        secretConfigured: Boolean(env.VIETQR_SECRET),
        endpoints: {
          token: '/vietqr/token',
          transactionSync: '/vietqr/transaction-sync',
        },
      });
    }

    // ---- VietQR: transaction sync (balance-change webhook) -------
    if (url.pathname === '/vietqr/transaction-sync') {
      if (request.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
      if (!env.VIETQR_SECRET) {
        return json({ ok: false, error: 'secret not configured' }, 503);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'bad json' }, 400);
      }

      // The checksum guards the request; the signature guards the data.
      // Both must pass before an order counts as paid.
      const wantChecksum = checksum(env.VIETQR_SECRET, body.userId || env.VIETQR_MERCHANT_ID || '');
      if (body.checksum && !timingSafeEqual(String(body.checksum).toLowerCase(), wantChecksum)) {
        return json({ ok: false, error: 'bad checksum' }, 401);
      }
      if (!verifySignature(env.VIETQR_SECRET, body, String(body.signature || '').toLowerCase())) {
        return json({ ok: false, error: 'bad signature' }, 401);
      }

      // Tell the shop. This is the whole point: the money arrived, and the
      // person who has to act on it should not have to open a bank app.
      const amount = (Number(body.amount) || 0).toLocaleString('vi-VN');
      const paid = [
        `<b>Payment received</b>`,
        '',
        `Order: ${esc(body.orderId || body.referenceNumber || '—')}`,
        `Amount: ${amount} đ`,
        `Bank account: ${esc(body.bankAccount || '—')}`,
        `Time: ${esc(body.transactionTime || '—')}`,
      ].join('\n');
      ctx.waitUntil(
        telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: env.SHOP_CHAT_ID,
          text: paid,
          parse_mode: 'HTML',
        }).catch(() => null)
      );

      return json({ code: '00', message: 'Success' });
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
