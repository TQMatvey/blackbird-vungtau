/**
 * The CORS preflight, and the verb guard it used to fall into.
 *
 * Send order is a cross-origin JSON POST from a static site. The browser
 * will not send it until the Worker answers an OPTIONS preflight. The
 * first version had no CORS, so the preflight fell through to the
 * POST-only 405, the browser cancelled the real POST, and the order was
 * never sent — while the endpoint itself was perfectly healthy, which is
 * what made it hard to see.
 *
 * So this drives the real handler, not a copy of the rule: a regression
 * here is indistinguishable from the bug, and only the handler can be
 * wrong in the same way again.
 *
 *   node worker/cors.test.mjs
 */

import worker from './index.js';

const SITE = 'https://blackbird-vungtau.pages.dev';
const BASE = 'https://blackbird-bot.example.workers.dev';

const env = {
  SITE_URL: SITE,
  TELEGRAM_BOT_TOKEN: 'test-token',
  SHOP_CHAT_ID: '1',
  WEBHOOK_URL: BASE,
};

// ctx.waitUntil is called on some paths and is a no-op here
const ctx = { waitUntil() {} };

const call = (path, init = {}) =>
  worker.fetch(new Request(BASE + path, init), env, ctx);

let failed = 0;
const check = (label, ok, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok && detail) console.log(`        ${detail}`);
};

// The preflight a browser actually sends for the POST the site makes.
const preflight = await call('/order', {
  method: 'OPTIONS',
  headers: {
    origin: SITE,
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type',
  },
});

check('OPTIONS /order is not a 405', preflight.status === 204,
  `got ${preflight.status}, the browser would drop the order`);
check('OPTIONS /order allows the site origin',
  preflight.headers.get('access-control-allow-origin') === SITE,
  `got ${preflight.headers.get('access-control-allow-origin')}`);
check('OPTIONS /order allows POST',
  (preflight.headers.get('access-control-allow-methods') || '').includes('POST'),
  `got ${preflight.headers.get('access-control-allow-methods')}`);
check('OPTIONS /order allows the content-type header',
  (preflight.headers.get('access-control-allow-headers') || '').toLowerCase().includes('content-type'),
  `got ${preflight.headers.get('access-control-allow-headers')}`);

// A preflight on any POST route has to be answered, not just /order: the
// VietQR payment QR is posted from the page the same way.
for (const path of ['/vietqr/qr', '/vietqr/check', '/vietqr/paid', '/telegram']) {
  const res = await call(path, { method: 'OPTIONS', headers: { origin: SITE } });
  check(`OPTIONS ${path} is answered`,
    res.status === 204 && res.headers.get('access-control-allow-origin') === SITE,
    `got ${res.status} ${res.headers.get('access-control-allow-origin')}`);
}

// The real response has to carry the same permission, or the browser
// blocks the body even after a good preflight.
const health = await call('/health', { headers: { origin: SITE } });
check('GET /health echoes the allow-origin header',
  health.headers.get('access-control-allow-origin') === SITE,
  `got ${health.headers.get('access-control-allow-origin')}`);

// A whole order, the way the page sends it, with Telegram stubbed so the
// test does not post to the shop. This is the part that has to arrive: a
// preflight that passes and a response the browser then throws away is
// still a lost order.
const realFetch = globalThis.fetch;
let sent = null;
globalThis.fetch = async (url, init) => {
  sent = JSON.parse(init.body);
  return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }),
    { status: 200, headers: { 'content-type': 'application/json' } });
};

const order = await call('/order', {
  method: 'POST',
  headers: { origin: SITE, 'content-type': 'application/json' },
  body: JSON.stringify({ lines: ['2 × Salted Salmon Pita — 240.000đ'], total: '240.000đ' }),
});
const orderBody = await order.json();
globalThis.fetch = realFetch;

check('POST /order reaches Telegram', !!sent && !!sent.text && sent.text.includes('240.000'),
  'the order was never sent to the bot');
check('POST /order returns the reference', order.status === 200 && /^BB-\d+$/.test(orderBody.ref || ''),
  `got ${order.status} ${JSON.stringify(orderBody)}`);
check('POST /order carries the allow-origin header',
  order.headers.get('access-control-allow-origin') === SITE,
  `got ${order.headers.get('access-control-allow-origin')}`);
check('POST /order keeps its JSON body readable by the page',
  (order.headers.get('content-type') || '').includes('application/json'),
  `got ${order.headers.get('content-type')}`);

// An origin that is not the site is not on the allow-list. This is a
// public ordering endpoint, so * would be an open relay into the shop's
// Telegram chat.
const foreign = await call('/health', { headers: { origin: 'https://evil.example' } });
check('a foreign origin is not allowed', !foreign.headers.get('access-control-allow-origin'),
  `got ${foreign.headers.get('access-control-allow-origin')}`);

// Telegram and VietQR post webhooks server-to-server: no Origin at all.
const webhook = await call('/telegram', { method: 'POST', body: JSON.stringify({}) });
check('a server-to-server webhook is not blocked by CORS', webhook.status === 200,
  `got ${webhook.status}`);

// Wrong verb on a real route is still a 405 — the preflight must not have
// turned it into a 404 or, worse, let a GET through.
const wrongVerb = await call('/order', { headers: { origin: SITE } });
check('GET /order is still a 405', wrongVerb.status === 405, `got ${wrongVerb.status}`);

// No SITE_URL configured: fail closed rather than open.
const noSite = await worker.fetch(
  new Request(BASE + '/order', { method: 'OPTIONS', headers: { origin: SITE } }),
  { ...env, SITE_URL: undefined },
  ctx
);
check('without SITE_URL nothing is allowed',
  !noSite.headers.get('access-control-allow-origin'),
  `got ${noSite.headers.get('access-control-allow-origin')}`);

console.log(failed ? `\n${failed} FAILED` : '\nall CORS checks pass');
process.exit(failed ? 1 : 0);
