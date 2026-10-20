'use strict';

/*
 * GANDOM FLY ROOT-CAUSE ENGINE 2558
 * Read-only diagnostics; no service restart or process termination.
 * Design targets are not treated as measured runtime facts.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const LAW = 2558;
const PORTS = [8787, 8788, 8080, 8888, 9000];
const findings = [];
const evidence = [];

function record(id, status, detail) {
  const item = { id, status, detail };
  findings.push(item);
  console.log(`[${status}] ${id}: ${detail}`);
}

function readFile(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function run(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (e) {
    return String(e.stdout || '') + String(e.stderr || '');
  }
}

function getHttp(port, route) {
  return new Promise(resolve => {
    const req = http.get({
      hostname: '127.0.0.1',
      port,
      path: route,
      timeout: 2500
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        if (body.length < 12000) body += chunk;
      });
      res.on('end', () => resolve({
        reachable: true,
        status: res.statusCode,
        body
      }));
    });

    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', err => resolve({
      reachable: false,
      error: err.message
    }));
  });
}

async function main() {
  console.log('=== GANDOM FLY ROOT-CAUSE ENGINE ===');
  console.log('LAW=2558');
  console.log('MODE=READ_ONLY');
  console.log('NO_PROCESS_KILL=1');
  console.log('NO_RESTART=1');
  console.log('NO_FAKE_PASS=1\n');

  // 1. Repository identity and local modifications
  const head = run('git', ['rev-parse', 'HEAD']);
  const branch = run('git', ['branch', '--show-current']);
  const status = run('git', ['status', '--short']);

  record('GIT_HEAD', head ? 'EVIDENCE' : 'UNKNOWN',
    head || 'Cannot read local Git commit');

  record('GIT_BRANCH', branch ? 'EVIDENCE' : 'UNKNOWN',
    branch || 'Cannot read branch');

  record('GIT_LOCAL_CHANGES', 'INFO',
    status ? status.split('\n').length + ' status entries; details preserved' :
      'No status entries reported, or Git status unavailable');

  // 2. Live process snapshot
  const ps = run('ps', ['-A']);
  const relevant = ps.split('\n').filter(line =>
    /\b(node|python|npm)\b/i.test(line) &&
    !/GANDOM-FLY-ROOT-CAUSE-2558/.test(line)
  );

  record('LIVE_PROCESSES',
    relevant.length ? 'EVIDENCE' : 'WARNING',
    relevant.length
      ? relevant.slice(0, 15).join(' | ')
      : 'No Node/Python process found in the process listing');

  // 3. Inspect server configuration without executing it
  const server = readFile('server.js');
  const audit = readFile('audit-service/server.js');
  const starter = readFile('start-gandom.sh');

  record('MAIN_SERVER_FILE', server ? 'PRESENT' : 'MISSING',
    server ? 'server.js is readable' : 'server.js is unavailable');

  record('STARTUP_SCRIPT', starter ? 'PRESENT' : 'MISSING',
    starter ? 'start-gandom.sh is readable' : 'Startup script unavailable');

  record('AUDIT_SERVER_FILE', audit ? 'PRESENT' : 'MISSING',
    audit ? 'audit-service/server.js is readable' :
      'Audit server file is unavailable');

  if (server) {
    const listenLines = server.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(x => /listen\s*\(|createServer|WebSocketServer|process\.env|PORT/.test(x.line))
      .slice(0, 35)
      .map(x => `${x.n}:${x.line.trim()}`);

    record('MAIN_SERVER_BINDING', listenLines.length ? 'EVIDENCE' : 'WARNING',
      listenLines.join(' | ') || 'No recognizable listen configuration found');
  }

  if (starter) {
    const configured = starter.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(x => /BACKEND_PORT|FRONTEND_PORT|node .*server|http\.server|audit-service|8787|8788|8080|8888|9000/.test(x.line))
      .slice(0, 35)
      .map(x => `${x.n}:${x.line.trim()}`);

    record('STARTUP_BINDINGS', configured.length ? 'EVIDENCE' : 'WARNING',
      configured.join(' | ') || 'No recognizable port/start command found');
  }

  // 4. Runtime HTTP checks: root and health are checked separately
  const httpResults = {};

  for (const port of PORTS) {
    const rootResult = await getHttp(port, '/');
    const healthResult = await getHttp(port, '/health');

    httpResults[port] = { root: rootResult, health: healthResult };

    record(`PORT_${port}_ROOT`,
      rootResult.reachable ? 'REACHABLE' : 'UNREACHABLE',
      rootResult.reachable
        ? `HTTP ${rootResult.status}`
        : rootResult.error);

    record(`PORT_${port}_HEALTH`,
      healthResult.reachable ? 'REACHABLE' : 'UNREACHABLE',
      healthResult.reachable
        ? `HTTP ${healthResult.status}`
        : healthResult.error);
  }

  // 5. Peer API and its actual reported state
  const peerResult = await getHttp(8787, '/api/peers');

  if (!peerResult.reachable) {
    record('P2P_PEER_API', 'FAIL',
      'Cannot connect to the peer API on port 8787');
  } else {
    try {
      const data = JSON.parse(peerResult.body);
      const count = Number(data.peers_count);
      record('P2P_PEER_API', 'EVIDENCE',
        `HTTP ${peerResult.status}; reported peers_count=${count}`);

      record('P2P_CONNECTIVITY',
        Number.isFinite(count) && count > 0 ? 'REPORTED_CONNECTED' : 'NO_PEERS_REPORTED',
        'This is the server-reported peer count, not independent proof of end-to-end delivery');
    } catch {
      record('P2P_PEER_API', 'WARNING',
        'Endpoint responded but returned non-JSON or invalid JSON');
    }
  }

  // 6. Locate existing brain/cell/DNA/P2P components
  const targets = [
    ['BRAIN', /brain|neuron/i],
    ['CELLS', /cell/i],
    ['DNA_CHROMOSOME', /dna|chromosome/i],
    ['P2P', /p2p|peer-bus/i],
    ['LIFE_DEATH', /node-death|birth|lifecycle/i],
    ['WALLET', /wallet/i],
    ['BLOCKCHAIN', /blockchain|chain\.json/i]
  ];

  const found = [];

  function walk(dir, depth) {
    if (depth > 4 || found.length > 4000) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === '.git' ||
          entry.name === 'node_modules' ||
          entry.name === '.gradle') continue;

      const full = path.join(dir, entry.name);
      const rel = path.relative(ROOT, full);

      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else {
        found.push(rel);
      }
    }
  }

  walk(ROOT, 0);

  for (const [name, pattern] of targets) {
    const matches = found.filter(file => pattern.test(file)).slice(0, 12);

    record(`COMPONENT_${name}`,
      matches.length ? 'FILES_FOUND' : 'NO_MATCHING_FILES_FOUND',
      matches.join(', ') || 'No matching file path found within scan limits');
  }

  // 7. Runtime claims must not be inferred from filenames or target constants
  record('LIVE_CELL_COUNT', 'NOT_PROVEN',
    'File presence cannot establish 400000 live, functioning cells');

  record('BRAIN_DNA_INTEGRATION', 'NOT_PROVEN',
    'Requires runtime linkage and measurable message/data flow');

  record('BIRTH_DEATH_EVENTS', 'NOT_PROVEN',
    'Requires observed lifecycle events and validated event records');

  record('GLOBAL_NETWORK', 'NOT_PROVEN',
    'Local HTTP checks do not prove global reachability or multi-node operation');

  // 8. Root-cause shortlist based on observed facts
  console.log('\n=== ROOT CAUSE SUMMARY ===');

  const unavailable = PORTS.filter(port =>
    !httpResults[port].root.reachable
  );

  console.log('LOCAL_ROOT_UNREACHABLE_PORTS=' +
    (unavailable.join(',') || 'NONE'));

  const front = httpResults[8080].root;
  console.log('FRONTEND_ROOT=' +
    (front.reachable ? `HTTP_${front.status}` : 'UNREACHABLE'));

  console.log('P2P_API_REACHABLE=' + peerResult.reachable);

  console.log('\n=== FINAL EVIDENCE STATUS ===');
  console.log('INSPECTION=READ_ONLY');
  console.log('FILES_MODIFIED=0');
  console.log('SERVICES_RESTARTED=0');
  console.log('PROCESSES_KILLED=0');
  console.log('PASS_REAL=NOT_ISSUED');
}

main().catch(err => {
  console.error('ENGINE_ERROR=' + err.message);
  console.log('PASS_REAL=NOT_ISSUED');
  process.exitCode = 1;
});
