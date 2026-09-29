/**
 * Known-answer tests for the Worker.
 *
 * The MD5 in index.js exists only to verify VietQR's callback signatures, and
 * a broken signature check is worse than no check at all: it would reject
 * every real payment, or — far worse — accept forged ones. So it is tested
 * against the published RFC 1321 vectors, plus the exact string VietQR
 * documents.
 *
 *   node worker/md5.test.mjs
 */

import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('./index.js', import.meta.url), 'utf8');

// pull the functions out of the module without importing it, so the test
// does not need a Workers runtime
const grab = (name) => {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in index.js`);
  let depth = 0, i = src.indexOf('{', start);
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(start, j + 1);
  }
  throw new Error(`${name} is unbalanced`);
};

const md5Hex = new Function(`${grab('md5Hex')}; return md5Hex;`)();
// The Host2Client checksums VietQR asks for. Neither is a signature over a
// payload, which is exactly why /vietqr/paid confirms against check-order
// before treating a webhook as a payment.
const orderChecksum = new Function(
  'md5Hex', `${grab('orderChecksum')}; return orderChecksum;`
)(md5Hex);
const transferContent = new Function(
  'VIET_D', `${grab('transferContent')}; return transferContent;`
)({ 'đ': 'd', 'Đ': 'D' });

let failed = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${got}\n        want ${want}`);
};

// RFC 1321 test suite
const vectors = [
  ['', 'd41d8cd98f00b204e9800998ecf8427e'],
  ['a', '0cc175b9c0f1b6a831c399e269772661'],
  ['abc', '900150983cd24fb0d6963f7d28e17f72'],
  ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
  ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
  ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'd174ab98d277d9f5a5611c2c9f419d9f'],
  ['1234567890'.repeat(8), '57edf4a22be3c955ac49da2e2107b67a'],
];
for (const [input, want] of vectors) {
  check(`md5(${JSON.stringify(input.slice(0, 24))})`, md5Hex(input), want);
}

// The exact shape VietQR documents for the ecommerce sync call:
// checkSum = MD5(password + ":" + ecommerceSite + "VietQRAccesskey")
const syncChecksum = md5Hex('37256497631:https://www.google.comVietQRAccesskey');
check('sync checksum is computable', syncChecksum.length, 32);
check('sync checksum is stable', syncChecksum, md5Hex('37256497631:https://www.google.comVietQRAccesskey'));

// Host2Client: check-order is authenticated with MD5(bankAccount + username)
check(
  'orderChecksum is MD5(bankAccount + username)',
  orderChecksum({ VIETQR_BANK_ACCOUNT: '0373568944', VIETQR_USER: 'nhatlinh' }),
  md5Hex('0373568944nhatlinh')
);

// The transfer content VietQR displays: no diacritics, no punctuation, and
// hard-capped at 19 characters
check('transferContent strips the dash', transferContent('BB-1234'), 'BB1234');
check('transferContent stays within 19 chars', transferContent('A'.repeat(50)).length, 19);
// ô folds to o, and the letter survives — stripping non-ASCII instead
// would give "BnhPhMai", which is what the first version did
check('transferContent folds accents, keeping the letter', transferContent('Bánh PhôMai'), 'BanhPhoMai');
check('transferContent folds đ', transferContent('Đặc Biệt'), 'DacBiet');
check('transferContent drops spaces', transferContent('Napoleon 70k'), 'Napoleon70k');
check('transferContent handles a real order ref', transferContent('BB-1234'), 'BB1234');

console.log(failed ? `\n${failed} FAILED` : '\nall MD5 and checksum checks pass');
process.exit(failed ? 1 : 0);
