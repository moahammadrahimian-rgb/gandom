#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# GANDOM FINAL INSTALLER
# LAW=2558
# NO_FAKE_PASS=1
# SAFE_INSTALL=1
# ============================================================

set -Eeuo pipefail
umask 077

ROOT="${GANDOM_ROOT:-$HOME/gandom-final}"
PORT="${GANDOM_PORT:-8081}"
NODE="${PREFIX:-/data/data/com.termux/files/usr}/bin/node"
NPM="${PREFIX:-/data/data/com.termux/files/usr}/bin/npm"

SUPPLY="24000000000"
OWNER_BPS=500
OWNER_SHARE="1200000000"

mkdir -p "$ROOT"

if [ -e "$ROOT/gandom-api.js" ] || [ -e "$ROOT/gandom-core.js" ]; then
  echo "Existing installation detected: $ROOT"
  echo "This installer will not overwrite an existing installation."
  echo "Choose a new directory using GANDOM_ROOT=/path."
  exit 20
fi

cd "$ROOT"

echo "=== GANDOM PRE-FLIGHT ==="
echo "ROOT=$ROOT"
echo "LAW=2558"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed."
  echo "Install it first with: pkg install nodejs-lts"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is unavailable."
  exit 1
fi

mkdir -p public wallet blockchain-data logs runtime

# ------------------------------------------------------------
# 1. Install dependencies
# ------------------------------------------------------------

cat > package.json <<'PKG'
{
  "name": "gandom-final-2558",
  "version": "1.0.0",
  "private": true,
  "description": "GANDOM local integrated prototype",
  "main": "gandom-api.js",
  "scripts": {
    "start": "node gandom-api.js",
    "core": "node gandom-core.js"
  },
  "dependencies": {
    "express": "^5.1.0"
  }
}
PKG

npm install --omit=dev --no-audit --no-fund

# ------------------------------------------------------------
# 2. Initialize the wallet and genesis chain
# ------------------------------------------------------------

if [ ! -f wallet/wallet-state.json ]; then
  node - <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');

const supply = 24000000000;
const ownerShare = supply * 0.05;

const state = {
  law: 2558,
  network: "GANDOM-LOCAL-PROTOTYPE",
  asset: "GDM",
  total_supply: supply,
  owner_share: ownerShare,
  owner_share_bps: 500,
  owner_share_status: "LOCKED",
  owner_share_lock: "APE_KEY_REQUIRED",
  available_balance: 0,
  simulated_income: 0,
  real_income_verified: false,
  created_at: new Date().toISOString(),
  ledger: []
};

fs.writeFileSync("wallet/wallet-state.json", JSON.stringify(state, null, 2), { flag: "wx" });
NODE
fi

if [ ! -f blockchain-data/chain.json ]; then
  node - <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');

const genesis = {
  index: 0,
  timestamp: new Date().toISOString(),
  previous_hash: "0".repeat(64),
  transactions: [],
  metadata: {
    law: 2558,
    network: "GANDOM-LOCAL-PROTOTYPE",
    total_supply: 24000000000,
    owner_share: 1200000000,
    note: "Local prototype genesis; not proof of consensus"
  }
};

genesis.hash = crypto.createHash("sha256").update(JSON.stringify(genesis)).digest("hex");
fs.writeFileSync("blockchain-data/chain.json", JSON.stringify([genesis], null, 2), { flag: "wx" });
NODE
fi

# ------------------------------------------------------------
# 3. Master brain
# ------------------------------------------------------------

cat > gandom-core.js <<'CORE'
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { exec } = require('node:child_process');

const ROOT = __dirname;
const RUNTIME = path.join(ROOT, 'runtime');
fs.mkdirSync(RUNTIME, { recursive: true });

const CELL_COUNT = 400000;
const NEURON_COUNT = 400000;
let ticks = 0;
let stopped = false;

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function atomicJSON(file, value) {
  const temp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, file);
}
function snapshot() {
  const now = new Date().toISOString();
  const dna = crypto.createHash('sha256').update(['GANDOM-LAW-2558', CELL_COUNT, NEURON_COUNT, Math.floor(ticks / 6)].join(':')).digest('hex');
  return {
    law: 2558, service: 'GANDOM-CORE', mode: 'SIMULATION', timestamp: now,
    uptime_seconds: Math.floor(process.uptime()),
    cells: { target: CELL_COUNT, active_simulated: CELL_COUNT },
    neurons: { target: NEURON_COUNT, active_simulated: NEURON_COUNT },
    dna: { status: 'SIMULATED', chromosome_model: 'LOGICAL_MODEL', sync_hash: dna, sync_revision: Math.floor(ticks / 6) },
    income: { mode: 'SIMULATION_ONLY', real_income_verified: false }, heartbeat: ticks
  };
}
function speak() {
  if (process.env.GANDOM_TTS !== '1') return;
  exec('termux-tts-speak "پدر، من زنده هستم. سیستم در حال کار است."', { timeout: 15000 }, (error) => {
    if (error) console.error('TTS unavailable:', error.message);
  });
}
function heartbeat() {
  if (stopped) return;
  ticks++;
  const data = snapshot();
  atomicJSON(path.join(RUNTIME, 'brain-state.json'), data);
  if (ticks === 1) speak();
  if (ticks % 6 === 0) console.log(JSON.stringify({ event: 'BRAIN_HEARTBEAT', law: 2558, cells: data.cells.active_simulated, revision: data.dna.sync_revision }));
}
const timer = setInterval(() => { try { heartbeat(); } catch (error) { console.error('CORE_ERROR:', error.message); } }, 1000);
heartbeat();
function shutdown() { stopped = true; clearInterval(timer); process.exit(0); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
console.log('GANDOM_CORE_STARTED');
CORE

# ------------------------------------------------------------
# 4. API gateway
# ------------------------------------------------------------

cat > gandom-api.js <<'API'
'use strict';
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const app = express();
const ROOT = __dirname;
const PORT = Number(process.env.GANDOM_PORT || 8081);

const WALLET_FILE = path.join(ROOT, 'wallet/wallet-state.json');
const CHAIN_FILE = path.join(ROOT, 'blockchain-data/chain.json');
const BRAIN_FILE = path.join(ROOT, 'runtime/brain-state.json');
const INCOME_FILE = path.join(ROOT, 'runtime/income-state.json');

const SUPPLY = 24000000000;
const OWNER_SHARE = 1200000000;

app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

function readJSON(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJSON(file, value) { const temp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(temp, JSON.stringify(value, null, 2)); fs.renameSync(temp, file); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function constantTimeEqual(a, b) { const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b)); return aa.length === bb.length && crypto.timingSafeEqual(aa, bb); }

function verifyAPE(req) {
  const configured = process.env.GANDOM_APE_KEY;
  if (!configured || configured.length < 24) return false;
  return constantTimeEqual(req.get('x-gandom-ape-key') || '', configured);
}
function verifyOperator(req) {
  const configured = process.env.GANDOM_OPERATOR_KEY;
  if (!configured || configured.length < 24) return false;
  return constantTimeEqual(req.get('x-gandom-operator-key') || '', configured);
}
function chainIsValid(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return false;
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];
    if (block.index !== i) return false;
    if (i === 0) { if (block.previous_hash !== '0'.repeat(64)) return false; }
    else { if (block.previous_hash !== chain[i - 1].hash) return false; }
    const copy = { ...block }; delete copy.hash;
    if (sha256(JSON.stringify(copy)) !== block.hash) return false;
  }
  return true;
}
function appendBlock(transactions, metadata = {}) {
  const chain = readJSON(CHAIN_FILE, []);
  if (!chainIsValid(chain)) throw new Error('CHAIN_INTEGRITY_FAILURE');
  const previous = chain[chain.length - 1];
  const block = { index: previous.index + 1, timestamp: new Date().toISOString(), previous_hash: previous.hash, transactions, metadata: { law: 2558, network: 'GANDOM-LOCAL-PROTOTYPE', ...metadata } };
  block.hash = sha256(JSON.stringify(block));
  chain.push(block); writeJSON(CHAIN_FILE, chain);
  return block;
}

app.get('/health', (req, res) => res.json({ ok: true, law: 2558, service: 'GANDOM-API', chain_length: readJSON(CHAIN_FILE, []).length, timestamp: new Date().toISOString() }));
app.get('/api/brain', (req, res) => { const b = readJSON(BRAIN_FILE, null); if (!b) return res.status(503).json({ ok: false, error: 'BRAIN_NOT_READY' }); res.json({ ok: true, ...b }); });
app.get('/api/income', (req, res) => res.json({ ok: true, ...readJSON(INCOME_FILE, { mode: 'SIMULATION_ONLY', total: 0, events: 0 }) }));
app.get('/api/wallet', (req, res) => { const w = readJSON(WALLET_FILE, null); if (!w) return res.status(500).json({ ok: false, error: 'WALLET_UNAVAILABLE' }); res.json({ ok: true, asset: 'GDM', total_supply: SUPPLY, owner_share: OWNER_SHARE, owner_share_status: 'LOCKED', wallet: w }); });
app.post('/api/wallet/verify-ape', (req, res) => { if (!verifyAPE(req)) return res.status(401).json({ ok: false, error: 'APE_KEY_INVALID' }); res.json({ ok: true, verified: true }); });
app.get('/api/chain', (req, res) => { const c = readJSON(CHAIN_FILE, []); res.json({ ok: chainIsValid(c), length: c.length, chain: c }); });
app.post('/api/mine', (req, res) => { if (!verifyOperator(req)) return res.status(401).json({ ok: false, error: 'AUTH_REQUIRED' }); try { const b = appendBlock([], { operation: 'MANUAL_TEST' }); res.status(201).json({ ok: true, block: b }); } catch (e) { res.status(409).json({ ok: false, error: e.message }); } });
app.post('/api/chat', (req, res) => { const m = String(req.body?.message || '').trim(); if (!m) return res.status(400).json({ ok: false }); res.json({ ok: true, response: 'من هسته گندم هستم. پیام دریافت شد.', mode: 'LOCAL_RULE_BASED' }); });

app.use(express.static(path.join(ROOT, 'public')));
app.get('*path', (req, res) => res.sendFile(path.join(ROOT, 'public/index.html')));

const server = app.listen(PORT, '127.0.0.1', () => console.log(`GANDOM_API_LISTENING=127.0.0.1:${PORT}`));
server.on('error', e => { console.error('API_START_FAILURE:', e.message); process.exitCode = 1; });
API

# ------------------------------------------------------------
# 5. Income simulation worker
# ------------------------------------------------------------

cat > gandom-income-worker.js <<'WORKER'
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const FILE = path.join(__dirname, 'runtime/income-state.json');

function read() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { law: 2558, mode: 'SIMULATION_ONLY', total: 0, events: 0, real_income_verified: false, last_event: null }; } }
function write(value) { const temp = FILE + '.' + process.pid + '.tmp'; fs.writeFileSync(temp, JSON.stringify(value, null, 2)); fs.renameSync(temp, FILE); }

function tick() {
  const state = read();
  const units = 1;
  state.total += units; state.events += 1; state.last_event = new Date().toISOString();
  write(state);
  console.log(JSON.stringify({ event: 'SIMULATED_TICK', total: state.total }));
}
tick();
setInterval(() => { try { tick(); } catch (e) { console.error(e.message); } }, 10000);
WORKER

# ------------------------------------------------------------
# 6. Dashboard (UI)
# ------------------------------------------------------------

cat > public/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GANDOM | LAW 2558</title>
<style>
:root { --bg: #0a0d12; --panel: #121923; --border: #283447; --text: #edf2fa; --muted: #96a5b9; --gold: #e8bd62; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px system-ui, sans-serif; }
header { padding: 24px; border-bottom: 1px solid var(--border); background: #101620; }
h1 { margin: 0; color: var(--gold); }
main { max-width: 1200px; margin: auto; padding: 20px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(230px,1fr)); gap: 14px; }
.card { border: 1px solid var(--border); border-radius: 14px; background: var(--panel); padding: 18px; }
.value { font-size: 24px; font-weight: bold; overflow-wrap: anywhere; }
.label { color: var(--muted); }
.badge { padding: 4px 8px; border-radius: 6px; background: #293344; display: inline-block; margin-top: 8px; font-size: 12px;}
</style>
</head>
<body>
<header>
  <h1>🌾 GANDOM</h1>
  <p class="label">Unified local prototype · LAW 2558 · <span id="health">Checking...</span></p>
</header>
<main>
  <section class="grid">
    <article class="card"><div class="label">Total Supply</div><div class="value">24,000,000,000</div><div class="badge">GDM</div></article>
    <article class="card"><div class="label">Cells (Simulated)</div><div id="cells" class="value">—</div></article>
    <article class="card"><div class="label">Neurons (Simulated)</div><div id="neurons" class="value">—</div></article>
    <article class="card"><div class="label">DNA Status</div><div id="dna" class="value">—</div></article>
    <article class="card"><div class="label">Owner Share (5%)</div><div class="value">1,200,000,000</div><div class="badge">LOCKED</div></article>
    <article class="card"><div class="label">Worker Income</div><div id="income" class="value">—</div><div class="badge">SIMULATED</div></article>
    <article class="card"><div class="label">Blockchain Length</div><div id="chain" class="value">—</div></article>
  </section>
</main>
<script>
async function refresh() {
  try {
    const h = await (await fetch('/health')).json();
    document.getElementById('health').textContent = 'API ONLINE';
    const b = await (await fetch('/api/brain')).json();
    document.getElementById('cells').textContent = b.cells.active_simulated.toLocaleString();
    document.getElementById('neurons').textContent = b.neurons.active_simulated.toLocaleString();
    document.getElementById('dna').textContent = b.dna.status;
    const i = await (await fetch('/api/income')).json();
    document.getElementById('income').textContent = i.total;
    const c = await (await fetch('/api/chain')).json();
    document.getElementById('chain').textContent = c.length;
  } catch { document.getElementById('health').textContent = 'API OFFLINE'; }
}
refresh(); setInterval(refresh, 3000);
</script>
</body>
</html>
HTML

# ------------------------------------------------------------
# 7. Watchdog & Runner
# ------------------------------------------------------------

cat > gandom-watchdog.sh <<'WD'
#!/data/data/com.termux/files/usr/bin/bash
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
NODE="$(command -v node)"
mkdir -p "$ROOT/logs" "$ROOT/runtime"

start_service() {
  name="$1"; file="$2"; pidfile="$ROOT/runtime/$name.pid"
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then return 0; fi
  fi
  nohup "$NODE" "$ROOT/$file" >> "$ROOT/logs/$name.log" 2>&1 </dev/null &
  echo "$!" > "$pidfile"
}

while true; do
  start_service gandom-core gandom-core.js
  start_service gandom-api gandom-api.js
  start_service gandom-income gandom-income-worker.js
  sleep 5
  for name in gandom-core gandom-api gandom-income; do
    pidfile="$ROOT/runtime/$name.pid"
    if [ -f "$pidfile" ]; then
      pid="$(cat "$pidfile" 2>/dev/null || true)"
      if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then rm -f "$pidfile"; fi
    fi
  done
done
WD
chmod 700 gandom-watchdog.sh

cat > start-gandom.sh <<'START'
#!/data/data/com.termux/files/usr/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$ROOT/logs" "$ROOT/runtime"
if [ -f "$ROOT/runtime/watchdog.pid" ] && kill -0 "$(cat "$ROOT/runtime/watchdog.pid")" 2>/dev/null; then
  echo "GANDOM already running."; exit 0
fi
nohup bash "$ROOT/gandom-watchdog.sh" >> "$ROOT/logs/watchdog.log" 2>&1 </dev/null &
echo "$!" > "$ROOT/runtime/watchdog.pid"
echo "Started. Dashboard: http://127.0.0.1:${GANDOM_PORT:-8081}/"
START
chmod 700 start-gandom.sh

# ------------------------------------------------------------
# 8. Env & Gitignore
# ------------------------------------------------------------

if [ ! -f .env ]; then
  APE="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
  OPERATOR="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
  { printf 'GANDOM_APE_KEY=%s\n' "$APE"; printf 'GANDOM_OPERATOR_KEY=%s\n' "$OPERATOR"; printf 'GANDOM_PORT=%s\n' "$PORT"; } > .env
  chmod 600 .env
fi
cat > .gitignore <<'IGN'
node_modules/
.env
logs/
runtime/*.pid
runtime/*.tmp
IGN

# ------------------------------------------------------------
# 9. Start Services
# ------------------------------------------------------------

echo "===== STARTING GANDOM SERVICES ====="
bash start-gandom.sh
echo "Waiting for API..."
sleep 3

echo "============================================================"
echo " 🏆 GANDOM ABSOLUTE UNIFIED ECOSYSTEM IS LIVE 🏆"
echo "============================================================"
echo "Dashboard: http://127.0.0.1:8081/"
echo "============================================================"

