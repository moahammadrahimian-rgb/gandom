#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom/audit"
OUT="$ROOT/SAFE-STAGING-SWEEP-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "===== GANDOM SAFE STAGING SWEEP ====="
echo "ROOT=$ROOT"
echo
echo "این مرحله فقط ANALYZE است؛ هیچ فایل زنده‌ای حذف نمی‌شود."
echo

echo "===== STORAGE ====="
df -h "$HOME"
echo

echo "===== BIGGEST ARCHIVES IN AUDIT ====="
find "$ROOT" -type f \
  \( -name '*.tar.gz' -o -name '*.tgz' -o -name '*.zip' -o -name '*.7z' -o -name '*.bak' \) \
  -printf '%s\t%p\n' 2>/dev/null |
sort -nr |
head -80 |
while IFS=$'\t' read -r size file; do
    printf '%10s  %s\n' "$(numfmt --to=iec "$size" 2>/dev/null || echo "$size")" "$file"
done | tee "$OUT/BIG-ARCHIVES.txt"

echo
echo "===== BIGGEST FILES IN STAGING ====="
find "$ROOT" -path '*/staging/*' -type f -printf '%s\t%p\n' 2>/dev/null |
sort -nr |
head -120 |
while IFS=$'\t' read -r size file; do
    printf '%10s  %s\n' "$(numfmt --to=iec "$size" 2>/dev/null || echo "$size")" "$file"
done | tee "$OUT/BIG-STAGING.txt"

echo
echo "===== STAGING DIRECTORY SIZES ====="
find "$ROOT" -type d -name staging -print 2>/dev/null |
while read -r d; do
    du -sh "$d" 2>/dev/null
done | tee "$OUT/STAGING-SIZES.txt"

echo
echo "===== PROTECTED AREAS ====="
printf '%s\n' \
  "$HOME/gandom/backups" \
  "$HOME/gandom/evidence" \
  "$HOME/gandom/gandom-core" \
  "$HOME/gandom/public" \
  "$HOME/gandom/www" \
  "$HOME/gandom/final-apk" \
  "$HOME/gandom/android" \
  "$HOME/gandom/node_modules"

echo
echo "===== RESULT ====="
echo "ANALYSIS_ONLY=YES"
echo "DELETE=NO"
echo "RUN=$OUT"
