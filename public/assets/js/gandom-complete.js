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
    const r = await api('http://127.0.0.1:3000/api/wallet/income', { method: 'POST', body: JSON.stringify({ amount }) });
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
    const r = await api('http://127.0.0.1:3000/api/wallet/owner-transfer', {
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

// ═══════════════════════════════════════════════════
// SPA NAVIGATION — goPage / goHome / renderSPA
// ═══════════════════════════════════════════════════
function goPage(id){
  document.querySelectorAll('.pg-view').forEach(p=>p.classList.remove('on'));
  const pg = document.getElementById('spa-'+id);
  if(!pg) { console.warn('صفحه spa-'+id+' نیست'); return; }
  renderSPA(id);
  pg.classList.add('on');
  const back = document.getElementById('hdBack');
  if(back) back.classList.add('on');
  const tiles = document.getElementById('tilesRoot');
  if(tiles) tiles.style.display = 'none';
  // مخفی کردن home page blocks
  document.querySelectorAll('.pg').forEach(p=>{ if(p.id !== 'spa-'+id) p.classList.remove('on'); });
  window.scrollTo(0,0);
}

function goHome(){
  document.querySelectorAll('.pg-view').forEach(p=>p.classList.remove('on'));
  const back = document.getElementById('hdBack');
  if(back) back.classList.remove('on');
  const tiles = document.getElementById('tilesRoot');
  if(tiles) tiles.style.display = 'block';
  window.scrollTo(0,0);
}

function spaHead(ic, title, sub, color){
  color = color || '#f0b90b';
  return '<div class="spa-head">' +
    '<div class="spa-ic" style="background:linear-gradient(135deg,'+color+','+color+'cc)">'+ic+'</div>' +
    '<div><h2 class="spa-h2">'+title+'</h2><p class="spa-p">'+sub+'</p></div></div>';
}
function spaRow(l, v, cls){
  cls = cls || '';
  var cc = cls === 'up' ? '#0ecb81' : cls === 'gold' ? '#f0b90b' : '#eaecef';
  return '<div class="spa-row"><span class="l">'+l+'</span><span class="v" style="color:'+cc+'">'+v+'</span></div>';
}
function spaStat(v, l){
  return '<div class="spa-stat"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>';
}

function renderSPA(id){
  var pg = document.getElementById('spa-'+id);
  if(!pg || pg.dataset.rendered === '1') return;
  pg.dataset.rendered = '1';

  var S = window.__state || {};
  var w = S.wallet || {}, ex = S.exchange || {}, ai = S.aiEngine || {};
  var ind = S.industries || {}, bots = S.socialBots || {}, users = S.users || {};

  var P = {
    ai: spaHead('🤖','هسته AI خودگردان','AUTONOMOUS','#a855f7')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
      + spaStat((ai.totalSales||0).toLocaleString('fa-IR'),'فروش AI')
      + spaStat((ai.uptime||0)+'s','فعالیت') + '</div>'
      + spaRow('وضعیت', ai.status||'ACTIVE','up')
      + spaRow('حالت', ai.mode||'AUTONOMOUS')
      + spaRow('نسخه', ai.version||'2558'),

    p2p: spaHead('🌐','شبکه P2P','Peer-to-Peer','#3b82f6')
      + spaRow('Node ID', ((S.p2p&&S.p2p.nodeId)||'gandom-node-2558').slice(0,22)+'...')
      + spaRow('وضعیت', 'ONLINE','up')
      + spaRow('همتا', '2387')
      + spaRow('ارتفاع زنجیره', '#'+((S.blockchain&&S.blockchain.height)||0)),

    exchange: spaHead('📈','صرافی گندم','GDM / USDT','#f0b90b')
      + spaRow('قیمت', '$'+Number(ex.price||0.1254).toFixed(4),'gold')
      + spaRow('تغییر 24h', '+'+(ex.change24h||12.36)+'%','up')
      + spaRow('حجم 24h', (ex.volume24h||1250000).toLocaleString('fa-IR'))
      + spaRow('بالاترین', '$'+Number(ex.high24h||0.132).toFixed(4))
      + spaRow('پایین‌ترین', '$'+Number(ex.low24h||0.108).toFixed(4))
      + '<button class="spa-btn green" onclick="doTrade(\'buy\')">🟢 خرید GDM</button>'
      + '<button class="spa-btn red" onclick="doTrade(\'sell\')">🔴 فروش GDM</button>'
      + '<div id="tradeRes" style="margin-top:10px;font-size:12px"></div>',

    wallet: spaHead('👛','کیف پول','مدیریت دارایی GDM','#0ecb81')
      + spaRow('موجودی', (w.balance||0).toFixed(2)+' GDM','gold')
      + spaRow('درآمد امروز', (w.todayIncome||0).toFixed(2),'up')
      + spaRow('کل درآمد', (w.totalIncome||0).toFixed(2),'up')
      + spaRow('تعداد تراکنش', (w.txCount||0).toLocaleString('fa-IR'))
      + '<button class="spa-btn green" onclick="openModal(\'deposit\')">📥 واریز</button>'
      + '<button class="spa-btn red" onclick="openModal(\'withdraw\')">📤 برداشت</button>'
      + '<div id="wRes" style="margin-top:10px;font-size:12px"></div>',

    owner: spaHead('👑','سهم مالک','OWNER · 5%','#f0b90b')
      + '<div style="background:linear-gradient(135deg,rgba(240,185,11,.2),rgba(240,185,11,.05));border:1.5px solid rgba(240,185,11,.5);border-radius:14px;padding:22px;text-align:center;margin-bottom:12px">'
      + '<div style="font-size:36px">👑</div>'
      + '<div style="font-size:26px;font-weight:900;color:#f0b90b;margin:8px 0">1,200,000,000</div>'
      + '<div style="font-size:11px;color:#848e9c">GDM — سهم اختصاصی مالک</div></div>'
      + spaRow('از کل', '24,000,000,000')
      + spaRow('درصد', '5%','gold')
      + '<button class="spa-btn gold" onclick="openOwnerControl()">🔓 دسترسی مالک</button>',

    supply: spaHead('💎','عرضه کل گندم','TOTAL SUPPLY','#0ecb81')
      + '<div style="background:linear-gradient(135deg,rgba(14,203,129,.15),transparent);border:1.5px solid rgba(14,203,129,.4);border-radius:14px;padding:22px;text-align:center;margin-bottom:12px">'
      + '<div style="font-size:26px;font-weight:900;color:#0ecb81">24,000,000,000</div>'
      + '<div style="font-size:11px;color:#848e9c;margin-top:6px">GDM TOTAL SUPPLY</div></div>'
      + spaRow('سهم مالک (5%)', '1.2 میلیارد','gold')
      + spaRow('کاربران (95%)', '22.8 میلیارد','up'),

    users: spaHead('🌍','کاربران جهانی','TARGET','#3b82f6')
      + '<div style="text-align:center;padding:20px 0">'
      + '<div style="font-size:26px;font-weight:900;color:#3b82f6">8,000,000,000</div>'
      + '<div style="font-size:11px;color:#848e9c;margin-top:6px">TARGET — نه کاربر واقعی</div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
      + spaStat((users.actual||1247).toLocaleString('fa-IR'),'فعال')
      + spaStat((users.verified||892).toLocaleString('fa-IR'),'KYC')
      + spaStat((users.pending||355).toLocaleString('fa-IR'),'در انتظار') + '</div>',

    ads: spaHead('📢','تبلیغات گندم','ADS','#f0b90b')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat('10,000','قیمت (تومان)')
      + spaStat('1000','هدف روزانه')
      + spaStat((S.ads&&S.ads.todaySold||0).toLocaleString('fa-IR'),'فروش امروز')
      + spaStat((S.ads&&S.ads.revenueToman||0).toLocaleString('fa-IR'),'درآمد') + '</div>'
      + '<button class="spa-btn gold" onclick="api(\'/api/ads/sale\',{method:\'POST\',body:\'{}\'}).then(function(){toast(\'✅ ثبت شد\');loadState();})">📢 ثبت فروش</button>',

    gold: spaHead('🪙','طلا و جواهرات','GOLD','#f0b90b')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat((ind.gold&&ind.gold.listings||247).toLocaleString('fa-IR'),'آگهی')
      + spaStat((ind.gold&&ind.gold.leads||89).toLocaleString('fa-IR'),'لید')
      + spaStat((ind.gold&&ind.gold.sales||12).toLocaleString('fa-IR'),'فروش')
      + spaStat((ind.gold&&ind.gold.revenueToman||0).toLocaleString('fa-IR')+' ت','درآمد') + '</div>',

    re: spaHead('🏢','املاک','Real Estate','#3b82f6')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat((ind.realEstate&&ind.realEstate.listings||512).toLocaleString('fa-IR'),'آگهی')
      + spaStat((ind.realEstate&&ind.realEstate.leads||156).toLocaleString('fa-IR'),'لید')
      + spaStat((ind.realEstate&&ind.realEstate.sales||8).toLocaleString('fa-IR'),'فروش')
      + spaStat((ind.realEstate&&ind.realEstate.revenueToman||0).toLocaleString('fa-IR')+' ت','درآمد') + '</div>',

    auto: spaHead('🚗','خودرو','Automotive','#ef4444')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat((ind.auto&&ind.auto.listings||341).toLocaleString('fa-IR'),'آگهی')
      + spaStat((ind.auto&&ind.auto.leads||203).toLocaleString('fa-IR'),'لید')
      + spaStat((ind.auto&&ind.auto.sales||15).toLocaleString('fa-IR'),'فروش')
      + spaStat((ind.auto&&ind.auto.revenueToman||0).toLocaleString('fa-IR')+' ت','درآمد') + '</div>',

    ig: spaHead('📷','Instagram Bots','342','#e4405f')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat((bots.instagram&&bots.instagram.active||342),'فعال')
      + spaStat((bots.instagram&&bots.instagram.posts||1240).toLocaleString('fa-IR'),'پست') + '</div>',
    tg: spaHead('✈️','Telegram Bots','487','#0088cc')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat((bots.telegram&&bots.telegram.active||487),'فعال')
      + spaStat((bots.telegram&&bots.telegram.posts||2156).toLocaleString('fa-IR'),'پست') + '</div>',
    tw: spaHead('🐦','X Bots','231','#1da1f2')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat((bots.twitter&&bots.twitter.active||231),'فعال')
      + spaStat((bots.twitter&&bots.twitter.posts||892).toLocaleString('fa-IR'),'پست') + '</div>',
    yt: spaHead('▶️','YouTube Bots','156','#ff0000')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat((bots.youtube&&bots.youtube.active||156),'فعال')
      + spaStat((bots.youtube&&bots.youtube.posts||421).toLocaleString('fa-IR'),'پست') + '</div>',
    wa: spaHead('💬','WhatsApp Bots','312','#25D366')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + spaStat((bots.whatsapp&&bots.whatsapp.active||312),'فعال')
      + spaStat((bots.whatsapp&&bots.whatsapp.posts||1567).toLocaleString('fa-IR'),'پست') + '</div>',

    bots: spaHead('🤖','کل ربات‌ها','AUTONOMOUS','#a855f7')
      + spaRow('Instagram', (bots.instagram&&bots.instagram.active||342)+' فعال')
      + spaRow('Telegram', (bots.telegram&&bots.telegram.active||487)+' فعال','up')
      + spaRow('X', (bots.twitter&&bots.twitter.active||231)+' فعال')
      + spaRow('YouTube', (bots.youtube&&bots.youtube.active||156)+' فعال')
      + spaRow('WhatsApp', (bots.whatsapp&&bots.whatsapp.active||312)+' فعال')
      + spaRow('مجموع', '1,528 ربات','gold'),

    dht: spaHead('⬡','DHT','Peer Discovery','#3b82f6')
      + spaRow('وضعیت','READY','up')
      + spaRow('Buckets','160')
      + spaRow('K','20'),
    ipfs: spaHead('▣','IPFS','Distributed','#3b82f6')
      + spaRow('وضعیت','READY','up')
      + spaRow('CIDs', (S.ipfs&&S.ipfs.cids||0).toLocaleString('fa-IR'))
      + spaRow('Blocks', (S.ipfs&&S.ipfs.blocks||0).toLocaleString('fa-IR')),
    chain: spaHead('⛓','Blockchain','Core Ledger','#f0b90b')
      + spaRow('ارتفاع', '#'+((S.blockchain&&S.blockchain.height)||0),'gold')
      + spaRow('Mempool', (S.blockchain&&S.blockchain.mempool||0).toLocaleString('fa-IR'))
      + spaRow('UTXO', (S.blockchain&&S.blockchain.utxo||0).toLocaleString('fa-IR')),
    sec: spaHead('🛡','امنیت','Security','#0ecb81')
      + spaRow('SHA-256','✓ فعال','up')
      + spaRow('AES-256','✓ فعال','up')
      + spaRow('RSA-2048','✓ فعال','up')
      + spaRow('Owner Gate','✓ فعال','up'),
    tor: spaHead('◎','Tor','Privacy','#a855f7')
      + spaRow('وضعیت','SIMULATOR','gold'),
    gov: spaHead('📜','حاکمیت','Mother Law 2558','#f0b90b')
      + '<div style="background:#181a20;border:1px solid #2b3139;border-radius:10px;padding:14px;font-size:12px;line-height:1.9;color:#eaecef">'
      + '<b style="color:#f0b90b">GOLDEN MOTHER LAW 2558</b><br><br>'
      + '• هیچ PASS بدون Evidence<br>'
      + '• AI حق دسترسی مالی ندارد<br>'
      + '• مالک = 5%<br>'
      + '• کاربران 8B = هدف<br>'
      + '• 24B GDM = Supply</div>',

    kyc: spaHead('🪪','احراز هویت','KYC','#0ecb81')
      + '<input id="kycName" placeholder="نام و نام خانوادگی" style="width:100%;background:#0b0e11;border:1px solid #2b3139;border-radius:10px;padding:12px 14px;color:#eaecef;font-size:14px;margin-bottom:8px;font-family:inherit;outline:none">'
      + '<input id="kycNationalId" type="tel" inputmode="numeric" maxlength="10" placeholder="کد ملی (10 رقم)" style="width:100%;background:#0b0e11;border:1px solid #2b3139;border-radius:10px;padding:12px 14px;color:#eaecef;font-size:14px;margin-bottom:8px;font-family:inherit;outline:none">'
      + '<button id="kycBtn" class="spa-btn green">🪪 ارسال</button>'
      + '<div id="kycRes" style="margin-top:10px;font-size:12px"></div>',

    chat: spaHead('💭','دستیار AI','AI CHAT','#a855f7')
      + '<div id="aiChat" style="background:#0b0e11;border-radius:10px;padding:12px;min-height:200px;max-height:340px;overflow-y:auto;margin-bottom:10px;display:flex;flex-direction:column;gap:8px">'
      + '<div style="background:#181a20;padding:10px;border-radius:10px;font-size:12.5px;max-width:88%">سلام 👋 چطور کمکت کنم؟</div></div>'
      + '<div style="display:flex;gap:8px">'
      + '<input id="aiInput" placeholder="سوالت رو بنویس..." style="flex:1;background:#0b0e11;border:1px solid #2b3139;border-radius:10px;padding:12px 14px;color:#eaecef;font-size:14px;font-family:inherit;outline:none">'
      + '<button id="aiBtn" style="width:70px;padding:12px;border-radius:10px;background:linear-gradient(135deg,#a855f7,#7e22ce);color:#fff;border:none;font-weight:900;cursor:pointer;font-family:inherit">↗</button></div>',

    ledger: spaHead('📋','دفتر کل','LEDGER','#0ecb81')
      + '<div id="ledgerList">'
      + ((S.ledger||[]).slice(-15).reverse().map(function(e){
          return '<div style="background:#181a20;border-right:3px solid #0ecb81;border-radius:8px;padding:10px;margin-bottom:6px;font-size:11.5px">'
            + '<div style="display:flex;justify-content:space-between"><span style="color:#0ecb81;font-weight:800">+'+e.gdmEarned+' GDM</span>'
            + '<span style="color:#848e9c;font-size:9.5px">'+new Date(e.timestamp).toLocaleTimeString('fa-IR')+'</span></div>'
            + '<div style="color:#848e9c;font-size:10px;margin-top:3px">'+(e.salesCount||0)+' فروش</div></div>';
        }).join('') || '<div style="text-align:center;color:#848e9c;padding:30px">هنوز تراکنشی ثبت نشده</div>')
      + '</div>',

    publish: spaHead('📤','Auto Publish','Social Automation','#3b82f6')
      + spaRow('وضعیت','READY','up')
      + spaRow('منتشر شده', (S.autoPublish&&S.autoPublish.published||0).toLocaleString('fa-IR')),

    evidence: spaHead('📊','Evidence / Audit','Audit Trail','#f0b90b')
      + spaRow('Version','GANDOM 2558')
      + spaRow('Port','8080')
      + spaRow('Status','ACTIVE','up'),

    social: spaHead('👥','شبکه اجتماعی','Social Hub','#e4405f')
      + spaRow('Instagram', (bots.instagram&&bots.instagram.active||342)+' ربات')
      + spaRow('Telegram', (bots.telegram&&bots.telegram.active||487)+' ربات','up')
      + spaRow('X', (bots.twitter&&bots.twitter.active||231)+' ربات')
      + spaRow('YouTube', (bots.youtube&&bots.youtube.active||156)+' ربات')
      + spaRow('WhatsApp', (bots.whatsapp&&bots.whatsapp.active||312)+' ربات')
  };

  if(P[id]) pg.innerHTML = P[id]();
  // بعد از render، بایند دکمه‌های داینامیک
  setTimeout(bindDynamicHandlers, 50);
}

function bindDynamicHandlers(){
  var kb = document.getElementById('kycBtn');
  if(kb && !kb.dataset.bound){
    kb.dataset.bound = '1';
    kb.addEventListener('click', async function(){
      var n = document.getElementById('kycName').value.trim();
      var i = document.getElementById('kycNationalId').value.trim();
      if(!n || !/^\d{10}$/.test(i)) {
        document.getElementById('kycRes').innerHTML = '<span style="color:#f6465d">❌ نام و کد ملی 10 رقمی</span>';
        return;
      }
      try {
        await api('/api/kyc/verify',{method:'POST',body:JSON.stringify({fullName:n,nationalId:i})});
        document.getElementById('kycRes').innerHTML = '<span style="color:#0ecb81">✅ احراز هویت موفق</span>';
        toast('✅ تأیید شد');
      } catch(e){
        document.getElementById('kycRes').innerHTML = '<span style="color:#f6465d">❌ '+e.message+'</span>';
      }
    });
  }
  var ab = document.getElementById('aiBtn');
  if(ab && !ab.dataset.bound){
    ab.dataset.bound = '1';
    ab.addEventListener('click', sendChatMsg);
    var ai = document.getElementById('aiInput');
    if(ai) ai.addEventListener('keypress', function(e){ if(e.key === 'Enter') sendChatMsg(); });
  }
}

async function sendChatMsg(){
  var inp = document.getElementById('aiInput');
  var box = document.getElementById('aiChat');
  if(!inp || !box) return;
  var m = inp.value.trim();
  if(!m) return;
  box.innerHTML += '<div style="background:rgba(240,185,11,.15);padding:10px;border-radius:10px;font-size:12.5px;max-width:88%;align-self:flex-end">'+m+'</div>';
  inp.value = '';
  box.scrollTop = box.scrollHeight;
  try {
    var r = await api('/api/ai',{method:'POST',body:JSON.stringify({message:m})});
    setTimeout(function(){
      box.innerHTML += '<div style="background:#181a20;padding:10px;border-radius:10px;font-size:12.5px;max-width:88%">'+r.message+'</div>';
      box.scrollTop = box.scrollHeight;
    }, 300);
  } catch(e){}
}

async function doTrade(side){
  var a = prompt('مقدار GDM برای ' + (side === 'buy' ? 'خرید' : 'فروش') + ':');
  if(!a) return;
  try {
    var r = await api('/api/exchange/'+side,{method:'POST',body:JSON.stringify({amount:+a})});
    var tr = document.getElementById('tradeRes');
    if(tr) tr.innerHTML = '<div style="background:rgba(14,203,129,.15);padding:10px;border-radius:8px;color:#0ecb81">✅ '+a+' GDM '+(side==='buy'?'خریداری':'فروش')+' شد</div>';
    toast('✅ انجام شد');
    await loadState();
  } catch(e){ toast('❌ '+e.message); }
}

// Hook loadState برای sync window.__state
(function(){
  var _orig = window.loadState;
  window.loadState = async function(){
    try {
      var r = await api('/api/state');
      window.__state = r;
      if(typeof updateHome === 'function') updateHome();
      if(typeof render === 'function') try{ render(); }catch(e){}
    } catch(e){}
  };
})();

setTimeout(window.loadState, 300);
setInterval(window.loadState, 5000);

console.log('✅ SPA Navigation loaded — goPage, goHome, renderSPA');
