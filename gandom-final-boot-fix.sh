#!/data/data/com.termux/files/usr/bin/bash

# GANDOM — قانون مادر ۲۵۵۸ / Mother Law 2558
# راه‌اندازی هدفمند و بررسی واقعی سرویس‌ها / Targeted startup and verification
# هیچ فرایند فعالی به‌صورت عمومی متوقف نمی‌شود / Never kill all Node processes.

set -u

ROOT="$HOME/gandom"
LOG_DIR="$ROOT/logs"
REPORT="$ROOT/GANDOM-VICTORY.json"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

mkdir -p "$LOG_DIR"
cd "$ROOT" || exit 1

declare -A PIDS
declare -A LOGS

LOGS[nodeA]="$LOG_DIR/node-a.log"
LOGS[nodeB]="$LOG_DIR/node-b.log"
LOGS[audit]="$LOG_DIR/audit.log"
LOGS[web]="$LOG_DIR/web.log"
LOGS[wallet]="$LOG_DIR/wallet.log"

say()  { printf "${BLUE}[GANDOM]${RESET} %s\n" "$*"; }
ok()   { printf "${GREEN}[PASS]${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${RESET} %s\n" "$*"; }
fail() { printf "${RED}[FAIL]${RESET} %s\n" "$*"; }

port_open() {
  local port="$1"

  timeout 2 bash -c \
    "exec 3<>/dev/tcp/127.0.0.1/$port" \
    >/dev/null 2>&1
}

# Resolve entry files without guessing an absent filename.
# نام واقعی فایل باید وجود داشته باشد.
resolve_file() {
  local candidate

  for candidate in "$@"; do
    if [ -f "$ROOT/$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

# Show package scripts before startup.
# ابتدا دستورات ثبت‌شده در package.json نمایش داده می‌شوند.
say "PACKAGE.JSON SCRIPTS"

if [ -f package.json ]; then
  node -e '
    const fs = require("fs");
    const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
    console.log(JSON.stringify(p.scripts || {}, null, 2));
  ' || {
    fail "Cannot parse package.json"
    exit 1
  }
else
  fail "package.json not found"
  exit 1
fi

# Find actual entry files.
NODE_A_FILE="$(resolve_file server.js || true)"
NODE_B_FILE="$(resolve_file node-b-persistent.js || true)"
AUDIT_FILE="$(resolve_file audit-server.js server-audit.js audit-service/server.js || true)"
WEB_FILE="$(resolve_file server-web.js web-server.js || true)"
WALLET_FILE="wallet-server-wrapper.js"

say "Resolved entry files:"
printf 'Node A: %s\n' "${NODE_A_FILE:-NOT_FOUND}"
printf 'Node B: %s\n' "${NODE_B_FILE:-NOT_FOUND}"
printf 'Audit:  %s\n' "${AUDIT_FILE:-NOT_FOUND}"
printf 'Web:    %s\n' "${WEB_FILE:-NOT_FOUND}"
printf 'Wallet: %s\n' "$WALLET_FILE"

# The HTTP verification route for each service.
# مسیر واقعی هر سرویس باید با کد آن سازگار باشد.
declare -A PORTS
declare -A URLS

PORTS[nodeA]=8787
PORTS[nodeB]=8788
PORTS[audit]=8888
PORTS[web]=8080
PORTS[wallet]=9000

URLS[nodeA]="http://127.0.0.1:8787/health"
URLS[nodeB]="http://127.0.0.1:8788/health"
URLS[audit]="http://127.0.0.1:8888/health"
URLS[web]="http://127.0.0.1:8080/"
URLS[wallet]="http://127.0.0.1:9000/health"

# Verify HTTP status 200, not merely TCP connectivity.
# فقط HTTP 200 پذیرفته می‌شود.
http_200() {
  local url="$1"
  local code

  code="$(curl -sS -o /dev/null -w '%{http_code}' \
    --connect-timeout 2 --max-time 4 "$url" 2>/dev/null || true)"

  [ "$code" = "200" ]
}

# Start one service only when its port is closed.
# اگر پورت باز باشد، فرایند جدید ساخته نمی‌شود.
start_if_needed() {
  local name="$1"
  local entry="$2"
  local port="$3"
  local log="$4"
  local url="$5"

  if [ -z "$entry" ] || [ ! -f "$ROOT/$entry" ]; then
    fail "$name: entry file missing"
    return 1
  fi

  if port_open "$port"; then
    say "$name: TCP $port already open; no duplicate launch"
  else
    say "$name: starting node $entry"

    (
      cd "$ROOT" || exit 1
      exec node "$entry"
    ) >>"$log" 2>&1 &

    PIDS["$name"]=$!
  fi

  sleep 3

  if ! port_open "$port"; then
    fail "$name: TCP port $port CLOSED"
    echo "----- Last 25 lines: $log -----"
    tail -n 25 "$log" 2>/dev/null || true
    echo "--------------------------------"
    return 1
  fi

  if http_200 "$url"; then
    ok "$name: HTTP 200 $url"
    return 0
  fi

  fail "$name: TCP OPEN but expected URL did not return HTTP 200"
  warn "URL tested: $url"
  warn "Check the route defined by the actual service source."
  echo "----- Last 25 lines: $log -----"
  tail -n 25 "$log" 2>/dev/null || true
  echo "--------------------------------"
  return 1
}

# Keep track of the five real checks.
# نتیجه‌ها فقط بر اساس بررسی زنده ثبت می‌شوند.
declare -A RESULTS
for name in nodeA nodeB audit web wallet; do
  RESULTS["$name"]=FAIL
done

# 1. Node A
# اگر Node A از قبل فعال باشد، همان فرایند حفظ می‌شود.
if [ -n "$NODE_A_FILE" ] &&
   start_if_needed nodeA "$NODE_A_FILE" 8787 "${LOGS[nodeA]}" "${URLS[nodeA]}"; then
  RESULTS[nodeA]=PASS
fi

# 2. Node B
if [ -n "$NODE_B_FILE" ] &&
   start_if_needed nodeB "$NODE_B_FILE" 8788 "${LOGS[nodeB]}" "${URLS[nodeB]}"; then
  RESULTS[nodeB]=PASS
fi

# 3. Audit
if [ -n "$AUDIT_FILE" ] &&
   start_if_needed audit "$AUDIT_FILE" 8888 "${LOGS[audit]}" "${URLS[audit]}"; then
  RESULTS[audit]=PASS
else
  fail "Audit entry missing or failed."
  warn "Audit candidates:"
  find "$ROOT" -maxdepth 4 -type f \
    -iname '*audit*.js' \
    -not -path '*/node_modules/*' \
    -print 2>/dev/null || true
fi

# 4. Web UI
if [ -n "$WEB_FILE" ] &&
   start_if_needed web "$WEB_FILE" 8080 "${LOGS[web]}" "${URLS[web]}"; then
  RESULTS[web]=PASS
elif port_open 8080 && http_200 "${URLS[web]}"; then
  # An existing static server may not have a dedicated JS entry in root.
  # سرور وب موجود فقط در صورت HTTP 200 پذیرفته می‌شود.
  RESULTS[web]=PASS
else
  fail "Web entry not found or web root did not return HTTP 200."
fi

# 5. Wallet wrapper
if [ ! -f "$WALLET_FILE" ]; then
  fail "Wallet wrapper missing: $WALLET_FILE"
elif start_if_needed wallet "$WALLET_FILE" 9000 "${LOGS[wallet]}" "${URLS[wallet]}"; then
  RESULTS[wallet]=PASS
fi

# Final live verification.
# همهٔ پنج endpoint مجدداً بررسی می‌شوند.
say "FINAL HTTP VERIFICATION"

ALL_PASS=1

for name in nodeA nodeB audit web wallet; do
  port="${PORTS[$name]}"
  url="${URLS[$name]}"

  if port_open "$port" && http_200 "$url"; then
    ok "$name TCP OPEN + HTTP 200"
    RESULTS["$name"]=PASS
  else
    fail "$name failed final verification ($port, $url)"
    RESULTS["$name"]=FAIL
    ALL_PASS=0
  fi
done

if [ "$ALL_PASS" -eq 1 ]; then
  # Record exactly what was checked; do not claim blockchain,
  # P2P, or wallet accounting correctness from HTTP responses alone.
  node - "$REPORT" <<'NODE'
const fs = require('fs');

const reportPath = process.argv[2];

const report = {
  project: 'GANDOM',
  law: 2558,
  status: 'PASS_REAL',
  verification: 'LIVE_HTTP_200_AND_TCP',
  timestamp: new Date().toISOString(),
  endpoints: {
    nodeA: { url: 'http://127.0.0.1:8787/health', http: 200 },
    nodeB: { url: 'http://127.0.0.1:8788/health', http: 200 },
    audit: { url: 'http://127.0.0.1:8888/health', http: 200 },
    web: { url: 'http://127.0.0.1:8080/', http: 200 },
    wallet: { url: 'http://127.0.0.1:9000/health', http: 200 }
  },
  limitations: [
    'HTTP 200 proves endpoint responsiveness only.',
    'Wallet /state must be checked separately for persisted state.',
    'P2P peer exchange and blockchain integrity require independent tests.',
    'No claim is made about production readiness or financial correctness.'
  ]
};

fs.writeFileSync(
  reportPath,
  JSON.stringify(report, null, 2) + '\n',
  { mode: 0o600 }
);

console.log('[GANDOM-VICTORY]', reportPath);
console.log('[PASS_REAL] Five configured HTTP endpoints returned 200.');
console.log('[LIMITATION] End-to-end application behavior is not implied.');
NODE

else
  fail "BOOT INCOMPLETE — GANDOM-VICTORY.json was not issued."
  for name in nodeA nodeB audit web wallet; do
    printf '%-8s %s\n' "$name" "${RESULTS[$name]}"
  done
  exit 1
fi

say "Logs:"
for name in nodeA nodeB audit web wallet; do
  printf '%s: %s\n' "$name" "${LOGS[$name]}"
done
