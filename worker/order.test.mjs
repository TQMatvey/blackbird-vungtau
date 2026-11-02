import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const source = await readFile(new URL('./index.js', import.meta.url), 'utf8');
const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let sent = 0;
globalThis.fetch = async () => { sent++; return Response.json({ok:true, result:{}}); };
const ctx = { waitUntil() {} };
const env = { TELEGRAM_BOT_TOKEN:'test', SHOP_CHAT_ID:'test' };
const post = body => worker.fetch(new Request('https://example.test/order', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)}), env, ctx);
const valid = {lines:['1 × Pita — 95.000đ'], total:'95.000đ', amount:95000, customer:{name:'Test', phone:'0912345678', address:''}};
let response = await post(valid);
assert.equal(response.status, 200);
assert.match((await response.json()).ref, /^BB-[A-F0-9]{8}$/);
assert.equal(sent, 1);
for (const invalid of [{...valid, amount:-1}, {...valid, customer:{name:'', phone:'123'}}, {...valid, lines:['x'.repeat(301)]}]) {
  response = await post(invalid);
  assert.equal(response.status, 400);
}
assert.equal(sent, 1);
console.log('Order validation and Telegram forwarding tests pass');
