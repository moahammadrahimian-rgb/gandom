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

assert.ok(fs.existsSync(evidenceFile), 'EVIDENCE_FILE_NOT_FOUND');

const evidence = JSON.parse(
  fs.readFileSync(evidenceFile, 'utf8')
);

assert.ok(
  typeof evidence.genesis === 'string' &&
  evidence.genesis.length > 0,
  'INVALID_GENESIS'
);

assert.ok(
  Array.isArray(evidence.chain),
  'CHAIN_NOT_ARRAY'
);

assert.equal(
  evidence.chain.length,
  evidence.event_count,
  'EVENT_COUNT_MISMATCH'
);

let previousHash = evidence.genesis;

for (let i = 0; i < evidence.chain.length; i++) {
  const item = evidence.chain[i];

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
console.log(`EVENT_COUNT=${evidence.chain.length}`);
console.log('GENESIS=PASS');
console.log('INDEX_SEQUENCE=PASS');
console.log('PREVIOUS_HASH_LINKS=PASS');
console.log('EVENT_HASHES=PASS');
console.log('FINAL_HASH_MATCH=PASS');
console.log('CHAIN_INTEGRITY=PASS');
console.log('INDEPENDENT_VERIFICATION=PASS');
console.log('=======================================');
