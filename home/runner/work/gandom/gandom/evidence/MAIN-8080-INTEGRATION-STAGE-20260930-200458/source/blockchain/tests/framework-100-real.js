const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const tests = [
  'MODULE_LOAD',
  'GENESIS',
  'BLOCK_CREATION',
  'POW',
  'MERKLE',
  'MERKLE_PROOF',
  'KEY_GENERATION',
  'SIGNATURE',
  'SIGNATURE_REJECTION',
  'VALID_TRANSACTION',

  'UTXO_FUNDS_READY',
  'MEMPOOL_VALIDATE',
  'MEMPOOL_ADD',
  'MEMPOOL_GET',
  'DUPLICATE_DETECTION',
  'DOUBLE_SPEND_DETECTION',
  'FEE_PRIORITY',
  'MEMPOOL_REMOVE',
  'INVALID_SIGNATURE_REJECTION',
  'INVALID_UTXO_REJECTION',
  'SECTION_9_MEMPOOL',

  'BLOCK_VALIDATION',
  'INVALID_BLOCK_REJECTION',
  'DUPLICATE_TX_REJECTION',
  'DOUBLE_SPEND_BLOCK_REJECTION',
  'CHAIN_VALIDATION',
  'UTXO_REBUILD',
  'GENESIS_TO_CURRENT',
  'CHAINWORK',
  'CUMULATIVE_WORK',

  'TARGET_BASED_WORK',
  'FORK_VALIDATION',
  'GREATER_WORK_WINS',
  'TIE_BREAK_DETERMINISTIC',
  'REORG_VALIDATION',
  'UTXO_ROLLBACK',
  'ORPHAN_RETURN_TO_MEMPOOL',
  'CONFIRMATIONS',
  'REQUIRED_CONFIRMATIONS_12',
  'SAVE_LOAD',

  'ATOMIC_WRITE',
  'CRASH_SAFE',
  'RECOVERABLE',
  'SIGTERM_RECOVERY',
  'SIGINT_RECOVERY',
  'PROCESS_CRASH_RECOVERY',
  'POWER_LOSS_SIMULATION',
  'BIGINT_USAGE',
  'NEGATIVE_AMOUNT_REJECTION',
  'OVERFLOW_PREVENTION',

  'CANONICAL_SERIALIZATION',
  'DETERMINISTIC_HASH',
  'STABLE_PROPERTY_ORDER',
  'MALFORMED_TX_REJECTION',
  'MALFORMED_BLOCK_REJECTION',
  'INVALID_MERKLE_REJECTION',
  'INVALID_POW_REJECTION',
  'INVALID_PREVIOUS_HASH_REJECTION',

  'INVALID_TIMESTAMP_REJECTION',
  'INTEGER_OVERFLOW_REJECTION',
  'MEMPOOL_SPAM_REJECTION',
  'DUPLICATE_BLOCK_REJECTION',
  'REPLAY_REJECTION',
  'UTXO_REPLAY_REJECTION',
  'CORRUPTED_DB_REJECTION',
  'LOWER_WORK_FORK_REJECTION',
  'HIGHER_WORK_FORK_ACCEPTANCE',
  'MODIFIED_BLOCK_REJECTION',

  'MODIFIED_TX_REJECTION',
  'MODIFIED_MERKLE_REJECTION',
  'FAKE_PREVIOUS_HASH_REJECTION',
  'FAKE_POW_REJECTION',
  'INVALID_DIFFICULTY_REJECTION',
  'FUTURE_TIMESTAMP_REJECTION',
  'DUPLICATE_TRANSACTION_REJECTION',
  'DUPLICATE_BLOCK_ATTACK_REJECTION',
  'UTXO_DOUBLE_SPEND_ATTACK_REJECTION',
  'BAD_SIGNATURE_ATTACK_REJECTION',

  'HASH_RATE',
  'MINING_TIME',
  'VERIFICATION_TIME',
  'MEMORY_USAGE',
  'BLOCK_VALIDATION_TIME',
  'TX_VALIDATION_TIME',
  'MERKLE_CONSTRUCTION_TIME',
  'BLOCK_SIZE_MEASUREMENT',
  'TX_THROUGHPUT',
  'MEMPOOL_THROUGHPUT',

  'API_CONTRACT',
  'EXPORT_CONTRACT',
  'BACKWARD_COMPATIBILITY',
  'PERSISTENCE_INTEGRITY',
  'RECOVERY_INTEGRITY',
  'DETERMINISTIC_EXECUTION',
  'ATTACK_SUITE',
  'BENCHMARK_REPORT',
  'BITCOIN_TECHNICAL_COMPARISON',
  'FINAL_INTEGRATION'
];

const root = __dirname;
const candidates = [
  'section9-mempool-real.js',
  'section10-block-validation.js',
  'section11-chain-validation.js',
  'section12-chain-work.js',
  'section13-fork-resolution.js',
  'section14-reorg.js',
  'section15-confirmations.js',
  'section16-persistence.js',
  'section17-crash-recovery.js',
  'section18-overflow.js',
  'section19-serialization.js',
  'section20-security.js',
  'section24-real-tests.js',
  'section25-attack-tests.js',
  'section26-benchmark.js'
];

function run(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;

  const r = spawnSync(process.execPath, [full], {
    cwd: path.join(root, '..', '..'),
    encoding: 'utf8',
    timeout: 300000
  });

  return {
    exitCode: r.status,
    output: `${r.stdout || ''}${r.stderr || ''}`
  };
}

console.log('=== GANDOM BLOCKCHAIN CORE V2 — FRAMEWORK 100 ===');

let completed = 0;

for (let i = 0; i < tests.length; i++) {
  const n = i + 1;
  const name = tests[i];

  let status = 'PENDING';

  for (const file of candidates) {
    const result = run(file);
    if (!result) continue;

    const token = new RegExp(
      `(?:${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})[=:]+PASS`
    );

    if (result.exitCode === 0 && token.test(result.output)) {
      status = 'PASS';
      break;
    }
  }

  if (status === 'PASS') completed++;

  console.log(
    `TEST_${String(n).padStart(3, '0')} ${name}=${status}`
  );
}

console.log('==============================================');
console.log(`FRAMEWORK=100`);
console.log(`COMPLETED=${completed}`);
console.log(`PENDING=${100 - completed}`);
console.log(`STATUS=${completed === 100 ? 'PASS' : 'CONTINUE'}`);
