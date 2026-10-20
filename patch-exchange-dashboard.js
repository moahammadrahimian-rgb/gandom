const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(FILE, 'utf8');

// ─── بکاپ ───
fs.writeFileSync(FILE + '.backup-ex-dash', content);
console.log('✅ بکاپ گرفته شد');

// ═══════════════════════════════════════════════════════
// پچ ۱: اضافه کردن exchange به names
// ═══════════════════════════════════════════════════════
if (!content.includes("exchange: '")) {
  content = content.replace(
    /settings:\s*'[^']*',/,
    `settings: 'تنظیمات',
    exchange: 'صرافی',`
  );
  console.log('✅ names اضافه شد');
}

// ═══════════════════════════════════════════════════════
// پچ ۲: اضافه کردن دکمه در منو
// ═══════════════════════════════════════════════════════
if (!content.includes('data-section="exchange"')) {
  // پیدا کردن دکمه settings و اضافه کردن بعدش
  const pattern = /(<button[^>]*data-section="settings"[^>]*>[\s\S]*?<\/button>)/;
  content = content.replace(
    pattern,
    `$1
        <button data-section="exchange" class="nav-btn">
          <span class="nav-icon">💱</span>
          <span class="nav-label">صرافی</span>
        </button>`
  );
  console.log('✅ دکمه منو اضافه شد');
}

// ═══════════════════════════════════════════════════════
// پچ ۳: اضافه کردن section صرافی
// ═══════════════════════════════════════════════════════
if (!content.includes('id="exchange"')) {
  const sectionHTML = `
    <!-- ═══════ Exchange Section ═══════ -->
    <section class="card exchange-module" id="exchange" style="display:none; margin-top:16px;">
      <div class="module-head">
        <h3>💱 صرافی GDM/IRT</h3>
        <span class="badge">EXCHANGE</span>
      </div>
      
      <!-- آمار -->
      <div class="stats-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin:20px 0;">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-value" id="ex-last-price">-</div>
          <div class="stat-label">آخرین قیمت</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value" id="ex-volume">-</div>
          <div class="stat-label">حجم معاملات</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-value" id="ex-high">-</div>
          <div class="stat-label">بالاترین</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📉</div>
          <div class="stat-value" id="ex-low">-</div>
          <div class="stat-label">پایین‌ترین</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔄</div>
          <div class="stat-value" id="ex-trades">-</div>
          <div class="stat-label">معاملات</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-value" id="ex-orders">-</div>
          <div class="stat-label">سفارش باز</div>
        </div>
      </div>
      
      <!-- فرم سفارش -->
      <div style="background:#1a2332; border:1px solid #2a3f5f; border-radius:12px; padding:20px; margin:20px 0;">
        <h4 style="color:#ffd700; margin-bottom:15px;">📝 ثبت سفارش جدید</h4>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
          <div>
            <label style="display:block; color:#8ba3c7; font-size:12px; margin-bottom:5px;">نوع</label>
            <select id="ex-side" style="width:100%; padding:10px; background:#0a0e17; color:#fff; border:1px solid #2a3f5f; border-radius:8px;">
              <option value="BUY">🟢 خرید</option>
              <option value="SELL">🔴 فروش</option>
            </select>
          </div>
          <div>
            <label style="display:block; color:#8ba3c7; font-size:12px; margin-bottom:5px;">قیمت (ریال)</label>
            <input type="number" id="ex-price" value="1000" style="width:100%; padding:10px; background:#0a0e17; color:#fff; border:1px solid #2a3f5f; border-radius:8px;">
          </div>
          <div>
            <label style="display:block; color:#8ba3c7; font-size:12px; margin-bottom:5px;">مقدار GDM</label>
            <input type="number" id="ex-amount" value="10" style="width:100%; padding:10px; background:#0a0e17; color:#fff; border:1px solid #2a3f5f; border-radius:8px;">
          </div>
          <div>
            <label style="display:block; color:#8ba3c7; font-size:12px; margin-bottom:5px;">User ID</label>
            <input type="text" id="ex-user" value="USR-alice" style="width:100%; padding:10px; background:#0a0e17; color:#fff; border:1px solid #2a3f5f; border-radius:8px;">
          </div>
        </div>
        
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button onclick="placeOrder()" style="flex:1; padding:12px 24px; background:#ffd700; color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">
            📝 ثبت سفارش
          </button>
          <button onclick="refreshExchange()" style="padding:12px 24px; background:#2a3f5f; color:#ffd700; border:1px solid #ffd700; border-radius:8px; font-weight:bold; cursor:pointer;">
            🔄 بروزرسانی
          </button>
        </div>
      </div>
      
      <!-- Order Book -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin:20px 0;">
        <div style="background:#0a0e17; border:1px solid #4ade80; border-radius:12px; padding:15px;">
          <h4 style="color:#4ade80; margin-bottom:10px;">🟢 Buy Orders (Bids)</h4>
          <div id="ex-bids" style="font-family:monospace; font-size:12px;">در حال بارگذاری...</div>
        </div>
        <div style="background:#0a0e17; border:1px solid #f87171; border-radius:12px; padding:15px;">
          <h4 style="color:#f87171; margin-bottom:10px;">🔴 Sell Orders (Asks)</h4>
          <div id="ex-asks" style="font-family:monospace; font-size:12px;">در حال بارگذاری...</div>
        </div>
      </div>
      
      <!-- سفارش‌های من -->
      <div style="background:#1a2332; border:1px solid #2a3f5f; border-radius:12px; padding:20px; margin-top:20px;">
        <h4 style="color:#ffd700; margin-bottom:15px;">📋 سفارش‌های من</h4>
        <div id="ex-my-orders">User ID رو وارد کن و دکمه بروزرسانی رو بزن</div>
      </div>
    </section>`;

  // اضافه کردن بعد از article settings
  const pattern = /(<article class="card module" id="settings">[\s\S]*?<\/article>)/;
  if (content.match(pattern)) {
    content = content.replace(pattern, `$1${sectionHTML}`);
    console.log('✅ section صرافی اضافه شد');
  } else {
    console.log('⚠️ article settings پیدا نشد، اضافه کردن قبل از footer');
    content = content.replace('</body>', `${sectionHTML}\n</body>`);
  }
}

// ═══════════════════════════════════════════════════════
// پچ ۴: JavaScript صرافی
// ═══════════════════════════════════════════════════════
if (!content.includes('async function refreshExchange')) {
  const scriptEnd = content.lastIndexOf('</script>');
  const js = `

// ═══════════════════════════════════════════════════════
// 💱 Exchange JavaScript
// ═══════════════════════════════════════════════════════

async function refreshExchange() {
  try {
    // Order Book
    const r1 = await fetch('/api/exchange/orderbook');
    const d1 = await r1.json();
    
    if (d1.ok) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      
      set('ex-last-price', (d1.lastPrice || 0).toLocaleString());
      
      // Bids
      const bidsEl = document.getElementById('ex-bids');
      if (bidsEl) {
        if (d1.bids && d1.bids.length > 0) {
          bidsEl.innerHTML = d1.bids.map(b => 
            \`<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid #1a2332;">
              <span style="color:#4ade80;">\${b.price.toLocaleString()}</span>
              <span style="color:#8ba3c7;">\${b.amount}</span>
              <span style="color:#ffd700;">\${b.total.toLocaleString()}</span>
            </div>\`
          ).join('');
        } else {
          bidsEl.innerHTML = '<div style="color:#8ba3c7;text-align:center;padding:20px;">هیچ سفارش خریدی نیست</div>';
        }
      }
      
      // Asks
      const asksEl = document.getElementById('ex-asks');
      if (asksEl) {
        if (d1.asks && d1.asks.length > 0) {
          asksEl.innerHTML = d1.asks.map(a => 
            \`<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid #1a2332;">
              <span style="color:#f87171;">\${a.price.toLocaleString()}</span>
              <span style="color:#8ba3c7;">\${a.amount}</span>
              <span style="color:#ffd700;">\${a.total.toLocaleString()}</span>
            </div>\`
          ).join('');
        } else {
          asksEl.innerHTML = '<div style="color:#8ba3c7;text-align:center;padding:20px;">هیچ سفارش فروشی نیست</div>';
        }
      }
    }
    
    // Stats 24h
    const r2 = await fetch('/api/exchange/stats24h');
    const d2 = await r2.json();
    
    if (d2.ok) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('ex-volume', (d2.volume || 0).toLocaleString());
      set('ex-high', (d2.high || 0).toLocaleString());
      set('ex-low', (d2.low || 0).toLocaleString());
      set('ex-trades', d2.trades || 0);
    }
    
    // Global Stats
    const r3 = await fetch('/api/exchange/stats');
    const d3 = await r3.json();
    
    if (d3.ok) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('ex-orders', d3.open_orders || 0);
    }
    
    // سفارش‌های من
    const userId = document.getElementById('ex-user')?.value;
    if (userId) {
      const r4 = await fetch('/api/exchange/orders?user=' + userId);
      const d4 = await r4.json();
      
      const myEl = document.getElementById('ex-my-orders');
      if (myEl && d4.ok && d4.orders) {
        if (d4.orders.length === 0) {
          myEl.innerHTML = '<div style="color:#8ba3c7;text-align:center;">هیچ سفارشی نداری</div>';
        } else {
          myEl.innerHTML = d4.orders.map(o => 
            \`<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:10px;background:#0a0e17;border-radius:8px;margin-bottom:8px;font-size:12px;">
              <span style="color:\${o.side === 'BUY' ? '#4ade80' : '#f87171'};">\${o.side === 'BUY' ? '🟢 خرید' : '🔴 فروش'}</span>
              <span style="color:#ffd700;">\${o.price.toLocaleString()}</span>
              <span style="color:#8ba3c7;">\${o.remaining}/\${o.amount}</span>
              <span style="color:\${o.status === 'FILLED' ? '#4ade80' : o.status === 'OPEN' ? '#ffd700' : '#f87171'};">\${o.status}</span>
              <button onclick="cancelOrder('\${o.orderId}','\${o.userId}')" style="background:#f87171;color:#fff;border:none;border-radius:4px;padding:4px;cursor:pointer;">لغو</button>
            </div>\`
          ).join('');
        }
      }
    }
  } catch(e) {
    console.error('Exchange error:', e);
  }
}

async function placeOrder() {
  const side = document.getElementById('ex-side')?.value;
  const price = parseInt(document.getElementById('ex-price')?.value);
  const amount = parseInt(document.getElementById('ex-amount')?.value);
  const userId = document.getElementById('ex-user')?.value;
  
  if (!side || !price || !amount || !userId) {
    alert('❌ همه فیلدها رو پر کن');
    return;
  }
  
  try {
    const r = await fetch('/api/exchange/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, side, price, amount })
    });
    const d = await r.json();
    
    if (d.ok) {
      const msg = d.message === 'ORDER_MATCHED' 
        ? '🎉 سفارش ثبت و معامله انجام شد!' 
        : '✅ سفارش با موفقیت ثبت شد';
      alert(msg);
      await refreshExchange();
    } else {
      alert('❌ خطا: ' + (d.error || 'unknown'));
    }
  } catch(e) {
    alert('❌ خطا در ارتباط');
  }
}

async function cancelOrder(orderId, userId) {
  if (!confirm('لغو سفارش ' + orderId + '؟')) return;
  
  try {
    const r = await fetch('/api/exchange/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, userId })
    });
    const d = await r.json();
    
    if (d.ok) {
      alert('✅ سفارش لغو شد');
      await refreshExchange();
    } else {
      alert('❌ خطا: ' + (d.error || ''));
    }
  } catch(e) {
    alert('❌ خطا');
  }
}

// بروزرسانی خودکار
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(refreshExchange, 2000);
  setInterval(refreshExchange, 15000);
});
  `;
  content = content.substring(0, scriptEnd) + js + content.substring(scriptEnd);
  console.log('✅ JavaScript اضافه شد');
}

// ─── ذخیره ───
fs.writeFileSync(FILE, content);
console.log('✅ فایل ذخیره شد');
console.log('📊 اندازه:', (content.length / 1024).toFixed(1), 'KB');

// ─── بررسی ───
console.log('');
console.log('📋 بررسی:');
console.log('  id="exchange":', content.includes('id="exchange"') ? '✅' : '❌');
console.log('  data-section="exchange":', content.includes('data-section="exchange"') ? '✅' : '❌');
console.log('  refreshExchange:', content.includes('function refreshExchange') ? '✅' : '❌');
console.log('  placeOrder:', content.includes('function placeOrder') ? '✅' : '❌');
