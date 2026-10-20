'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.gandom-2558');
const FILES = [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
];

const sha256 = data =>
  crypto.createHash('sha256').update(data).digest('hex');

function readChain(relativePath) {
  const file = path.join(ROOT, relativePath);
  const raw = fs.readFileSync(file);
  const data = JSON.parse(raw.toString('utf8'));

  if (!Array.isArray(data.chain) || data.chain.length === 0) {
    throw new Error('CHAIN_EMPTY_OR_INVALID: ' + relativePath);
  }

  const chain = data.chain;

  return {
    file: relativePath,
    fileSHA256: sha256(raw),
    blocks: chain.length,
    genesis: chain[0],
    chain,
    difficulty: data.difficulty ?? null
  };
}

function auditStructure(node) {
  const errors = [];
  const blocks = node.chain;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    if (!b || typeof b !== 'object') {
      errors.push({ index: i, error: 'BLOCK_NOT_OBJECT' });
      continue;
    }

    if (!Number.isSafeInteger(b.index) || b.index !== i) {
      errors.push({
        index: i,
        error: 'INVALID_INDEX',
        actual: b.index,
        expected: i
      });
    }

    if (typeof b.hash !== 'string' ||
        !/^[0-9a-f]{64}$/i.test(b.hash)) {
      errors.push({ index: i, error: 'INVALID_HASH_FORMAT' });
    }

    if (i > 0) {
      if (b.prevHash !== blocks[i - 1].hash) {
        errors.push({
          index: i,
          error: 'PREV_HASH_MISMATCH',
          expected: blocks[i - 1].hash,
          actual: b.prevHash
        });
      }

      if (!Number.isSafeInteger(b.timestamp) ||
          !Number.isSafeInteger(blocks[i - 1].timestamp) ||
          b.timestamp < blocks[i - 1].timestamp) {
        errors.push({ index: i, error: 'TIMESTAMP_ORDER_INVALID' });
      }
    }
  }

  return {
    file: node.file,
    blockCount: blocks.length,
    genesisHash: node.genesis.hash,
    lastIndex: blocks.at(-1).index,
    structuralErrors: errors,
    linksValid: errors.filter(e =>
      e.error === 'PREV_HASH_MISMATCH').length === 0,
    indicesValid: errors.filter(e =>
      e.error === 'INVALID_INDEX').length === 0
  };
}

function benchmark(iterations) {
  const input = Buffer.from('GANDOM-2558-SHA256-BENCHMARK');
  let digest = '';

  // Warm-up is reported separately from measured work.
  for (let i = 0; i < 10000; i++) {
    digest = sha256(Buffer.concat([input, Buffer.from(String(i))]));
  }

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    digest = sha256(Buffer.concat([
      input,
      Buffer.from(String(i))
    ]));
  }

  const elapsedMs = performance.now() - start;

  return {
    algorithm: 'SHA-256',
    iterations,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    hashesPerSecond: Math.round(iterations / (elapsedMs / 1000)),
    finalDigest: digest,
    meaning: 'Local synthetic benchmark; not Bitcoin network hashrate'
  };
}

function main() {
  const startedAt = new Date().toISOString();
  const nodes = FILES.map(readChain);
  const audits = nodes.map(auditStructure);
  const genesisMatch =
    nodes[0].genesis.hash === nodes[1].genesis.hash;

  const report = {
    version: 'GANDOM_GENESIS_AUDIT_2558',
    startedAt,
    mode: 'READ_ONLY',
    mutation: false,
    serviceRestarted: false,
    nodes: nodes.map(n => ({
      file: n.file,
      fileSHA256: n.fileSHA256,
      blocks: n.blocks,
      genesisHash: n.genesis.hash,
      genesisPrevHash: n.genesis.prevHash,
      genesisTimestamp: n.genesis.timestamp,
      genesisDifficulty: n.genesis.difficulty,
      genesisNonce: n.genesis.nonce,
      genesisMerkleRoot: n.genesis.merkleRoot,
      difficulty: n.difficulty
    })),
    genesisMatch,
    structureAudits: audits,
    benchmark: benchmark(100000),
    verdict: genesisMatch
      ? 'GENESIS_HASH_MATCHED_FULL_CONSENSUS_NOT_PROVEN'
      : 'GENESIS_MISMATCH_SYNC_BLOCKED',
    limitations: [
      'Does not replace project-specific block hash validation',
      'Does not independently validate transaction signatures or Merkle roots',
      'Does not modify either chain file',
      'Benchmark does not measure network throughput or block production'
    ]
  };

  const output = path.join(OUT, 'audit-report.json');
  const temporary = output + '.tmp';

  fs.writeFileSync(temporary, JSON.stringify(report, null, 2));
  fs.renameSync(temporary, output);

  console.log('\n===== GANDOM 2558 AUDIT =====');
  console.log(JSON.stringify(report, null, 2));
  console.log('\nREPORT=' + output);
  console.log('CHAIN_MUTATION=false');
  console.log('SERVICE_RESTARTED=false');
}

try {
  main();
} catch (error) {
  console.error('AUDIT_FAILED:', error.message);
  process.exitCode = 1;
}
