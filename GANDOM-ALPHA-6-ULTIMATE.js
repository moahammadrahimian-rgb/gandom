'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname);
const NODE = process.execPath;

const SERVICES = [
  // ۱. هسته بلاک‌چین و شبکه
  { name: 'Node-A (Blockchain)', file: 'server.js' },
  { name: 'Node-B (P2P Peer)', file: 'node-b-chain.js' },
  { name: 'Bridge (Integration)', file: 'gandom-alpha-6-bridge.js', env: { GANDOM_CHAIN_API: 'http://127.0.0.1:8787/api/chain' } },
  
  // ۲. هسته زیستی و عصبی (مغز، ریه، سلول‌ها)
  { name: 'Neural-Core (Brain)', file: 'gandom-core/neural/GANDOM-NEURAL-BRAIN-2558.js' },
  { name: 'Cell-Runtime (400k Cells)', file: 'audit/REVIVAL-1470-20261010-092454/staging/Cell-Math-Physics/REAL-CELL-LIFE-8-ENGINES-2558.js' },
  { name: 'Lung-Runtime (Breath)', file: 'audit/REVIVAL-1470-20261010-092454/staging/Law2558/GANDOM-LUNG-GLOBAL-2558.js' },
  
  // ۳. ایجنت‌ها و هوش مصنوعی (تبلیغات، دکتر، زمین‌شناسی و...)
  { name: 'Agent-Runtime', file: 'ops-2558/agent.js' },
  { name: 'AI-Worker', file: 'ai-worker.js' }, 
  { name: 'AI-Runner', file: 'ai-runner.js' },
  { name: 'Ads-Manager (Social)', file: 'ads-manager.js' },
  { name: 'AI-Accountant', file: 'ai-accountant-bridge.js' },
  
  // ۴. ماژول‌های تخصصی پیدا شده در عمق پوشه‌ها
  { name: 'Doctor-AI', file: '.gandom-core/revival-live/NODE_RUNTIME/0f52d94de0ff2c8c__0f52d94de0ff2c8c-doctor.js' },
  { name: 'Social-AI', file: '.gandom-core/revival-live/LAW2558_IMMUNE/c5acdbba8d653d9b__c5acdbba8d653d9b-social.js' }
];

const children = new Map();

function log(event, data = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...data }));
}

function startService(service) {
  const file = path.resolve(ROOT, service.file);
  if (!fs.existsSync(file)) {
    log('SERVICE_MISSING', { service: service.name, path: file });
    return;
  }
  const child = spawn(NODE, [file], {
    cwd: ROOT,
    env: { ...process.env, ...service.env },
    stdio: 'inherit'
  });
  children.set(service.name, child);
  child.once('spawn', () => log('SERVICE_STARTED', { service: service.name, pid: child.pid }));
  child.once('exit', (code) => {
    children.delete(service.name);
    log('SERVICE_EXITED', { service: service.name, code });
  });
}

function shutdown() {
  log('SHUTTING_DOWN_SYSTEM');
  for (const [name, child] of children) {
    try { child.kill('SIGTERM'); } catch(e) {}
  }
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
  console.clear();
  console.log("==========================================================");
  console.log("🧬 GANDOM ALPHA 6 - ULTIMATE UNIFIED BOOT + AI MODULES");
  console.log("==========================================================");
  log('SYSTEM_BOOTING_STARTED');

  for (const service of SERVICES) {
    startService(service);
    await new Promise(r => setTimeout(r, 1000)); // تاخیر برای جلوگیری از تداخل
  }

  console.log("==========================================================");
  log('SYSTEM_BOOT_COMPLETE', { active_services: children.size });
  console.log("✅ GANDOM ALPHA 6 IS FULLY ALIVE WITH ALL AI MODULES.");
  console.log("==========================================================");
}

main().catch(error => {
  log('FATAL_ERROR', { error: error.message });
  process.exit(1);
});
