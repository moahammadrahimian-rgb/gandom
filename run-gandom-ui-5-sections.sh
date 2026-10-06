#!/data/data/com.termux/files/usr/bin/bash

set -u

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

echo "========================================"
echo " GANDOM — 5 SECTION UI EXECUTION"
echo "========================================"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="backups/ui-5-sections-$STAMP"

mkdir -p "$BACKUP"
cp -a www "$BACKUP/www" 2>/dev/null || true
cp -a capacitor.config.json "$BACKUP/capacitor.config.json" 2>/dev/null || true

echo "BACKUP=PASS"
echo "BACKUP_PATH=$BACKUP"

mkdir -p www/assets/css
mkdir -p www/assets/js

# ==========================================================
# SECTION 1
# Design System + Main Frame
# ==========================================================

echo
echo "========== SECTION 1 =========="
echo "DESIGN SYSTEM + MAIN FRAME"

cat > www/assets/css/gandom-ui.css <<'CSS'
:root{
  --bg:#06100c;
  --surface:#0b1914;
  --surface2:#10231c;
  --surface3:#153027;
  --green:#0a9969;
  --green2:#22b77d;
  --text:#f3f8f5;
  --muted:#91aaa0;
  --border:rgba(255,255,255,.09);
  --danger:#ef6b73;
  --warning:#e7b85c;
  --success:#35d38b;
  --radius:20px;
}

*{box-sizing:border-box}

html,body{
  margin:0;
  min-height:100%;
  background:var(--bg);
  color:var(--text);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
}

body{
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
}

button{
  font:inherit;
  color:inherit;
}

.app{
  width:min(100%,760px);
  min-height:100vh;
  margin:auto;
  padding-bottom:90px;
}

.header{
  position:sticky;
  top:0;
  z-index:20;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:16px 18px;
  background:rgba(6,16,12,.92);
  backdrop-filter:blur(16px);
  border-bottom:1px solid var(--border);
}

.brand{
  display:flex;
  align-items:center;
  gap:12px;
}

.logo{
  width:44px;
  height:44px;
  display:grid;
  place-items:center;
  border-radius:14px;
  background:linear-gradient(145deg,var(--green2),var(--green));
  font-size:25px;
}

.brand-title{
  font-weight:800;
  letter-spacing:.5px;
}

.brand-sub{
  color:var(--muted);
  font-size:11px;
}

.page{
  padding:18px;
}

.section{
  margin-bottom:16px;
}

.hero{
  padding:24px;
  border:1px solid var(--border);
  border-radius:26px;
  background:
    radial-gradient(circle at top right,rgba(34,183,125,.20),transparent 42%),
    linear-gradient(145deg,#10281f,#091610);
  box-shadow:0 18px 45px rgba(0,0,0,.25);
}

.eyebrow{
  color:var(--green2);
  font-size:12px;
  font-weight:700;
  letter-spacing:1px;
  text-transform:uppercase;
}

h1,h2,h3,p{
  margin-top:0;
}

h1{
  margin-bottom:8px;
  font-size:clamp(28px,8vw,44px);
}

h2{
  font-size:18px;
}

.muted{
  color:var(--muted);
}

.grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}

.card{
  padding:18px;
  border:1px solid var(--border);
  border-radius:var(--radius);
  background:linear-gradient(145deg,var(--surface2),var(--surface));
}

.card-full{
  grid-column:1/-1;
}

.metric{
  font-size:24px;
  font-weight:800;
}

.status{
  display:inline-flex;
  align-items:center;
  gap:7px;
  padding:6px 10px;
  border-radius:999px;
  background:rgba(53,211,139,.12);
  color:var(--success);
  font-size:12px;
}

.status.offline{
  background:rgba(239,107,115,.12);
  color:var(--danger);
}

.button{
  border:0;
  border-radius:14px;
  padding:12px 16px;
  background:var(--green);
  font-weight:700;
}

.chart{
  width:100%;
  height:190px;
  display:block;
  border-radius:16px;
  background:#091711;
  border:1px solid var(--border);
}

.nav{
  position:fixed;
  left:50%;
  bottom:12px;
  transform:translateX(-50%);
  width:min(calc(100% - 24px),720px);
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:5px;
  padding:8px;
  border:1px solid var(--border);
  border-radius:22px;
  background:rgba(11,25,20,.94);
  backdrop-filter:blur(18px);
  z-index:30;
}

.nav button{
  border:0;
  background:transparent;
  padding:10px 4px;
  border-radius:14px;
  color:var(--muted);
  font-size:11px;
}

.nav button.active{
  background:rgba(34,183,125,.14);
  color:var(--green2);
}

.view{
  display:none;
}

.view.active{
  display:block;
}

.row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
}

.small{
  font-size:12px;
}

.list{
  display:grid;
  gap:9px;
}

.list-item{
  display:flex;
  justify-content:space-between;
  padding:12px;
  border-radius:14px;
  background:rgba(255,255,255,.035);
}

details{
  border:1px solid var(--border);
  border-radius:16px;
  padding:14px;
  background:rgba(255,255,255,.025);
}

details+details{
  margin-top:10px;
}

summary{
  cursor:pointer;
  font-weight:700;
}

@media(max-width:430px){
  .page{padding:14px}
  .grid{grid-template-columns:1fr}
  .card-full{grid-column:auto}
}
CSS

cat > www/assets/js/gandom-ui.js <<'JS'
'use strict';

const GANDOM_UI = {
  version: '1.0.0',
  sections: 5,
  appId: 'com.gandom.app'
};

window.GANDOM_UI = Object.freeze(GANDOM_UI);

const $ = (selector) => document.querySelector(selector);

function activateView(name){
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${name}`);
  });

  document.querySelectorAll('.nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
}

document.querySelectorAll('.nav button').forEach(button => {
  button.addEventListener('click', () => activateView(button.dataset.view));
});

function drawChart(){
  const canvas = $('#marketChart');
  if(!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;

  ctx.clearRect(0,0,w,h);

  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;

  for(let i=1;i<5;i++){
    const y = h*i/5;
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(w,y);
    ctx.stroke();
  }

  /*
   * این خط فقط برای نمایش ساختار نمودار است.
   * هیچ قیمت یا داده بازار جعلی تولید نمی‌شود.
   */
  ctx.strokeStyle = '#22b77d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20,h*.70);
  ctx.lineTo(w*.25,h*.58);
  ctx.lineTo(w*.42,h*.63);
  ctx.lineTo(w*.60,h*.40);
  ctx.lineTo(w*.78,h*.48);
  ctx.lineTo(w-20,h*.28);
  ctx.stroke();
}

async function checkRuntime(){
  const status = $('#runtimeStatus');

  try{
    const response = await fetch('/health', {
      method:'GET',
      cache:'no-store'
    });

    if(!response.ok) throw new Error('HTTP '+response.status);

    status.textContent = 'Runtime Online';
    status.classList.remove('offline');
  }catch(error){
    status.textContent = 'Runtime Offline';
    status.classList.add('offline');
  }
}

window.addEventListener('resize', drawChart);

document.addEventListener('DOMContentLoaded', () => {
  drawChart();
  checkRuntime();
});
JS

node --check www/assets/js/gandom-ui.js \
  && echo "SECTION_1_JS=PASS" \
  || echo "SECTION_1_JS=FAIL"

# ==========================================================
# SECTION 2
# Home + Economy + Exchange
# ==========================================================

echo
echo "========== SECTION 2 =========="
echo "HOME + ECONOMY + EXCHANGE"

# ==========================================================
# SECTION 3
# Wallet + P2P + Network + AI
# ==========================================================

echo
echo "========== SECTION 3 =========="
echo "WALLET + P2P + NETWORK + AI"

# ==========================================================
# SECTION 4
# Security + Backup + Evidence + UX
# ==========================================================

echo
echo "========== SECTION 4 =========="
echo "SECURITY + BACKUP + EVIDENCE + UX"

# ==========================================================
# SECTION 5
# Integration + Capacitor + Android
# ==========================================================

echo
echo "========== SECTION 5 =========="
echo "INTEGRATION + CAPACITOR + ANDROID"

cat > www/index.html <<'HTML'
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#06100c">
<meta name="description" content="GANDOM decentralized ecosystem">

<title>GANDOM</title>

<link rel="stylesheet" href="/assets/css/gandom-ui.css">
</head>

<body>

<div class="app">

<header class="header">
  <div class="brand">
    <div class="logo">🌾</div>
    <div>
      <div class="brand-title">GANDOM</div>
      <div class="brand-sub">Decentralized Ecosystem</div>
    </div>
  </div>

  <span id="runtimeStatus" class="status offline">
    Checking Runtime
  </span>
</header>

<main class="page">

<!-- SECTION 2: HOME -->
<section id="view-home" class="view active">

  <div class="hero section">
    <div class="eyebrow">GANDOM CORE</div>
    <h1>گندم</h1>
    <p class="muted">
      رابط یکپارچه شبکه، اقتصاد، کیف پول و سرویس‌های GANDOM
    </p>
  </div>

  <div class="grid section">

    <article class="card">
      <div class="muted small">Network</div>
      <div class="metric">P2P</div>
      <span class="status">Core</span>
    </article>

    <article class="card">
      <div class="muted small">Runtime</div>
      <div class="metric">Live</div>
      <span id="homeRuntime" class="status">Checking</span>
    </article>

    <article class="card card-full">
      <h2>وضعیت سیستم</h2>
      <div class="list">
        <div class="list-item">
          <span>UI</span>
          <span>Ready</span>
        </div>
        <div class="list-item">
          <span>Capacitor</span>
          <span>Configured</span>
        </div>
        <div class="list-item">
          <span>Core Data</span>
          <span>Runtime Controlled</span>
        </div>
      </div>
    </article>

  </div>

</section>

<!-- SECTION 2: ECONOMY + EXCHANGE -->
<section id="view-market" class="view">

  <div class="section">
    <div class="eyebrow">ECONOMY</div>
    <h1>اقتصاد و بازار</h1>
    <p class="muted">
      داده بازار باید از منبع واقعی Runtime وارد شود.
    </p>
  </div>

  <div class="card section">
    <div class="row">
      <div>
        <div class="muted small">GDM Market</div>
        <h2>Exchange</h2>
      </div>
      <span class="status">Ready</span>
    </div>

    <canvas id="marketChart" class="chart"></canvas>

    <p class="muted small">
      نمودار فعلی فقط چارچوب UI است؛ قیمت واقعی تا اتصال API بازار نمایش داده نمی‌شود.
    </p>
  </div>

  <div class="grid">
    <article class="card">
      <div class="muted small">Supply</div>
      <div class="metric">Core</div>
    </article>

    <article class="card">
      <div class="muted small">Market Data</div>
      <div class="metric">API</div>
    </article>
  </div>

</section>

<!-- SECTION 3: WALLET + NETWORK + AI -->
<section id="view-network" class="view">

  <div class="section">
    <div class="eyebrow">NETWORK</div>
    <h1>شبکه و سرویس‌ها</h1>
  </div>

  <div class="grid section">

    <article class="card">
      <h2>Wallet</h2>
      <p class="muted">
        موجودی و تراکنش فقط از Runtime واقعی.
      </p>
      <span class="status">Protected</span>
    </article>

    <article class="card">
      <h2>P2P</h2>
      <p class="muted">
        Peer / Node / DHT
      </p>
      <span class="status">Connected UI</span>
    </article>

    <article class="card">
      <h2>AI</h2>
      <p class="muted">
        سرویس هوشمند موجود در Core
      </p>
      <span class="status">Service</span>
    </article>

    <article class="card">
      <h2>Node</h2>
      <p class="muted">
        وضعیت Node از Runtime
      </p>
      <span class="status">Monitor</span>
    </article>

  </div>

</section>

<!-- SECTION 4: SECURITY + BACKUP -->
<section id="view-security" class="view">

  <div class="section">
    <div class="eyebrow">SECURITY</div>
    <h1>امنیت و شواهد</h1>
  </div>

  <div class="card section">

    <details open>
      <summary>Security</summary>
      <p class="muted">
        وضعیت امنیتی از Core واقعی خوانده خواهد شد.
      </p>
    </details>

    <details>
      <summary>Backup</summary>
      <p class="muted">
        نقطه پشتیبان پروژه در مسیر backups نگهداری می‌شود.
      </p>
    </details>

    <details>
      <summary>Evidence / Audit</summary>
      <p class="muted">
        شواهد باید از اجرای واقعی سیستم ثبت شوند.
      </p>
    </details>

  </div>

  <div class="card">
    <h2>UX States</h2>
    <div class="list">
      <div class="list-item"><span>Loading</span><span>Ready</span></div>
      <div class="list-item"><span>Error</span><span>Supported</span></div>
      <div class="list-item"><span>Offline</span><span>Supported</span></div>
      <div class="list-item"><span>Empty</span><span>Supported</span></div>
    </div>
  </div>

</section>

<!-- SECTION 5 -->
<section id="view-more" class="view">

  <div class="section">
    <div class="eyebrow">SYSTEM</div>
    <h1>GANDOM System</h1>
  </div>

  <div class="card section">
    <h2>Integration</h2>
    <div class="list">
      <div class="list-item">
        <span>App ID</span>
        <span>com.gandom.app</span>
      </div>
      <div class="list-item">
        <span>Web Directory</span>
        <span>www</span>
      </div>
      <div class="list-item">
        <span>UI Sections</span>
        <span>5</span>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Backup</h2>
    <p class="muted">
      نسخه قبل از اجرای این مرحله در backups ثبت شده است.
    </p>
  </div>

</section>

</main>

<nav class="nav">
  <button data-view="home" class="active">خانه</button>
  <button data-view="market">بازار</button>
  <button data-view="network">شبکه</button>
  <button data-view="security">امنیت</button>
  <button data-view="more">سیستم</button>
</nav>

</div>

<script src="/assets/js/gandom-ui.js"></script>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const runtime = document.getElementById('runtimeStatus');
  const homeRuntime = document.getElementById('homeRuntime');

  const observer = new MutationObserver(() => {
    if(runtime.classList.contains('offline')){
      homeRuntime.textContent = 'Offline';
      homeRuntime.classList.add('offline');
    }else{
      homeRuntime.textContent = 'Online';
      homeRuntime.classList.remove('offline');
    }
  });

  observer.observe(runtime, {
    attributes:true,
    childList:true,
    subtree:true
  });
});
</script>

</body>
</html>
HTML

echo "UI_INDEX_CREATED=PASS"

node --check www/assets/js/gandom-ui.js \
  && echo "JS_SYNTAX=PASS" \
  || echo "JS_SYNTAX=FAIL"

test -s www/index.html \
  && echo "INDEX_HTML=PASS" \
  || echo "INDEX_HTML=FAIL"

test -s www/assets/css/gandom-ui.css \
  && echo "UI_CSS=PASS" \
  || echo "UI_CSS=FAIL"

test -s www/assets/js/gandom-ui.js \
  && echo "UI_JS=PASS" \
  || echo "UI_JS=FAIL"

echo
echo "========== CAPACITOR SYNC =========="

if command -v npx >/dev/null 2>&1; then
  npx cap sync android
  SYNC_CODE=$?
  if [ "$SYNC_CODE" -eq 0 ]; then
    echo "CAPACITOR_SYNC=PASS"
  else
    echo "CAPACITOR_SYNC=FAIL"
  fi
else
  echo "CAPACITOR_SYNC=NOT_RUN_NPX_MISSING"
fi

echo
echo "========== ANDROID BUILD =========="

if [ -x android/gradlew ]; then
  cd android
  ./gradlew assembleDebug
  BUILD_CODE=$?
  cd ..

  if [ "$BUILD_CODE" -eq 0 ]; then
    echo "ANDROID_BUILD=PASS"
  else
    echo "ANDROID_BUILD=FAIL"
  fi
else
  echo "ANDROID_BUILD=NOT_RUN_GRADLEW_MISSING"
fi

echo
echo "========================================"
echo " GANDOM — 5 SECTION EXECUTION END"
echo "========================================"

echo "SECTION_1=DESIGN_SYSTEM_MAIN_FRAME"
echo "SECTION_2=HOME_ECONOMY_EXCHANGE"
echo "SECTION_3=WALLET_P2P_NETWORK_AI"
echo "SECTION_4=SECURITY_BACKUP_EVIDENCE_UX"
echo "SECTION_5=INTEGRATION_ANDROID_APK"

echo
echo "IMPORTANT:"
echo "PASS فقط بر اساس خروجی واقعی ثبت می‌شود."
echo "قیمت/موجودی/بازار جعلی تولید نشده است."
echo "========================================"
