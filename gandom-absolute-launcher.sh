#!/data/data/com.termux/files/usr/bin/bash
set -u

# GANDOM LAW 2558 — guarded launcher
# قانون مادر ۲۵۵۸ — راه‌اندازی با پشتیبان و کنترل شواهد

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo "=== GANDOM | LAW 2558 | GUARDED EXECUTION ==="

# 1) Dependencies / وابستگی‌ها
for cmd in node curl sha256sum; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo -e "${RED}MISSING_DEPENDENCY=$cmd${RESET}"
    echo "Install with: pkg install nodejs curl coreutils"
    exit 1
  fi
done

# 2) Verify expected entrypoints; never guess missing filenames.
for file in server.js gandom-force-consensus.js; do
  if [ ! -f "$ROOT/$file" ]; then
    echo -e "${RED}MISSING_FILE=$file${RESET}"
    exit 1
  fi
done

# 3) Preserve chain and wallet data before modification.
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/archive/pre-launch-$STAMP"
mkdir -p "$BACKUP" || exit 1

for item in blockchain-data blockchain-data-b wallet; do
  if [ -e "$ROOT/$item" ]; then
    cp -a "$ROOT/$item" "$BACKUP/" || {
      echo -e "${RED}BACKUP_FAILED=$item${RESET}"
      exit 1
    }
  fi
done

echo "BACKUP=$BACKUP"

# 4) Do not indiscriminately kill every Node process.
# Stop only processes whose command line explicitly references this project.
if command -v pgrep >/dev/null 2>&1; then
  while IFS= read -r pid; do
    [ -n "$pid" ] || continue
    CMD="$(tr '\000' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
    case "$CMD" in
      *"$ROOT/server.js"*|*"$ROOT/server-node-b.js"*|*"$ROOT/audit-service/server.js"*|*"$ROOT/wallet/GANDOM-WALLET-2558.js"*)
        echo "STOP_OWN_PROCESS_PID=$pid"
        kill -TERM "$pid" 2>/dev/null || true
        ;;
    esac
  done < <(pgrep -f 'node|nodejs' 2>/dev/null || true)
fi

sleep 2

# 5) Repair consensus state; this fails closed on divergent histories.
echo "=== CONSENSUS REPAIR ==="
node "$ROOT/gandom-force-consensus.js" || {
  echo -e "${RED}FATAL: CONSENSUS REPAIR FAILED — SERVICES NOT RESTARTED${RESET}"
  echo "Inspect: $ROOT/FORCE_WRITE_PROOF.json"
  exit 1
}

# 6) Start only known, present entrypoints.
# Each service gets a separate log and PID record.
mkdir -p "$ROOT/runtime-logs" "$ROOT/run"
start_service() {
  local name="$1"
  local file="$2"

  if [ ! -f "$ROOT/$file" ]; then
    echo -e "${YELLOW}SERVICE_SKIPPED=$name REASON=ENTRYPOINT_MISSING:$file${RESET}"
    return 0
  fi

  nohup node "$ROOT/$file" \
    >> "$ROOT/runtime-logs/$name.log" 2>&1 </dev/null &
  local pid=$!
  echo "$pid" > "$ROOT/run/$name.pid"
  echo "STARTED=$name PID=$pid ENTRYPOINT=$file"
}

start_service "node-a" "server.js"

# Node B filename must be verified; do not silently substitute another architecture.
if [ -f "$ROOT/server-node-b.js" ]; then
  start_service "node-b" "server-node-b.js"
elif [ -f "$ROOT/node-b-persistent.js" ]; then
  start_service "node-b" "node-b-persistent.js"
else
  echo -e "${YELLOW}SERVICE_SKIPPED=node-b REASON=NO_KNOWN_ENTRYPOINT${RESET}"
fi

start_service "audit" "audit-service/server.js"
start_service "wallet" "wallet/GANDOM-WALLET-2558.js"

# Web UI may be served by server.js or a separate script.
# Do not launch an arbitrary file just because port 8080 is requested.
if [ -f "$ROOT/web-server.js" ]; then
  start_service "web-ui" "web-server.js"
else
  echo -e "${YELLOW}SERVICE_SKIPPED=web-ui REASON=web-server.js_NOT_FOUND${RESET}"
fi

sleep 5

# 7) HTTP checks are evidence only for endpoints that actually exist.
check_port() {
  local port="$1"
  local path="$2"
  local code
  code="$(curl --connect-timeout 2 --max-time 4 -sS -o /dev/null \
    -w '%{http_code}' "http://127.0.0.1:$port$path" 2>/dev/null || true)"
  printf 'HTTP port=%s path=%s status=%s\n' "$port" "$path" "${code:-000}"
  [ "$code" = "200" ]
}

OK=1
check_port 8787 /health || OK=0
check_port 8788 /health || OK=0
check_port 8888 /health || OK=0
check_port 9000 /health || OK=0
check_port 8080 / || OK=0

echo "=== CHAIN HASH VERIFICATION ==="
sha256sum blockchain-data/chain.json blockchain-data-b/chain.json

HASH_A="$(sha256sum blockchain-data/chain.json | awk '{print $1}')"
HASH_B="$(sha256sum blockchain-data-b/chain.json | awk '{print $1}')"

if [ "$HASH_A" != "$HASH_B" ]; then
  echo -e "${RED}CHAIN_SYNC=FAIL${RESET}"
  OK=0
else
  echo -e "${GREEN}CHAIN_FILE_HASH_MATCH=1${RESET}"
fi

echo "=== PROOF SUMMARY ==="
if [ -f "$ROOT/FORCE_WRITE_PROOF.json" ]; then
  cat "$ROOT/FORCE_WRITE_PROOF.json"
else
  echo "PROOF_FILE_MISSING=1"
  OK=0
fi

if [ "$OK" -eq 1 ]; then
  echo -e "${GREEN}FILE_SYNC_AND_HTTP_CHECKS=PASS${RESET}"
  echo "PASS_REAL=NOT_ESTABLISHED"
  echo "Reason: HTTP 200 and equal file hashes do not prove P2P handshake, chain validity, or wallet transaction processing."
else
  echo -e "${RED}EXECUTION_INCOMPLETE=1${RESET}"
  echo "PASS_REAL=NOT_ESTABLISHED"
  echo "Inspect logs in $ROOT/runtime-logs/"
  exit 1
fi
