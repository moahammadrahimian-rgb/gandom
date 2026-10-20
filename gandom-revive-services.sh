#!/data/data/com.termux/files/usr/bin/bash

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
declare -A PORTS
declare -A LOGS

PORTS[nodeA]=8787
PORTS[nodeB]=8788
PORTS[web]=8080
PORTS[audit]=8888
PORTS[wallet]=9000

LOGS[nodeB]="$LOG_DIR/node-b.log"
LOGS[audit]="$LOG_DIR/audit.log"
LOGS[wallet]="$LOG_DIR/wallet.log"

say() {
    printf "${BLUE}[GANDOM]${RESET} %s\n" "$*"
}

ok() {
    printf "${GREEN}[PASS]${RESET} %s\n" "$*"
}

warn() {
    printf "${YELLOW}[WARN]${RESET} %s\n" "$*"
}

fail() {
    printf "${RED}[FAIL]${RESET} %s\n" "$*"
}

port_open() {
    local port="$1"

    if command -v curl >/dev/null 2>&1; then
        # TCP may be open even when an HTTP route returns 404.
        # Bash /dev/tcp provides a TCP-level test.
        timeout 2 bash -c \
            "exec 3<>/dev/tcp/127.0.0.1/$port" \
            >/dev/null 2>&1
        return $?
    fi

    timeout 2 bash -c \
        "exec 3<>/dev/tcp/127.0.0.1/$port" \
        >/dev/null 2>&1
}

show_scripts() {
    say "PACKAGE.JSON — scripts section"

    if [ ! -f package.json ]; then
        fail "package.json not found in $ROOT"
        return 1
    fi

    if command -v node >/dev/null 2>&1; then
        node -e '
          const fs = require("fs");
          try {
            const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
            console.log(JSON.stringify(p.scripts || {}, null, 2));
          } catch (e) {
            console.error("Cannot parse package.json:", e.message);
            process.exitCode = 1;
          }
        ' || return 1
    else
        fail "Node.js is unavailable"
        return 1
    fi
}

find_service_file() {
    local kind="$1"
    local candidate
    local candidates=()

    case "$kind" in
        audit)
            candidates=(
                "audit-server.js"
                "server-audit.js"
                "audit-service/server.js"
                "server.js"
            )
            ;;
        *)
            return 1
            ;;
    esac

    for candidate in "${candidates[@]}"; do
        if [ -f "$ROOT/$candidate" ]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done

    return 1
}

launch_service() {
    local name="$1"
    local command_string="$2"
    local log_file="$3"
    local port="$4"

    say "Starting $name"
    say "Command: $command_string"
    say "Log: $log_file"

    if port_open "$port"; then
        warn "$name port $port is already open; refusing duplicate launch"
        return 0
    fi

    # Run each service with its own log.
    # No pkill and no broad process termination.
    (
        cd "$ROOT" || exit 1
        exec bash -c "$command_string"
    ) >>"$log_file" 2>&1 &

    local pid=$!
    PIDS["$name"]="$pid"

    sleep 2

    if port_open "$port"; then
        ok "$name TCP port $port is OPEN (PID $pid)"
        return 0
    fi

    fail "$name TCP port $port is CLOSED"

    if ! kill -0 "$pid" 2>/dev/null; then
        warn "$name process exited; exit status may be visible in its log"
    else
        warn "$name process still exists, but the expected port is closed"
    fi

    echo "----- Last 15 lines: $log_file -----"
    tail -n 15 "$log_file" 2>/dev/null || true
    echo "------------------------------------"

    return 1
}

say "GANDOM REVIVAL — LAW 2558"
say "Root: $ROOT"
say "Mode: targeted launch; existing services are not killed"

if ! show_scripts; then
    fail "Cannot safely determine project scripts."
    exit 1
fi

if [ ! -f node-b-persistent.js ]; then
    fail "node-b-persistent.js not found"
    exit 1
fi

# Preserve existing logs. Append new execution output.
touch "${LOGS[nodeB]}" "${LOGS[audit]}" "${LOGS[wallet]}"

RESULT_NODEB=FAIL
RESULT_AUDIT=FAIL
RESULT_WALLET=FAIL

# 1. Node B
if launch_service \
    "Node B" \
    "node node-b-persistent.js" \
    "${LOGS[nodeB]}" \
    "${PORTS[nodeB]}"; then
    RESULT_NODEB=PASS
fi

# 2. Audit
AUDIT_FILE="$(find_service_file audit || true)"

if [ -n "$AUDIT_FILE" ]; then
    say "Audit entry file: $AUDIT_FILE"

    if launch_service \
        "Audit" \
        "node \"$AUDIT_FILE\"" \
        "${LOGS[audit]}" \
        "${PORTS[audit]}"; then
        RESULT_AUDIT=PASS
    fi
else
    fail "Could not identify an Audit entry file."
    warn "Files containing audit in their names:"
    find "$ROOT" \
        -maxdepth 4 \
        -type f \
        -iname '*audit*.js' \
        -not -path '*/node_modules/*' \
        -print 2>/dev/null || true

    echo "----- Last 15 lines: ${LOGS[audit]} -----"
    tail -n 15 "${LOGS[audit]}" 2>/dev/null || true
fi

# 3. Wallet
WALLET_FILE="wallet/GANDOM-WALLET-2558.js"

if [ -f "$WALLET_FILE" ]; then
    if launch_service \
        "Wallet" \
        "node \"$WALLET_FILE\"" \
        "${LOGS[wallet]}" \
        "${PORTS[wallet]}"; then
        RESULT_WALLET=PASS
    fi
else
    fail "Wallet source not found: $WALLET_FILE"
    echo "----- Last 15 lines: ${LOGS[wallet]} -----"
    tail -n 15 "${LOGS[wallet]}" 2>/dev/null || true
fi

# 4. Final TCP inventory
say "Final TCP port inventory"

ALL_OPEN=1

for name in nodeA nodeB web audit wallet; do
    port="${PORTS[$name]}"

    if port_open "$port"; then
        ok "$name : $port OPEN"
    else
        fail "$name : $port CLOSED"
        ALL_OPEN=0
    fi
done

# PASS_REAL is issued only when all five TCP ports are open
# AND all three requested launch attempts reported success.
if [ "$ALL_OPEN" -eq 1 ] &&
   [ "$RESULT_NODEB" = PASS ] &&
   [ "$RESULT_AUDIT" = PASS ] &&
   [ "$RESULT_WALLET" = PASS ]; then

    if command -v node >/dev/null 2>&1; then
        node - "$REPORT" <<'NODE'
const fs = require('fs');

const reportPath = process.argv[2];

const report = {
  project: 'GANDOM',
  law: 2558,
  status: 'PASS_REAL',
  verification: 'TCP_PORTS_AND_LAUNCH_ATTEMPTS',
  timestamp: new Date().toISOString(),
  ports: {
    nodeA: { port: 8787, tcp: 'OPEN' },
    nodeB: { port: 8788, tcp: 'OPEN' },
    web:   { port: 8080, tcp: 'OPEN' },
    audit: { port: 8888, tcp: 'OPEN' },
    wallet:{ port: 9000, tcp: 'OPEN' }
  },
  limitations: [
    'TCP open does not prove correct HTTP routes.',
    'TCP open does not prove API functionality.',
    'TCP open does not prove wallet accounting or security.',
    'Blockchain consistency must be verified independently.'
  ]
};

fs.writeFileSync(
  reportPath,
  JSON.stringify(report, null, 2) + '\n',
  { mode: 0o600 }
);

console.log('[REPORT]', reportPath);
console.log('[PASS_REAL] All five TCP ports open and launch attempts succeeded.');
console.log('[LIMITATION] Application-level verification is still required.');
NODE
    else
        fail "Cannot generate JSON report: Node.js unavailable"
        exit 1
    fi
else
    fail "REVIVAL INCOMPLETE — no PASS_REAL report generated."
    say "Node B: $RESULT_NODEB"
    say "Audit:  $RESULT_AUDIT"
    say "Wallet: $RESULT_WALLET"
    say "Review the service logs before the next repair."
    exit 1
fi

say "Diagnostic logs:"
printf '  %s\n' "${LOGS[nodeB]}" "${LOGS[audit]}" "${LOGS[wallet]}"
