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
 *   POST /vietqr/sync          register this site with VietQR (once)
 *   POST /vietqr/qr            create a payment QR for an order
 *   POST /vietqr/paid          VietQR balance-change webhook
 *   POST /vietqr/check         confirm an order straight from VietQR
 *   GET  /vietqr/status        which VietQR pieces are configured
 *
 * Secrets (never in this file, never in git):
 *   TELEGRAM_BOT_TOKEN  the bot token
 *   SHOP_CHAT_ID        the Telegram chat that receives orders
 *   WEBHOOK_URL         this Worker's own public URL
 *   SITE_URL            the public site, registered with VietQR
 *   VIETQR_USER         username VietQR issued for Get Token
 *   VIETQR_PASS         password VietQR issued for Get Token
 *   VIETQR_BANK_CODE    MB or BIDV
 *   VIETQR_BANK_ACCOUNT receiving account number
 *   VIETQR_BANK_NAME    account holder, no diacritics
 */

const BOT = '@tqblackbirdbot';

/* ------------------------------------------------------------------
   CORS — why this block exists at all.

   The site posts JSON: assets/app.js sends
   headers: { 'content-type': 'application/json' }. That header is NOT
   on the CORS-safelisted list, so a browser must send a preflight
   OPTIONS before the POST. This Worker used to answer OPTIONS with
   405 "POST only" (the POST_ONLY check below), the browser dropped the
   whole thing as net::ERR_FAILED, fetch() rejected, and the page fell
   back to "Not sent — copied". No order ever reached Telegram — the
   route was fine, the transport was not.

   Fix is two halves and both are required:
     1. answer the preflight with the headers the browser is asking for;
     2. put the same headers on the real response, or the browser
        blocks reading it even after a successful preflight.

   Why not '*': this is a live Worker that accepts orders and already
   ran with an open CORS. Every origin is matched against this list,
   and an origin that is absent or not listed simply gets no CORS
   header at all — no throw, no 500, the request is answered normally
   and the browser blocks it. That is the intended outcome for a site
   that is not ours.

   >>> ADD A NEW DOMAIN HERE when the site moves (a custom domain, a
   >>> second pages.dev project, a preview). One line, nothing else.
   >>> Exact scheme + host + optional port. No trailing slash.
   ------------------------------------------------------------------ */

const ALLOWED_ORIGINS = [
  'https://blackbird-vungtau.pages.dev',
  // 'http://localhost:8899',   // local debugging only — MUST stay commented out in production
];

/* Paths a browser on our site actually calls. The Telegram and VietQR
   webhooks are server-to-server: they carry no Origin and must never
   get CORS treatment. */
const CORS_PATHS = ['/order'];

// Ten minutes. Long enough that a customer tapping Send order twice
// does not preflight twice, short enough that changing ALLOWED_ORIGINS
// stops being confusing for more than a coffee break.
const CORS_MAX_AGE = '600';

/* Returns the CORS headers for this request, or {} when the origin is
   not ours. Never throws. */
function corsHeaders(request) {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  if (!ALLOWED_ORIGINS.includes(origin)) return {};

  const h = {
    'access-control-allow-origin': origin,   // echo the exact origin, not '*'
    'access-control-allow-methods': 'POST, OPTIONS',
    // content-type is the whole reason the preflight exists; without it
    // listed here the browser refuses the POST and we are back to square one.
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': CORS_MAX_AGE,
    'access-control-expose-headers': 'content-type',
    // this response varies by Origin, so a cache must not hand a
    // stranger the header meant for us
    'vary': 'Origin',
  };
  return h;
}

function corsAllowed(request, url) {
  if (request.method !== 'OPTIONS') return false;
  if (!CORS_PATHS.includes(url.pathname)) return false;
  return Object.keys(corsHeaders(request)).length > 0;
}

/* ------------------------------------------------------------------
   VietQR, Host2Client — the ecommerce model.

   The first pass here implemented Host2Host, where the merchant hosts
   Get Token and Transaction Sync and VietQR calls in. That is the wrong
   product for one restaurant site: it needs a merchant connection
   declaration (whose published form, vietqr.vn/merchant/request, now
   404s anyway) and a live endpoint before the application can be
   approved.

   Host2Client is the other way round. We call VietQR:

     POST {base}/vqr/api/peripheral/ecommerce/token_generate   Basic auth
     POST {base}/vqr/api/ecommerce                            Bearer
     POST {base}/vqr/api/qr/generate-customer                 Bearer
     POST {base}/vqr/api/ecommerce-transactions/check-order   Bearer

   and VietQR posts balance changes to the webhook we hand them. Test is
   dev.vietqr.org; production is api.vietqr.org.

   One important property: the documented Host2Client webhook payload
   carries no signature. So the webhook is treated as a *hint* that money
   moved, and /vietqr/paid confirms the order against VietQR's own
   check-order API before anything is marked paid or the shop is told.
   A webhook anyone can POST to must never be the thing that decides a
   payment happened.
   ------------------------------------------------------------------ */

const VQ_TEST = 'https://dev.vietqr.org';
const VQ_PROD = 'https://api.vietqr.org';

function vietqrBase(env) {
  // flip VIETQR_LIVE=1 once the account is live and the contract is signed
  return env.VIETQR_LIVE === '1' ? VQ_PROD : VQ_TEST;
}

// A single in-memory token, refreshed on demand. A Worker isolate may be
// recycled at any time, which only costs one extra Get Token call.
let tokenCache = { token: null, at: 0 };

async function vietqrToken(env) {
  if (!env.VIETQR_USER || !env.VIETQR_PASS) throw new Error('vietqr credentials not configured');
  const now = Date.now();
  if (tokenCache.token && now - tokenCache.at < 240000) return tokenCache.token;

  const basic = btoa(`${env.VIETQR_USER}:${env.VIETQR_PASS}`);
  const r = await fetch(`${vietqrBase(env)}/vqr/api/peripheral/ecommerce/token_generate`, {
    method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/json' },
  });
  const body = await r.json().catch(() => null);
  if (!r.ok || !body) throw new Error(`vietqr get token: HTTP ${r.status}`);
  const tok = body.access_token || body.data && body.data.accessToken;
  if (!tok) throw new Error('vietqr get token: no token in response');
  tokenCache = { token: tok, at: now };
  return tok;
}

async function vietqrPost(env, path, payload) {
  const tok = await vietqrToken(env);
  const r = await fetch(vietqrBase(env) + path, {
    method: 'POST',
    headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`vietqr ${path}: HTTP ${r.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}


/* ------------------------------------------------------------------
   MD5.

   WebCrypto has no MD5 and VietQR authenticates several calls with it.
   The implementation below is covered by the known-answer tests in
   md5.test.mjs, which run before anything is deployed.
   ------------------------------------------------------------------ */



function md5Hex(input) {
  // see the note above; kept self-contained so the Worker has no dependencies
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

// VietQR's check-order call is authenticated with a checksum:
//   MD5(bankAccount + username)
function orderChecksum(env) {
  return md5Hex(String(env.VIETQR_BANK_ACCOUNT || '') + String(env.VIETQR_USER || ''));
}

// The transfer content VietQR shows must be Vietnamese without diacritics and
// without punctuation, capped at 19 characters.
//
// Folding has to be real, not a deletion: stripping non-ASCII outright turns
// "Bánh" into "Bnh". NFD splits the accents off so they can be removed while
// the letter survives. đ is the exception — it is a distinct letter, not a
// base plus a mark, so NFD leaves it alone and it needs an explicit mapping.
const VIET_D = { 'đ': 'd', 'Đ': 'D' };

function transferContent(ref) {
  const folded = String(ref)
    .replace(/[đĐ]/g, (c) => VIET_D[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');   // combining diacritical marks
  return folded.replace(/[^A-Za-z0-9]/g, '').slice(0, 19);
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
  ];

  // Who to call back. The shop is a group chat now, so the message is read
  // by whoever is free — without these three there is nobody to ask.
  const c = o.customer || {};
  if (c.name || c.phone || c.address) {
    head.push('');
    if (c.name) head.push(`Name: ${esc(c.name)}`);
    if (c.phone) head.push(`Phone: ${esc(c.phone)}`);
    if (c.address) head.push(`Address: ${esc(c.address)}`);
  }

  head.push('');
  head.push(...lines.map(l => '• ' + esc(l)));
  if (o.total) head.push('', `<b>Total: ${esc(o.total)}</b>`);
  if (o.pickup) head.push(`Pickup: ${esc(o.pickup)}`);

  head.push('', 'Nobody has taken this order yet.');
  return head.join('\n');
}

// The button on each order. The reference is the whole payload: the handler
// edits the message it was pressed on, so nothing has to be remembered
// server-side — an isolate can be recycled between the press and the reply
// without losing anything.
function orderKeyboard(ref) {
  return {
    inline_keyboard: [[{ text: '✔ Taken', callback_data: 'taken:' + ref }]],
  };
}

// Appends the "who took it" line to an order message, in place. The text
// comes from the callback's own copy of the message, not from storage, so
// this works for orders that arrived hours ago and after any restart.
function takenText(original, who, when) {
  return original.replace(/\n*Nobody has taken this order yet\.?/, '') +
    `\n\n<b>Taken by ${esc(who)}</b> — ${esc(when)}`;
}

export default {
  async fetch(request, env, ctx) {
    // Every route below answers through here, so the CORS headers are
    // applied in one place instead of on twenty `return json(...)` lines:
    // a response without them is unreadable by the browser even when the
    // preflight succeeded.
    const res = await handle(request, env, ctx);
    const cors = corsHeaders(request);
    if (!Object.keys(cors).length) return res;
    const h = new Headers(res.headers);
    for (const k of Object.keys(cors)) h.set(k, cors[k]);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  },
};

// The routing itself, unchanged from before — only the call site moved.
async function handle(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    // Preflight first, before every other route check. This must return
    // immediately: a preflight carries no order body, so it must never
    // reach /order, never call makeRef() and never touch Telegram.
    if (corsAllowed(request, url)) {
      const h = new Headers(cors);
      return new Response(null, { status: 204, statusText: 'No Content', headers: h });
    }

    // Anyone who opens the Worker directly should get something that says
    // what it is, rather than a bare {"error":"not found"} that looks like
    // a broken deployment.
    if (url.pathname === '/') {
      return json({
        ok: true,
        service: 'Black Bird orders',
        bot: BOT,
        site: env.SITE_URL || null,
        routes: {
          'GET /health': 'liveness',
          'POST /order': 'receive an order from the site, send it to Telegram',
          'POST /telegram': 'Telegram webhook (set automatically by /setup)',
          'GET /setup': 're-register the Telegram webhook',
          'GET /vietqr/status': 'which VietQR pieces are configured',
          'POST /vietqr/sync': 'register this site with VietQR, returns a certificate QR',
          'POST /vietqr/qr': 'create a payment QR for an order',
          'POST /vietqr/paid': 'VietQR balance-change webhook',
          'POST /vietqr/check': 'ask VietQR whether an order is paid',
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, bot: BOT, now: new Date().toISOString() });
    }

    // A known path reached with the wrong verb is a 405, not a 404. Saying
    // "not found" for a GET on /order hides the fact that the route exists.
    const POST_ONLY = ['/order', '/telegram', '/vietqr/sync', '/vietqr/qr',
                       '/vietqr/paid', '/vietqr/check'];
    if (POST_ONLY.includes(url.pathname) && request.method !== 'POST') {
      return json({ ok: false, error: 'POST only', allow: 'POST' }, 405);
    }

    // ---- VietQR: register this site (once) ------------------------
    // Returns a certificate QR that the owner scans in the VietQR app to
    // link a bank account, plus the clientId and webhook VietQR will use.
    if (url.pathname === '/vietqr/sync' && request.method === 'POST') {
      const site = env.SITE_URL;
      if (!env.VIETQR_USER || !env.VIETQR_PASS) {
        return json({ ok: false, error: 'vietqr credentials not configured' }, 503);
      }
      if (!site) return json({ ok: false, error: 'SITE_URL not configured' }, 503);
      // checkSum = MD5(password + ":" + ecommerceSite + "VietQRAccesskey")
      const checkSum = md5Hex(`${env.VIETQR_PASS}:${site}VietQRAccesskey`);
      try {
        const body = await vietqrPost(env, '/vqr/api/ecommerce', {
          ecommerceSite: site,
          checkSum,
          webhook: `${env.WEBHOOK_URL}/vietqr/paid`,
          code: 'BLACKBIRD',
        });
        return json({ ok: true, site, response: body });
      } catch (err) {
        return json({ ok: false, error: String(err && err.message || err) }, 502);
      }
    }

    // ---- VietQR: a payment QR for an order ------------------------
    if (url.pathname === '/vietqr/qr' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'bad json' }, 400);
      }
      const ref = body.ref;
      const amount = Math.round(Number(body.amount) || 0);
      if (!ref || !amount) return json({ ok: false, error: 'ref and amount are required' }, 400);
      if (!env.VIETQR_BANK_ACCOUNT || !env.VIETQR_BANK_CODE || !env.VIETQR_BANK_NAME) {
        return json({ ok: false, error: 'bank details not configured' }, 503);
      }
      try {
        const vq = await vietqrPost(env, '/vqr/api/qr/generate-customer', {
          bankCode: env.VIETQR_BANK_CODE,
          bankAccount: env.VIETQR_BANK_ACCOUNT,
          userBankName: env.VIETQR_BANK_NAME,
          amount: String(amount),
          content: transferContent(ref),
          transType: 'C',
          qrType: 3,               // semi-dynamic: amount is per order
          orderId: ref,            // echoed back on payment, so we can match
          terminalCode: '',
          subTerminalCode: '',
        });
        return json({ ok: true, ref, qrCode: vq.qrCode, qrLink: vq.qrLink, transactionRefId: vq.transactionRefId });
      } catch (err) {
        return json({ ok: false, error: String(err && err.message || err) }, 502);
      }
    }

    // ---- VietQR: balance-change webhook ---------------------------
    // The documented Host2Client payload carries no signature, so this is
    // treated as a hint and nothing more: it triggers a confirmation
    // against VietQR's own check-order API. A webhook anyone can POST to
    // must never be what decides a payment happened.
    if (url.pathname === '/vietqr/paid' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response('ok');
      }
      // N05 = incoming transfer, N22 = a bank account was linked
      const kind = body.notificationType;
      if (kind === 'N22') {
        ctx.waitUntil(
          telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
            chat_id: env.SHOP_CHAT_ID,
            text: `Bank account linked: <code>${esc(body.bankAccount || '—')}</code> (${esc(body.bankCode || '')})`,
            parse_mode: 'HTML',
          }).catch(() => null)
        );
        return json({ ok: true, seen: 'N22' });
      }
      if (kind !== 'N05') return json({ ok: true, ignored: true, notificationType: kind });

      const ref = body.orderId;
      const amount = Number(body.amount) || 0;

      // Confirm before telling the shop the money is in.
      let confirmed = false;
      try {
        const r = await vietqrPost(env, '/vqr/api/ecommerce-transactions/check-order', {
          bankAccount: env.VIETQR_BANK_ACCOUNT,
          bankCode: env.VIETQR_BANK_CODE,
          type: '0',
          value: ref,
          checkSum: orderChecksum(env),
        });
        const rows = Array.isArray(r) ? r : (r && r.data) || [];
        const hit = rows.find(x => x && x.orderId === ref);
        // status 1 = paid
        confirmed = Boolean(hit && Number(hit.status) === 1);
      } catch (err) {
        if (window && window.console) window.console.warn('check-order failed', err);
      }

      if (!confirmed) {
        // Say so rather than quietly ignoring: an unconfirmed webhook means
        // the webhook and VietQR disagree, which someone should look at.
        ctx.waitUntil(
          telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
            chat_id: env.SHOP_CHAT_ID,
            text: `A transfer arrived for <code>${esc(ref || 'unknown')}</code> but VietQR has not confirmed it paid. Check before serving.`,
            parse_mode: 'HTML',
          }).catch(() => null)
        );
        return json({ ok: true, confirmed: false, ref });
      }

      ctx.waitUntil(
        telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: env.SHOP_CHAT_ID,
          text: [
            '<b>Payment confirmed</b>',
            '',
            `Order: <code>${esc(ref)}</code>`,
            `Amount: ${amount.toLocaleString('vi-VN')} đ`,
            `Bank: ${esc(env.VIETQR_BANK_CODE)} ${esc(env.VIETQR_BANK_ACCOUNT)}`,
          ].join('\n'),
          parse_mode: 'HTML',
        }).catch(() => null)
      );
      return json({ ok: true, confirmed: true, ref });
    }

    // ---- VietQR: ask about one order directly --------------------
    if (url.pathname === '/vietqr/check' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'bad json' }, 400);
      }
      if (!body.ref) return json({ ok: false, error: 'ref required' }, 400);
      try {
        const r = await vietqrPost(env, '/vqr/api/ecommerce-transactions/check-order', {
          bankAccount: env.VIETQR_BANK_ACCOUNT,
          bankCode: env.VIETQR_BANK_CODE,
          type: '0',
          value: body.ref,
          checkSum: orderChecksum(env),
        });
        const rows = Array.isArray(r) ? r : (r && r.data) || [];
        const hit = rows.find(x => x && x.orderId === body.ref);
        return json({ ok: true, found: Boolean(hit), status: hit ? Number(hit.status) : null, row: hit || null });
      } catch (err) {
        return json({ ok: false, error: String(err && err.message || err) }, 502);
      }
    }

    // ---- VietQR: which pieces are wired up -----------------------
    if (request.method === 'GET' && url.pathname === '/vietqr/status') {
      return json({
        ok: true,
        model: 'Host2Client (ecommerce)',
        environment: env.VIETQR_LIVE === '1' ? 'production' : 'test',
        site: env.SITE_URL || null,
        credentialsConfigured: Boolean(env.VIETQR_USER && env.VIETQR_PASS),
        bankConfigured: Boolean(env.VIETQR_BANK_ACCOUNT && env.VIETQR_BANK_CODE && env.VIETQR_BANK_NAME),
        endpoints: { sync: '/vietqr/sync', qr: '/vietqr/qr', paid: '/vietqr/paid', check: '/vietqr/check' },
      });
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
          reply_markup: orderKeyboard(ref),
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

      // ---- the "✔ Taken" button on an order message ---------------
      // This is the whole point of the button: in a group chat the message
      // is read by several people, and without a claim two of them cook one
      // order and the customer waits. The press is answered first — Telegram
      // shows a spinner on the button and it must stop, even if the edit
      // below fails.
      const cb = update && update.callback_query;
      if (cb && cb.data) {
        const who = [cb.from.first_name, cb.from.last_name].filter(Boolean).join(' ') ||
                    ('id' + cb.from.id);
        const ref = String(cb.data).replace(/^taken:/, '');

        await telegram(env.TELEGRAM_BOT_TOKEN, 'answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Taken — ' + ref,
        }).catch(() => null);

        const original = cb.message && cb.message.text;
        if (original && cb.message.chat) {
          const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
          await telegram(env.TELEGRAM_BOT_TOKEN, 'editMessageText', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: takenText(original, who, when),
            parse_mode: 'HTML',
            // the button has done its job; leaving it invites a second press
            reply_markup: { inline_keyboard: [] },
          }).catch(() => null);
        }
        return new Response('ok');
      }

      const msg = update && update.message;
      if (!msg || !msg.text) return new Response('ok');

      const text = msg.text.trim();

      // Someone claims an order by typing its reference. This is the
      // fallback for a phone where the button is awkward, and it also works
      // when the message is forwarded rather than tapped.
      const typed = /^BB-\d{4}$/i.exec(text);
      if (typed && msg.chat.type !== 'private') {
        const who = [msg.from && msg.from.first_name, msg.from && msg.from.last_name]
          .filter(Boolean).join(' ') || (msg.from ? 'id' + msg.from.id : 'someone');
        await telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: msg.chat.id,
          text: `${esc(who)} says <b>${esc(text.toUpperCase())}</b> is taken.`,
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id,
        }).catch(() => null);
        return new Response('ok');
      }

      // /chatid reports this conversation's id. A group's id is not
      // visible anywhere in the Telegram UI, and SHOP_CHAT_ID has to be set
      // to it before orders can be delivered to a group instead of a
      // private chat. One command in the group, and the number comes back.
      if (text.startsWith('/chatid')) {
        await telegram(env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: msg.chat.id,
          text: `Chat id: <code>${msg.chat.id}</code>` +
                (msg.chat.title ? `\nTitle: ${esc(msg.chat.title)}` : ''),
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id,
        }).catch(() => null);
        return new Response('ok');
      }

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
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
