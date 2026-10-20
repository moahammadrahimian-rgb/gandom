const $ = id => document.getElementById(id);

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || 'HTTP_' + res.status);
  return data;
}

let toastTimer;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function showResult(elId, type, text) {
  const el = $(elId);
  el.className = 'result-box ' + type;
  el.textContent = text;
}

async function loadState() {
  try {
    const s = await api('/api/state');
    $('gdmPrice').textContent = Number(s.exchange.price).toFixed(2);
    $('change24h').textContent = '+' + s.exchange.change24h + '%';
    $('volume').textContent = Number(s.exchange.volume24h).toLocaleString('fa-IR');
    $('high').textContent = Number(s.exchange.high24h).toLocaleString('fa-IR');
    $('low').textContent = Number(s.exchange.low24h).toLocaleString('fa-IR');
    $('walletBalance').textContent = Number(s.wallet.balance).toLocaleString('fa-IR') + ' GDM';
    $('adTarget').textContent = Number(s.ads.dailyTarget).toLocaleString('fa-IR');
    $('adPrice').textContent = Number(s.ads.priceToman).toLocaleString('fa-IR');
    $('adsSold').textContent = Number(s.ads.todaySold).toLocaleString('fa-IR');
    $('supply').textContent = Number(s.economy.totalSupply).toLocaleString('fa-IR');
    $('userTarget').textContent = Number(s.users.target).toLocaleString('fa-IR');
    $('connText').textContent = 'متصل';
    $('evidenceState').textContent = 'آخرین بروزرسانی: ' + new Date().toLocaleTimeString('fa-IR');
  } catch (e) {
    $('connText').textContent = 'آفلاین';
    const dot = document.getElementById('statusDot');
    if (dot) { dot.style.background = '#ff5566'; dot.style.boxShadow = '0 0 8px #ff5566'; }
    throw e;
  }
}

$('incomeBtn').addEventListener('click', async () => {
  const amount = Number($('incomeAmount').value);
  if (!amount || amount <= 0) return showResult('walletResult', 'error', '❌ مبلغ معتبر وارد کنید');
  try {
    const r = await api('/api/wallet/income', { method: 'POST', body: JSON.stringify({ amount }) });
    showResult('walletResult', 'success', '✅ درآمد به کیف پول اضافه شد\n💰 مبلغ: ' + r.event.amount + ' GDM\n🔗 Ledger: ' + r.event.id.slice(0, 18) + '...');
    $('incomeAmount').value = '';
    await loadState();
    showToast('درآمد با موفقیت منتقل شد');
  } catch (e) {
    showResult('walletResult', 'error', '❌ خطا: ' + e.message);
  }
});

let pendingTransfer = null;

$('transferBtn').addEventListener('click', () => {
  const amount = Number($('transferAmount').value);
  const destination = $('destination').value.trim();
  if (!amount || amount <= 0) return showResult('walletResult', 'error', '❌ مبلغ معتبر وارد کنید');
  if (!destination) return showResult('walletResult', 'error', '❌ مقصد را وارد کنید');
  pendingTransfer = { amount, destination };
  $('ownerAuthInput').value = '';
  $('ownerModal').classList.add('show');
  setTimeout(() => $('ownerAuthInput').focus(), 300);
});

function closeOwnerModal() {
  $('ownerModal').classList.remove('show');
  pendingTransfer = null;
}

async function confirmOwnerAuth() {
  const auth = $('ownerAuthInput').value.trim();
  if (!auth) return showToast('رمز تأیید را وارد کنید');
  if (!pendingTransfer) return;
  try {
    const r = await api('/api/wallet/owner-transfer', {
      method: 'POST',
      body: JSON.stringify({ ...pendingTransfer, ownerAuth: auth })
    });
    showResult('walletResult', 'success', '✅ انتقال با موفقیت انجام شد\n💸 مبلغ: ' + r.event.amount + ' GDM\n🎯 مقصد: ' + r.event.destination + '\n🔗 Ledger: ' + r.event.id.slice(0, 18) + '...');
    $('transferAmount').value = '';
    $('destination').value = '';
    closeOwnerModal();
    await loadState();
    showToast('انتقال تأیید شده انجام شد');
  } catch (e) {
    closeOwnerModal();
    showResult('walletResult', 'error', '❌ ' + e.message);
  }
}

$('ownerModal').addEventListener('click', e => { if (e.target.id === 'ownerModal') closeOwnerModal(); });
$('ownerAuthInput').addEventListener('keypress', e => { if (e.key === 'Enter') confirmOwnerAuth(); });

function addAiMsg(text, who) {
  const chat = $('aiChat');
  const div = document.createElement('div');
  div.className = 'ai-msg ' + who;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

$('aiBtn').addEventListener('click', async () => {
  const msg = $('aiInput').value.trim();
  if (!msg) return;
  addAiMsg(msg, 'user');
  $('aiInput').value = '';
  try {
    const r = await api('/api/ai', { method: 'POST', body: JSON.stringify({ message: msg }) });
    setTimeout(() => addAiMsg(r.message, 'ai'), 400);
  } catch (e) {
    setTimeout(() => addAiMsg('خطا در ارتباط با سرور', 'ai'), 400);
  }
});
$('aiInput').addEventListener('keypress', e => { if (e.key === 'Enter') $('aiBtn').click(); });

$('adSaleBtn').addEventListener('click', async () => {
  try {
    const r = await api('/api/ads/sale', { method: 'POST', body: '{}' });
    $('adsSold').textContent = Number(r.ads.todaySold).toLocaleString('fa-IR');
    showToast('فروش تبلیغ ثبت شد');
  } catch (e) {
    showToast('خطا: ' + e.message);
  }
});

document.querySelectorAll('.sector').forEach(b => {
  b.addEventListener('click', () => {
    const s = b.dataset.sector;
    const names = { 'real-estate': 'املاک', 'gold': 'طلا', 'auto': 'خودرو', 'social': 'شبکه اجتماعی' };
    showToast('ماژول ' + names[s] + ' — به‌زودی');
  });
});

$('refreshBtn').addEventListener('click', async () => {
  await loadState();
  showToast('بازار بروزرسانی شد');
});

document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    const page = btn.dataset.page;
    if (page === 'wallet') $('walletCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (page === 'exchange') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (page === 'ai') document.querySelector('.ai-chat').scrollIntoView({ behavior: 'smooth', block: 'center' });
    else if (page === 'more') document.querySelectorAll('details')[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

loadState().catch(e => showToast('سرور در دسترس نیست'));


// ═══════════════════════════════════════════════════
// 🇮🇷 IRAN TIME (Asia/Tehran)
// ═══════════════════════════════════════════════════
const IRAN_TZ = 'Asia/Tehran';

function iranTime() {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: IRAN_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date());
}

function iranDate() {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: IRAN_TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'
  }).format(new Date());
}

function iranDateTime() {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: IRAN_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date());
}

function injectIranClock() {
  const topbar = document.querySelector('.topbar') || document.querySelector('.tb');
  if (!topbar || document.getElementById('iranClock')) return;
  const clock = document.createElement('div');
  clock.id = 'iranClock';
  clock.style.cssText = 'position:absolute;bottom:-26px;left:50%;transform:translateX(-50%);font-size:10px;color:#848e9c;background:rgba(11,14,17,.95);padding:4px 12px;border-radius:99px;border:1px solid #2b3139;font-family:ui-monospace,monospace;z-index:50;white-space:nowrap';
  clock.textContent = '🇮🇷 ' + iranTime() + ' — ' + iranDate();
  topbar.appendChild(clock);
  setInterval(() => {
    const c = document.getElementById('iranClock');
    if (c) c.textContent = '🇮🇷 ' + iranTime() + ' — ' + iranDate();
  }, 1000);
}

// ═══════════════════════════════════════════════════
// 🔑 API KEY
// ═══════════════════════════════════════════════════
function openApiKey() {
  const saved = JSON.parse(localStorage.getItem('gandom_api_keys') || '{}');
  if ($('apiOR')) $('apiOR').value = saved.openrouter || '';
  if ($('apiTG')) $('apiTG').value = saved.telegram || '';
  if ($('apiIG')) $('apiIG').value = saved.instagram || '';
  if ($('apiX'))  $('apiX').value  = saved.twitter || '';
  if ($('apiRes')) $('apiRes').className = 'res';
  if ($('apiModal')) $('apiModal').classList.add('show');
}

function saveApiKeys() {
  const keys = {
    openrouter: ($('apiOR')?.value || '').trim(),
    telegram:   ($('apiTG')?.value || '').trim(),
    instagram:  ($('apiIG')?.value || '').trim(),
    twitter:    ($('apiX')?.value  || '').trim(),
    savedAt: iranDateTime()
  };
  localStorage.setItem('gandom_api_keys', JSON.stringify(keys));
  if ($('apiRes')) {
    $('apiRes').className = 'res ok';
    $('apiRes').innerHTML = '✅ ذخیره شد<br>📅 ' + iranDateTime();
  }
  if (typeof showToast === 'function') showToast('🔑 API Keys ذخیره شد');
  setTimeout(() => { if ($('apiModal')) $('apiModal').classList.remove('show'); }, 1500);
}

// ═══════════════════════════════════════════════════
// 👑 OWNER 5% CONTROL
// ═══════════════════════════════════════════════════
function openOwnerControl() {
  if ($('ownerAuthModal')) $('ownerAuthModal').value = '';
  if ($('ownerRes')) $('ownerRes').className = 'res';
  if ($('ownerModal')) $('ownerModal').classList.add('show');
  setTimeout(() => { if ($('ownerAuthModal')) $('ownerAuthModal').focus(); }, 200);
}

function confirmOwner() {
  const auth = ($('ownerAuthModal')?.value || '').trim();
  if (auth === 'GANDOM_OWNER_AUTH') {
    if ($('ownerRes')) {
      $('ownerRes').className = 'res ok';
      $('ownerRes').innerHTML =
        '✅ دسترسی مالک تأیید شد<br><br>' +
        '👑 سهم شما: <b style="color:#f0b90b">1,200,000,000 GDM</b><br>' +
        '📊 از کل: 24,000,000,000 GDM<br>' +
        '🎯 درصد: 5%<br><br>' +
        '📅 ' + iranDateTime();
    }
    if (typeof showToast === 'function') showToast('👑 دسترسی مالک تأیید شد');
  } else {
    if ($('ownerRes')) {
      $('ownerRes').className = 'res err';
      $('ownerRes').textContent = '❌ رمز اشتباه است';
    }
    if (typeof showToast === 'function') showToast('❌ رمز اشتباه');
  }
}

// ═══════════════════════════════════════════════════
// راه‌اندازی خودکار
// ═══════════════════════════════════════════════════
setTimeout(injectIranClock, 800);

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && $('ownerModal')?.classList.contains('show')) confirmOwner();
  if (e.key === 'Escape') document.querySelectorAll('.modal-ov').forEach(m => m.classList.remove('show'));
});

document.addEventListener('click', e => {
  document.querySelectorAll('.modal-ov').forEach(m => {
    if (e.target === m) m.classList.remove('show');
  });
});

console.log('✅ Iran Time + API + Owner loaded');
