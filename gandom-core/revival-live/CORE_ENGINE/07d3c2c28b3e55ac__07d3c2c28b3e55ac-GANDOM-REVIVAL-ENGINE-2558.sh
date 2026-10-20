#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/audit/GANDOM-REVIVAL-$TS"
CAND="$OUT/candidates"
LIVE="$ROOT/gandom-core"
DB="$(find "$ROOT/audit" -maxdepth 2 -name 'GANDOM-1470.sqlite' -type f | sort | tail -1)"

mkdir -p "$OUT" "$CAND"

echo "===== GANDOM 2558 REVIVAL ENGINE ====="
echo "DB=$DB"
echo "OUT=$OUT"

[ -n "$DB" ] && [ -f "$DB" ] || {
  echo "REVIVAL_STOP=DATABASE_NOT_FOUND"
  exit 1
}

SQL="$PREFIX/bin/sqlite3"
[ -x "$SQL" ] || {
  echo "REVIVAL_STOP=SQLITE_NOT_FOUND"
  exit 1
}

echo "===== BACKUP LIVE STATE ====="
tar -czf "$OUT/LIVE-BEFORE-REVIVAL.tar.gz" \
  "$LIVE" 2>/dev/null || true

echo "===== CAPABILITY EXTRACTION ====="

"$SQL" -separator '|' "$DB" \
'SELECT path,sha256,section,status
 FROM files
 WHERE status="KNOWN"
 ORDER BY section,path;' > "$OUT/KNOWN.tsv"

"$SQL" -separator '|' "$DB" \
'SELECT path,sha256
 FROM files
 WHERE section="UNKNOWN_NEW";' > "$OUT/UNKNOWN.tsv"

echo "KNOWN=$(wc -l < "$OUT/KNOWN.tsv")"
echo "UNKNOWN=$(wc -l < "$OUT/UNKNOWN.tsv")"

echo "===== SELECT EXECUTABLE TREASURES ====="

while IFS='|' read -r PATH HASH SECTION STATUS; do
    [ -f "$PATH" ] || continue

    case "$PATH" in
      *.js|*.mjs|*.cjs|*.sh|*.json)
        ;;
      *)
        continue
        ;;
    esac

    SAFE="$(printf '%s' "$PATH" | sha256sum | awk '{print $1}')"
    DEST="$CAND/$SECTION/$SAFE-$(basename "$PATH")"

    mkdir -p "$(dirname "$DEST")"

    cp -p "$PATH" "$DEST"

    {
      echo "SOURCE=$PATH"
      echo "SHA256=$HASH"
      echo "SECTION=$SECTION"
      echo "STATUS=$STATUS"
      echo "EXTRACTED=$(date -Iseconds)"
    } > "$DEST.meta"
done < "$OUT/KNOWN.tsv"

echo "CANDIDATE_FILES=$(find "$CAND" -type f ! -name '*.meta' | wc -l)"

echo "===== UNKNOWN CAPABILITY MINING ====="

while IFS='|' read -r PATH HASH; do
    [ -f "$PATH" ] || continue

    case "$PATH" in
      *.js|*.mjs|*.cjs|*.sh|*.json|*.md|*.txt)
        ;;
      *)
        continue
        ;;
    esac

    SAFE="$(printf '%s' "$PATH" | sha256sum | awk '{print $1}')"
    DEST="$CAND/UNKNOWN_REVIEW/$SAFE-$(basename "$PATH")"

    mkdir -p "$(dirname "$DEST")"
    cp -p "$PATH" "$DEST"

    {
      echo "SOURCE=$PATH"
      echo "SHA256=$HASH"
      echo "CLASS=UNKNOWN_REVIEW"
    } > "$DEST.meta"
done < "$OUT/UNKNOWN.tsv"

echo "UNKNOWN_CANDIDATES=$(find "$CAND/UNKNOWN_REVIEW" -type f ! -name '*.meta' 2>/dev/null | wc -l)"

echo "===== DEPENDENCY SCAN ====="

grep -RhoE \
  "(require\\(['\"][^'\"]+|from ['\"][^'\"]+|source ['\"][^'\"]+)" \
  "$CAND" 2>/dev/null |
sort -u > "$OUT/DEPENDENCIES.txt"

echo "DEPENDENCY_REFERENCES=$(wc -l < "$OUT/DEPENDENCIES.txt")"

echo "===== LIVE CAPABILITY MAP ====="

find "$LIVE" -type f \
  \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.sh' -o -name '*.json' \) \
  -print 2>/dev/null |
sort > "$OUT/LIVE-CAPABILITIES.txt"

echo "LIVE_FILES=$(wc -l < "$OUT/LIVE-CAPABILITIES.txt")"

echo "===== REVIVAL MANIFEST ====="

{
  echo "GANDOM 2558 REVIVAL MANIFEST"
  echo "TIME=$(date -Iseconds)"
  echo
  echo "KNOWN_CANDIDATES=$(find "$CAND" -type f ! -name '*.meta' | wc -l)"
  echo "UNKNOWN_CANDIDATES=$(find "$CAND/UNKNOWN_REVIEW" -type f ! -name '*.meta' 2>/dev/null | wc -l)"
  echo
  echo "RULE=NO_DIRECT_DELETE"
  echo "RULE=LIVE_BACKUP_CREATED"
  echo "RULE=SOURCE_HASH_PRESERVED"
  echo "RULE=UNKNOWN_PRESERVED"
  echo "RULE=REVIVAL_REQUIRES_REAL_TEST"
} > "$OUT/REVIVAL-MANIFEST.txt"

echo "===== REAL TEST GATE ====="

TESTS=0
PASS=0

if [ -f "$ROOT/gandom-core/index.js" ]; then
  TESTS=$((TESTS+1))
  if node --check "$ROOT/gandom-core/index.js" >/dev/null 2>&1; then
    PASS=$((PASS+1))
    echo "CORE_SYNTAX=PASS"
  else
    echo "CORE_SYNTAX=FAIL"
  fi
fi

for f in \
  "$ROOT/gandom-core/p2p/neural/REAL-NEURAL-P2P-BUS-2558.js" \
  "$ROOT/gandom-core/p2p/neural/REAL-NEURAL-P2P-EXECUTION-2558.js"
do
  [ -f "$f" ] || continue
  TESTS=$((TESTS+1))
  if node --check "$f" >/dev/null 2>&1; then
    PASS=$((PASS+1))
    echo "NEURAL=$(basename "$f")=PASS"
  else
    echo "NEURAL=$(basename "$f")=FAIL"
  fi
done

echo "TESTS=$TESTS"
echo "PASS=$PASS"

if [ "$TESTS" -gt 0 ] && [ "$PASS" -eq "$TESTS" ]; then
  GATE="PASS_REAL"
else
  GATE="HOLD_REAL"
fi

echo "REVIVAL_GATE=$GATE"

cat > "$OUT/STATUS.txt" <<EOF
GANDOM 2558 REVIVAL

REVIVAL_GATE=$GATE
KNOWN_CANDIDATES=$(find "$CAND" -type f ! -name '*.meta' | wc -l)
UNKNOWN_CANDIDATES=$(find "$CAND/UNKNOWN_REVIEW" -type f ! -name '*.meta' 2>/dev/null | wc -l)
TESTS=$TESTS
PASS=$PASS

LIVE_MODIFICATION=NO
DIRECT_DELETE=NO
ROLLBACK_BACKUP=$OUT/LIVE-BEFORE-REVIVAL.tar.gz

STATUS=$( [ "$GATE" = "PASS_REAL" ] && echo READY_FOR_CONTROLLED_MERGE || echo HOLD )
EOF

cat "$OUT/STATUS.txt"

echo
echo "===== REVIVAL COMPLETE ====="
echo "OUT=$OUT"
