'use strict';

const fs = require('fs');
const crypto = require('crypto');
const assert = require('node:assert/strict');

const evidenceFile = process.argv[2];

if (!evidenceFile) {
  console.error('INDEPENDENT_VERIFICATION=FAIL');
  console.error('ERROR=EVIDENCE_FILE_REQUIRED');
  process.exit(1);
}

if (!fs.existsSync(evidenceFile)) {
  console.error('INDEPENDENT_VERIFICATION=FAIL');
  console.error(`ERROR=FILE_NOT_FOUND:${evidenceFile}`);
  process.exit(1);
}

const raw = fs.readFileSync(evidenceFile, 'utf8');
const evidence = JSON.parse(raw);

assert.ok(evidence);
assert.ok(Array.isArray(evidence.chain));

const chain = evidence.chain;

assert.equal(
  chain.length,
  evidence.event_count,
  'EVENT_COUNT_MISMATCH'
);

let previousHash = evidence.genesis;

assert.ok(
  typeof previousHash === 'string' &&
  previousHash.length > 0,
  'INVALID_GENESIS'
);

for (let i = 0; i < chain.length; i++) {
  const item = chain[i];

  assert.equal(
    item.index,
    i,
    `INDEX_MISMATCH_${i}`
  );

  assert.equal(
    item.previous_hash,
    previousHash,
    `PREVIOUS_HASH_MISMATCH_${i}`
  );

  const canonical = JSON.stringify({
    index: item.index,
    event: item.event,
    previous_hash: item.previous_hash
  });

  const recalculatedHash = crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex');

  assert.equal(
    item.hash,
    recalculatedHash,
    `EVENT_HASH_MISMATCH_${i}`
  );

  previousHash = recalculatedHash;
}

assert.equal(
  previousHash,
  evidence.final_hash,
  'FINAL_HASH_MISMATCH'
);

console.log('=======================================');
console.log('GANDOM INDEPENDENT EVIDENCE VERIFIER');
console.log('=======================================');
console.log(`EVIDENCE_FILE=${evidenceFile}`);
console.log(`EVENT_COUNT_EXPECTED=${evidence.event_count}`);
console.log(`EVENT_COUNT_ACTUAL=${chain.length}`);
console.log('GENESIS=PASS');
console.log('EVENT_HASHES=PASS');
console.log('CHAIN_LINKS=PASS');
console.log('FINAL_HASH_MATCH=PASS');
console.log('TAMPER_CHECK=PASS');
console.log('INDEPENDENT_VERIFICATION=PASS');
console.log('=======================================');
