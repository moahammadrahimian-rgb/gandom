#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const cp = require('child_process');

const LAW = 'constitution/GOLDEN-MOTHER-LAW-2558.md';
const GATE = 'gandom-core/governance/Law2558ExecutionGate.js';

function fail(code, reason) {
  console.error('LAW_2558_RUN=FAIL');
  console.error('LAW_2558_CODE=' + code);
  console.error('LAW_2558_REASON=' + reason);
  process.exit(1);
}

if (!fs.existsSync(LAW)) fail('LAW_MISSING', LAW);
if (!fs.existsSync(GATE)) fail('GATE_MISSING', GATE);

const lawText = fs.readFileSync(LAW, 'utf8');

if (!lawText.includes('LAW_ID=GANDOM-MOTHER-2558'))
  fail('LAW_ID_MISSING', 'GANDOM-MOTHER-2558');

if (!lawText.includes('GLOBAL LAW LOCK'))
  fail('GLOBAL_LOCK_MISSING', 'GLOBAL LAW LOCK');

if (!lawText.includes('CHAPTER EXECUTION'))
  fail('CHAPTER_LOCK_MISSING', 'CHAPTER EXECUTION');

const EXPECTED_LAW_HASH =
  '6341320fcf06777a1b9202954af0e428e1d4cff03f3179737f60573adecfcf1d';

const expectedHash = EXPECTED_LAW_HASH;

const actualLawHash = crypto
  .createHash('sha256')
  .update(lawText)
  .digest('hex');

if (actualLawHash !== EXPECTED_LAW_HASH) {
  fail(
    'LAW_HASH_MISMATCH',
    'Law 2558 content hash does not match locked reference'
  );
}

const gate = cp.spawnSync(
  process.execPath,
  [GATE],
  { encoding: 'utf8' }
);

process.stdout.write(gate.stdout || '');
process.stderr.write(gate.stderr || '');

if (gate.status !== 0)
  fail('GATE_REJECTED', 'Law2558ExecutionGate rejected execution');

console.log('LAW_2558_RUN=PASS');
console.log('LAW_2558_ID=GANDOM-MOTHER-2558');
console.log('LAW_2558_HASH=' + expectedHash);
console.log('LAW_2558_EXECUTION_AUTHORIZED=true');
console.log('LAW_2558_GATE_ENFORCED=true');
