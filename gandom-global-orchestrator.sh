#!/data/data/com.termux/files/usr/bin/bash
# GANDOM GLOBAL ORCHESTRATOR — LAW 2558
# فارسی: هماهنگ‌ساز اصلی؛ قبل از تغییر، از داده‌های حیاتی نسخه پشتیبان می‌گیرد.
# English: Master orchestrator; backs up critical data before making changes.
set -Eeuo pipefail
umask 077

ROOT="${GANDOM_ROOT:-$HOME/gandom}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_ROOT="${GANDOM_BACKUP_ROOT:-$ROOT/backups}"
BACKUP_DIR="$BACKUP_ROOT/backup_$STAMP"
LOG_DIR="$ROOT/logs"
EVIDENCE="$ROOT/execution_evidence.json"

say(){ printf '[GANDOM] %s\n' "$*"; }
die(){ printf '[GANDOM][ABORT] %s\n' "$*" >&2; exit 1; }
have(){ command -v "$1" >/dev/null 2>&1; }

[[ -d "$ROOT" ]] || die "Project root not found: $ROOT"
cd "$ROOT"

# Preflight basics; do not mutate project data yet.
say "LAW=2558 | NO_FAKE_PASS=1 | DATA_PRESERVATION=MANDATORY"
have pkg || die "Termux pkg manager not found; run this script inside Termux."
# Dependency installation is intentionally deferred until after the mandatory backup.
FREE_KB="$(df -Pk "$ROOT" | awk 'NR==2 {print $4}')"
ARCH="$(uname -m)"
say "ROOT=$ROOT ARCH=$ARCH FREE_KB=${FREE_KB:-unknown}"
[[ "${FREE_KB:-0}" =~ ^[0-9]+$ ]] || die "Cannot determine free disk space."
(( FREE_KB >= 102400 )) || die "Less than 100 MiB free; refusing to continue."

# CRITICAL: create and verify a timestamped backup BEFORE any project mutation.
mkdir -p "$BACKUP_ROOT" || die "Cannot create backup root: $BACKUP_ROOT"
mkdir -m 700 "$BACKUP_DIR" || die "Cannot create backup directory: $BACKUP_DIR"
backup_item(){
  local item="$1"
  if [[ -e "$ROOT/$item" ]]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$item")"
    cp -a "$ROOT/$item" "$BACKUP_DIR/$item" || die "Backup failed for $item"
    [[ -e "$BACKUP_DIR/$item" ]] || die "Backup verification failed for $item"
  else
    printf 'MISSING\t%s\n' "$item" >> "$BACKUP_DIR/missing-items.tsv"
  fi
}
backup_item "blockchain-data"
backup_item "wallet-data"
backup_item "config"
backup_item ".env"
backup_item "package.json"
backup_item "package-lock.json"
backup_item "server.js"
backup_item "audit-service"
# Hash manifest proves what was copied, not that the application is correct.
( cd "$BACKUP_DIR" && find . -type f -print0 | sort -z | xargs -0 -r sha256sum > SHA256SUMS ) \
  || die "Could not create backup hash manifest"
if [[ -f "$BACKUP_DIR/SHA256SUMS" ]]; then
  ( cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS >/dev/null ) \
    || die "Backup hash verification failed"
fi
printf '%s\n' "$BACKUP_DIR" > "$ROOT/.gandom-last-backup"
say "BACKUP_VERIFIED=$BACKUP_DIR"

# Install missing command-line dependencies only after the backup succeeded.
missing=()
for c in node npm curl jq; do have "$c" || missing+=("$c"); done
if ((${#missing[@]})); then
  say "Installing missing Termux packages: ${missing[*]}"
  pkg update -y || die "pkg update failed"
  pkg install -y nodejs curl jq || die "Dependency installation failed"
fi
for c in node npm curl jq; do have "$c" || die "Required command still missing: $c"; done

mkdir -p "$LOG_DIR"
# Do NOT pkill -f node: that can terminate unrelated apps and this shell.
# Stop only processes whose command line explicitly points to this project's
# known server entry points; never kill all Node processes.
say "Checking project service processes (no blanket pkill)."
if command -v pgrep >/dev/null 2>&1; then
  pgrep -af "$ROOT/(server.js|audit-service/server.js|gandom-core-master.js)" || true
fi

# Preserve chain data. Genesis is created ONLY when no chain file exists.
# Existing malformed chain is never overwritten automatically.
CHAIN="$ROOT/blockchain-data/chain.json"
if [[ ! -e "$CHAIN" ]]; then
  mkdir -p "$(dirname "$CHAIN")"
  GENESIS_TMP="$CHAIN.tmp.$$"
  node - "$GENESIS_TMP" <<'NODE' || die "Could not create genesis chain file"
const fs = require('fs');
const crypto = require('crypto');
const target = process.argv[2];
const body = { index: 0, height: 0, timestamp: new Date().toISOString(),
  previousHash: '0'.repeat(64), data: { type: 'GENESIS', law: 2558 } };
body.hash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
fs.writeFileSync(target, JSON.stringify({ chain: [body] }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
NODE
  mv "$GENESIS_TMP" "$CHAIN" || die "Could not atomically install genesis file"
  say "CHAIN_CREATED=genesis (file was absent; backup recorded absence)"
else
  say "CHAIN_PRESERVED=existing file; no automatic rewrite"
fi

# Syntax-check only; the master manager performs bounded service startup.
node --check "$ROOT/gandom-core-master.js" || die "Master script syntax check failed"
node --check "$ROOT/p2p-sync-validator.js" || die "P2P validator syntax check failed"

# Keep a single orchestrator process; do not silently overwrite a live manager.
if [[ -f "$ROOT/.gandom-master.pid" ]] && kill -0 "$(cat "$ROOT/.gandom-master.pid")" 2>/dev/null; then
  die "Master manager appears active (PID $(cat "$ROOT/.gandom-master.pid")); inspect it before restarting."
fi
nohup node "$ROOT/gandom-core-master.js" --root "$ROOT" --backup "$BACKUP_DIR" \
  >> "$LOG_DIR/global-orchestrator.log" 2>&1 &
MASTER_PID=$!
printf '%s\n' "$MASTER_PID" > "$ROOT/.gandom-master.pid"
say "MASTER_PID=$MASTER_PID"
say "Waiting up to 90 seconds for execution report..."
for _ in $(seq 1 45); do
  [[ -s "$EVIDENCE" ]] && break
  kill -0 "$MASTER_PID" 2>/dev/null || break
  sleep 2
done

if [[ -s "$EVIDENCE" ]]; then
  jq '{startedAt, finishedAt, overall, backup, services: [.services[] | {name,port,state,httpStatus,attempts,detail}], p2p}' "$EVIDENCE"
else
  say "Evidence report not ready; inspect $LOG_DIR/global-orchestrator.log"
fi

say "=== PORT SUMMARY (live probes) ==="
for p in 8787 8788 8080 8888 9000; do
  code="$(curl -sS --connect-timeout 2 --max-time 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$p/health" 2>/dev/null || true)"
  [[ "$code" == "200" ]] && state="HTTP_200" || state="NOT_HEALTHY"
  printf 'PORT=%s STATUS=%s HTTP=%s\n' "$p" "$state" "${code:-000}"
done
say "NO_FAKE_PASS=1: report states are evidence-based; unavailable services remain BLOCKED/FAIL."
