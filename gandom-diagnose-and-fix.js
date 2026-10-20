'use strict';

/*
 * GANDOM — Law 2558
 * Read-only diagnosis by default.
 * No data deletion, no automatic service restart,
 * no fake PASS, no automatic dependency installation.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT = process.cwd();

const TARGETS = {
  audit: 'audit-server.js',
  web: 'server-web.js',
  nodeB: 'node-b-persistent.js',
  wallet: path.join('wallet', 'GANDOM-WALLET-2558.js'),
};

const findings = [];
let failures = 0;

function report(label, status, details) {
  console.log(`\n[${status}] ${label}`);
  if (details) console.log(details);
  findings.push({ label, status, details: details || '' });

  if (status === 'FAIL' || status === 'MISSING') failures++;
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  if (!fs.existsSync(fullPath)) return null;

  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    report('FILE_READ_ERROR', 'FAIL',
      `${relativePath}: ${error.message}`);
    return null;
  }
}

function walk(dir, results = [], depth = 0) {
  if (depth > 5 || results.length > 5000) return results;

  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === '.gradle'
    ) continue;

    const full = path.join(dir, entry.name);
    const relative = path.relative(ROOT, full);

    if (entry.isDirectory()) {
      walk(full, results, depth + 1);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(relative);
    }
  }

  return results;
}

function findAlternatives(expected, candidates) {
  const basename = path.basename(expected).toLowerCase();

  return candidates.filter(file => {
    const actual = path.basename(file).toLowerCase();

    if (actual === basename) return false;

    if (expected === TARGETS.audit) {
      return actual.includes('audit') &&
        actual.endsWith('.js');
    }

    if (expected === TARGETS.web) {
      return (
        actual.includes('web') ||
        actual.includes('frontend')
      ) && actual.endsWith('.js');
    }

    return false;
  });
}

function inspectExpectedFile(expected, candidates) {
  if (exists(expected)) {
    report('EXPECTED_FILE', 'PASS', `Found: ${expected}`);
    return;
  }

  const alternatives = findAlternatives(expected, candidates);

  if (alternatives.length) {
    report(
      'EXPECTED_FILE',
      'MISSING',
      `Expected: ${expected}\n` +
      `Possible actual filenames:\n` +
      alternatives.map(x => `  ${x}`).join('\n')
    );
  } else {
    report(
      'EXPECTED_FILE',
      'MISSING',
      `Not found: ${expected}\n` +
      'No matching alternative was identified.'
    );
  }
}

function inspectPackage() {
  const pkgText = read('package.json');

  if (!pkgText) {
    report(
      'PACKAGE_JSON',
      'MISSING',
      'Root package.json was not found.'
    );
    return;
  }

  let pkg;

  try {
    pkg = JSON.parse(pkgText);
  } catch (error) {
    report('PACKAGE_JSON', 'FAIL', error.message);
    return;
  }

  const declared = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.optionalDependencies || {}),
  };

  const commonModules = [
    'express',
    'ws',
  ];

  const missing = [];

  for (const moduleName of commonModules) {
    const modulePath = path.join(
      ROOT,
      'node_modules',
      moduleName,
      'package.json'
    );

    const installed = fs.existsSync(modulePath);
    const declaredVersion = declared[moduleName];

    console.log(
      `[MODULE] ${moduleName}: ` +
      `declared=${declaredVersion || 'NO'} ` +
      `installed=${installed ? 'YES' : 'NO'}`
    );

    if (!installed) {
      missing.push(moduleName);
    }
  }

  if (missing.length) {
    report(
      'DEPENDENCIES',
      'FAIL',
      'Missing modules: ' + missing.join(', ') + '\n' +
      'If package.json is valid, the repair command is:\n' +
      'npm install\n\n' +
      'To install only the missing modules explicitly, if ' +
      'the source code requires them:\n' +
      'npm install ' + missing.join(' ')
    );
  } else {
    report(
      'DEPENDENCIES',
      'PASS',
      'express and ws are installed. ' +
      'This does not prove all imports resolve.'
    );
  }

  console.log('\n[PACKAGE SCRIPTS]');
  console.log(JSON.stringify(pkg.scripts || {}, null, 2));
}

function discoverRoutes(source, filename) {
  if (!source) {
    report(
      `ROUTES ${filename}`,
      'MISSING',
      `Cannot inspect routes: ${filename} was not found.`
    );
    return;
  }

  const patterns = [
    /\b(?:app|server|router)\.(get|post|put|patch|delete|all)\s*\(\s*(['"`])([^'"`]+)\2/g,
    /\b(?:app|router)\.(get|post|put|patch|delete|all)\s*\(\s*(\[[^\]]+\])/g,
    /\burl\.pathname\s*===?\s*(['"`])([^'"`]+)\1/g,
    /\bpathname\s*===?\s*(['"`])([^'"`]+)\1/g,
  ];

  const found = [];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(source)) !== null) {
      found.push(match[0].trim());
    }
  }

  const unique = [...new Set(found)];

  if (!unique.length) {
    report(
      `ROUTES ${filename}`,
      'UNKNOWN',
      'No obvious route declaration found. ' +
      'Inspect the request handler manually.'
    );
  } else {
    report(
      `ROUTES ${filename}`,
      'INFO',
      unique.join('\n')
    );
  }

  const portMatches = [
    ...source.matchAll(
      /\b(?:PORT|port)\s*[:=]\s*(?:process\.env\.[A-Z0-9_]+\s*\|\|\s*)?(\d{2,5})/g
    )
  ].map(match => match[1]);

  const listenMatches = [
    ...source.matchAll(
      /\.listen\s*\(\s*([^,\n)]+)/g
    )
  ].map(match => match[1].trim());

  console.log(`[PORT EXPRESSIONS] ${filename}:`,
    [...new Set(portMatches)].join(', ') || 'not statically identified');

  console.log(`[LISTEN EXPRESSIONS] ${filename}:`,
    listenMatches.join(' | ') || 'none identified');

  if (filename === TARGETS.nodeB) {
    const healthRoute = unique.filter(route =>
      /health|status|ready/i.test(route)
    );

    const rootRoute = unique.filter(route =>
      /\/['"`)]/.test(route) ||
      /pathname\s*===?\s*(['"`])\/\1/.test(route)
    );

    console.log('\n[NODE B HEALTH CHECK GUIDANCE]');

    if (healthRoute.length) {
      console.log('Candidate health declarations:');
      console.log(healthRoute.join('\n'));
    }

    if (rootRoute.length) {
      console.log('Candidate root declarations:');
      console.log(rootRoute.join('\n'));
    }

    console.log(
      'Use the actual port and route confirmed from the source. ' +
      'A route declaration alone does not prove that the listener started.'
    );
  }
}

function inspectWallet(source) {
  if (!source) {
    report(
      'WALLET_SOURCE',
      'MISSING',
      `Not found: ${TARGETS.wallet}`
    );
    return;
  }

  const indicators = {
    httpCreateServer: /\bhttp\.createServer\s*\(/.test(source),
    httpsCreateServer: /\bhttps\.createServer\s*\(/.test(source),
    expressImport: /\brequire\s*\(\s*['"]express['"]\s*\)|\bfrom\s+['"]express['"]/.test(source),
    listenCall: /\.listen\s*\(/.test(source),
    processExit: /\bprocess\.exit\s*\(/.test(source),
    testTerms: /\b(?:describe|it|test)\s*\(/.test(source),
    moduleExports: /\bmodule\.exports\b|\bexports\./.test(source),
  };

  console.log('\n[WALLET SOURCE INDICATORS]');
  console.log(JSON.stringify(indicators, null, 2));

  if (indicators.listenCall) {
    report(
      'WALLET_HTTP',
      'INFO',
      'A .listen() call exists. Verify its host, port, and execution path.'
    );
  } else {
    report(
      'WALLET_HTTP',
      'FAIL',
      'No obvious .listen() call found. The file does not visibly ' +
      'start an HTTP listener. It may be a library or test runner.'
    );
  }

  if (indicators.processExit) {
    console.log(
      'WARNING: process.exit() exists; determine whether it runs ' +
      'before a server can remain active.'
    );
  }

  console.log(
    '\nWrapper policy: no automatic wallet wrapper will be generated. ' +
    'First identify exported functions and the intended API contract. ' +
    'A generic wrapper cannot safely invent wallet endpoints or ' +
    'claim wallet functionality that the source does not implement.'
  );
}

function checkPort(port, host = '127.0.0.1', timeout = 1200) {
  return new Promise(resolve => {
    const socket = net.createConnection({ port, host });
    let done = false;

    const finish = result => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

async function main() {
  console.log('GANDOM DIAGNOSE — LAW 2558');
  console.log('ROOT:', ROOT);
  console.log('MODE: READ-ONLY; no restart, deletion, or installation');

  const candidates = walk(ROOT);

  inspectExpectedFile(TARGETS.audit, candidates);
  inspectExpectedFile(TARGETS.web, candidates);

  const nodeB = read(TARGETS.nodeB);
  discoverRoutes(nodeB, TARGETS.nodeB);

  const wallet = read(TARGETS.wallet);
  inspectWallet(wallet);

  inspectPackage();

  console.log('\n[LOCAL PORT PROBES]');
  for (const port of [8787, 8788, 8080, 8888, 9000]) {
    const open = await checkPort(port);
    console.log(
      `127.0.0.1:${port} TCP=${open ? 'OPEN' : 'CLOSED'}`
    );
  }

  const output = {
    law: 2558,
    mode: 'READ_ONLY',
    root: ROOT,
    timestamp: new Date().toISOString(),
    findings,
    summary: {
      findings: findings.length,
      failures,
      passReal: false,
      reason: 'Diagnosis only; no service or API behavior was proven.',
    },
  };

  const reportPath = path.join(
    ROOT,
    'gandom-diagnose-report.json'
  );

  fs.writeFileSync(
    reportPath,
    JSON.stringify(output, null, 2) + '\n',
    { flag: 'w', mode: 0o600 }
  );

  console.log('\n[REPORT]', reportPath);
  console.log('[DIAGNOSIS_COMPLETE]');
  console.log('[PASS_REAL] NOT ISSUED');
  console.log('[REASON] Read-only checks do not prove end-to-end service health.');
}

main().catch(error => {
  console.error('[FATAL]', error.stack || error.message);
  process.exitCode = 1;
});
