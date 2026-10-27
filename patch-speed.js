const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'node-b-chain.js');
let code = fs.readFileSync(file, 'utf8');

// پیدا کردن تایمر ۵ ثانیه‌ای و تغییر آن به ۵۰۰ میلی‌ثانیه (نیم ثانیه)
if (code.includes('}, 5000);')) {
    code = code.replace('}, 5000);', '}, 500);');
    fs.writeFileSync(file, code);
    console.log("⚡ node-b-chain.js patched: Mining interval changed from 5000ms to 500ms!");
} else if (code.includes('MINING_INTERVAL')) {
    console.log("⚠️ Speed patch already applied.");
} else {
    // اگر ساختار فرق داشت، سعی میکنیم خودمون تایمر رو بذاریم
    code = code.replace(/setInterval\(\(\) => \{([\s\S]*?)\}, \d+\);/g, 'setInterval(() => {$1}, process.env.MINING_INTERVAL || 500);');
    fs.writeFileSync(file, code);
    console.log("✅ node-b-chain.js patched with dynamic interval (default 500ms).");
}
