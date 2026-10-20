'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const LAW = 2558;
const PORT = Number(process.env.GANDOM_PORT || 8787);
const INTERVAL_MS = Math.max(
  10000,
  Number(process.env.GANDOM_CYCLE_INTERVAL_MS || 30000)
);

const ROOT = path.resolve(__dirname, '../../');
const STATE_DIR = path.join(ROOT, 'runtime', 'automation-2558');
const STATE_FILE = path.join(STATE_DIR, 'cycle-state.json');

let busy = false;
let stopped = false;
let timer = null;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function atomicWrite(file, value) {
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, value, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function readState() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

    if (state.law !== LAW ||
        !Number.isSafeInteger(state.cycles) ||
        state.cycles < 0) {
      throw new Error('INVALID_PERSISTED_STATE');
    }

    return state;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    return {
      law: LAW,
      cycles: 0,
      lastHash: null,
      lastStatus: 'INITIALIZED',
      lastCycleAt: null
    };
  }
}

function requestJson(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.get({
      hostname: '127.0.0.1',
      port: PORT,
      path: endpoint,
      timeout: 4000
    }, res => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', chunk => {
        body += chunk;

        if (body.length > 1024 * 1024) {
          req.destroy(new Error('RESPONSE_TOO_LARGE'));
        }
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(
            new Error('HTTP_' + res.statusCode + ':' + endpoint)
          );
        }

        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('INVALID_JSON:' + endpoint));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('REQUEST_TIMEOUT:' + endpoint));
    });

    req.on('error', reject);
  });
}

async function observe() {
  const health = await requestJson('/health');
  const peers = await requestJson('/api/peers');
  const stats = await requestJson('/api/stats');
  const version = await requestJson('/api/version');

  if (health.ok !== true ||
      peers.ok !== true ||
      stats.ok !== true ||
      version.ok !== true) {
    throw new Error('OBSERVATION_GATE_FAILED');
  }

  const peerCount = Number(
    peers.peers_count ??
    (Array.isArray(peers.peers) ? peers.peers.length : NaN)
  );

  if (!Number.isSafeInteger(peerCount) || peerCount < 0) {
    throw new Error('INVALID_PEER_COUNT');
  }

  return {
    observedAt: new Date().toISOString(),
    nodeId: health.node_id || peers.node_id || null,
    peerCount,
    version: version.version || null,
    memoryMb: Number.isFinite(Number(stats.memory_mb))
      ? Number(stats.memory_mb)
      : null,
    uptimeSeconds: Number.isFinite(Number(stats.uptime_seconds))
      ? Number(stats.uptime_seconds)
      : null
  };
}

async function runCycle() {
  if (busy || stopped) return;

  busy = true;

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });

    const previous = readState();
    const observation = await observe();

    const result = {
      law: LAW,
      cycle: previous.cycles + 1,
      status: 'OBSERVATION_ONLY',
      action: 'NONE',
      reason: 'No authorized actuator is configured',
      observation
    };

    const canonical = JSON.stringify(result);
    const digest = sha256(canonical);

    result.evidence = {
      algorithm: 'SHA-256',
      digest,
      verified: sha256(canonical) === digest
    };

    if (!result.evidence.verified) {
      throw new Error('EVIDENCE_VERIFICATION_FAILED');
    }

    const next = {
      law: LAW,
      cycles: result.cycle,
      lastHash: digest,
      lastStatus: result.status,
      lastCycleAt: result.observation.observedAt
    };

    atomicWrite(STATE_FILE, JSON.stringify(next, null, 2) + '\n');

    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({
      law: LAW,
      status: 'FAIL',
      action: 'NONE',
      error: error.message,
      at: new Date().toISOString()
    }));
  } finally {
    busy = false;
  }
}

function stop() {
  stopped = true;
  if (timer) clearInterval(timer);
  console.log('GANDOM_AUTOMATION_STOPPED=1');
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

console.log('GANDOM_LAW=' + LAW);
console.log('NO_FAKE_PASS=1');
console.log('MODE=OBSERVE_AND_RECORD');
console.log('SERVER_PORT=' + PORT);
console.log('INTERVAL_MS=' + INTERVAL_MS);

runCycle();
timer = setInterval(runCycle, INTERVAL_MS);
