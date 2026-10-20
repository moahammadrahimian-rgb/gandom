'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CHAIN_FILES = [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
];

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function inspect(relativePath) {
  const file = path.join(ROOT, relativePath);

  if (!fs.existsSync(file)) {
    return {
      file: relativePath,
      status: 'MISSING'
    };
  }

  const raw = fs.readFileSync(file);
  const parsed = JSON.parse(raw.toString('utf8'));
  const chain = Array.isArray(parsed) ? parsed : parsed.chain;

  if (!Array.isArray(chain) || chain.length === 0) {
    return {
      file: relativePath,
      status: 'INVALID_FORMAT',
      sha256: sha256(raw)
    };
  }

  const errors = [];

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];

    if (!block || typeof block !== 'object') {
      errors.push(`INVALID_BLOCK_AT_${i}`);
      continue;
    }

    if (i > 0) {
      if (block.index !== chain[i - 1].index + 1) {
        errors.push(`INDEX_ERROR_AT_${i}`);
      }

      if (block.prevHash !== chain[i - 1].hash) {
        errors.push(`LINK_ERROR_AT_${i}`);
      }
    }
  }

  return {
    file: relativePath,
    status: errors.length ? 'BLOCKED' : 'STRUCTURE_OK',
    bytes: raw.length,
    sha256: sha256(raw),
    blockCount: chain.length,
    genesisHash: chain[0]?.hash ?? null,
    latestIndex: chain[chain.length - 1]?.index ?? null,
    errors
  };
}

const report = {
  law: 2558,
  mode: 'READ_ONLY_PROTECTION_PREFLIGHT',
  timestamp: new Date().toISOString(),
  chains: CHAIN_FILES.map(inspect)
};

console.log(JSON.stringify(report, null, 2));

if (report.chains.some(
  item => item.status !== 'STRUCTURE_OK'
)) {
  console.error(
    '\nGANDOM_2558: BLOCKED — do not rebuild, overwrite, or synchronize chain files automatically.'
  );
  process.exitCode = 2;
} else {
  console.log(
    '\nGANDOM_2558: STRUCTURAL_PREFLIGHT_PASS — full consensus validity is not established.'
  );
}
