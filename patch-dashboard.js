const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(FILE, 'utf8');

// ─── بکاپ ───
const backup = FILE + '.backup-' + Date.now();
fs.writeFileSync(backup, content);
console.log('✅ بکاپ:', backup);

// ─── پچ ۱: اضافه کردن blockchain به names ───
content = content.replace(
  /settings: 'تنظیمات',/,
  `settings: 'تنظیمات',
    blockchain: 'بلاک‌چین',`
);

// ─── پچ ۲: اضافه کردن دکمه ناوبری ───
// پیدا کردن یه دکمه موجود (settings) و اضافه کردن بعدش
const navButtonPattern = /(<button[^>]*data-section="settings"[^>]*>[\s\S]*?<\/button>)/;
if (content.match(navButtonPattern)) {
  content = content.replace(
    navButtonPattern,
    `$1
        <button data-section="blockchain" class="nav-btn">
          <span class="nav-icon">⛓️</span>
          <span class="nav-label">بلاک‌چین</span>
        </button>`
  );
}

// ─── پچ ۳: اضافه کردن section برای blockchain ───
// پیدا کردن section settings و اضافه کردن بعدش
const sectionPattern = /(<section[^>]*id="settings"[^>]*>[\s\S]*?<\/section>)/;
if (content.match(sectionPattern)) {
  const blockchainSection = `
      <section id="blockchain" class="section hidden">
        <h2>⛓️ بلاک‌چین گندم ۲۵۵۸</h2>
        
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
          <button onclick="mineBlockFromDashboard()" class="action-btn">
            ⛏️ استخراج بلوک جدید
          </button>
          <button onclick="refreshChain()" class="action-btn secondary">
            🔄 بروزرسانی
          </button>
          <a href="/assets/chain.html" target="_blank" class="action-btn secondary">
            🔍 کاوشگر کامل
          </a>
        </div>
        
        <div class="chain-blocks-preview" id="chain-blocks-preview">
          <h3>📋 آخرین بلوک‌ها</h3>
          <div id="blocks-preview">در حال بارگذاری...</div>
        </div>
      </section>`;
  
  content = content.replace(sectionPattern, `$1${blockchainSection}`);
}

// ─── پچ ۴: اضافه کردن JavaScript ───
const scriptEnd = content.lastIndexOf('</script>');
const blockchainJS = `

// ═══════════════════════════════════════════════════════
// ⛓️ Blockchain Dashboard
// ═══════════════════════════════════════════════════════

async function refreshChain() {
  try {
    const r = await fetch('/api/chain/stats');
    const d = await r.json();
    if (!d.ok) throw new Error('API error');
    
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    
    setEl('chain-length', d.length);
    setEl('chain-difficulty', d.difficulty);
    setEl('chain-valid', d.is_valid ? '✅' : '❌');
    setEl('chain-pending', d.pending_tx);
    setEl('chain-supply', (d.total_supply / 1000000).toFixed(2) + 'M');
    setEl('chain-wallets', d.wallets_count || 0);
    
    const hashEl = document.getElementById('chain-latest-hash');
    if (hashEl) hashEl.textContent = d.latest_hash;
    
    // بارگذاری بلاک‌ها
    const r2 = await fetch('/api/chain');
    const d2 = await r2.json();
    if (d2.ok && d2.chain) {
      const preview = document.getElementById('blocks-preview');
      if (preview) {
        const blocks = d2.chain.slice(-5).reverse();
        preview.innerHTML = blocks.map(b => \`
          <div class="block-preview-item">
            <span class="block-idx">#\${b.index}</span>
            <span class="block-hash">\${b.hash.substring(0, 20)}...</span>
            <span class="block-tx">\${b.tx_count} tx</span>
          </div>
        \`).join('');
      }
    }
  } catch(e) {
    console.error('Chain refresh error:', e);
  }
}

async function mineBlockFromDashboard() {
  try {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⛏️ در حال استخراج...';
    
    const r = await fetch('/api/chain/mine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ miner: 'GDM-dashboard-miner' })
    });
    const d = await r.json();
    
    if (d.ok) {
      alert('🎉 بلوک #' + d.block.index + ' استخراج شد!');
      await refreshChain();
    } else {
      alert('❌ خطا: ' + d.error);
    }
  } catch(e) {
    alert('❌ خطا در استخراج');
  } finally {
    const btn = event.target;
    btn.disabled = false;
    btn.textContent = '⛏️ استخراج بلوک جدید';
  }
}

// شروع خودکار
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(refreshChain, 1000);
  setInterval(refreshChain, 10000);
});
`;

content = content.substring(0, scriptEnd) + blockchainJS + content.substring(scriptEnd);

// ─── پچ ۵: اضافه کردن CSS ───
const styleEnd = content.lastIndexOf('</style>');
const blockchainCSS = `

/* ═══════ Blockchain Styles ═══════ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.stat-card {
  background: linear-gradient(135deg, #1a2332 0%, #0f1620 100%);
  border: 1px solid #2a3f5f;
  border-radius: 12px;
  padding: 18px;
  text-align: center;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: #ffd700;
  transform: translateY(-3px);
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-value {
  color: #ffd700;
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  color: #8ba3c7;
  font-size: 12px;
}

.chain-hash-box {
  background: #0a0e17;
  border: 1px solid #2a3f5f;
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
}

.hash-label {
  color: #8ba3c7;
  font-size: 12px;
  margin-bottom: 5px;
}

.hash-value {
  color: #4ade80;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.chain-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 20px 0;
}

.action-btn {
  padding: 12px 24px;
  background: #ffd700;
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #e5c100;
  transform: translateY(-2px);
}

.action-btn.secondary {
  background: #2a3f5f;
  color: #ffd700;
  border: 1px solid #ffd700;
}

.action-btn.secondary:hover {
  background: #3a5070;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chain-blocks-preview {
  background: #1a2332;
  border: 1px solid #2a3f5f;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}

.chain-blocks-preview h3 {
  color: #ffd700;
  margin-bottom: 15px;
}

.block-preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0a0e17;
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  font-family: monospace;
}

.block-idx {
  color: #ffd700;
  font-weight: bold;
}

.block-hash {
  color: #4ade80;
  flex: 1;
  margin: 0 15px;
}

.block-tx {
  color: #8ba3c7;
}
`;

content = content.substring(0, styleEnd) + blockchainCSS + content.substring(styleEnd);

// ─── ذخیره ───
fs.writeFileSync(FILE, content);
console.log('✅ داشبورد پچ شد');
console.log(`📊 حجم جدید: ${(content.length / 1024).toFixed(1)} KB`);
