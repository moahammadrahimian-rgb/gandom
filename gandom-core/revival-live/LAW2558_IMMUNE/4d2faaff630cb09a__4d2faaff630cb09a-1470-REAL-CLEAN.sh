#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$PWD"
STAGING="$ROOT/audit/REVIVAL-1470-20261007-210838/staging"
RUN="$ROOT/audit/1470-REAL-CLEAN-$(date +%Y%m%d-%H%M%S)"
LOG="$RUN/DELETION-LOG.txt"

mkdir -p "$RUN"

echo "===== GANDOM 2558 REAL STAGING CLEAN ====="
echo "STAGING=$STAGING"
echo "DELETE=YES"
echo "LIVE_AREAS=PROTECTED"
echo

{
echo "GANDOM 2558 REAL STAGING CLEAN"
echo "DATE=$(date)"
echo "STAGING=$STAGING"
echo
} > "$LOG"

echo "===== BEFORE ====="
du -sh "$STAGING"

echo
echo "===== EXACT DUPLICATES ====="

find "$STAGING" -type f -printf '%s\t%p\n' |
sort -n > "$RUN/FILES.tsv"

awk -F '\t' '
{
 n[$1]++
 files[$1]=files[$1] "\n" $2
}
END {
 for (s in n)
   if (n[s] > 1) {
     print "SIZE=" s
     printf "%s\n", files[s]
   }
}' "$RUN/FILES.tsv" > "$RUN/COLLISIONS.txt"

awk '
/^SIZE=/ {
 size=$0
 next
}
NF {
 if (first[size] == "") {
   first[size]=$0
   next
 }
 print size "\t" first[size] "\t" $0
}' "$RUN/COLLISIONS.txt" |
while IFS=$'\t' read -r size keep candidate; do

    [ -f "$keep" ] || continue
    [ -f "$candidate" ] || continue

    if cmp -s "$keep" "$candidate"; then
        echo "DELETE_EXACT_DUPLICATE: $candidate"
        echo "KEEP: $keep"

        printf 'DELETE_EXACT_DUPLICATE\t%s\tKEEP=%s\n' \
          "$candidate" "$keep" >> "$LOG"

        rm -f -- "$candidate"
    fi
done

echo
echo "===== ZERO BYTE ====="

find "$STAGING" -type f -size 0 -print0 |
while IFS= read -r -d '' f; do
    echo "DELETE_ZERO_BYTE: $f"
    printf 'DELETE_ZERO_BYTE\t%s\n' "$f" >> "$LOG"
    rm -f -- "$f"
done

echo
echo "===== TEMP ARTIFACTS ====="

find "$STAGING" -type f \( \
    -name '*.tmp' -o \
    -name '*.hash.tmp' -o \
    -name '*.sha.tmp' \
\) -print0 |
while IFS= read -r -d '' f; do
    echo "DELETE_TEMP: $f"
    printf 'DELETE_TEMP\t%s\n' "$f" >> "$LOG"
    rm -f -- "$f"
done

echo
echo "===== EMPTY DIRECTORIES ====="

find "$STAGING" -depth -type d -empty -print0 |
while IFS= read -r -d '' d; do
    echo "REMOVE_EMPTY_DIR: $d"
    printf 'REMOVE_EMPTY_DIR\t%s\n' "$d" >> "$LOG"
    rmdir -- "$d" 2>/dev/null || true
done

echo
echo "===== AFTER ====="
du -sh "$STAGING"

echo
echo "===== RESULT ====="
echo "CLEAN=COMPLETE"
echo "DELETION_LOG=$LOG"
echo "PROTECTED_LIVE_AREAS=YES"
echo "STAGING_ONLY=YES"
