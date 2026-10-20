#!/data/data/com.termux/files/usr/bin/bash
# GANDOM SAFE TEARDOWN & RESTORE — LAW 2558
# فارسی: توقف کنترل‌شده؛ بازیابی فقط با مسیر پشتیبان صریح و پس از تأیید کاربر.
# English: graceful teardown; restore requires an explicit backup path and confirmation.
set -Eeuo pipefail
umask 077
ROOT="${GANDOM_ROOT:-$HOME/gandom}"
cd "$ROOT" || { echo "Project root not found: $ROOT" >&2; exit 1; }

# Stop only PIDs recorded by this manager, using SIGTERM first.
if [[ -f "$ROOT/.gandom-master.pid" ]]; then
  pid="$(cat "$ROOT/.gandom-master.pid" 2>/dev/null || true)"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null || true
    for _ in $(seq 1 10); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  fi
  rm -f "$ROOT/.gandom-master.pid"
fi

# Do not kill all Node processes. List likely project processes for manual review.
echo "Project-related processes (review before stopping anything else):"
pgrep -af "$ROOT/(server.js|audit-service/server.js|gandom-core-master.js)" || true

if [[ "${1:-}" != "--restore" ]]; then
  echo "Teardown complete. No data was restored or deleted."
  echo "To restore, provide an explicit verified backup directory:"
  echo "  $0 --restore '$ROOT/backups/backup_YYYYMMDD_HHMMSS'"
  exit 0
fi

BACKUP="${2:-}"
[[ -n "$BACKUP" && -d "$BACKUP" ]] || { echo "Explicit existing backup directory required." >&2; exit 2; }
[[ -f "$BACKUP/SHA256SUMS" ]] || { echo "Backup has no SHA256SUMS; refusing restore." >&2; exit 2; }
( cd "$BACKUP" && sha256sum -c SHA256SUMS ) || { echo "Backup hash verification failed." >&2; exit 2; }
printf 'WARNING: restore will replace matching project paths from:\n%s\n' "$BACKUP"
printf 'Type RESTORE-2558 to continue: '
read -r confirm
[[ "$confirm" == "RESTORE-2558" ]] || { echo "Cancelled; no files restored."; exit 3; }

# Create a safety snapshot of current state before restoration.
NOW="$(date +%Y%m%d_%H%M%S)"
SAFETY="$ROOT/backups/pre_restore_$NOW"
mkdir -p "$SAFETY" || exit 4
for item in blockchain-data wallet-data config .env package.json package-lock.json server.js audit-service; do
  if [[ -e "$ROOT/$item" ]]; then
    mkdir -p "$SAFETY/$(dirname "$item")"
    cp -a "$ROOT/$item" "$SAFETY/$item" || { echo "Safety snapshot failed; aborting." >&2; exit 4; }
  fi
done

for item in blockchain-data wallet-data config .env package.json package-lock.json server.js audit-service; do
  if [[ -e "$BACKUP/$item" ]]; then
    # Restore each matching item without deleting unrelated project files.
    rm -rf "$ROOT/$item"
    cp -a "$BACKUP/$item" "$ROOT/$item" || { echo "Restore failed for $item; inspect $SAFETY" >&2; exit 5; }
  fi
done
echo "RESTORE_COPIED=1"
echo "Safety snapshot: $SAFETY"
echo "Run application-specific integrity tests before declaring PASS_REAL."
