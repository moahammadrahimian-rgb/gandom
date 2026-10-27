const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("🔍 Scanning for pre-built Math, Quantum, and 400k Cell modules...");

// جستجوی فایل‌های مربوط به ریاضیات، فیزیک و سلول‌ها
const findCommand = `find . -type f \\( -name "*.js" -o -name "*.sh" \\) | grep -iE "math|quantum|calculus|integral|derivative|equation|cell|experience|evolution" | grep -v node_modules`;
let files = [];
try {
    const output = execSync(findCommand).toString().trim();
    if (output) files = output.split('\n');
} catch(e) {}

// حذف تکراری‌ها و فایل‌های بک‌آپ
files = [...new Set(files)].filter(f => !f.includes('backup') && !f.includes('test'));

console.log(`✅ Found ${files.length} advanced modules.`);

// ساخت کانفیگ جدید PM2
let config = `module.exports = {\n  apps: [\n`;
const existingApps = [
    { name: "Gandom-Wallet", script: "./wallet-api.js" },
    { name: "Gandom-Blockchain", script: "./server.js" },
    { name: "Gandom-P2P-Brain", script: "./node-b-chain.js" },
    { name: "Gandom-Bridge", script: "./gandom-alpha-6-bridge.js" },
    { name: "Gandom-Brain-Neural", script: "./gandom-core/neural/GANDOM-NEURAL-BRAIN-2558.js" },
    { name: "Gandom-AI-Worker", script: "./ai-worker.js" },
    { name: "Gandom-Ads", script: "./ads-manager.js" },
    { name: "Gandom-Accountant", script: "./ai-accountant-bridge.js" },
    { name: "Gandom-Doctor", script: "./gandom-core/revival-live/NODE_RUNTIME/0f52d94de0ff2c8c__0f52d94de0ff2c8c-doctor.js" },
    { name: "Gandom-Social", script: "./gandom-core/revival-live/LAW2558_IMMUNE/c5acdbba8d653d9b__c5acdbba8d653d9b-social.js" }
];

// اضافه کردن ۱۰ سرویس اصلی
existingApps.forEach(app => {
    config += `    { name: "${app.name}", script: "${app.script}", max_memory_restart: "64M" },\n`;
});

// اضافه کردن لایه‌های محاسباتی/ریاضی/سلولی کشف شده
files.forEach((file, index) => {
    // جلوگیری از اضافه شدن فایل‌های تکراری اصلی
    if (existingApps.some(a => a.script.includes(file))) return;
    
    const isSh = file.endsWith('.sh');
    const ext = isSh ? 'bash' : 'node';
    const fileName = path.basename(file).replace('.js', '').replace('.sh', '');
    
    config += `    { name: "Math-Cell-Layer-${index+1}", script: "${file}", interpreter: "${ext}", max_memory_restart: "64M" },\n`;
});

config += `  ]\n};\n`;

fs.writeFileSync('ecosystem.ultimate.config.js', config);
console.log("✅ Ultimate Architecture generated: ecosystem.ultimate.config.js");
console.log("🚀 Restarting PM2 with all Math, Quantum, and Cell Layers...");

try {
    execSync('pkill -9 node', { stdio: 'ignore' });
    execSync('pm2 start ecosystem.ultimate.config.js', { stdio: 'inherit' });
    execSync('pm2 save', { stdio: 'inherit' });
} catch(e) {
    console.log("Error executing PM2:", e.message);
}
