import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url);
const scope = {};
vm.createContext(scope);
vm.runInContext(
  readFileSync(new URL("assets/catalog.js", root), "utf8"),
  scope,
);
assert.equal(scope.ITEMS.length, 31);
assert.equal(new Set(scope.ITEMS.map((i) => i.en)).size, 31);
for (const item of scope.ITEMS) {
  for (const l of ["en", "vi", "ru"]) assert.ok(item[l] && item[l].trim());
  assert.ok(item.price > 0);
  assert.ok(scope.GROUPS[item.g - 1]);
  const stem = scope.GALLERY[item.en];
  assert.ok(stem);
  for (const suffix of [".webp", "@2x.webp"])
    assert.ok(existsSync(new URL("assets/img/menu/" + stem + suffix, root)));
}
assert.equal(
  scope.ITEMS.find((i) => i.en === "Full Napoleon Cake").price,
  560000,
);
console.log(
  "31 menu items: all translations, prices, categories and image files verified. Whole Napoleon: 560000 VND.",
);
