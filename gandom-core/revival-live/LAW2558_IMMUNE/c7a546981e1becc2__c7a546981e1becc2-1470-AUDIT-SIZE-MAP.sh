#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom/audit"
OUT="$HOME/gandom/audit/1470-AUDIT-SIZE-MAP-$(date +%Y%m%d-%H%M%S).txt"

echo "===== GANDOM 1470 AUDIT SIZE MAP =====" | tee "$OUT"
echo "ROOT=$ROOT" | tee -a "$OUT"
echo | tee -a "$OUT"

echo "===== TOP LEVEL =====" | tee -a "$OUT"
du -sh "$ROOT"/* 2>/dev/null | sort -h | tee -a "$OUT"

echo | tee -a "$OUT"
echo "===== FILE COUNT BY TOP DIRECTORY =====" | tee -a "$OUT"

for d in "$ROOT"/*; do
    [ -d "$d" ] || continue
    n=$(find "$d" -type f 2>/dev/null | wc -l)
    s=$(du -sh "$d" 2>/dev/null | cut -f1)
    printf '%-12s %10s files  %s\n' "$s" "$n" "$d"
done | sort -h | tee -a "$OUT"

echo | tee -a "$OUT"
echo "===== LARGEST FILES — NO HASH =====" | tee -a "$OUT"
find "$ROOT" -type f -printf '%s\t%p\n' 2>/dev/null |
sort -nr |
head -100 |
awk -F '\t' '{
  printf "%.1f MB\t%s\n", $1/1048576, $2
}' | tee -a "$OUT"

echo | tee -a "$OUT"
echo "===== CONTROL =====" | tee -a "$OUT"
echo "ANALYSIS_ONLY=YES" | tee -a "$OUT"
echo "DELETE=NO" | tee -a "$OUT"
echo "RESTORE=NO" | tee -a "$OUT"
echo "LIVE_MODIFICATION=NO" | tee -a "$OUT"
echo "BACKUPS_MODIFIED=NO" | tee -a "$OUT"
echo "EVIDENCE_MODIFIED=NO" | tee -a "$OUT"
echo "CORE_MODIFIED=NO" | tee -a "$OUT"

echo | tee -a "$OUT"
echo "REPORT=$OUT"
