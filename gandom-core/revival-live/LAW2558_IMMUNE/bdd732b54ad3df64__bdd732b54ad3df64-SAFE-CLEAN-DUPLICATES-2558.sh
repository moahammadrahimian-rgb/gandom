#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
AUDIT="$ROOT/audit"
BACKUPS="$ROOT/backups"

echo "===== GANDOM SAFE CLEAN 2558 ====="
echo "ROOT=$ROOT"
echo "AUDIT=$AUDIT"
echo "BACKUPS=$BACKUPS"
echo

echo "===== BEFORE ====="
df -h "$HOME"
du -sh "$AUDIT" "$BACKUPS" 2>/dev/null
echo

# محل قرنطینه فقط برای گزارش؛ چیزی از backup منتقل نمی‌شود
REPORT="$AUDIT/SAFE-CLEAN-REPORT-$(date +%Y%m%d-%H%M%S).txt"

echo "===== HASHING BACKUPS ====="
TMP_BACKUP_HASHES="$AUDIT/.backup-hashes.tmp"

find "$BACKUPS" -type f -print0 2>/dev/null |
while IFS= read -r -d '' f; do
    sha256sum "$f"
done > "$TMP_BACKUP_HASHES"

echo "Backup hashes: $(wc -l < "$TMP_BACKUP_HASHES")"

echo "===== SEARCHING EXACT DUPLICATES IN AUDIT ====="

DUPLIST="$AUDIT/.duplicate-list.tmp"
: > "$DUPLIST"

find "$AUDIT" -type f \
    ! -name '.backup-hashes.tmp' \
    ! -name '.duplicate-list.tmp' \
    ! -name 'SAFE-CLEAN-REPORT-*' \
    -print0 2>/dev/null |
while IFS= read -r -d '' f; do
    H="$(sha256sum "$f" | awk '{print $1}')"

    if grep -q "^$H " "$TMP_BACKUP_HASHES"; then
        echo "$f"
        printf '%s\t%s\n' "$H" "$f" >> "$DUPLIST"
    fi
done

echo
echo "===== EXACT DUPLICATES FOUND ====="
wc -l "$DUPLIST"
cat "$DUPLIST"

echo
echo "===== DELETE ONLY EXACT AUDIT DUPLICATES ====="

DELETED=0

while IFS=$'\t' read -r HASH FILE; do
    [ -z "${FILE:-}" ] && continue

    if [ -f "$FILE" ]; then
        SIZE="$(du -h "$FILE" | awk '{print $1}')"
        echo "DELETE_DUPLICATE: $SIZE $FILE"
        rm -f -- "$FILE"
        DELETED=$((DELETED+1))
    fi
done < "$DUPLIST"

echo
echo "DELETED_EXACT_DUPLICATES=$DELETED"

echo
echo "===== REMOVE EMPTY GENERATED DIRECTORIES ====="
find "$AUDIT" -type d -empty -delete 2>/dev/null || true

echo
echo "===== CLEAN TEMP HASH FILES ====="
rm -f "$TMP_BACKUP_HASHES" "$DUPLIST"

echo
echo "===== AFTER ====="
df -h "$HOME"
du -sh "$AUDIT" "$BACKUPS" 2>/dev/null

echo
echo "===== SAFE CLEAN COMPLETE ====="
