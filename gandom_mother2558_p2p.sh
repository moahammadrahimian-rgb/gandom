#!/data/data/com.termux/files/usr/bin/bash

set -u
umask 077

ROOT="$HOME/gandom"
MAIN_PORT=8787
TEST_PORT=8788
RUN_ID="GANDOM-P2P-2558-$(date -u +%Y%m%dT%H%M%SZ)-$$"
EVD="$ROOT/evidence/$RUN_ID"

mkdir -p "$EVD" || exit 1
exec > >(tee -a "$EVD/execution.log") 2>&1

echo "=================================================="
echo "GANDOM | MOTHER LAW 2558 | REAL P2P EXECUTION"
echo "RUN_ID=$RUN_ID"
echo "UTC=$(date -u +%FT%TZ)"
echo "ROOT=$ROOT"
echo "EVIDENCE=$EVD"
echo "=================================================="

cd "$ROOT" || exit 1

# مرحله 1: بررسی پیش‌نیازها و وضعیت گره اصلی
command -v node >/dev/null 2>&1 || {
  echo "BLOCKED: NODE_NOT_FOUND"
  exit 10
}

test -f server.js || {
  echo "BLOCKED: server.js_NOT_FOUND"
  exit 11
}

node --version
npm --version 2>/dev/null || true

echo
echo "===== MAIN NODE HEALTH ====="
MAIN_OK=0

for URL in \
  "http://127.0.0.1:$MAIN_PORT/health" \
  "http://127.0.0.1:$MAIN_PORT/"
do
  echo "URL=$URL"
  if curl --connect-timeout 2 --max-time 5 -sS \
      -D "$EVD/main-headers.txt" "$URL" \
      -o "$EVD/main-response.txt"; then
    cat "$EVD/main-response.txt"
    echo
    MAIN_OK=1
    break
  fi
done

if [ "$MAIN_OK" -ne 1 ]; then
  echo "BLOCKED: MAIN_NODE_HTTP_UNAVAILABLE"
  echo "Existing server was not stopped or restarted."
  exit 12
fi

echo
echo "===== PORT OWNERSHIP ====="
if command -v ss >/dev/null 2>&1; then
  ss -ltn 2>&1 | tee "$EVD/listening-tcp.txt"
else
  echo "ss command unavailable"
fi

# مرحله 2: پورت آزمایشی باید آزاد باشد.
if curl --connect-timeout 1 --max-time 2 -sS \
   "http://127.0.0.1:$TEST_PORT/health" \
   -o "$EVD/preexisting-test-port.txt"; then
  echo "BLOCKED: TEST_PORT_8788_ALREADY_SERVING"
  echo "No process will be killed."
  exit 13
fi

# مرحله 3: ثبت تنظیمات واقعی بدون افشای متغیرهای محیطی
echo
echo "===== NODE CONFIGURATION ====="
grep -nE \
'process\.env\.PORT|PEER_ADDRESS|new WebSocket|httpServer\.listen|HELLO_ACK|PEER_CONNECTED|DATA_ACK' \
server.js > "$EVD/p2p-source-map.txt" 2>&1 || true

cat "$EVD/p2p-source-map.txt"

# مرحله 4: اجرای گره دوم؛ فقط روی پورت آزمایشی
# خروجی و PID مستقل ثبت می‌شود.
echo
echo "===== START SECOND NODE ====="

PORT="$TEST_PORT" \
PEER_ADDRESS="ws://127.0.0.1:$MAIN_PORT" \
NODE_ENV=test \
nohup node "$ROOT/server.js" \
  > "$EVD/secondary-node.log" 2>&1 &

SECOND_PID=$!
echo "$SECOND_PID" > "$EVD/secondary-node.pid"

cleanup() {
  if [ -n "${SECOND_PID:-}" ] &&
     kill -0 "$SECOND_PID" 2>/dev/null; then
    kill -TERM "$SECOND_PID" 2>/dev/null || true
    sleep 1
    if kill -0 "$SECOND_PID" 2>/dev/null; then
      kill -KILL "$SECOND_PID" 2>/dev/null || true
    fi
    echo "SECONDARY_NODE_CLEANED_UP=YES"
  else
    echo "SECONDARY_NODE_ALREADY_EXITED=YES"
  fi
}
trap cleanup EXIT

# مرحله 5: فرصت راه‌اندازی و handshake
i=0
while [ "$i" -lt 15 ]; do
  if ! kill -0 "$SECOND_PID" 2>/dev/null; then
    echo "SECONDARY_NODE_EXITED_EARLY=YES"
    break
  fi

  if curl --connect-timeout 1 --max-time 2 -sS \
      "http://127.0.0.1:$TEST_PORT/health" \
      -o "$EVD/secondary-health.json"; then
    break
  fi

  sleep 1
  i=$((i+1))
done

echo
echo "===== SECONDARY NODE HEALTH ====="
if [ -f "$EVD/secondary-health.json" ]; then
  cat "$EVD/secondary-health.json"
  echo
else
  echo "SECONDARY_HEALTH=UNAVAILABLE"
fi

sleep 5

echo
echo "===== FINAL MAIN HEALTH ====="
curl --connect-timeout 2 --max-time 5 -sS \
  "http://127.0.0.1:$MAIN_PORT/health" \
  -o "$EVD/main-health-final.json" || true
cat "$EVD/main-health-final.json" 2>/dev/null || true
echo

echo
echo "===== FINAL SECONDARY HEALTH ====="
curl --connect-timeout 2 --max-time 5 -sS \
  "http://127.0.0.1:$TEST_PORT/health" \
  -o "$EVD/secondary-health-final.json" || true
cat "$EVD/secondary-health-final.json" 2>/dev/null || true
echo

echo
echo "===== P2P HANDSHAKE EVIDENCE ====="
grep -Ein \
'PEER_CONNECTED|PEER_OUTBOUND|HELLO_ACK|WELCOME|DATA_ACK|WebSocket|ECONNREFUSED|error|Error|EADDRINUSE|uncaught' \
"$EVD/secondary-node.log" || true

echo
echo "===== SECONDARY NODE LOG TAIL ====="
tail -n 80 "$EVD/secondary-node.log" 2>/dev/null || true

echo
echo "===== EVIDENCE CHECKSUMS ====="
find "$EVD" -maxdepth 1 -type f ! -name SHA256SUMS.txt \
  -print0 | sort -z | xargs -0 -r sha256sum \
  > "$EVD/SHA256SUMS.txt"

cat "$EVD/SHA256SUMS.txt"

echo
echo "===== EXECUTION RESULT ====="
echo "RUN_ID=$RUN_ID"
echo "EVIDENCE_DIR=$EVD"
echo "P2P_PASS=NOT_CLAIMED"
echo "Reason: peer counters and handshake evidence must be inspected."
echo "=================================================="
