const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(FILE, 'utf8');

// ─── بکاپ ───
fs.writeFileSync(FILE + '.backup4', content);

// ─── پیدا کردن آخرین section (settings) ───
// باید قبل از </main> یا بعد از آخرین </section> اضافه کنیم

// الگوی section settings
const sectionPattern = /(<section[^>]*id="settings"[\s\S]*?<\/section>)/;

if (!content.match(sectionPattern)) {
  console.log('❌ section settings پیدا نشد');
  process.exit(1);
}

const blockchainSection = `

    <!-- ═══════ Blockchain Section ═══════ -->
    <section id="blockchain" class="section hidden">
      <h2 class="section-title">⛓️ بلاک‌چین گندم ۲۵۵۸</h2>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-value" id="chain-length">-</div>
          <div class="stat-label">تعداد بلوک</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚙️</div>
          <div class="stat-value" id="chain-difficulty">-</div>
          <div class="stat-label">سطح سختی</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value" id="chain-valid">-</div>
          <div class="stat-label">اعتبار</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-value" id="chain-pending">-</div>
          <div class="stat-label">تراکنش در انتظار</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-value" id="chain-supply">-</div>
          <div class="stat-label">موجودی کل</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👛</div>
          <div class="stat-value" id="chain-wallets">-</div>
          <div class="stat-label">تعداد کیف</div>
        </div>
      </div>
      
      <div class="chain-hash-box">
        <div class="hash-label">آخرین هش:</div>
        <div class="hash-value" id="chain-latest-hash">-</div>
      </div>
      
      <div class="chain-actions">
        <button onclick="mineBlockFromDashboard()" class="action-btn" id="btn-mine-chain">
          ⛏️ استخراج بلوک جدید
        </button>
        <button onclick="refreshChain()" class="action-btn secondary">
          🔄 بروزرسانی
        </button>
        <a href="/assets/chain.html" target="_blank" class="action-btn secondary">
          🔍 کاوشگر کامل
        </a>
      </div>
      
      <div class="chain-blocks-preview">
        <h3>📋 آخرین بلوک‌ها</h3>
        <div id="blocks-preview">در حال بارگذاری...</div>
      </div>
    </section>`;

content = content.replace(sectionPattern, `$1${blockchainSection}`);

// ─── ذخیره ───
fs.writeFileSync(FILE, content);
console.log('✅ Section blockchain اضافه شد');
console.log('📊 اندازه جدید:', (content.length / 1024).toFixed(1), 'KB');

// ─── بررسی ───
if (content.includes('id="blockchain"')) {
  console.log('✅ Section blockchain تایید شد');
} else {
  console.log('❌ Section اضافه نشد');
}
