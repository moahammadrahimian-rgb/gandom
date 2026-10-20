'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const { Worker, isMainThread, workerData } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');

const OUT = '.gandom-2558/heavy-two-node-report.json';

if (!isMainThread) {
  const { label, iterations } = workerData;
  let value = `${label}:GANDOM:2558`;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    value = crypto.createHash('sha256')
      .update(value)
      .digest('hex');
  }

  const elapsedMs = performance.now() - start;
  const result = {
    node: label,
    iterations,
    elapsedMs: +elapsedMs.toFixed(2),
    hashesPerSecond: Math.round(iterations / (elapsedMs / 1000)),
    finalDigest: value
  };

  if (process.send) process.send(result);
  else require('node:worker_threads').parentPort.postMessage(result);
} else {
  const iterations = Math.max(
    1000,
    Math.min(Number(process.env.GANDOM_ITERATIONS) || 200000, 2000000)
  );

  const chainFiles = [
    'blockchain-data/chain.json',
    'blockchain-data-b/chain.json'
  ];

  const before = chainFiles.map(file => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const chain = data.chain || [];
    return {
      file,
      count: chain.length,
      genesis: chain[0]?.hash || null,
      lastIndex: chain.at(-1)?.index ?? null
    };
  });

  const start = performance.now();
  const workers = ['NODE-A-WORKLOAD', 'NODE-B-WORKLOAD'].map(label =>
    new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { label, iterations }
      });
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', code => {
        if (code !== 0) reject(new Error(`${label} exited with ${code}`));
      });
    })
  );

  Promise.all(workers).then(results => {
    const report = {
      test: 'GANDOM_TWO_WORKER_SHA256_STRESS',
      mode: 'COMPUTE_ONLY_READ_ONLY_CHAIN_DATA',
      iterationsPerWorker: iterations,
      totalHashes: iterations * 2,
      wallTimeMs: +(performance.now() - start).toFixed(2),
      workers: results,
      chainsBefore: before,
      sameGenesis: before[0].genesis === before[1].genesis,
      verdict: before[0].genesis === before[1].genesis
        ? 'GENESIS_MATCH_REQUIRES_P2P_TEST'
        : 'GENESIS_MISMATCH_SYNC_BLOCKED',
      chainMutation: false,
      serviceRestarted: false
    };

    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    console.log(`REPORT=${OUT}`);
  }).catch(error => {
    console.error('BENCHMARK_FAILED:', error.message);
    process.exitCode = 1;
  });
}
