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
const signatureData = new Function(`${grab('signatureData')}; return signatureData;`)();
// verifySignature calls md5Hex and signatureData, so it needs both in scope
const verifySignature = new Function(
  'md5Hex', 'signatureData', `${grab('verifySignature')}; return verifySignature;`
)(md5Hex, signatureData);

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

// The exact shape VietQR documents: signature data is
// transactionId + amount padded to 10 digits + transactionTime + orderId
const sample = {
  transactionId: '0a4cc317-3af3-4055-bc83-7296adb624bf',
  amount: '100000',
  transactionTime: '2024-05-1701:53',
  orderId: '0a4cc317-3af3-4055-bc83-7296adb624bf',
};
check(
  'signatureData pads the amount to 10 digits',
  signatureData(sample),
  '0a4cc317-3af3-4055-bc83-7296adb624bf00001000002024-05-1701:530a4cc317-3af3-4055-bc83-7296adb624bf'
);
check(
  'signatureData leaves a long amount alone',
  signatureData({ ...sample, amount: '50000000' }),
  '0a4cc317-3af3-4055-bc83-7296adb624bf00500000002024-05-1701:530a4cc317-3af3-4055-bc83-7296adb624bf'
);

const secret = 'test-secret';
const good = md5Hex(secret + signatureData(sample));
check('accepts a correct signature', verifySignature(secret, sample, good), true);
check('rejects a wrong signature', verifySignature(secret, sample, 'deadbeef'), false);
check('rejects an empty signature', verifySignature(secret, sample, ''), false);
check('rejects when the secret is unset', verifySignature('', sample, good), false);

const tampered = { ...sample, amount: '1' };
check('rejects a tampered amount', verifySignature(secret, tampered, good), false);

console.log(failed ? `\n${failed} FAILED` : '\nall MD5 and signature checks pass');
process.exit(failed ? 1 : 0);
