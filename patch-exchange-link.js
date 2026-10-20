const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(FILE, 'utf8');

// اضافه کردن لینک به exchange.html در دکمه صرافی
content = content.replace(
  /<button data-section="exchange"([^>]*)>/,
  '<button data-section="exchange"$1 onclick="window.open(\'/assets/exchange.html\', \'_blank\')">'
);

fs.writeFileSync(FILE, content);
console.log('✅ لینک اضافه شد');
