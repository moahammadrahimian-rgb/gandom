'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = process.cwd();
const results = [];

function record(lock, name, status, detail) {
  const item = { lock, name, status, detail };
  results.push(item);
  console.log(
    `[${status}] [LOCK-${lock}] ${name}: ${detail}`
  );
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readJSON(rel) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(ROOT, rel), 'utf8')
    );
  } catch (e) {
    return null;
  }
}

function scanFiles(dir, extensions, output = []) {
  if (!fs.existsSync(dir)) return output;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return output;
  }

  for (const entry of entries) {
    if ([
      'node_modules', '.git', 'audit', 'dist',
      'build', '.gradle'
    ].includes(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanFiles(full, extensions, output);
    } else if (extensions.includes(path.extname(entry.name))) {
      output.push(full);
    }
  }

  return output;
}

function request(port, endpoint) {
  return new Promise(resolve => {
    const req = http.get({
      hostname: '127.0.0.1',
      port,
      path: endpoint,
      timeout: 3000
    }, res => {
      let body = '';

      res.on('data', chunk => {
        if (body.length < 50000) body += chunk;
      });

      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {}

        resolve({
          reachable: true,
          status: res.statusCode,
          json,
          body: body.slice(0, 500)
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ reachable: false, error: 'TIMEOUT' });
    });

    req.on('error', e => {
      resolve({ reachable: false, error: e.code || e.message });
    });
  });
}

async function main() {
  console.log('\n========== GANDOM FIVE-LOCK RUN ==========');
  console.log('ROOT=' + ROOT);
  console.log('LAW=2558');
  console.log('MODE=INTEGRATED_EXECUTION');
  console.log('SOURCE_DATA_MODIFIED=0\n');

  // LOCK 1 — Governance and project integrity
  const lawFiles = [
    'constitution/GOLDEN-MOTHER-LAW-2558.json',
    'gandom-core/governance/GOLDEN-MOTHER-LAW-2558.json'
  ];

  let lawFound = false;

  for (const file of lawFiles) {
    if (!exists(file)) continue;

    lawFound = true;
    const law = readJSON(file);

    record(
      1,
      file,
      law ? 'PASS' : 'FAIL',
      law ? 'File exists and JSON parses' : 'Invalid JSON'
    );
  }

  if (!lawFound) {
    record(1, 'Mother Law', 'FAIL', 'Law files not found at expected paths');
  }

  const packageJson = readJSON('package.json');

  record(
    1,
    'package.json',
    packageJson ? 'PASS' : 'FAIL',
    packageJson ? 'Project manifest parses' : 'Manifest missing or invalid'
  );

  // LOCK 2 — Core services, API, and P2P
  const ports = [8080, 8787, 8788, 8888, 9000];
  const serviceResults = {};

  for (const port of ports) {
    const r = await request(port, '/');
    serviceResults[port] = r;

    record(
      2,
      `HTTP ${port}`,
      r.reachable ? 'PASS' : 'WARN',
      r.reachable
        ? `HTTP ${r.status}`
        : `Unavailable: ${r.error}`
    );
  }

  for (const endpoint of [
    '/api/wallet',
    '/api/chain',
    '/api/tokenomics',
    '/api/market/chart'
  ]) {
    const r = await request(8787, endpoint);

    record(
      2,
      endpoint,
      r.reachable && r.status >= 200 && r.status < 300
        ? 'PASS' : 'FAIL',
      r.reachable
        ? `HTTP ${r.status}; JSON=${Boolean(r.json)}`
        : `Unavailable: ${r.error}`
    );
  }

  const nodeBFiles = [
    'node-b-chain.js',
    'blockchain-data-b/chain.json'
  ];

  for (const file of nodeBFiles) {
    record(
      2,
      file,
      exists(file) ? 'PASS' : 'FAIL',
      exists(file) ? 'Found' : 'Missing'
    );
  }

  // LOCK 3 — AI brain and agent modules
  const sourceFiles = scanFiles(ROOT, ['.js', '.ts', '.mjs', '.cjs']);
  const sourceText = sourceFiles.map(file => {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      return '';
    }
  }).join('\n');

  const brainPatterns = [
    /agent/i,
    /memory/i,
    /neuron|brain|inference/i
  ];

  for (const pattern of brainPatterns) {
    const found = pattern.test(sourceText);

    record(
      3,
      pattern.source,
      found ? 'WARN' : 'FAIL',
      found
        ? 'Code reference found; runtime behavior not yet proven'
        : 'No matching implementation reference found'
    );
  }

  // LOCK 4 — Specialist domains
  const domainPatterns = {
    medical: /medical|clinical|healthcare/i,
    plants: /botany|plant|agriculture/i,
    minerals: /mineral|geology|mining/i,
    image_analysis: /image.?analysis|vision|image.?recognition/i
  };

  for (const [name, pattern] of Object.entries(domainPatterns)) {
    const found = pattern.test(sourceText);

    record(
      4,
      name,
      found ? 'WARN' : 'FAIL',
      found
        ? 'Code reference found; specialist accuracy not verified'
        : 'No matching implementation reference found'
    );
  }

  // LOCK 5 — Economy, UI, and Android
  const economyPatterns = {
    wallet: /wallet/i,
    tokenomics: /total_supply|tokenomics|owner_share/i,
    market: /market|order.?book|exchange/i
  };

  for (const [name, pattern] of Object.entries(economyPatterns)) {
    const found = pattern.test(sourceText);

    record(
      5,
      name,
      found ? 'WARN' : 'FAIL',
      found
        ? 'Code reference found; end-to-end behavior not verified'
        : 'No matching implementation reference found'
    );
  }

  const apkFiles = scanFiles(ROOT, ['.apk']);

  record(
    5,
    'Android APK',
    apkFiles.length ? 'WARN' : 'FAIL',
    apkFiles.length
      ? `${apkFiles.length} APK artifact(s) found; install/runtime not verified`
      : 'No APK artifact found'
  );

  // Blockchain integrity: read-only; never rewrite either chain.
  for (const file of [
    'blockchain-data/chain.json',
    'blockchain-data-b/chain.json'
  ]) {
    const data = readJSON(file);

    if (!data) {
      record(2, file, 'FAIL', 'Missing or invalid JSON');
      continue;
    }

    const chain = Array.isArray(data) ? data : data.chain;

    if (!Array.isArray(chain) || chain.length === 0) {
      record(2, file, 'FAIL', 'Chain array missing or empty');
      continue;
    }

    let indexGaps = 0;
    let brokenLinks = 0;
    let missingHashes = 0;
    let missingPrevHash = 0;

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];

      if (!block || typeof block !== 'object') {
        missingHashes++;
        continue;
      }

      if (typeof block.hash !== 'string' || !block.hash) {
        missingHashes++;
      }

      if (i > 0) {
        const prev = chain[i - 1];

        if (
          !Number.isInteger(block.index) ||
          !Number.isInteger(prev.index) ||
          block.index !== prev.index + 1
        ) {
          indexGaps++;
        }

        if (typeof block.prevHash !== 'string') {
          missingPrevHash++;
        } else if (block.prevHash !== prev.hash) {
          brokenLinks++;
        }
      }
    }

    const declared = Array.isArray(data) ? chain.length : data.length;
    const lengthMatches = declared === chain.length;
    const clean = lengthMatches &&
      indexGaps === 0 &&
      brokenLinks === 0 &&
      missingHashes === 0 &&
      missingPrevHash === 0;

    record(
      2,
      file,
      clean ? 'PASS' : 'FAIL',
      JSON.stringify({
        declared_length: declared,
        actual_length: chain.length,
        first_index: chain[0]?.index,
        last_index: chain.at(-1)?.index,
        length_matches: lengthMatches,
        index_gaps: indexGaps,
        broken_prevHash_links: brokenLinks,
        blocks_without_hash: missingHashes,
        missing_prevHash: missingPrevHash
      })
    );
  }

  // Final summary
  const counts = {
    PASS: results.filter(x => x.status === 'PASS').length,
    WARN: results.filter(x => x.status === 'WARN').length,
    FAIL: results.filter(x => x.status === 'FAIL').length
  };

  const report = {
    timestamp: new Date().toISOString(),
    project: 'GANDOM',
    law: 2558,
    mode: 'INTEGRATED_EXECUTION',
    source_data_modified: false,
    counts,
    pass_real: false,
    results
  };

  const outDir = path.join(ROOT, 'audit');
  fs.mkdirSync(outDir, { recursive: true });

  const reportPath = path.join(
    outDir,
    `FIVE-LOCKS-${Date.now()}.json`
  );

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n========== FIVE-LOCK SUMMARY ==========');
  console.log(JSON.stringify(counts, null, 2));
  console.log('REPORT=' + reportPath);
  console.log('PASS_REAL=NOT_CLAIMED');
  console.log('SOURCE_DATA_MODIFIED=0');
}

main().catch(error => {
  console.error('RUNNER_FATAL=' + error.stack);
  process.exitCode = 1;
});
