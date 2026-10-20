#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

# قانون مادر ۲۵۵۸:
# ابتدا پشتیبان، سپس تغییر کنترل‌شده؛ حذف داده ممنوع.
# LAW 2558: Back up first; never delete user data.

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="$ROOT/backups/pre-repair-$STAMP"
ARCHIVE_ROOT="$ROOT/archive/$STAMP"

mkdir -p "$BACKUP_ROOT" "$ARCHIVE_ROOT"

echo "=== GANDOM SANITIZER / LAW 2558 ==="
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP_ROOT"
echo "ARCHIVE=$ARCHIVE_ROOT"

# Preserve data before any modifications.
# پیش از هر تغییری، داده‌های حساس پروژه را پشتیبان بگیر.
for item in blockchain-data blockchain-data-b wallet; do
    if [ -e "$ROOT/$item" ]; then
        cp -a "$ROOT/$item" "$BACKUP_ROOT/"
        echo "BACKUP_OK=$item"
    else
        echo "BACKUP_SKIP=$item (not found)"
    fi
done

# Store a manifest for independent verification.
(
    cd "$BACKUP_ROOT"
    find . -type f -print0 |
        sort -z |
        xargs -0 -r sha256sum
) > "$BACKUP_ROOT/SHA256SUMS.txt"

echo "BACKUP_MANIFEST=$BACKUP_ROOT/SHA256SUMS.txt"

# Archive only known legacy/backup patterns at the project root.
# فایل‌های فعال و پوشه‌های داده را به‌صورت بازگشتی جابه‌جا نکن.
# Dry-run-like reporting is avoided here: only matched root entries move.
shopt -s nullglob dotglob

moved=0
for path in "$ROOT"/*.bak \
            "$ROOT"/*.before \
            "$ROOT"/*.step*-before \
            "$ROOT"/test-*.js \
            "$ROOT"/test-*.sh; do
    [ -e "$path" ] || continue

    base="$(basename "$path")"

    # Never move this sanitizer or the live launcher.
    case "$base" in
        gandom-ultimate-sanitizer.sh|gandom-absolute-launcher.sh)
            continue
            ;;
    esac

    # Do not overwrite an existing archived file.
    target="$ARCHIVE_ROOT/$base"
    if [ -e "$target" ]; then
        target="$ARCHIVE_ROOT/${STAMP}-${base}"
    fi

    if mv -- "$path" "$target"; then
        echo "ARCHIVED=$base"
        moved=$((moved + 1))
    else
        echo "ARCHIVE_ERROR=$base" >&2
        exit 1
    fi
done

echo "ARCHIVED_COUNT=$moved"
echo "BACKUP_COMPLETE=1"
echo "SANITIZER_STATUS=PASS"
echo "NOTE=No chain or wallet content was modified."
