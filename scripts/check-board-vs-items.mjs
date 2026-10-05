/**
 * Does every row on the menu board map to a row in the order builder?
 *
 * The board (index.html, hand-edited) and ITEMS (assets/app.js, hand-edited)
 * are the project's known duplication, and the new click-through matches
 * them by dish name. Anything that fails to match simply is not pressable,
 * so a mismatch shows up as a board row that does nothing — quiet, and easy
 * to miss. This check is what makes it loud.
 *
 *   node scripts/check-board-vs-items.mjs
 */
import { readFileSync } from 'node:fs';

const repo = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const app = readFileSync(repo + '/assets/app.js', 'utf8');
const html = readFileSync(repo + '/index.html', 'utf8');

// --- ITEMS, evaluated as the real JS it is -------------------------------
const s = app.indexOf('var ITEMS = [') + 'var ITEMS = ['.length;
const e = app.indexOf('];', s);
const ITEMS = new Function('return [' + app.slice(s, e).replace(/,\s*$/, '') + '];')();
console.log('ITEMS in the builder:', ITEMS.length);

// --- the board rows -----------------------------------------------------
// The board is a set of <section class="grp"> blocks inside <div class="board">,
// so slicing to the first </section> stops after the first group of five.
// Everything up to the order section is the board.
const b0 = html.indexOf('<div class="board">');
const b1 = html.indexOf('<section class="order"', b0);
const board = html.slice(b0, b1);
const rows = [...board.matchAll(/<li class="row[^"]*">([\s\S]*?)<\/li>/g)].map(m => m[1]);
console.log('rows on the board:  ', rows.length);

const decode = (v) => String(v || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const nameOf = (r) => {
  const m = r.match(/<h4 class="row__name">([\s\S]*?)<\/h4>/);
  return m ? decode(m[1]).replace(/\s+/g, ' ').trim() : null;
};

// Two shapes on the board: a pita prints two prices inside .row__pv spans,
// everything else prints one directly in the .row__price paragraph. Both end
// a number with <span class="row__cur">, so that is the one anchor that
// catches every row without caring which shape it is.
const pricesOf = (r) => [...r.matchAll(/([\d.]+)<span class="row__cur">/g)]
  .map(m => Number(m[1].replace(/\./g, '')));

const norm = (v) => decode(v).replace(/\s+/g, ' ').trim().toLowerCase();

let matched = 0, unmatched = 0, drift = 0, orderOk = 0;
const problems = [];

rows.forEach((r, k) => {
  const nm = nameOf(r);
  const pr = pricesOf(r);
  const ix = ITEMS.findIndex((it) => norm(it.en) === norm(nm));
  if (ix < 0) {
    unmatched++;
    problems.push(`UNMATCHED (stays unclickable): ${nm}`);
    return;
  }
  matched++;
  const expected = ITEMS[ix].sizes || [ITEMS[ix].price];
  const a = [...pr].sort((x, y) => x - y).join(',');
  const b = [...expected].sort((x, y) => x - y).join(',');
  if (a !== b) {
    drift++;
    problems.push(`PRICE DRIFT: ${nm} — board ${pr.join('/')} vs builder ${expected.join('/')}`);
  }
  if (ix === k) orderOk++;
});

console.log();
console.log('matched by dish name:        ', matched, 'of', rows.length);
console.log('unmatched (not clickable):   ', unmatched);
console.log('price drift board vs builder:', drift);
console.log('board order == ITEMS order:  ', orderOk, 'of', rows.length);
console.log();
if (problems.length) {
  problems.forEach(p => console.log('   ', p));
  process.exitCode = 1;
} else {
  console.log('   clean: every board row maps to an orderable item, same prices, same order');
}
