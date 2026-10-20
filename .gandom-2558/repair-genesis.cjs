'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const A = path.resolve('blockchain-data/chain.json');
const B = path.resolve('blockchain-data-b/chain.json');
const REPORT = path.resolve('.gandom-2558/repair-genesis-report.json');

function sha256(file) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function readChain(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!raw || !Array.isArray(raw.chain) || raw.chain.length === 0) {
    throw new Error('INVALID_CHAIN_FORMAT: ' + file);
  }
  return raw;
}

function summarize(file, data) {
  return {
    file,
    blocks: data.chain.length,
    genesis: data.chain[0].hash,
    lastIndex: data.chain[data.chain.length - 1].index,
    fileSHA256: sha256(file)
  };
}

function main() {
  const report = {
    time: new Date().toISOString(),
    mode: 'READ_ONLY_REPAIR_PREFLIGHT',
    mutation: false,
    restart: false
  };

  try {
    const a = readChain(A);
    const b = readChain(B);

    report.nodeA = summarize(A, a);
    report.nodeB = summarize(B, b);
    report.sameGenesis = a.chain[0].hash === b.chain[0].hash;

    report.plan = report.sameGenesis
      ? 'VALIDATE_FULL_CHAIN_AND_SYNC'
      : 'VALIDATE_A_FULL_CHAIN_THEN_PREPARE_EXPLICIT_B_RECOVERY';

    report.warning =
      'No automatic genesis recreation, chain replacement, or service restart performed.';

    report.status = 'PREFLIGHT_COMPLETE_NOT_REPAIRED';
  } catch (e) {
    report.status = 'BLOCKED';
    report.error = e.message;
  }

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('REPORT=' + REPORT);
}

main();
