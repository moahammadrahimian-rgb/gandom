'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const FILES = [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
];

const report = [];
let failures = 0;

function out(key, value) {
  const line = `${key}=${value}`;
  report.push(line);
  console.log(line);
}

function fail(message) {
  failures++;
  out('FINDING', message);
}

function readChain(relative) {
  const full = path.join(ROOT, relative);

  if (!fs.existsSync(full)) {
    fail(`${relative}:FILE_MISSING`);
    return null;
  }

  const before = fs.statSync(full);

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    fail(`${relative}:INVALID_JSON`);
    return null;
  }

  const blocks = Array.isArray(parsed)
    ? parsed
    : parsed.chain;

  if (!Array.isArray(blocks)) {
    fail(`${relative}:CHAIN_ARRAY_NOT_FOUND`);
    return null;
  }

  const after = fs.statSync(full);

  out('CHAIN_FILE', relative);
  out('BLOCK_COUNT', blocks.length);
  out('FILE_SIZE', before.size);
  out('FILE_MTIME_UNCHANGED',
      before.mtimeMs === after.mtimeMs);

  if (before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs) {
    fail(`${relative}:FILE_CHANGED_DURING_AUDIT`);
  }

  if (blocks.length === 0) {
    fail(`${relative}:EMPTY_CHAIN`);
    return { relative, blocks };
  }

  let previous = null;
  const indices = new Set();

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    if (!b || typeof b !== 'object') {
      fail(`${relative}:INVALID_BLOCK_AT_POSITION_${i}`);
      continue;
    }

    if (!Number.isSafeInteger(b.index)) {
      fail(`${relative}:INVALID_INDEX_AT_POSITION_${i}`);
    } else {
      if (indices.has(b.index)) {
        fail(`${relative}:DUPLICATE_INDEX_${b.index}`);
      }
      indices.add(b.index);

      if (b.index !== i) {
        fail(`${relative}:INDEX_POSITION_MISMATCH_${i}`);
      }
    }

    if (typeof b.hash !== 'string' ||
        !/^[0-9a-f]{64}$/i.test(b.hash)) {
      fail(`${relative}:INVALID_STORED_HASH_AT_${i}`);
    }

    if (i === 0) {
      out('GENESIS_HASH', b.hash || 'MISSING');
      out('GENESIS_PREV_HASH', b.prevHash || 'MISSING');
    } else {
      if (previous && b.prevHash !== previous.hash) {
        fail(
          `${relative}:BROKEN_LINK_AT_${i}` +
          `:EXPECTED=${previous.hash}` +
          `:ACTUAL=${b.prevHash}`
        );
      }
    }

    if (!Array.isArray(b.transactions)) {
      fail(`${relative}:TRANSACTIONS_NOT_ARRAY_AT_${i}`);
    }

    previous = b;
  }

  out('LOCAL_LINK_AUDIT',
      failures === 0 ? 'NO_FINDING_YET' : 'FINDINGS_EXIST');

  return { relative, blocks };
}

out('GANDOM_MOTHER_LOCK', '2558');
out('AUDIT_MODE', 'READ_ONLY');
out('PRIVATE_KEYS_READ', 'NO');
out('CHAIN_FILES_MODIFIED', 'NO');
out('AUTOMATIC_REPAIR', 'NO');

const results = FILES.map(readChain).filter(Boolean);

if (results.length === 2 &&
    results[0].blocks.length &&
    results[1].blocks.length) {
  const a = results[0].blocks;
  const b = results[1].blocks;

  const ga = a[0].hash;
  const gb = b[0].hash;

  out('GENESIS_HASH_MATCH', ga === gb);

  if (ga !== gb) {
    fail('CROSS_NODE_GENESIS_MISMATCH');
  }

  const common = Math.min(a.length, b.length);
  let commonPrefix = 0;

  for (let i = 0; i < common; i++) {
    if (a[i].hash !== b[i].hash) break;
    commonPrefix++;
  }

  out('COMMON_HASH_PREFIX_BLOCKS', commonPrefix);
  out('TIP_A', a[a.length - 1].hash || 'MISSING');
  out('TIP_B', b[b.length - 1].hash || 'MISSING');
  out('TIP_HASH_MATCH',
      a[a.length - 1].hash === b[b.length - 1].hash);

  if (commonPrefix < common) {
    fail('CHAIN_DIVERGENCE_DETECTED');
  }
}

out('FINDING_COUNT', failures);
out('CONSENSUS_GATE',
    failures === 0 ? 'STRUCTURAL_CHECKS_ONLY' : 'BLOCKED');
out('PRODUCTION_APPROVAL', 'NOT_GRANTED');
out('PASS_REAL_FULL_SYSTEM', 'NOT_CLAIMED');

const stamp = new Date().toISOString()
  .replace(/[:.]/g, '-');

const reportPath = path.join(
  ROOT,
  `GANDOM_CONSENSUS_GATE_2558_${stamp}.txt`
);

fs.writeFileSync(reportPath, report.join('\n') + '\n', {
  encoding: 'utf8',
  flag: 'wx',
  mode: 0o600
});

console.log(`REPORT=${reportPath}`);
