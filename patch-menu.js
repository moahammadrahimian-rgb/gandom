const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(FILE, 'utf8');

// ─── اضافه کردن blockchain به names اگر نیست ───
if (!content.includes("blockchain: '")) {
  content = content.replace(
    /settings:\s*'[^']*',/,
    `settings: 'تنظیمات',
    blockchain: 'بلاک‌چین',`
  );
  console.log('✅ names اضافه شد');
}

// ─── بکاپ ───
fs.writeFileSync(FILE + '.backup3', content);

// ─── ذخیره ───
fs.writeFileSync(FILE, content);
console.log('✅ فایل ذخیره شد');

// ─── بررسی دکمه‌ها ───
const matches = content.match(/data-section="[^"]+"/g);
console.log('\n📋 دکمه‌های موجود:');
matches.forEach(m => console.log('  -', m));

// ─── بررسی section ها ───
const sections = content.match(/id="(home|wallet|market|p2p|ai|social|settings|blockchain)"/g);
console.log('\n📋 Section های موجود:');
sections.forEach(s => console.log('  -', s));

// ─── آیا دکمه blockchain در HTML هست؟ ───
if (content.includes('data-section="blockchain"')) {
  console.log('\n✅ دکمه blockchain در HTML هست');
} else {
  console.log('\n❌ دکمه blockchain در HTML نیست - نیاز به اضافه دستی');
}

// ─── آیا section blockchain در HTML هست؟ ───
if (content.includes('id="blockchain"')) {
  console.log('✅ Section blockchain در HTML هست');
} else {
  console.log('❌ Section blockchain در HTML نیست');
}
