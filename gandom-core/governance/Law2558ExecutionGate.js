#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');

const LAW = 'constitution/GOLDEN-MOTHER-LAW-2558.md';

function fail(code, reason) {
  console.error(`LAW_2558_GATE=FAIL`);
  console.error(`LAW_2558_CODE=${code}`);
  console.error(`LAW_2558_REASON=${reason}`);
  process.exit(1);
}

if (!fs.existsSync(LAW)) {
  fail('LAW_MISSING', LAW);
}

const text = fs.readFileSync(LAW, 'utf8');

if (!text.includes('LAW_ID=GANDOM-MOTHER-2558')) {
  fail('LAW_ID_MISSING', 'GANDOM-MOTHER-2558');
}

if (!text.includes('GLOBAL LAW LOCK')) {
  fail('GLOBAL_LOCK_MISSING', 'GLOBAL LAW LOCK');
}

if (!text.includes('CHAPTER EXECUTION')) {
  fail('CHAPTER_LOCK_MISSING', 'CHAPTER EXECUTION');
}

const EXPECTED_LAW_HASH = '6341320fcf06777a1b9202954af0e428e1d4cff03f3179737f60573adecfcf1d';

const hash = crypto
  .createHash('sha256')
  .update(text)
  .digest('hex');

if (hash !== EXPECTED_LAW_HASH) {
  fail('LAW_HASH_MISMATCH', 'Law 2558 content hash does not match locked reference');
}

console.log('LAW_2558_GATE=PASS');
console.log('LAW_2558_ID=GANDOM-MOTHER-2558');
console.log('LAW_2558_HASH=' + hash);
console.log('LAW_2558_CHAPTER_EXECUTION_LOCK=PASS');
console.log('LAW_2558_EXECUTION_AUTHORIZED=true');
