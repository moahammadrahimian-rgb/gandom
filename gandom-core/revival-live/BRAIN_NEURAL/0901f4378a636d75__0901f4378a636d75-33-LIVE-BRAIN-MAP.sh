#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$PWD"
STAGING="$(find "$ROOT/audit" -maxdepth 2 -type d -name staging | sort | tail -1)"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/audit/33-LIVE-BRAIN-MAP-$TS"
mkdir -p "$OUT"

echo "===== GANDOM 2558 — 33 LIVE BRAIN MAP ====="
echo "ROOT=$ROOT"
echo "STAGING=$STAGING"
echo "MODE=ANALYSIS_ONLY"
echo "DELETE=NO"
echo "LIVE_MODIFICATION=NO"
echo

echo "===== LIVE ROOTS =====" | tee "$OUT/live-roots.txt"
for p in \
  "$ROOT/gandom-core" \
  "$ROOT/public" \
  "$ROOT/www" \
  "$ROOT/server.js" \
  "$ROOT/package.json" \
  "$ROOT/android" \
  "$ROOT/final-apk" \
  "$ROOT/evidence" \
  "$ROOT/backups"
do
  [ -e "$p" ] && printf '%s\n' "$p" | tee -a "$OUT/live-roots.txt"
done

echo
echo "===== STAGING INVENTORY ====="
find "$STAGING" -type f 2>/dev/null | sort > "$OUT/all-files.txt"
wc -l "$OUT/all-files.txt"

echo
echo "===== FILE CLASSIFICATION ====="

: > "$OUT/classification.tsv"

while IFS= read -r f; do
    rel="${f#$STAGING/}"
    base="$(basename "$f")"
    size="$(wc -c < "$f" 2>/dev/null || echo 0)"
    sha="$(sha256sum "$f" 2>/dev/null | awk '{print $1}')"

    case "$rel" in
      Law2558/*|*2558*|*LAW*|*GOLDEN-MOTHER*)
        class="LAW2558"
        ;;
      P2P-Node/*|*P2P*|*NEURAL*|*BRAIN*|*NODE*)
        class="P2P-BRAIN"
        ;;
      Engine-Execution/*|*ENGINE*|*EXECUTION*|*RUNTIME*)
        class="ENGINE"
        ;;
      Wallet-Revenue/*|*WALLET*|*REVENUE*)
        class="WALLET-REVENUE"
        ;;
      Unknown/*)
        class="UNKNOWN"
        ;;
      *)
        class="OTHER"
        ;;
    esac

    printf '%s\t%s\t%s\t%s\t%s\n' \
      "$class" "$size" "$sha" "$rel" "$base" \
      >> "$OUT/classification.tsv"
done < "$OUT/all-files.txt"

echo
echo "===== CLASS COUNTS ====="
cut -f1 "$OUT/classification.tsv" |
  sort | uniq -c | sort -nr |
  tee "$OUT/class-counts.txt"

echo
echo "===== ZERO BYTE ====="
awk -F'\t' '$2==0 {print $4}' "$OUT/classification.tsv" |
  tee "$OUT/zero-byte.txt"

echo
echo "===== ARCHIVE / SNAPSHOT / BACKUP ARTIFACTS ====="
grep -Ei '\.(tar|tar\.gz|tgz|zip|bak|snapshot|jsonl)$|backup|snapshot|archive' \
  "$OUT/all-files.txt" |
  tee "$OUT/archive-artifacts.txt" || true

echo
echo "===== CODE CANDIDATES ====="
grep -Ei '\.(js|mjs|cjs|ts|tsx|jsx|sh|py|json|html|css)$' \
  "$OUT/all-files.txt" |
  tee "$OUT/code-candidates.txt" || true

echo
echo "===== POSSIBLE DEPENDENCY REFERENCES ====="
: > "$OUT/dependency-hits.txt"

while IFS= read -r f; do
  b="$(basename "$f")"
  hits="$(
    grep -RIl --exclude-dir=node_modules --exclude-dir=.git \
      -- "$b" \
      "$ROOT/gandom-core" "$ROOT/public" "$ROOT/www" "$ROOT/server.js" \
      2>/dev/null | head -20
  )"

  if [ -n "$hits" ]; then
    {
      echo "### $b"
      echo "$hits"
      echo
    } >> "$OUT/dependency-hits.txt"
  fi
done < "$OUT/all-files.txt"

echo
echo "===== UNIQUE HASH GROUPS ====="
cut -f3 "$OUT/classification.tsv" |
  sort | uniq -c | sort -nr |
  awk '$1>1' |
  tee "$OUT/hash-groups.txt"

echo
echo "===== RESULT ====="
echo "ANALYSIS_ONLY=YES"
echo "DELETE=NO"
echo "LIVE_MODIFICATION=NO"
echo "BACKUPS_MODIFIED=NO"
echo "EVIDENCE_MODIFIED=NO"
echo "CORE_MODIFIED=NO"
echo "REPORT=$OUT"
echo
echo "NEXT=REVIEW_33_SECTIONS_AND_DEPENDENCIES"
