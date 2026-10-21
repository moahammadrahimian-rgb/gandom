const fs = require('fs');
const { execSync } = require('child_process');
const http = require('http');

console.log("==================================================");
console.log("🔍 GANDOM ULTIMATE ARCHITECTURE AUDIT (LAW 2558)");
console.log("==================================================");

const audit = {
    core: {},
    network: {},
    ai_workers: {},
    frontend: {},
    missing: []
};

// 1. بررسی فایل‌های حیاتی (Core & Data)
console.log("\n[1] بررسی فایل‌های حیاتی و داده‌ها...");
const files = {
    'blockchain': 'blockchain-data/chain.json',
    'wallet': 'wallet/wallet-state.json',
    'ai_engine': 'start-ai.js',
    'workers': 'worker-coordinator.js',
    'api_gateway': 'gandom-api-gateway.js',
    'android_apk': 'final-apk/app-debug.apk'
};

for (const [key, path] of Object.entries(files)) {
    if (fs.existsSync(path)) {
        audit.core[key] = "EXISTS";
        console.log(` ✅ ${key}: یافت شد.`);
    } else {
        audit.core[key] = "MISSING";
        audit.missing.push(`فایل ${key} (${path}) وجود ندارد.`);
        console.log(` ❌ ${key}: یافت نشد!`);
    }
}

// 2. بررسی داده‌های بلاک‌چین
console.log("\n[2] بررسی عمق بلاک‌چین و کیف پول...");
try {
    const chain = JSON.parse(fs.readFileSync('blockchain-data/chain.json', 'utf8'));
    audit.core.chain_length = chain.length;
    console.log(` 🔗 طول زنجیره: ${chain.length} (شامل بلاک‌های جدید)`);
    
    const wallet = JSON.parse(fs.readFileSync('wallet/wallet-state.json', 'utf8'));
    audit.core.wallet_owner_irt = wallet.owner_balance?.irt || 0;
    console.log(` 💰 موجودی مالک (IRT): ${audit.core.wallet_owner_irt}`);
} catch (e) {
    console.log(` ❌ خطا در خواندن دیتا: ${e.message}`);
}

// 3. بررسی پردازش‌های فعال (Proccess Audit)
console.log("\n[3] بررسی پردازش‌های در حال اجرا...");
try {
    const ps = execSync('ps -ef | grep node | grep -v grep').toString();
    audit.network.nodeA = ps.includes('server.js') ? "RUNNING" : "STOPPED";
    audit.network.nodeB = ps.includes('node-b') ? "RUNNING" : "STOPPED";
    audit.ai_workers.brain = ps.includes('start-ai') ? "RUNNING" : "STOPPED";
    audit.frontend.api = ps.includes('gandom-api-gateway') ? "RUNNING" : "STOPPED";
    
    console.log(` 🟢 Node A: ${audit.network.nodeA}`);
    console.log(` 🟢 Node B: ${audit.network.nodeB}`);
    console.log(` 🧠 AI Brain: ${audit.ai_workers.brain}`);
    console.log(` 🌉 API Gateway: ${audit.frontend.api}`);
} catch (e) {
    console.log(` ⚠️ خطا در اجرای دستور ps: ${e.message}`);
}

// 4. بررسی شبیه‌سازی هوش مصنوعی (Are cells real or mock?)
console.log("\n[4] استعلام وضعیت واقعی ۴۰۰,۰۰۰ سلول و ۱۰۰۰ کارگر...");
if (audit.ai_workers.brain === "RUNNING") {
    console.log(" ⚠️ توجه: مغز در حال اجراست، اما ما باید بررسی کنیم که آیا این اعداد در حافظه (RAM) واقعاً در حال پردازش هستند یا فقط در API گیت‌وی به صورت هاردکد (Hardcoded) نمایش داده می‌شوند.");
    console.log(" 🔍 نتیجه: نیاز به کدهای عمیق‌تر برای اثبات حیات سلول‌ها دارد.");
}

// 5. تولید گزارش نهایی
console.log("\n==================================================");
console.log("📊 گزارش نهایی (GAP ANALYSIS)");
console.log("==================================================");

if (audit.missing.length === 0) {
    console.log("✅ تمام فایل‌های ساختاری حضور دارند.");
} else {
    console.log("❌ موارد مفقود (Missing):");
    audit.missing.forEach(m => console.log(` - ${m}`));
}

fs.writeFileSync('GANDOM_AUDIT_REPORT.json', JSON.stringify(audit, null, 2));
console.log("\n📄 گزارش کامل در فایل GANDOM_AUDIT_REPORT.json ذخیره شد.");
