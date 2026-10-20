const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(FILE, 'utf8');

// ─── بکاپ ───
fs.writeFileSync(FILE + '.backup-final', content);

// ─── بخش Blockchain (به شکل section کارت) ───
const blockchainHTML = `
    <!-- ═══════ Blockchain Section ═══════ -->
    <section class="card blockchain-module" id="blockchain" style="display:none; margin-top:16px;">
      <div class="module-head">
        <h3>⛓️ بلاک‌چین گندم ۲۵۵۸</h3>
        <span class="badge">BLOCKCHAIN</span>
      </div>
      
      <div class="stats-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin:20px 0;">
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
          <div class="stat-label">در انتظار</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-value" id="chain-supply">-</div>
          <div class="stat-label">موجودی کل</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👛</div>
          <div class="stat-value" id="chain-wallets">-</div>
          <div class="stat-label">کیف‌ها</div>
        </div>
      </div>
      
      <div style="background:#0a0e17; border:1px solid #2a3f5f; border-radius:10px; padding:15px; margin:20px 0;">
        <div style="color:#8ba3c7; font-size:12px; margin-bottom:5px;">آخرین هش:</div>
        <div id="chain-latest-hash" style="color:#4ade80; font-family:monospace; font-size:12px; word-break:break-all;">-</div>
      </div>
      
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin:20px 0;">
        <button onclick="mineBlockFromDashboard()" id="btn-mine-chain" style="padding:12px 24px; background:#ffd700; color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-family:inherit;">
          ⛏️ استخراج بلوک جدید
        </button>
        <button onclick="refreshChain()" style="padding:12px 24px; background:#2a3f5f; color:#ffd700; border:1px solid #ffd700; border-radius:8px; font-weight:bold; cursor:pointer; font-family:inherit;">
          🔄 بروزرسانی
        </button>
        <a href="/assets/chain.html" target="_blank" style="padding:12px 24px; background:#2a3f5f; color:#ffd700; border:1px solid #ffd700; border-radius:8px; font-weight:bold; cursor:pointer; text-decoration:none; font-family:inherit; display:inline-block;">
          🔍 کاوشگر کامل
        </a>
      </div>
      
      <div style="background:#1a2332; border:1px solid #2a3f5f; border-radius:12px; padding:20px; margin-top:20px;">
        <h3 style="color:#ffd700; margin-bottom:15px; font-size:16px;">📋 آخرین بلوک‌ها</h3>
        <div id="blocks-preview">در حال بارگذاری...</div>
      </div>
    </section>`;

// ─── پیدا کردن article settings و اضافه کردن بعدش ───
const pattern = /(<article class="card module" id="settings">[\s\S]*?<\/article>)/;

if (content.match(pattern)) {
  content = content.replace(pattern, `$1${blockchainHTML}`);
  console.log('✅ بخش بلاک‌چین اضافه شد (بعد از article settings)');
} else {
  console.log('❌ article settings پیدا نشد');
}

// ─── اضافه کردن CSS برای stat-card ───
if (!content.includes('.stat-card {')) {
  const styleEnd = content.lastIndexOf('</style>');
  const css = `
    .stat-card { background: linear-gradient(135deg, #1a2332 0%, #0f1620 100%); border: 1px solid #2a3f5f; border-radius: 12px; padding: 15px; text-align: center; transition: all 0.3s; }
    .stat-card:hover { border-color: #ffd700; transform: translateY(-3px); }
    .stat-icon { font-size: 24px; margin-bottom: 8px; }
    .stat-value { color: #ffd700; font-size: 20px; font-weight: bold; margin-bottom: 4px; }
    .stat-label { color: #8ba3c7; font-size: 11px; }
    .block-preview-item { display: flex; justify-content: space-between; align-items: center; background: #0a0e17; padding: 10px 15px; border-radius: 8px; margin-bottom: 8px; font-size: 12px; font-family: monospace; }
    .block-idx { color: #ffd700; font-weight: bold; }
    .block-hash { color: #4ade80; flex: 1; margin: 0 15px; overflow: hidden; text-overflow: ellipsis; }
    .block-tx { color: #8ba3c7; }
  `;
  content = content.substring(0, styleEnd) + css + content.substring(styleEnd);
  console.log('✅ CSS اضافه شد');
}

// ─── بررسی JavaScript blockchain (اگه نباشه) ───
if (!content.includes('async function refreshChain')) {
  const scriptEnd = content.lastIndexOf('</script>');
  const js = `

// ═══════ Blockchain Dashboard ═══════
async function refreshChain() {
  try {
    const r = await fetch('/api/chain/stats');
    const d = await r.json();
    if (!d.ok) return;
    
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('chain-length', d.length);
    set('chain-difficulty', d.difficulty);
    set('chain-valid', d.is_valid ? '✅' : '❌');
    set('chain-pending', d.pending_tx);
    set('chain-supply', ((d.total_supply||0)/1000000).toFixed(2) + 'M');
    set('chain-wallets', d.wallets_count || 0);
    
    const hashEl = document.getElementById('chain-latest-hash');
    if (hashEl) hashEl.textContent = d.latest_hash || '-';
    
    const r2 = await fetch('/api/chain');
    const d2 = await r2.json();
    if (d2.ok && d2.chain) {
      const preview = document.getElementById('blocks-preview');
      if (preview) {
        const blocks = d2.chain.slice(-5).reverse();
        preview.innerHTML = blocks.map(b => \`
          <div class="block-preview-item">
            <span class="block-idx">#\${b.index}</span>
            <span class="block-hash">\${b.hash.substring(0, 24)}...</span>
            <span class="block-tx">\${b.tx_count} tx</span>
          </div>
        \`).join('');
      }
    }
  } catch(e) { console.error('Chain error:', e); }
}

async function mineBlockFromDashboard() {
  const btn = document.getElementById('btn-mine-chain');
  if (btn) { btn.disabled = true; btn.textContent = '⛏️ در حال استخراج...'; }
  try {
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
      alert('❌ خطا: ' + (d.error || 'unknown'));
    }
  } catch(e) { alert('❌ خطا در استخراج'); }
  finally {
    if (btn) { btn.disabled = false; btn.textContent = '⛏️ استخراج بلوک جدید'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(refreshChain, 1500);
  setInterval(refreshChain, 10000);
});
  `;
  content = content.substring(0, scriptEnd) + js + content.substring(scriptEnd);
  console.log('✅ JavaScript اضافه شد');
}

// ─── ذخیره ───
fs.writeFileSync(FILE, content);
console.log('✅ فایل ذخیره شد');
console.log('📊 اندازه جدید:', (content.length / 1024).toFixed(1), 'KB');

// ─── بررسی ───
console.log('\n📋 بررسی:');
console.log('  id="blockchain":', content.includes('id="blockchain"') ? '✅' : '❌');
console.log('  data-section="blockchain":', content.includes('data-section="blockchain"') ? '✅' : '❌');
console.log('  refreshChain:', content.includes('function refreshChain') ? '✅' : '❌');
