'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ROOT = path.resolve(__dirname);

const SERVICES = [
  { name: 'Wallet-API', file: 'wallet-api.js' }, // جدید
  { name: 'Blockchain', file: 'server.js' },
  { name: 'P2P-Node-B', file: 'node-b-chain.js' },
  { name: 'Integration-Bridge', file: 'gandom-alpha-6-bridge.js' },
  { name: 'AI-Worker', file: 'ai-worker.js' },
  { name: 'Brain', file: 'gandom-core/neural/GANDOM-NEURAL-BRAIN-2558.js' },
  { name: 'Ads-Manager', file: 'ads-manager.js' },
  { name: 'AI-Accountant', file: 'ai-accountant-bridge.js' },
  { name: 'Doctor-AI', file: 'gandom-core/revival-live/NODE_RUNTIME/0f52d94de0ff2c8c__0f52d94de0ff2c8c-doctor.js' },
  { name: 'Social-AI', file: 'gandom-core/revival-live/LAW2558_IMMUNE/c5acdbba8d653d9b__c5acdbba8d653d9b-social.js' }
];

function startService(srv) {
    const filePath = path.resolve(ROOT, srv.file);
    if (!fs.existsSync(filePath)) {
        console.log(`[${srv.name}] ❌ MISSING`);
        return;
    }
    console.log(`[${srv.name}] ⏳ Starting...`);
    const child = spawn('node', ['--max-old-space-size=64', filePath], { cwd: ROOT });
    child.stdout.on('data', data => {
        if(data.toString().includes('Live on') || data.toString().includes('STARTED')) console.log(`[${srv.name}] ✅ ${data.toString().trim()}`);
    });
    child.on('exit', () => console.log(`[${srv.name}] ⚠️ Exited`));
}

(async () => {
    console.clear();
    console.log("🌾 GANDOM ALPHA 6 - FULL BOOT");
    for (const srv of SERVICES) {
        startService(srv);
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log("✅ ALL SERVICES INITIATED.");
})();
