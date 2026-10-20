#!/data/data/com.termux/files/usr/bin/bash
set -u

STAGING="$HOME/gandom/audit/REVIVAL-1470-20261007-210838/staging"
RUN="$HOME/gandom/audit/STAGING-CLEAN-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN"

LOG="$RUN/DELETION-LOG.txt"
HASHES="$RUN/SHA256-MANIFEST.txt"

echo "===== GANDOM STAGING EXACT-DUPLICATE CLEAN =====" | tee "$LOG"
echo "STAGING=$STAGING" | tee -a "$LOG"
echo "ONLY_EXACT_SHA256_DUPLICATES=YES" | tee -a "$LOG"
echo "PROTECTED_LIVE_AREAS=YES" | tee -a "$LOG"
echo | tee -a "$LOG"

if [ ! -d "$STAGING" ]; then
    echo "ERROR=STAGING_NOT_FOUND"
    exit 1
fi

echo "===== HASHING ====="

find "$STAGING" -type f -print0 2>/dev/null |
while IFS= read -r -d '' f; do
    sha256sum "$f"
done > "$HASHES"

echo "HASH_MANIFEST=$HASHES"
echo

echo "===== EXACT DUPLICATES ====="

awk '
{
    hash=$1
    $1=""
    sub(/^ /,"")
    file=$0

    if (seen[hash] == "") {
        seen[hash]=file
    } else {
        print hash "\t" seen[hash] "\t" file
    }
}
' "$HASHES" > "$RUN/DUPLICATES.txt"

COUNT=0

while IFS=$'\t' read -r hash original duplicate; do
    [ -z "${duplicate:-}" ] && continue

    if [ -f "$original" ] && [ -f "$duplicate" ]; then
        echo "DELETE_EXACT_DUPLICATE: $duplicate" | tee -a "$LOG"
        echo "IDENTICAL_TO: $original" | tee -a "$LOG"
        echo "SHA256: $hash" | tee -a "$LOG"

        rm -f -- "$duplicate"
        COUNT=$((COUNT+1))
    fi
done < "$RUN/DUPLICATES.txt"

echo | tee -a "$LOG"
echo "DELETED_EXACT_DUPLICATES=$COUNT" | tee -a "$LOG"

echo
echo "===== REMOVE EMPTY STAGING DIRECTORIES ====="
find "$STAGING" -depth -type d -empty -delete 2>/dev/null || true

echo
echo "===== AFTER ====="
du -sh "$STAGING" 2>/dev/null || true
df -h "$HOME"

echo
echo "===== CLEAN COMPLETE ====="
echo "RUN=$RUN"
echo "HASH_MANIFEST=$HASHES"
echo "DELETION_LOG=$LOG"
echo "ROLLBACK_SOURCE=IDENTICAL_RETAINED_FILE"
echo "PROTECTED_AREAS=YES"
