#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
STAMP="$(date +%Y%m%d-%H%M%S)"
RUN="$ROOT/audit/REVIVAL-1470-MOTHER-$STAMP"

RAW="$RUN/raw"
META="$RUN/metadata"
ANALYSIS="$RUN/analysis"
STAGE="$RUN/staging"
EVID="$RUN/evidence"

mkdir -p "$RAW" "$META" "$ANALYSIS" "$STAGE" "$EVID"

echo "===================================================="
echo " GANDOM — 1470 BACKUP MOTHER INGESTION ENGINE"
echo "===================================================="
echo "RUN=$RUN"
echo "LAW2558=ACTIVE"
echo "MODE=DISCOVERY_ANALYSIS_STAGED_REVIVAL"
echo "RESTORE=NO"
echo "DELETE=NO"
echo "OVERWRITE=NO"
echo "LIVE_CODE_MODIFIED=NO"
echo "FAKE_PASS=FORBIDDEN"
echo

# ----------------------------------------------------
# 1. PROTECT CURRENT LIVE STATE
# ----------------------------------------------------

echo "===== 1. PROTECT CURRENT LIVE STATE ====="

tar -czf "$EVID/LIVE-BEFORE-1470-INGEST.tar.gz" \
  --exclude="./audit" \
  --exclude="./node_modules" \
  "$ROOT" 2>/dev/null || true

sha256sum "$EVID/LIVE-BEFORE-1470-INGEST.tar.gz" \
  > "$EVID/LIVE-BEFORE-1470-INGEST.sha256" 2>/dev/null || true

echo "CURRENT_LIVE_BACKUP=CREATED"

# ----------------------------------------------------
# 2. DISCOVER EVERYTHING — PROJECT + USB
# ----------------------------------------------------

echo
echo "===== 2. DISCOVER ALL POSSIBLE BACKUP SOURCES ====="

find "$ROOT" \
  -path "$ROOT/node_modules" -prune -o \
  -path "$ROOT/.git" -prune -o \
  -path "$ROOT/audit" -prune -o \
  -type f \
  \( \
    -iname "*1470*" \
    -o -iname "*backup*" \
    -o -iname "*snapshot*" \
    -o -iname "*restore*" \
    -o -iname "*archive*" \
    -o -iname "*full*" \
    -o -iname "*live*" \
    -o -iname "*.tar" \
    -o -iname "*.tar.gz" \
    -o -iname "*.tgz" \
    -o -iname "*.zip" \
    -o -iname "*.gz" \
  \) \
  -print 2>/dev/null | sort -u \
  > "$META/PROJECT-SOURCES.txt"

if [ -d /storage ]; then
  find /storage \
    -type f \
    \( \
      -iname "*1470*" \
      -o -iname "*backup*" \
      -o -iname "*snapshot*" \
      -o -iname "*restore*" \
      -o -iname "*archive*" \
      -o -iname "*full*" \
      -o -iname "*live*" \
      -o -iname "*.tar" \
      -o -iname "*.tar.gz" \
      -o -iname "*.tgz" \
      -o -iname "*.zip" \
      -o -iname "*.gz" \
    \) \
    -print 2>/dev/null | sort -u \
    > "$META/STORAGE-SOURCES.txt"
else
  : > "$META/STORAGE-SOURCES.txt"
fi

cat "$META/PROJECT-SOURCES.txt" \
    "$META/STORAGE-SOURCES.txt" 2>/dev/null |
sort -u > "$META/ALL-SOURCES.txt"

SOURCE_COUNT=$(wc -l < "$META/ALL-SOURCES.txt")

echo "SOURCE_COUNT=$SOURCE_COUNT"

# ----------------------------------------------------
# 3. IMMUTABLE SOURCE MANIFEST
# ----------------------------------------------------

echo
echo "===== 3. IMMUTABLE SOURCE MANIFEST ====="

while IFS= read -r f; do
  [ -f "$f" ] || continue

  size=$(wc -c < "$f" 2>/dev/null || echo 0)
  hash=$(sha256sum "$f" 2>/dev/null | awk '{print $1}' || echo HASH_ERROR)

  printf '%s\t%s\t%s\n' "$hash" "$size" "$f"
done < "$META/ALL-SOURCES.txt" \
> "$META/SOURCE-MANIFEST.tsv"

echo "MANIFEST_LINES=$(wc -l < "$META/SOURCE-MANIFEST.tsv")"

# ----------------------------------------------------
# 4. DUPLICATES — NEVER DELETE
# ----------------------------------------------------

echo
echo "===== 4. DUPLICATE ANALYSIS ====="

awk -F '\t' '
{
  count[$1]++
  files[$1]=files[$1] "\n" $3
}
END {
  for (h in count)
    if (count[h] > 1) {
      print "HASH=" h " COUNT=" count[h] files[h]
    }
}' "$META/SOURCE-MANIFEST.tsv" \
> "$ANALYSIS/DUPLICATES-BY-SHA256.txt"

echo "DUPLICATE_HASH_GROUPS=$(grep -c '^HASH=' "$ANALYSIS/DUPLICATES-BY-SHA256.txt" 2>/dev/null || echo 0)"
echo "DUPLICATES=ANALYZE_ONLY"

# ----------------------------------------------------
# 5. CLASSIFY ALL KNOWLEDGE
# ----------------------------------------------------

echo
echo "===== 5. LIVING-SYSTEM CLASSIFICATION ====="

: > "$ANALYSIS/DNA.txt"
: > "$ANALYSIS/LAW2558.txt"
: > "$ANALYSIS/BRAIN.txt"
: > "$ANALYSIS/NEURON.txt"
: > "$ANALYSIS/P2P.txt"
: > "$ANALYSIS/NODE.txt"
: > "$ANALYSIS/CELL.txt"
: > "$ANALYSIS/ENGINE.txt"
: > "$ANALYSIS/LIFECYCLE.txt"
: > "$ANALYSIS/API.txt"
: > "$ANALYSIS/WALLET_REVENUE.txt"
: > "$ANALYSIS/UI.txt"
: > "$ANALYSIS/TEST_EVIDENCE.txt"
: > "$ANALYSIS/UNKNOWN.txt"

while IFS= read -r f; do

  low=$(printf '%s' "$f" | tr '[:upper:]' '[:lower:]')

  case "$low" in
    *dna*) printf '%s\n' "$f" >> "$ANALYSIS/DNA.txt" ;;
  esac

  case "$low" in
    *2558*|*law2558*) printf '%s\n' "$f" >> "$ANALYSIS/LAW2558.txt" ;;
  esac

  case "$low" in
    *brain*) printf '%s\n' "$f" >> "$ANALYSIS/BRAIN.txt" ;;
  esac

  case "$low" in
    *neural*|*neuron*) printf '%s\n' "$f" >> "$ANALYSIS/NEURON.txt" ;;
  esac

  case "$low" in
    *p2p*|*peer*|*tcp*|*websocket*) printf '%s\n' "$f" >> "$ANALYSIS/P2P.txt" ;;
  esac

  case "$low" in
    *node*|*registry*|*node-link*) printf '%s\n' "$f" >> "$ANALYSIS/NODE.txt" ;;
  esac

  case "$low" in
    *cell*) printf '%s\n' "$f" >> "$ANALYSIS/CELL.txt" ;;
  esac

  case "$low" in
    *engine*|*execution*) printf '%s\n' "$f" >> "$ANALYSIS/ENGINE.txt" ;;
  esac

  case "$low" in
    *lifecycle*|*birth*|*death*|*propagat*) printf '%s\n' "$f" >> "$ANALYSIS/LIFECYCLE.txt" ;;
  esac

  case "$low" in
    *api*|*server*|*http*) printf '%s\n' "$f" >> "$ANALYSIS/API.txt" ;;
  esac

  case "$low" in
    *wallet*|*revenue*|*payment*) printf '%s\n' "$f" >> "$ANALYSIS/WALLET_REVENUE.txt" ;;
  esac

  case "$low" in
    *ui*|*public*|*www*|*html*|*css*) printf '%s\n' "$f" >> "$ANALYSIS/UI.txt" ;;
  esac

  case "$low" in
    *test*|*evidence*|*verify*|*proof*) printf '%s\n' "$f" >> "$ANALYSIS/TEST_EVIDENCE.txt" ;;
  esac

done < "$META/ALL-SOURCES.txt"

# ----------------------------------------------------
# 6. DO NOT LOSE UNKNOWN MATERIAL
# ----------------------------------------------------

echo
echo "===== 6. UNKNOWN MATERIAL PRESERVATION ====="

cat "$ANALYSIS/DNA.txt" \
    "$ANALYSIS/LAW2558.txt" \
    "$ANALYSIS/BRAIN.txt" \
    "$ANALYSIS/NEURON.txt" \
    "$ANALYSIS/P2P.txt" \
    "$ANALYSIS/NODE.txt" \
    "$ANALYSIS/CELL.txt" \
    "$ANALYSIS/ENGINE.txt" \
    "$ANALYSIS/LIFECYCLE.txt" \
    "$ANALYSIS/API.txt" \
    "$ANALYSIS/WALLET_REVENUE.txt" \
    "$ANALYSIS/UI.txt" \
    "$ANALYSIS/TEST_EVIDENCE.txt" \
  | sort -u > "$ANALYSIS/KNOWN-LIVING-SOURCES.txt"

grep -Fxv -f "$ANALYSIS/KNOWN-LIVING-SOURCES.txt" \
  "$META/ALL-SOURCES.txt" \
  > "$ANALYSIS/UNKNOWN.txt" || true

echo "UNKNOWN=$(wc -l < "$ANALYSIS/UNKNOWN.txt")"

# ----------------------------------------------------
# 7. REAL JAVASCRIPT SYNTAX ANALYSIS
# ----------------------------------------------------

echo
echo "===== 7. REAL SYNTAX ANALYSIS ====="

: > "$ANALYSIS/SYNTAX.tsv"

PASS=0
FAIL=0

while IFS= read -r f; do
  case "$f" in
    *.js)
      if node --check "$f" >/dev/null 2>&1; then
        printf 'PASS_SYNTAX\t%s\n' "$f" >> "$ANALYSIS/SYNTAX.tsv"
        PASS=$((PASS+1))
      else
        printf 'FAIL_SYNTAX\t%s\n' "$f" >> "$ANALYSIS/SYNTAX.tsv"
        FAIL=$((FAIL+1))
      fi
    ;;
  esac
done < "$META/ALL-SOURCES.txt"

echo "PASS_SYNTAX=$PASS"
echo "FAIL_SYNTAX=$FAIL"

# ----------------------------------------------------
# 8. DEPENDENCY / REFERENCE EXTRACTION
# ----------------------------------------------------

echo
echo "===== 8. DEPENDENCY EXTRACTION ====="

: > "$ANALYSIS/DEPENDENCY-REFERENCES.txt"

while IFS= read -r f; do
  case "$f" in
    *.js|*.json|*.ts|*.mjs|*.cjs)
      grep -En \
        'require\(|from[[:space:]]+["'\'']|import[[:space:]]|module\.exports|exports\.|process\.env|WebSocket|http|crypto' \
        "$f" 2>/dev/null |
      sed "s#^#$f:#" >> "$ANALYSIS/DEPENDENCY-REFERENCES.txt" || true
    ;;
  esac
done < "$META/ALL-SOURCES.txt"

echo "DEPENDENCY_REFERENCES=$(wc -l < "$ANALYSIS/DEPENDENCY-REFERENCES.txt")"

# ----------------------------------------------------
# 9. STAGE — PRESERVE ORIGINAL RELATIVE PATH
# ----------------------------------------------------

echo
echo "===== 9. STAGED REVIVAL ====="

while IFS= read -r f; do
  [ -f "$f" ] || continue

  case "$f" in
    "$ROOT"/*)
      rel="${f#$ROOT/}"
      dst="$STAGE/project/$rel"
      ;;
    /storage/*)
      rel="${f#/storage/}"
      dst="$STAGE/storage/$rel"
      ;;
    *)
      continue
      ;;
  esac

  mkdir -p "$(dirname "$dst")"

  # COPY ONLY — NEVER MOVE
  cp -p "$f" "$dst" 2>/dev/null || {
    echo "STAGE_COPY_FAILED=$f" >> "$EVID/STAGE-ERRORS.txt"
  }

done < "$META/ALL-SOURCES.txt"

echo "STAGED_FILES=$(find "$STAGE" -type f 2>/dev/null | wc -l)"

# ----------------------------------------------------
# 10. SPECIAL LIVING CORE REPORT
# ----------------------------------------------------

echo
echo "===== 10. LIVING CORE ====="

for x in \
  DNA LAW2558 BRAIN NEURON P2P NODE CELL ENGINE LIFECYCLE \
  API WALLET_REVENUE UI TEST_EVIDENCE UNKNOWN
do
  n=$(wc -l < "$ANALYSIS/$x.txt" 2>/dev/null || echo 0)
  printf '%-20s=%s\n' "$x" "$n"
done

# ----------------------------------------------------
# 11. TARGET MODEL
# ----------------------------------------------------

echo
echo "===== 11. LIVING TARGET MODEL ====="
echo "TARGET_NODES=20000"
echo "TARGET_CELLS_PER_NODE=400000"
echo "TARGET_TOTAL_CELLS=8000000000"
echo "TARGET_STATUS=ARCHITECTURAL_TARGET_ONLY"
echo "REALITY_RULE=ONLY_REAL_EXECUTION_COUNTS"

# ----------------------------------------------------
# 12. FINAL CONTROL
# ----------------------------------------------------

cat > "$EVID/CONTROL.txt" <<CONTROL
GANDOM 1470 MOTHER INGESTION

RUN=$RUN

RESTORE=NO
DELETE=NO
OVERWRITE=NO
LIVE_CODE_MODIFIED=NO
FAKE_PASS=FORBIDDEN

ALL_DISCOVERED_SOURCES_ARE_PRESERVED=YES
UNKNOWN_SOURCES_ARE_PRESERVED=YES
DUPLICATES_ARE_PRESERVED=YES
FAIL_SYNTAX_SOURCES_ARE_PRESERVED=YES
ORIGINAL_HASHES_RECORDED=YES
STAGING_ONLY=YES

TARGET_NODES=20000
TARGET_CELLS_PER_NODE=400000
TARGET_TOTAL_CELLS=8000000000

NEXT=INDEPENDENT_CANONICAL_LIVING_CORE_RECONSTRUCTION
CONTROL

echo
echo "===================================================="
echo " 1470 MOTHER INGESTION COMPLETE"
echo "===================================================="
cat "$EVID/CONTROL.txt"
echo
echo "RUN=$RUN"
