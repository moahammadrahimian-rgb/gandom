#!/data/data/com.termux/files/usr/bin/bash

# GANDOM AUTO START — LAW 2558
# راه‌اندازی امن و کنترل‌شده سرویس‌های گندم
# Safe startup, dependency checks, health checks and evidence logging.

set -u
umask 077

ROOT="$HOME/gandom"
LOG_DIR="$ROOT/logs"
STATE_DIR="$ROOT/runtime"
CHAIN_DIR="$ROOT/blockchain-data"
CHAIN_FILE="$CHAIN_DIR/chain.json"
LOCK_DIR="$STATE_DIR/autostart.lock"
BOOT_LOG="$LOG_DIR/auto-start.log"

mkdir -p "$LOG_DIR" "$STATE_DIR" "$CHAIN_DIR"
cd "$ROOT" || exit 1

log() {
    printf '[%s] %s\n' \
        "$(date '+%Y-%m-%d %H:%M:%S%z')" "$*" \
        | tee -a "$BOOT_LOG"
}

# --------------------------------------------------
# 1. Prevent duplicate bootstrap processes
# جلوگیری از اجرای هم‌زمان چند راه‌انداز
# --------------------------------------------------

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    log "STARTUP_LOCKED: another bootstrap may be running."
    exit 1
fi

cleanup() {
    rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --------------------------------------------------
# 2. Check Termux dependencies
# بررسی و نصب پیش‌نیازها
# --------------------------------------------------

for cmd in pkg node npm curl jq nohup; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        log "MISSING_DEPENDENCY: $cmd"
    fi
done

if ! command -v pkg >/dev/null 2>&1; then
    log "FATAL: Termux pkg is unavailable."
    exit 1
fi

MISSING=0

for cmd in node curl jq nohup; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING=1
    fi
done

if [ "$MISSING" -eq 1 ]; then
    log "INSTALLING: required Termux packages"

    pkg update -y >>"$BOOT_LOG" 2>&1 || {
        log "FATAL: pkg update failed"
        exit 1
    }

    pkg install -y nodejs curl jq coreutils \
        >>"$BOOT_LOG" 2>&1 || {
        log "FATAL: dependency installation failed"
        exit 1
    }
fi

for cmd in node npm curl jq nohup; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        log "FATAL: $cmd is still unavailable"
        exit 1
    fi
done

log "DEPENDENCIES=PASS"

# --------------------------------------------------
# 3. Validate existing blockchain data
# اعتبارسنجی داده موجود؛ بدون بازنویسی زنجیره
# --------------------------------------------------

if [ -f "$CHAIN_FILE" ]; then
    if ! jq -e 'type == "object"' \
        "$CHAIN_FILE" >/dev/null 2>&1; then
        log "FATAL: chain.json exists but is not a valid JSON object."
        log "PRESERVATION_LOCK: original chain was not modified."
        exit 1
    fi

    log "CHAIN_FILE=EXISTS_VALID_JSON"
else
    # This is a bootstrap marker, NOT a real verified blockchain.
    # این فقط نشانگر اولیه است، نه بلاک‌چین تأییدشده.
    TEMP_FILE="$CHAIN_DIR/.chain.json.bootstrap.tmp"

    cat > "$TEMP_FILE" <<'JSON'
{
  "schema_version": 1,
  "project": "GANDOM",
  "law": 2558,
  "status": "UNINITIALIZED",
  "chain": [],
  "genesis_created": false,
  "verification": {
    "status": "NOT_VERIFIED",
    "reason": "Initial placeholder; no consensus or genesis proof exists."
  }
}
JSON

    if jq -e 'type == "object"' "$TEMP_FILE" >/dev/null; then
        mv "$TEMP_FILE" "$CHAIN_FILE"
        log "CHAIN_BOOTSTRAP=CREATED_UNINITIALIZED"
    else
        rm -f "$TEMP_FILE"
        log "FATAL: initial chain JSON validation failed"
        exit 1
    fi
fi

# --------------------------------------------------
# 4. Validate manager script
# بررسی نحو جاوااسکریپت پیش از اجرا
# --------------------------------------------------

MANAGER="$ROOT/GANDOM-BOOT-MASTER.js"

if [ ! -f "$MANAGER" ]; then
    log "FATAL: $MANAGER not found"
    exit 1
fi

if ! node --check "$MANAGER" >>"$BOOT_LOG" 2>&1; then
    log "FATAL: JavaScript syntax validation failed"
    exit 1
fi

log "BOOT_MANAGER_SYNTAX=PASS"

# --------------------------------------------------
# 5. Start manager asynchronously
# اجرای مدیر در پس‌زمینه
# --------------------------------------------------

MANAGER_LOG="$LOG_DIR/boot-master.log"
PID_FILE="$STATE_DIR/boot-master.pid"

if [ -f "$PID_FILE" ]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"

    if [[ "$OLD_PID" =~ ^[0-9]+$ ]] &&
       kill -0 "$OLD_PID" 2>/dev/null; then

        CMDLINE="$(tr '\0' ' ' \
            < "/proc/$OLD_PID/cmdline" 2>/dev/null || true)"

        if [[ "$CMDLINE" == *GANDOM-BOOT-MASTER.js* ]]; then
            log "BOOT_MANAGER=ALREADY_RUNNING PID=$OLD_PID"
        else
            log "STALE_OR_FOREIGN_PID_FILE: $PID_FILE"
            exit 1
        fi
    else
        rm -f "$PID_FILE"

        nohup node "$MANAGER" \
            >>"$MANAGER_LOG" 2>&1 </dev/null &

        NEW_PID=$!
        printf '%s\n' "$NEW_PID" > "$PID_FILE"

        sleep 1

        if kill -0 "$NEW_PID" 2>/dev/null; then
            log "BOOT_MANAGER=STARTED PID=$NEW_PID"
        else
            rm -f "$PID_FILE"
            log "FATAL: boot manager exited during startup"
            exit 1
        fi
    fi
else
    nohup node "$MANAGER" \
        >>"$MANAGER_LOG" 2>&1 </dev/null &

    NEW_PID=$!
    printf '%s\n' "$NEW_PID" > "$PID_FILE"

    sleep 1

    if kill -0 "$NEW_PID" 2>/dev/null; then
        log "BOOT_MANAGER=STARTED PID=$NEW_PID"
    else
        rm -f "$PID_FILE"
        log "FATAL: boot manager exited during startup"
        exit 1
    fi
fi

# --------------------------------------------------
# 6. Health checks
# پاسخ HTTP واقعی را بررسی کن؛ صرف باز بودن پورت کافی نیست.
# --------------------------------------------------

check_health() {
    local name="$1"
    local port="$2"
    local path="$3"
    local url="http://127.0.0.1:${port}${path}"
    local attempt
    local body
    local code

    for attempt in 1 2 3 4 5 6 7 8 9 10; do
        body="$(curl -fsS --connect-timeout 2 \
            --max-time 3 "$url" 2>/dev/null || true)"

        code="$(curl -sS -o /dev/null \
            -w '%{http_code}' \
            --connect-timeout 2 --max-time 3 \
            "$url" 2>/dev/null || true)"

        if [ "$code" = "200" ]; then
            log "HEALTH_HTTP_200: $name port=$port"
            printf '%s\n' "$body"
            return 0
        fi

        sleep 2
    done

    log "HEALTH_FAILED: $name port=$port url=$url"
    return 1
}

log "HEALTH_CHECK_BEGIN"

A_OK=0
B_OK=0
AUDIT_OK=0
UI_OK=0
WALLET_OK=0

check_health NODE_A 8787 /health || true
[ "$?" -eq 0 ] && A_OK=1

check_health NODE_B 8788 /health || true
[ "$?" -eq 0 ] && B_OK=1

check_health AUDIT 8888 /health || true
[ "$?" -eq 0 ] && AUDIT_OK=1

check_health FRONTEND 8080 / || true
[ "$?" -eq 0 ] && UI_OK=1

check_health WALLET 9000 /health || true
[ "$?" -eq 0 ] && WALLET_OK=1

# --------------------------------------------------
# 7. Evidence-based status
# PASS_REAL must never be inferred from process startup.
# --------------------------------------------------

log "===== GANDOM SERVICE REPORT ====="
log "NODE_A_HTTP_HEALTH=$A_OK"
log "NODE_B_HTTP_HEALTH=$B_OK"
log "AUDIT_HTTP_HEALTH=$AUDIT_OK"
log "FRONTEND_HTTP_HEALTH=$UI_OK"
log "WALLET_HTTP_HEALTH=$WALLET_OK"

if [ "$A_OK" -eq 1 ] &&
   [ "$B_OK" -eq 1 ] &&
   [ "$AUDIT_OK" -eq 1 ] &&
   [ "$UI_OK" -eq 1 ] &&
   [ "$WALLET_OK" -eq 1 ]; then

    log "SERVICE_HTTP_HEALTH=PASS"

    # HTTP health alone does not establish full-system PASS_REAL.
    log "PASS_REAL=NOT_CLAIMED"
    log "REASON=Peer connectivity, blockchain integrity, and independent verification remain to be proven."
else
    log "SERVICE_HTTP_HEALTH=PARTIAL_OR_FAILED"
    log "PASS_REAL=NOT_CLAIMED"
fi

log "AUTO_START_COMPLETE"
