#!/data/data/com.termux/files/usr/bin/bash

# GANDOM LAW 2558
# Resilient boot: missing optional web service must not block others.

cd "$HOME/gandom" 2>/dev/null || cd "$PWD"
mkdir -p logs

echo "=== GANDOM CLEAN BOOT — LAW 2558 ==="

NODE="$(command -v node)"
CURL="$(command -v curl)"

if [ -z "$NODE" ] || [ -z "$CURL" ]; then
  echo "[FAIL] node or curl is unavailable"
  ps -ef | grep '[n]ode'
  exit 1
fi

# 1. Stop only identifiable GANDOM service processes.
echo "[1] Stopping existing GANDOM service processes..."

for pid in $(ps -ef | awk '
  /node-b-persistent\.js|node-b-health-wrapper\.js|audit-service\/server\.js|wallet-server-wrapper\.js/ &&
  !/awk/ && !/gandom-total-victory-fix\.sh/ {print $2}
'); do
  [ -n "$pid" ] || continue
  cmd="$(tr '\000' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
  case "$cmd" in
    *node*)
      echo "[STOP] PID=$pid $cmd"
      kill -9 "$pid" 2>/dev/null || true
      ;;
  esac
done

sleep 3

# 2. Generate the Node B HTTP wrapper.
echo "[2] Generating Node B wrapper..."

cat > node-b-health-wrapper.js <<'NODEEOF'
'use strict';

const http = require('http');
const path = require('path');

let p2pLoaded = false;
let p2pError = null;

try {
  require(path.join(__dirname, 'node-b-persistent.js'));
  p2pLoaded = true;
  console.log('[NODE-B] P2P module loaded');
} catch (err) {
  p2pError = err && err.message ? err.message : String(err);
  console.error('[NODE-B] P2P module load failed:', p2pError);
}

process.on('uncaughtException', (err) => {
  console.error('[NODE-B] uncaughtException:', err.stack || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[NODE-B] unhandledRejection:', reason);
});

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET' && req.url.split('?')[0] === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: 'ok',
      node: 'B',
      service: 'GANDOM-NODE-B',
      p2p_module_loaded: p2pLoaded,
      p2p_load_error: p2pError,
      timestamp: new Date().toISOString()
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ status: 'not_found' }));
});

server.on('error', (err) => {
  console.error('[NODE-B] HTTP server error:', err.stack || err);
  process.exitCode = 1;
});

server.listen(8788, '127.0.0.1', () => {
  console.log('[NODE-B] HTTP_READY 127.0.0.1:8788');
});
NODEEOF

"$NODE" --check node-b-health-wrapper.js || \
  echo "[WARN] Node B wrapper syntax check failed"

# 3. Start Node A if its entry file exists.
echo "[3] Starting Node A..."
if [ -f server.js ]; then
  nohup "$NODE" server.js > logs/nodeA.log 2>&1 < /dev/null &
  echo "$!" > logs/nodeA.pid
else
  echo "[WARN] server.js missing; Node A not started"
fi

# 4. Start Node B wrapper.
echo "[4] Starting Node B wrapper..."
nohup "$NODE" node-b-health-wrapper.js \
  > logs/node-b-wrapper.log 2>&1 < /dev/null &
echo "$!" > logs/nodeB.pid

# 5. Start Audit if available.
echo "[5] Starting Audit..."
if [ -f audit-service/server.js ]; then
  nohup "$NODE" audit-service/server.js \
    > logs/audit.log 2>&1 < /dev/null &
  echo "$!" > logs/audit.pid
else
  echo "[WARN] audit-service/server.js missing; Audit not started"
fi

# 6. Start Wallet wrapper if available.
echo "[6] Starting Wallet..."
if [ -f wallet-server-wrapper.js ]; then
  nohup "$NODE" wallet-server-wrapper.js \
    > logs/wallet-wrapper.log 2>&1 < /dev/null &
  echo "$!" > logs/wallet.pid
else
  echo "[WARN] wallet-server-wrapper.js missing; Wallet not started"
fi

# 7. Web UI is optional. Do not assume a filename.
echo "[7] Checking optional Web UI..."
WEB_STARTED=0
for file in server-web.js web-server.js; do
  if [ -f "$file" ]; then
    nohup "$NODE" "$file" > logs/web.log 2>&1 < /dev/null &
    echo "$!" > logs/web.pid
    echo "[INFO] Web UI started from $file"
    WEB_STARTED=1
    break
  fi
done

if [ "$WEB_STARTED" -eq 0 ]; then
  echo "[WARN] Separate Web UI entry file not found; checking port 8080 anyway"
fi

echo "[WAIT] Waiting 5 seconds..."
sleep 5

# 8. Real HTTP checks.
echo "[8] Checking HTTP endpoints..."
FAILURES=0

check_http() {
  name="$1"
  url="$2"
  output="logs/${name}-health-response.txt"

  code="$("$CURL" -sS -o "$output" -w '%{http_code}' \
    --connect-timeout 2 --max-time 5 "$url" 2>/dev/null || true)"

  if [ "$code" = "200" ]; then
    echo "[PASS] $name HTTP 200 ($url)"
  else
    echo "[FAIL] $name HTTP $code ($url)"
    FAILURES=$((FAILURES + 1))
  fi
}

check_http nodeA  http://127.0.0.1:8787/health
check_http nodeB  http://127.0.0.1:8788/health
check_http audit  http://127.0.0.1:8888/health
check_http wallet http://127.0.0.1:9000/health

# Port 8080 is checked independently; absence of separate Web UI is not fatal.
WEB_CODE="$("$CURL" -sS -o logs/web-health-response.txt -w '%{http_code}' \
  --connect-timeout 2 --max-time 5 http://127.0.0.1:8080/ 2>/dev/null || true)"

if [ "$WEB_CODE" = "200" ]; then
  echo "[PASS] web HTTP 200"
  WEB_OK=1
else
  echo "[WARN] web HTTP $WEB_CODE (8080)"
  WEB_OK=0
fi

# 9. Record exactly what was measured.
timestamp="$("$NODE" -p 'new Date().toISOString()')"

if [ "$FAILURES" -eq 0 ]; then
  if [ "$WEB_OK" -eq 1 ]; then
    cat > GANDOM-VICTORY.json <<EOFJSON
{
  "status": "HTTP_HEALTH_PASS",
  "law": 2558,
  "timestamp": "$timestamp",
  "services": {
    "nodeA": "200",
    "nodeB": "200",
    "audit": "200",
    "wallet": "200",
    "web": "200"
  },
  "p2p_independently_verified": false,
  "production_approval": false
}
EOFJSON
  else
    cat > GANDOM-VICTORY.json <<EOFJSON
{
  "status": "CORE_HTTP_HEALTH_PASS",
  "law": 2558,
  "timestamp": "$timestamp",
  "services": {
    "nodeA": "200",
    "nodeB": "200",
    "audit": "200",
    "wallet": "200",
    "web": "$WEB_CODE"
  },
  "p2p_independently_verified": false,
  "production_approval": false
}
EOFJSON
  fi
  echo "[INFO] HTTP results recorded in GANDOM-VICTORY.json"
else
  cat > GANDOM-VICTORY.json <<EOFJSON
{
  "status": "FAIL",
  "law": 2558,
  "timestamp": "$timestamp",
  "core_http_failures": $FAILURES,
  "web_http": "$WEB_CODE"
}
EOFJSON
  echo "[FAIL] $FAILURES required HTTP checks failed"
fi

echo
echo "=== NODE B LOG ==="
tail -n 30 logs/node-b-wrapper.log 2>/dev/null || true

echo
echo "=== GANDOM-VICTORY.json ==="
cat GANDOM-VICTORY.json 2>/dev/null || true

echo
echo "=== FINAL PROCESS LIST: ps -ef | grep node ==="
ps -ef | grep '[n]ode' || true

if [ "$FAILURES" -ne 0 ]; then
  exit 1
fi
