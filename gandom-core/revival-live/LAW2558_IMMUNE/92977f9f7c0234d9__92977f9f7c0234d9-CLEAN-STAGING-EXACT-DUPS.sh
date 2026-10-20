#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
STAGING="$ROOT/audit/REVIVAL-1470-20261007-210838/staging"
RUN="$ROOT/audit/STAGING-EXACT-CLEAN-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$RUN"

echo "===== GANDOM 2558 STAGING EXACT-DUP CLEAN ====="
echo "STAGING=$STAGING"
echo "RUN=$RUN"
echo

if [ ! -d "$STAGING" ]; then
  echo "ERROR=STAGING_NOT_FOUND"
  exit 1
fi

echo "===== BEFORE ====="
du -sh "$STAGING" 2>/dev/null || true
df -h "$HOME" | tail -1

echo
echo "===== HASHING ONLY STAGING ====="

find "$STAGING" -type f -print0 2>/dev/null |
while IFS= read -r -d '' f; do
    size=$(wc -c < "$f" 2>/dev/null) || continue
    printf '%s\t%s\n' "$size" "$f"
done > "$RUN/SIZE-MANIFEST.tsv"

echo "SIZE_MANIFEST=$(wc -l < "$RUN/SIZE-MANIFEST.tsv")"

echo
echo "===== EXACT DUPLICATE DETECTION ====="

awk -F '\t' '
{
  n[$1]++
  files[$1]=files[$1] "\n" $2
}
END {
  for (s in n)
    if (n[s] > 1)
      printf "%s\t%s%s\n", s,n[s],files[s]
}' "$RUN/SIZE-MANIFEST.tsv" > "$RUN/SIZE-CANDIDATES.txt"

: > "$RUN/HASH-MANIFEST.tsv"
: > "$RUN/DELETE-LOG.txt"

declare -A SEEN

while IFS=$'\t' read -r size file; do
    [ -f "$file" ] || continue

    hash=$(sha256sum "$file" 2>/dev/null | awk '{print $1}')
    [ -n "$hash" ] || continue

    printf '%s\t%s\t%s\n' "$hash" "$size" "$file" >> "$RUN/HASH-MANIFEST.tsv"

    key="${hash}|${size}"

    if [ -n "${SEEN[$key]+x}" ]; then
        keep="${SEEN[$key]}"

        echo "DELETE_EXACT_DUPLICATE=$file"
        echo "KEEP_IDENTICAL=$keep"

        printf 'DELETE_EXACT_DUPLICATE\t%s\tKEEP\t%s\tSHA256\t%s\n' \
          "$file" "$keep" "$hash" >> "$RUN/DELETE-LOG.txt"

        rm -f -- "$file"
    else
        SEEN["$key"]="$file"
    fi

done < "$RUN/SIZE-MANIFEST.tsv"

echo
echo "===== REMOVE EMPTY STAGING DIRECTORIES ====="
find "$STAGING" -type d -empty -delete 2>/dev/null || true

echo
echo "===== AFTER ====="
du -sh "$STAGING" 2>/dev/null || true
df -h "$HOME" | tail -1

echo
echo "===== RESULT ====="
echo "HASH_MANIFEST=$RUN/HASH-MANIFEST.tsv"
echo "DELETE_LOG=$RUN/DELETE-LOG.txt"
echo "ROLLBACK_SOURCE=IDENTICAL_RETAINED_FILE"
echo "PROTECTED_AREAS=YES"
echo "LIVE_MODIFICATION=NO"
echo "BACKUPS_MODIFIED=NO"
echo "EVIDENCE_MODIFIED=NO"
echo "CORE_MODIFIED=NO"
echo "=============================================="
