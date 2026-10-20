#!/data/data/com.termux/files/usr/bin/bash
set -u

STAGING="$(find "$PWD/audit" -maxdepth 2 -type d -name staging | sort | tail -1)"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$PWD/audit/FAST-33-BACKTEST-$TS"
mkdir -p "$OUT"

echo "===== GANDOM 2558 FAST BACKTEST ====="
echo "STAGING=$STAGING"
echo "MODE=STATIC-SAFETY-ANALYSIS"
echo "EXECUTE_PROJECT_CODE=NO"
echo "DELETE=NO"
echo

echo "===== JAVASCRIPT SYNTAX ====="
: > "$OUT/js.txt"

find "$STAGING" -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.cjs" \) -print0 |
while IFS= read -r -d '' f; do
    if node --check "$f" >/dev/null 2>&1; then
        echo "PASS|$f" | tee -a "$OUT/js.txt"
    else
        echo "FAIL|$f" | tee -a "$OUT/js.txt"
    fi
done

echo
echo "===== JSON VALIDATION ====="
: > "$OUT/json.txt"

find "$STAGING" -type f -name "*.json" -print0 |
while IFS= read -r -d '' f; do
    if node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$f" >/dev/null 2>&1; then
        echo "PASS|$f" | tee -a "$OUT/json.txt"
    else
        echo "FAIL|$f" | tee -a "$OUT/json.txt"
    fi
done

echo
echo "===== ARCHIVE CONTENT INVENTORY ====="
: > "$OUT/archives.txt"

find "$STAGING" -type f \( -name "*.tar.gz" -o -name "*.tgz" -o -name "*.tar" \) -print0 |
while IFS= read -r -d '' f; do
    echo "===== $f =====" | tee -a "$OUT/archives.txt"
    tar -tzf "$f" 2>/dev/null |
      head -80 |
      tee -a "$OUT/archives.txt" || echo "ARCHIVE_READ_FAIL|$f" | tee -a "$OUT/archives.txt"
    echo | tee -a "$OUT/archives.txt"
done

echo
echo "===== REAL / NEURAL / BRAIN CANDIDATES ====="
grep -Ei \
'REAL-|NEURAL|BRAIN|NODE-LIFE|SELFHEAL|LANGUAGE-BRAIN|PAYMENT|REVENUE|TREASURE|DEPENDENCY' \
"$OUT/js.txt" "$OUT/json.txt" "$OUT/archives.txt" \
2>/dev/null | head -250 | tee "$OUT/candidates.txt"

echo
echo "===== RESULT ====="
echo "ANALYSIS_ONLY=YES"
echo "PROJECT_CODE_EXECUTED=NO"
echo "DELETE=NO"
echo "LIVE_MODIFICATION=NO"
echo "BACKUPS_MODIFIED=NO"
echo "EVIDENCE_MODIFIED=NO"
echo "REPORT=$OUT"
