#!/data/data/com.termux/files/usr/bin/bash
set -u

cd "$HOME/gandom" || exit 1
mkdir -p logs

NODE="$(command -v node)" || {
  echo "[FAIL] Node.js is unavailable"
  exit 1
}
CURL="$(command -v curl)" || {
  echo "[FAIL] curl is unavailable"
  exit 1
}

# انتخاب فقط از میان فایل‌های واقعی موجود
choose_file() {
  local file
  for file in "$@"; do
    if [ -f "$file" ]; then
      printf '%s' "$file"
      return 0
    fi
  done
  return 1
}

NODE_A_FILE="$(choose_file server.js)" || {
  echo "[FAIL] Node A entry file server.js not found"
  exit 1
}

NODE_B_FILE="$(choose_file node-b-health-wrapper.js)" || {
  echo "[FAIL] Node B wrapper not found"
  exit 1
}

AUDIT_FILE="$(choose_file audit-service/server.js)" || {
  echo "[FAIL] audit-service/server.js not found"
  exit 1
}

WEB_FILE="$(choose_file server-web.js web-server.js)" || {
  echo "[FAIL] No supported Web UI entry file found (server-web.js/web-server.js)"
  echo "[INFO] Inspect project files before selecting the correct entry point."
  exit 1
}

WALLET_FILE="$(choose_file wallet-server-wrapper.js)" || {
  echo "[FAIL] wallet-server-wrapper.js not found"
  exit 1
}

# بررسی نحو فایل‌ها پیش از تغییر وضعیت سرویس‌ها
for file in "$NODE_A_FILE" "$NODE_B_FILE" "$AUDIT_FILE" "$WEB_FILE" "$WALLET_FILE"; do
  if ! "$NODE" --check "$file"; then
    echo "[FAIL] Syntax error: $file"
    exit 1
  fi
done

# فقط پورت‌های متعلق به این پنج سرویس بررسی می‌شوند.
# هیچ فایل داده‌ای حذف نمی‌شود.
PORTS=(8787 8788 8888 8080 9000)

port_pids() {
  local port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$port" 2>/dev/null |
      tr ' ' '\n' |
      grep -E '^[0-9]+$' |
      sort -u || true
  fi
}

echo "[1/5] Stopping processes currently owning target ports..."

PIDS=""
for port in "${PORTS[@]}"; do
  found="$(port_pids "$port")"
  [ -z "$found" ] || PIDS="$PIDS $found"
done

PIDS="$(printf '%s\n' $PIDS 2>/dev/null | grep -E '^[0-9]+$' | sort -u || true)"

if [ -n "$PIDS" ]; then
  # بررسی فرمان پردازش پیش از توقف؛ پردازش‌های غیر Node دست‌نخورده می‌مانند.
  for pid in $PIDS; do
    cmdline="$(tr '\000' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
    case "$cmdline" in
      *node*|*nodejs*)
        echo "[STOP] PID=$pid $cmdline"
        kill "$pid" 2>/dev/null || true
        ;;
      *)
        echo "[WARN] PID=$pid on a target port is not identified as Node; not killing it."
        ;;
    esac
  done
fi

sleep 2

start_service() {
  local name="$1"
  local file="$2"
  local log="$3"

  echo "[START] $name -> $file"
  nohup "$NODE" "$file" >> "$log" 2>&1 </dev/null &
  echo "$!" > "logs/${name}.pid"
}

start_service nodeA "$NODE_A_FILE" logs/nodeA.log
start_service nodeB "$NODE_B_FILE" logs/node-b-wrapper.log
start_service audit "$AUDIT_FILE" logs/audit.log
start_service web "$WEB_FILE" logs/web.log
start_service wallet "$WALLET_FILE" logs/wallet-wrapper.log

echo "[WAIT] Waiting 5 seconds..."
sleep 5

check_http() {
  local name="$1"
  local url="$2"
  local code

  code="$("$CURL" -sS -o "logs/${name}-health-response.txt" \
    -w '%{http_code}' --max-time 4 "$url" 2>/dev/null || true)"

  if [ "$code" = "200" ]; then
    echo "[PASS] $name HTTP 200 ($url)"
    return 0
  fi

  echo "[FAIL] $name HTTP=$code ($url)"
  return 1
}

echo "[2/5] Checking all five HTTP endpoints..."

failures=0

check_http nodeA  http://127.0.0.1:8787/health || failures=$((failures + 1))
check_http nodeB  http://127.0.0.1:8788/health || failures=$((failures + 1))
check_http audit  http://127.0.0.1:8888/health || failures=$((failures + 1))
check_http web    http://127.0.0.1:8080/ || failures=$((failures + 1))
check_http wallet http://127.0.0.1:9000/health || failures=$((failures + 1))

echo "[3/5] Checking Node B health payload..."
if "$CURL" -fsS --max-time 4 http://127.0.0.1:8788/health \
  | grep -q '"node":"B"'; then
  echo "[PASS] Node B identifies itself as B"
else
  echo "[FAIL] Node B health payload is missing expected identity"
  failures=$((failures + 1))
fi

echo "[4/5] Recording measured HTTP results..."

if [ "$failures" -eq 0 ]; then
  cat > GANDOM-VICTORY.json <<EOFJSON
{
  "status": "HTTP_HEALTH_PASS",
  "timestamp": "$("$NODE" -p 'new Date().toISOString()')",
  "services": {
    "nodeA": "200",
    "nodeB": "200",
    "audit": "200",
    "web": "200",
    "wallet": "200"
  },
  "p2p_independently_verified": false,
  "production_approval": false,
  "law": 2558
}
EOFJSON

  echo
  echo "============================================================"
  echo "       GANDOM — FIVE HTTP ENDPOINTS RESPONDED 200"
  echo "============================================================"
  echo "[PASS] HTTP health checks completed."
  echo "[INFO] This does NOT prove a live P2P handshake or production readiness."
  echo "[INFO] Node B health payload:"
  cat logs/nodeB-health-response.txt 2>/dev/null || \
    "$CURL" -fsS http://127.0.0.1:8788/health
  echo
  echo "[INFO] Evidence written to GANDOM-VICTORY.json"
else
  cat > GANDOM-VICTORY.json <<EOFJSON
{
  "status": "FAIL",
  "timestamp": "$("$NODE" -p 'new Date().toISOString()')",
  "http_check_failures": $failures,
  "law": 2558
}
EOFJSON

  echo
  echo "[FAIL] $failures HTTP/identity checks failed."
  echo "[INFO] Inspect logs in ./logs/ and GANDOM-VICTORY.json"
  exit 1
fi

echo "[5/5] Boot script finished."
