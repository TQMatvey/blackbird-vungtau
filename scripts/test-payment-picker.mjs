import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const src = readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const code = src.slice(
  src.indexOf("function loadBankApps("),
  src.indexOf("\n  render();", src.indexOf("function loadBankApps(")),
);
function element() {
  return {
    hidden: true,
    value: "",
    options: [],
    setAttribute() {},
    removeAttribute() {},
    appendChild(o) {
      this.options.push(o);
    },
    remove(i) {
      this.options.splice(i, 1);
    },
  };
}
const ids = {};
for (const id of [
  "payBox",
  "payQr",
  "payOpen",
  "payBank",
  "payMemoVal",
  "payAmount",
  "payAcctVal",
  "payHolderVal",
  "payMemoCopy",
])
  ids[id] = element();
ids.payBank.options = [{ value: "" }];
const document = {
  getElementById: (id) => ids[id],
  createElement: () => element(),
};
const window = {
  location: { origin: "https://blackbird-vungtau.pages.dev", pathname: "/" },
  matchMedia: () => ({ matches: false }),
};
const navigator = { userAgent: "Android", platform: "", maxTouchPoints: 0 };
const show = new Function(
  "document",
  "window",
  "navigator",
  "fetch",
  "T",
  "vnd",
  "fallbackCopy",
  code + "; return showPay;",
)(
  document,
  window,
  navigator,
  () => Promise.reject(Error("offline")),
  () => ({ copied: "Copied" }),
  (n) => String(n),
  () => {},
);
show("BB-TEST123", {
  url: "https://example.com/qr",
  account: "123456",
  bank: "TPB",
  accountName: "TEST SHOP",
  amount: 560000,
});
assert.equal(ids.payOpen.hidden, true);
ids.payBank.value = "vcb";
ids.payBank.onchange();
const link = new URL(ids.payOpen.href);
assert.equal(link.searchParams.get("app"), "vcb");
assert.equal(link.searchParams.get("ba"), "123456@tpb");
assert.equal(link.searchParams.get("am"), "560000");
assert.equal(link.searchParams.get("tn"), "BB-TEST123");
assert.equal(ids.payOpen.hidden, false);
ids.payBank.value = "";
ids.payBank.onchange();
assert.equal(ids.payOpen.hidden, true);
console.log(
  "Payment picker keeps the selected app separate from the receiving bank and preserves transfer details.",
);
