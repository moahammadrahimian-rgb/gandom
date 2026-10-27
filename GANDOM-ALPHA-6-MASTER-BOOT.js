'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = process.env.GANDOM_ROOT || path.resolve(__dirname);
const NODE = process.execPath;

const SERVICES = [
  {
    name: 'blockchain-node-a',
    file: 'server.js',
    required: true
  },
  {
    name: 'neural-core', // مغز
    file: 'gandom-core/neural/GANDOM-NEURAL-BRAIN-2558.js',
    required: false
  },
  {
    name: 'cell-runtime', // موتور سلولی (۴۰۰,۰۰۰ سلول)
    file: 'audit/REVIVAL-1470-20261010-092454/staging/Cell-Math-Physics/REAL-CELL-LIFE-8-ENGINES-2558.js',
    required: false
  },
  {
    name: 'lung-runtime', // ریه
    file: 'audit/REVIVAL-1470-20261010-092454/staging/Law2558/GANDOM-LUNG-GLOBAL-2558.js',
    required: false
  },
  {
    name: 'agent-runtime', // ایجنت‌ها
    file: 'ops-2558/agent.js',
    required: false
  },
  {
    name: 'bridge',
    file: 'gandom-alpha-6-bridge.js',
    required: true,
    env: {
      GANDOM_CHAIN_API: 'http://127.0.0.1:8787/api/chain'
    }
  }
];

const children = new Map();
const failures = new Map();
let shuttingDown = false;

function log(event, data = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...data }));
}

function startService(service) {
  const file = path.resolve(ROOT, service.file);
  if (!fs.existsSync(file)) {
    if (service.required) {
      failures.set(service.name, `Missing: ${service.file}`);
      log('SERVICE_REQUIRED_MISSING', { service: service.name });
    } else {
      log('SERVICE_OPTIONAL_MISSING', { service: service.name });
    }
    return;
  }
  if (children.has(service.name)) return;
  const child = spawn(NODE, [file], { cwd: ROOT, env: { ...process.env, ...service.env }, stdio: 'inherit' });
  children.set(service.name, child);
  child.once('spawn', () => log('SERVICE_STARTED', { service: service.name, pid: child.pid }));
  child.once('error', error => {
    failures.set(service.name, error.message);
    log('SERVICE_START_ERROR', { service: service.name, error: error.message });
  });
  child.once('exit', (code) => {
    children.delete(service.name);
    if (!shuttingDown && code !== 0) failures.set(service.name, `exit=${code}`);
    log('SERVICE_EXITED', { service: service.name, code });
  });
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const [name, child] of children) child.kill('SIGTERM');
  setTimeout(() => { for (const child of children.values()) child.kill('SIGKILL'); process.exit(0); }, 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
  log('MASTER_BOOT_STARTED', { root: ROOT });
  for (const service of SERVICES) startService(service);
  log('MASTER_BOOT_COMPLETE', { started: children.size, failures: Object.fromEntries(failures) });
}

main().catch(error => { log('MASTER_BOOT_FATAL', { error: error.message }); process.exitCode = 1; });
