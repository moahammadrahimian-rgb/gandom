#!/data/data/com.termux/files/usr/bin/bash
set -u

# قانون مادر ۲۵۵۸: ثبت خطا، حفظ داده و توقف در شکست.
# LAW 2558: Capture errors, preserve data, and stop on failure.

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

mkdir -p logs runtime-logs

echo "=== GANDOM STRICT BOOT / LAW 2558 ==="
echo "TIME=$(date -Iseconds)"
echo "ROOT=$ROOT"

# مرحلهٔ اول: تعمیر داده باید قبل از راه‌اندازی موفق شود.
# Phase 1: Repair and validate data before starting services.
if ! node gandom-force-sync-and-repair.js \
    > logs/force-sync.log 2>&1; then
  echo "FATAL=DATA_REPAIR_FAILED"
  tail -n 40 logs/force-sync.log
  echo "PASS_REAL=NOT_ESTABLISHED"
  exit 1
fi

echo "DATA_REPAIR=OK"

# بررسی وجود فایل‌های اجرایی / Verify entry-point files.
declare -A ENTRY
declare -A PORT
declare -A LOG

ENTRY[node-a]="server.js"
PORT[node-a]=8787
LOG[node-a]="logs/node-a.log"

ENTRY[node-b]="node-b-persistent.js"
PORT[node-b]=8788
LOG[node-b]="logs/node-b.log"

ENTRY[wallet]="wallet/GANDOM-WALLET-2558.js"
PORT[wallet]=9000
LOG[wallet]="logs/wallet.log"

# مسیر Audit از فایل‌های واقعی پروژه کشف می‌شود؛ مسیر حدسی اجرا نمی‌شود.
# Discover the real audit entry point instead of guessing.
AUDIT_ENTRY=""
for candidate in audit-service/server.js audit/server.js; do
  if [ -f "$candidate" ]; then
    AUDIT_ENTRY="$candidate"
    break
  fi
done

if [ -z "$AUDIT_ENTRY" ]; then
  echo "AUDIT_ENTRY_NOT_FOUND=1"
  echo "Search: find . -maxdepth 3 -name server.js -type f"
  echo "PASS_REAL=NOT_ESTABLISHED"
  exit 1
fi

ENTRY[audit]="$AUDIT_ENTRY"
PORT[audit]=8888
LOG[audit]="logs/audit.log"

# کنترل وابستگی‌ها بدون تغییر خودکار / Check dependencies without auto-install.
if [ ! -d node_modules/ws ]; then
  echo "DEPENDENCY_MISSING=ws"
  echo "Run npm install only after reviewing package.json and lockfile."
  echo "PASS_REAL=NOT_ESTABLISHED"
  exit 1
fi

# فقط فرایندهای متعلق به همین پروژه شناسایی می‌شوند.
# Stop only processes whose command line points to this project.
for pid in $(pgrep -f "$ROOT/(server.js|node-b-persistent.js|wallet/GANDOM-WALLET-2558.js|audit-service/server.js)" 2>/dev/null || true); do
  if [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ]; then
    echo "STOP_OWN_PROJECT_PID=$pid"
    kill "$pid" 2>/dev/null || true
  fi
done

sleep 1

# راه‌اندازی ترتیبی و ثبت stdout/stderr هر سرویس.
# Start services sequentially and capture each service's output.
for service in node-a node-b wallet audit; do
  entry="${ENTRY[$service]}"
  logfile="${LOG[$service]}"
  port="${PORT[$service]}"

  if [ ! -f "$entry" ]; then
    echo "ENTRY_MISSING=$entry"
    echo "PASS_REAL=NOT_ESTABLISHED"
    exit 1
  fi

  echo "--- START $service: $entry ---"
  nohup node "$entry" >> "$logfile" 2>&1 &
  pid=$!
  echo "$pid" > "logs/$service.pid"
  echo "PID_$service=$pid"

  # سه ثانیه برای آشکارشدن خطای اولیه / Allow initial startup errors to appear.
  sleep 3

  code="$(curl -sS --connect-timeout 2 --max-time 4 \
    -o /dev/null -w '%{http_code}' \
    "http://127.0.0.1:$port/health" 2>/dev/null || true)"

  echo "HTTP_$service=$code"

  if [ "$code" = "000" ]; then
    echo "SERVICE_FAILED=$service"
    echo "--- LAST 40 LINES: $logfile ---"
    tail -n 40 "$logfile" 2>/dev/null || true
    echo "PASS_REAL=NOT_ESTABLISHED"
    exit 1
  fi
done

# سرویس وب در صورت وجود، جداگانه بررسی می‌شود.
# Check the web UI if its server is already configured.
webcode="$(curl -sS --connect-timeout 2 --max-time 4 \
  -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:8080/ 2>/dev/null || true)"
echo "HTTP_web_ui=$webcode"

echo "=== CHAIN HASH VERIFICATION ==="
sha256sum blockchain-data/chain.json blockchain-data-b/chain.json

hash_a="$(sha256sum blockchain-data/chain.json | awk '{print $1}')"
hash_b="$(sha256sum blockchain-data-b/chain.json | awk '{print $1}')"

if [ "$hash_a" != "$hash_b" ]; then
  echo "CHAIN_SYNC=FAIL"
  echo "PASS_REAL=NOT_ESTABLISHED"
  exit 1
fi

echo "CHAIN_FILE_HASH_MATCH=1"
echo "FILES_MODIFIED=$(node -e \
  "try{console.log(require('./FORCE_SYNC_PROOF.json').filesModified)}catch(e){console.log('UNKNOWN')}")"

# HTTP و هش یکسان به‌تنهایی اثبات اجماع زنده نیستند.
# HTTP success and matching hashes do not prove live consensus.
echo "BOOT_CHECKS=PASS"
echo "PASS_REAL=NOT_ESTABLISHED"
echo "Reason: live P2P handshake and wallet operation still require independent tests."
