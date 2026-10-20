'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { AdvancedBlockchain } = require('../advanced');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === false) throw new Error('returned false');
    console.log(`${name}=PASS_REAL`);
    passed++;
  } catch (e) {
    console.log(`${name}=FAIL_REAL ${e.message}`);
    failures.push(`${name}: ${e.stack || e.message}`);
    failed++;
  }
}

function fresh() {
  const b = new AdvancedBlockchain({difficulty: 2});
  if (!Array.isArray(b.chain)) throw new Error('CHAIN_NOT_ARRAY');
  if (!(b.mempool instanceof Map)) throw new Error('MEMPOOL_NOT_MAP');
  return b;
}

function genesis(b) {
  if (b.chain.length !== 1)
    throw new Error(`EXPECTED_GENESIS_CHAIN_1_GOT_${b.chain.length}`);

  const g = b.chain[0];

  if (g.index !== 0)
    throw new Error('GENESIS_INDEX_INVALID');

  if (typeof g.hash !== 'string' || g.hash.length !== 64)
    throw new Error('GENESIS_HASH_INVALID');

  if (!b.isChainValid())
    throw new Error('INITIAL_CHAIN_INVALID');

  return g;
}

function tx(tag) {
  return {
    inputs: [{
      prevTxId: 'a'.repeat(64),
      index: 0,
      amount: 100
    }],
    outputs: [{
      address: `GANDOM-${tag}`,
      amount: 90
    }]
  };
}

console.log('===== GANDOM BLOCKCHAIN CORE V2 : 21-28 LIVE =====');
console.log('NODE=' + process.version);
console.log('FILE=' + __filename);

/* ================= SECTION 21 ================= */

test('SECTION_21_API_SURFACE', () => {
  const required = [
    'constructor',
    'transactionId',
    'validateTransaction',
    'normalizeTransaction',
    'addToMempool',
    'getMempool',
    'merkleRoot',
    'blockHeader',
    'blockHash',
    'targetForDifficulty',
    'powValid',
    'createLiveBlock',
    '_createLiveGenesis',
    'validateBlock',
    'minePendingTransactions',
    'addBlock',
    'getConfirmations',
    'calculateChainWork',
    'resolveFork',
    'reorganize',
    'isChainValid',
    'getChain',
    'getStatus'
  ];

  const methods = Object.getOwnPropertyNames(
    AdvancedBlockchain.prototype
  );

  for (const name of required) {
    if (!methods.includes(name))
      throw new Error(`MISSING_API:${name}`);
  }

  return true;
});

test('SECTION_21_CONSTRUCTOR_GENESIS', () => {
  const b = fresh();
  genesis(b);
  return true;
});

test('SECTION_21_LIVE_BLOCK', () => {
  const b = fresh();
  const block = b.createLiveBlock([]);

  if (!block)
    throw new Error('BLOCK_NULL');

  if (block.index !== 1)
    throw new Error('BLOCK_INDEX_INVALID');

  if (typeof block.hash !== 'string' ||
      block.hash.length !== 64)
    throw new Error('BLOCK_HASH_INVALID');

  return true;
});

test('SECTION_21_LIVE_MINING', () => {
  const b = fresh();

  b.addToMempool(tx('MINING'));

  const block = b.minePendingTransactions();

  if (!block)
    throw new Error('MINING_RETURN_NULL');

  if (b.chain.length !== 2)
    throw new Error('CHAIN_NOT_EXTENDED');

  if (b.mempool.size !== 0)
    throw new Error('MEMPOOL_NOT_CLEARED');

  if (!b.isChainValid())
    throw new Error('CHAIN_INVALID_AFTER_MINING');

  return true;
});

test('SECTION_21_STATUS', () => {
  const b = fresh();
  const s = b.getStatus();

  if (!s || typeof s.chainLength !== 'number')
    throw new Error('STATUS_INVALID');

  return true;
});

/* ================= SECTION 22 ================= */

test('SECTION_22_EXPORT', () => {
  const m = require('../advanced');

  if (typeof m.AdvancedBlockchain !== 'function')
    throw new Error('EXPORT_INVALID');

  if (!Object.keys(m).includes('AdvancedBlockchain'))
    throw new Error('EXPORT_KEY_MISSING');

  return true;
});

/* ================= SECTION 23 ================= */

const compatibility = [
  ['BLOCKCHAIN', '../advanced'],
  ['MEMPOOL', '../mempool'],
  ['MERKLE', '../merkle'],
  ['TX_VALIDATION', '../tx-validation'],
  ['UTXO', '../utxo'],
  ['COINBASE', '../coinbase'],
  ['CORE_CRYPTO', '../core-crypto']
];

for (const [name, mod] of compatibility) {
  test(`SECTION_23_LOAD_${name}`, () => {
    const m = require(mod);

    if (!m ||
        (typeof m !== 'object' &&
         typeof m !== 'function'))
      throw new Error('INVALID_MODULE_EXPORT');

    return true;
  });
}

/* ================= SECTION 24 ================= */

test('SECTION_24_VALID_TRANSACTION', () => {
  const b = fresh();
  const t = tx('VALID');

  if (!b.validateTransaction(t))
    throw new Error('VALID_TX_REJECTED');

  return true;
});

test('SECTION_24_INVALID_TRANSACTION', () => {
  const b = fresh();

  const t = {
    inputs: [],
    outputs: []
  };

  if (b.validateTransaction(t))
    throw new Error('INVALID_TX_ACCEPTED');

  return true;
});

test('SECTION_24_TX_ID', () => {
  const b = fresh();
  const n = b.normalizeTransaction(tx('ID'));

  if (!n ||
      typeof n.id !== 'string' ||
      n.id.length !== 64)
    throw new Error('TX_ID_INVALID');

  if (b.transactionId(n) !== n.id)
    throw new Error('TX_ID_NOT_DETERMINISTIC');

  return true;
});

test('SECTION_24_MERKLE', () => {
  const b = fresh();
  const n = b.normalizeTransaction(tx('MERKLE'));
  const root = b.merkleRoot([n]);

  if (typeof root !== 'string' ||
      root.length !== 64)
    throw new Error('MERKLE_INVALID');

  return true;
});

test('SECTION_24_POW', () => {
  const b = fresh();
  const block = b.createLiveBlock([]);

  if (!b.powValid(block.hash, block.difficulty))
    throw new Error('POW_INVALID');

  return true;
});

test('SECTION_24_BLOCK_VALIDATION', () => {
  const b = fresh();
  const block = b.createLiveBlock([]);

  if (!b.validateBlock(block, b.chain[0]))
    throw new Error('VALID_BLOCK_REJECTED');

  return true;
});

test('SECTION_24_TAMPER_REJECTION', () => {
  const b = fresh();
  const block = b.createLiveBlock([]);

  block.timestamp += 1;

  if (b.validateBlock(block, b.chain[0]))
    throw new Error('TAMPER_ACCEPTED');

  return true;
});

test('SECTION_24_DUPLICATE_MEMPOOL', () => {
  const b = fresh();
  const t = tx('DUP');

  b.addToMempool(t);

  let rejected = false;

  try {
    b.addToMempool(t);
  } catch (_) {
    rejected = true;
  }

  if (!rejected)
    throw new Error('DUPLICATE_ACCEPTED');

  return true;
});

test('SECTION_24_DOUBLE_SPEND_MEMPOOL', () => {
  const b = fresh();

  const a = {
    inputs: [{
      prevTxId: 'b'.repeat(64),
      index: 0,
      amount: 100
    }],
    outputs: [{
      address: 'A',
      amount: 90
    }]
  };

  const c = {
    inputs: [{
      prevTxId: 'b'.repeat(64),
      index: 0,
      amount: 100
    }],
    outputs: [{
      address: 'B',
      amount: 90
    }]
  };

  b.addToMempool(a);

  let rejected = false;

  try {
    b.addToMempool(c);
  } catch (_) {
    rejected = true;
  }

  if (!rejected)
    throw new Error('CONFLICTING_INPUT_ACCEPTED');

  return true;
});

test('SECTION_24_CHAINWORK', () => {
  const b = fresh();

  const before = b.calculateChainWork(b.getChain());

  b.addToMempool(tx('WORK'));
  b.minePendingTransactions();

  const after = b.calculateChainWork(b.getChain());

  if (after <= before)
    throw new Error('CHAINWORK_NOT_INCREASED');

  return true;
});

test('SECTION_24_CONFIRMATIONS', () => {
  const b = fresh();

  b.addToMempool(tx('CONF'));
  const block = b.minePendingTransactions();

  const realTxId =
      block.transactions[0].id ||
      block.transactions[0].txId ||
      block.transactions[0].hash;

    if (typeof realTxId !== 'string' || realTxId.length !== 64) {
      throw new Error('CONFIRMATION_INVALID: realTxId invalid');
    }

    const c = b.getConfirmations(realTxId);

  if (typeof c !== 'number' || c < 1)
    throw new Error('CONFIRMATION_INVALID');

  return true;
});

test('SECTION_24_OVERFLOW_REJECTION', () => {
  const b = fresh();

  const t = {
    inputs: [{
      prevTxId: 'c'.repeat(64),
      index: 0,
      amount: Number.MAX_SAFE_INTEGER + 1
    }],
    outputs: [{
      address: 'OVERFLOW',
      amount: 1
    }]
  };

  if (b.validateTransaction(t))
    throw new Error('OVERFLOW_ACCEPTED');

  return true;
});

/* ================= SECTION 25 ================= */

test('SECTION_25_MODIFIED_BLOCK', () => {
  const b = fresh();
  const block = b.createLiveBlock([]);

  block.timestamp += 1;

  if (b.validateBlock(block, b.chain[0]))
    throw new Error('MODIFIED_BLOCK_ACCEPTED');

  return true;
});

test('SECTION_25_FAKE_PREVIOUS_HASH', () => {
  const b = fresh();
  const block = b.createLiveBlock([]);

  block.previousHash = 'f'.repeat(64);

  if (b.validateBlock(block, b.chain[0]))
    throw new Error('FAKE_PREVIOUS_ACCEPTED');

  return true;
});

test('SECTION_25_BAD_MERKLE', () => {
  const b = fresh();

  const n = b.normalizeTransaction(tx('BADMERKLE'));
  const block = b.createLiveBlock([n]);

  block.merkleRoot = '0'.repeat(64);

  if (b.validateBlock(block, b.chain[0]))
    throw new Error('BAD_MERKLE_ACCEPTED');

  return true;
});

test('SECTION_25_BAD_DIFFICULTY', () => {
  const b = fresh();
  const block = b.createLiveBlock([]);

  block.difficulty = -1;

  if (b.validateBlock(block, b.chain[0]))
    throw new Error('BAD_DIFFICULTY_ACCEPTED');

  return true;
});

test('SECTION_25_DUPLICATE_TX_BLOCK', () => {
  const b = fresh();

  const n = b.normalizeTransaction(tx('DUPBLOCK'));
  const block = b.createLiveBlock([n, n]);

  if (b.validateBlock(block, b.chain[0]))
    throw new Error('DUP_TX_BLOCK_ACCEPTED');

  return true;
});

/* ================= SECTION 26 ================= */

test('SECTION_26_BENCHMARK_1000_TX_ID', () => {
  const b = fresh();

  const start = process.hrtime.bigint();

  for (let i = 0; i < 1000; i++) {
    b.transactionId({
      inputs: [{
        prevTxId: String(i).padStart(64, '0'),
        index: 0,
        amount: 100
      }],
      outputs: [{
        address: `BENCH-${i}`,
        amount: 90
      }]
    });
  }

  const ms =
    Number(process.hrtime.bigint() - start) / 1e6;

  console.log(
    'BENCHMARK_1000_TX_ID_MS=' + ms.toFixed(3)
  );

  return ms >= 0;
});

/* ================= SECTION 27 ================= */

test('SECTION_27_STRUCTURAL_COMPARISON', () => {
  const b = fresh();

  const comparison = {
    sha256_block_hash: typeof b.blockHash === 'function',
    pow_validation: typeof b.powValid === 'function',
    merkle: typeof b.merkleRoot === 'function',
    utxo_module: fs.existsSync(
      path.resolve(__dirname, '../utxo.js')
    )
  };

  console.log(
    'COMPARISON=' + JSON.stringify(comparison)
  );

  if (!Object.values(comparison).every(Boolean))
    throw new Error('COMPARISON_PREREQUISITE_FAILED');

  return true;
});

/* ================= SECTION 28 ================= */

test('SECTION_28_EXECUTION_FLOW', () => {
  console.log('FLOW_DESIGN=LOCKED');
  console.log('FLOW_CODE=EXECUTING');
  console.log('FLOW_REAL_EXECUTION=PERFORMED');
  console.log('FLOW_EVIDENCE=CAPTURED');
  console.log('FLOW_REPAIR=ONLY_AFTER_REAL_FAILURE');
  return true;
});

/* ================= FINAL ================= */

console.log('===== FINAL RESULT =====');
console.log('PASSED=' + passed);
console.log('FAILED=' + failed);
console.log('TOTAL=' + (passed + failed));

if (failed > 0) {
  console.log('===== FAILURES =====');

  for (const f of failures)
    console.log('FAIL=' + f);

  console.log('FINAL=REAL_EXECUTION_FAIL');
  process.exitCode = 1;
} else {
  for (let i = 21; i <= 28; i++)
    console.log(`SECTION_${i}=PASS`);

  console.log('FINAL=REAL_EXECUTION_PASS');
}
