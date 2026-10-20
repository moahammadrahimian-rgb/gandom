#!/data/data/com.termux/files/usr/bin/bash
set -u
set -o pipefail

ROOT="$HOME/gandom"
TS="$(date +%Y%m%d-%H%M%S)"
RUN="$ROOT/audit/REVIVAL-1470-$TS"

DISC="$RUN/discovery"
REPORT="$RUN/report"
STAGE="$RUN/staging"
EVID="$RUN/evidence"
BACKUP="$RUN/current-live-backup"

mkdir -p "$DISC" "$REPORT" "$STAGE" "$EVID" "$BACKUP"

echo "======================================================"
echo " GANDOM 1470 CONTROLLED REVIVAL ENGINE"
echo " LAW 2558 SAFE MODE"
echo "======================================================"
echo "RUN=$RUN"
echo

# ------------------------------------------------------
# 0. HARD SAFETY GATE
# ------------------------------------------------------

export RESTORE=NO
export DELETE=NO
export OVERWRITE=NO
export FAKE_PASS=FORBIDDEN
export LIVE_MODIFICATION=NO

cat > "$RUN/CONTROL.txt" <<CONTROL
GANDOM 1470 CONTROLLED REVIVAL
LAW_2558=ACTIVE

RESTORE=NO
DELETE=NO
OVERWRITE=NO
FAKE_PASS=FORBIDDEN
LIVE_MODIFICATION=NO

RULE:
No backup is trusted merely because its name contains PASS,
2558, LIVE, FINAL, COMPLETE, REAL or 1470.

Every candidate requires:
DISCOVERY
HASH
TYPE
CONTENT_ANALYSIS
CANONICAL_SELECTION
STAGING
TEST
EVIDENCE
INDEPENDENT_VERIFICATION

Unknown material is NOT discarded.
Unknown material is quarantined for analysis.
CONTROL

# ------------------------------------------------------
# 1. PROTECT CURRENT LIVE STATE
# ------------------------------------------------------

echo "===== 1. PROTECT CURRENT LIVE STATE ====="

tar \
  --exclude='./audit' \
  --exclude='./node_modules' \
  -czf "$BACKUP/current-live.tar.gz" \
  -C "$ROOT" . 2>/dev/null || true

if [ -f "$BACKUP/current-live.tar.gz" ]; then
    sha256sum "$BACKUP/current-live.tar.gz" \
      > "$BACKUP/current-live.sha256"
    echo "CURRENT_LIVE_BACKUP=CREATED"
else
    echo "CURRENT_LIVE_BACKUP=FAILED"
    exit 2
fi

# ------------------------------------------------------
# 2. FIND ALL POSSIBLE BACKUP SOURCES
# ------------------------------------------------------

echo
echo "===== 2. DISCOVER ALL POSSIBLE SOURCES ====="

SOURCE_LIST="$DISC/ALL-SOURCES.txt"
: > "$SOURCE_LIST"

# Current project
find "$ROOT" \
  -path "$ROOT/audit" -prune -o \
  -type f \
  \( \
    -iname '*backup*' -o \
    -iname '*snapshot*' -o \
    -iname '*restore*' -o \
    -iname '*archive*' -o \
    -iname '*1470*' -o \
    -iname '*2558*' -o \
    -iname '*gandom*' -o \
    -iname '*gandum*' \
  \) -print 2>/dev/null >> "$SOURCE_LIST"

# Common external storage
for SD in /storage/* /sdcard; do
    [ -d "$SD" ] || continue

    find "$SD" \
      -type f \
      \( \
        -iname '*backup*' -o \
        -iname '*snapshot*' -o \
        -iname '*restore*' -o \
        -iname '*archive*' -o \
        -iname '*1470*' -o \
        -iname '*2558*' -o \
        -iname '*gandom*' -o \
        -iname '*gandum*' \
      \) -print 2>/dev/null >> "$SOURCE_LIST"
done

sort -u "$SOURCE_LIST" -o "$SOURCE_LIST"

SOURCE_COUNT="$(wc -l < "$SOURCE_LIST" | tr -d ' ')"

echo "DISCOVERED_SOURCES=$SOURCE_COUNT"

# ------------------------------------------------------
# 3. DISCOVER BACKUP DIRECTORIES
# ------------------------------------------------------

echo
echo "===== 3. BACKUP DIRECTORIES ====="

DIR_LIST="$DISC/BACKUP-DIRECTORIES.txt"
: > "$DIR_LIST"

find "$ROOT" \
  -type d \
  \( \
    -iname '*backup*' -o \
    -iname '*snapshot*' -o \
    -iname '*archive*' -o \
    -iname '*1470*' -o \
    -iname '*2558*' \
  \) -print 2>/dev/null >> "$DIR_LIST"

for SD in /storage/* /sdcard; do
    [ -d "$SD" ] || continue

    find "$SD" \
      -type d \
      \( \
        -iname '*backup*' -o \
        -iname '*snapshot*' -o \
        -iname '*archive*' -o \
        -iname '*1470*' -o \
        -iname '*2558*' \
      \) -print 2>/dev/null >> "$DIR_LIST"
done

sort -u "$DIR_LIST" -o "$DIR_LIST"

echo "BACKUP_DIRECTORIES=$(wc -l < "$DIR_LIST" | tr -d ' ')"

# ------------------------------------------------------
# 4. COMPLETE HASH INVENTORY
# ------------------------------------------------------

echo
echo "===== 4. HASH INVENTORY ====="

HASH_FILE="$REPORT/SOURCE-HASHES.tsv"

printf "PATH\tSIZE\tSHA256\tTYPE\n" > "$HASH_FILE"

while IFS= read -r F; do
    [ -f "$F" ] || continue

    SIZE="$(stat -c '%s' "$F" 2>/dev/null || echo 0)"
    HASH="$(sha256sum "$F" 2>/dev/null | awk '{print $1}')"
    TYPE="$(file -b "$F" 2>/dev/null | tr '\t' ' ')"

    printf "%s\t%s\t%s\t%s\n" \
      "$F" "$SIZE" "$HASH" "$TYPE" >> "$HASH_FILE"

done < "$SOURCE_LIST"

echo "HASH_INVENTORY=COMPLETE"

# ------------------------------------------------------
# 5. CONTENT / CAPABILITY ANALYSIS
# ------------------------------------------------------

echo
echo "===== 5. CONTENT CAPABILITY ANALYSIS ====="

CANDIDATE="$REPORT/CANDIDATES.tsv"
UNKNOWN="$REPORT/UNKNOWN.tsv"

printf "SCORE\tCATEGORY\tPATH\tREASON\n" > "$CANDIDATE"
printf "PATH\tTYPE\tSIZE\tREASON\n" > "$UNKNOWN"

while IFS= read -r F; do

    [ -f "$F" ] || continue

    NAME="$(basename "$F" | tr '[:upper:]' '[:lower:]')"
    TYPE="$(file -b "$F" 2>/dev/null | tr '[:upper:]' '[:lower:]')"
    SIZE="$(stat -c '%s' "$F" 2>/dev/null || echo 0)"

    SCORE=0
    CATEGORY="UNKNOWN"
    REASON=""

    # ------------------------------------------
    # LAW 2558 / GOVERNANCE
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      '2558|law|constitution|governance|evidence|verify|verification|seal|trust'; then
        SCORE=$((SCORE+100))
        CATEGORY="LAW2558"
        REASON="$REASON LAW2558"
    fi

    # ------------------------------------------
    # BRAIN / NEURON
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      'brain|neural|neuron|neron|cell-life|safety-governor|synapse'; then
        SCORE=$((SCORE+95))
        CATEGORY="BRAIN_NEURON"
        REASON="$REASON BRAIN_NEURON"
    fi

    # ------------------------------------------
    # P2P / NODE
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      'p2p|peer|node|tcp|transport|handshake|heartbeat|discovery|registry'; then
        SCORE=$((SCORE+90))
        CATEGORY="P2P_NODE"
        REASON="$REASON P2P_NODE"
    fi

    # ------------------------------------------
    # ENGINE / EXECUTION
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      'engine|execution|executor|runtime|worker|state|lifecycle'; then
        SCORE=$((SCORE+85))
        CATEGORY="ENGINE_EXECUTION"
        REASON="$REASON ENGINE_EXECUTION"
    fi

    # ------------------------------------------
    # CELL / MATH / PHYSICS
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      'cell|math|physics|laplacian|conservation|stability|geometry'; then
        SCORE=$((SCORE+80))
        CATEGORY="CELL_MATH_PHYSICS"
        REASON="$REASON CELL_MATH_PHYSICS"
    fi

    # ------------------------------------------
    # REVENUE / WALLET / PAYMENT
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      'wallet|payment|revenue|economic|finance|money|transfer'; then
        SCORE=$((SCORE+70))
        CATEGORY="WALLET_REVENUE"
        REASON="$REASON WALLET_REVENUE"
    fi

    # ------------------------------------------
    # API / SERVER
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      'api|server|http|websocket|ws|service'; then
        SCORE=$((SCORE+60))
        CATEGORY="API_SERVER"
        REASON="$REASON API_SERVER"
    fi

    # ------------------------------------------
    # UI
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      'ui|frontend|public|www|html|css|dashboard'; then
        SCORE=$((SCORE+50))
        CATEGORY="UI"
        REASON="$REASON UI"
    fi

    # ------------------------------------------
    # TESTS / EVIDENCE
    # ------------------------------------------

    if echo "$NAME $TYPE" | grep -Eq \
      'test|integration|real-two-peer|evidence|audit'; then
        SCORE=$((SCORE+45))
        [ "$CATEGORY" = "UNKNOWN" ] && CATEGORY="TEST_EVIDENCE"
        REASON="$REASON TEST_EVIDENCE"
    fi

    # ------------------------------------------
    # ACTUAL CONTENT ANALYSIS
    # ------------------------------------------

    if [ "$SIZE" -gt 0 ] && [ "$SIZE" -lt 5000000 ]; then

        if grep -aEiq \
          'LAW_2558|GOLDEN-MOTHER-LAW|NO_FAKE_PASS|FAKE_PASS|EVIDENCE|VERIFY|NODE|P2P|NEURAL|NEURON|CELL|ENGINE|EXECUTION' \
          "$F" 2>/dev/null; then

            SCORE=$((SCORE+40))
            REASON="$REASON CONTENT_SIGNATURE"

            if [ "$CATEGORY" = "UNKNOWN" ]; then
                CATEGORY="UNKNOWN_USEFUL_SIGNATURE"
            fi
        fi
    fi

    # ------------------------------------------
    # CLASSIFY
    # ------------------------------------------

    if [ "$SCORE" -ge 40 ]; then

        printf "%s\t%s\t%s\t%s\n" \
          "$SCORE" "$CATEGORY" "$F" "$REASON" \
          >> "$CANDIDATE"

    else

        printf "%s\t%s\t%s\t%s\n" \
          "$F" "$TYPE" "$SIZE" \
          "NO_CURRENT_SIGNATURE;REQUIRES_UNKNOWN_ANALYSIS" \
          >> "$UNKNOWN"

    fi

done < "$SOURCE_LIST"

# ------------------------------------------------------
# 6. UNKNOWN CONTENT ANALYSIS
# ------------------------------------------------------

echo
echo "===== 6. UNKNOWN MATERIAL ANALYSIS ====="

UNKNOWN_DETAIL="$REPORT/UNKNOWN-DETAILED.tsv"

printf "PATH\tTYPE\tSIZE\tTEXT_SIGNATURES\n" > "$UNKNOWN_DETAIL"

while IFS=$'\t' read -r F TYPE SIZE REASON; do

    [ "$F" = "PATH" ] && continue
    [ -f "$F" ] || continue

    SIG="$(strings "$F" 2>/dev/null | \
      grep -Ei \
      '2558|gandom|gandum|law|evidence|verify|node|p2p|peer|neural|neuron|brain|cell|engine|execution|wallet|payment|api|server|websocket' \
      | head -30 \
      | tr '\n' ' ' \
      | cut -c1-1500)"

    if [ -n "$SIG" ]; then
        printf "%s\t%s\t%s\t%s\n" \
          "$F" "$TYPE" "$SIZE" "$SIG" \
          >> "$UNKNOWN_DETAIL"
    fi

done < "$UNKNOWN"

# ------------------------------------------------------
# 7. CANONICAL SELECTION
# ------------------------------------------------------

echo
echo "===== 7. CANONICAL SELECTION ====="

CANON="$REPORT/CANONICAL-SELECTION.tsv"

printf "PRIORITY\tCATEGORY\tPATH\tSHA256\n" > "$CANON"

sort -nr -k1,1 "$CANDIDATE" 2>/dev/null | \
while IFS=$'\t' read -r SCORE CATEGORY F REASON; do

    HASH="$(sha256sum "$F" 2>/dev/null | awk '{print $1}')"

    case "$CATEGORY" in

      LAW2558)
        PRIORITY=1000
        ;;

      BRAIN_NEURON)
        PRIORITY=900
        ;;

      P2P_NODE)
        PRIORITY=850
        ;;

      CELL_MATH_PHYSICS)
        PRIORITY=800
        ;;

      ENGINE_EXECUTION)
        PRIORITY=750
        ;;

      TEST_EVIDENCE)
        PRIORITY=700
        ;;

      WALLET_REVENUE)
        PRIORITY=650
        ;;

      API_SERVER)
        PRIORITY=600
        ;;

      UI)
        PRIORITY=500
        ;;

      *)
        PRIORITY=100
        ;;
    esac

    printf "%s\t%s\t%s\t%s\n" \
      "$PRIORITY" "$CATEGORY" "$F" "$HASH" >> "$CANON"

done

# ------------------------------------------------------
# 8. STAGE — NEVER OVERWRITE LIVE CODE
# ------------------------------------------------------

echo
echo "===== 8. CONTROLLED STAGING ====="

mkdir -p \
  "$STAGE/Law2558" \
  "$STAGE/Brain-Neuron" \
  "$STAGE/P2P-Node" \
  "$STAGE/Cell-Math-Physics" \
  "$STAGE/Engine-Execution" \
  "$STAGE/Wallet-Revenue" \
  "$STAGE/API-Server" \
  "$STAGE/UI" \
  "$STAGE/Tests-Evidence" \
  "$STAGE/Unknown"

while IFS=$'\t' read -r SCORE CATEGORY F REASON; do

    [ "$SCORE" = "SCORE" ] && continue
    [ -f "$F" ] || continue

    SAFE_NAME="$(basename "$F")"

    case "$CATEGORY" in
      LAW2558)
        DEST="$STAGE/Law2558/$SAFE_NAME"
        ;;

      BRAIN_NEURON)
        DEST="$STAGE/Brain-Neuron/$SAFE_NAME"
        ;;

      P2P_NODE)
        DEST="$STAGE/P2P-Node/$SAFE_NAME"
        ;;

      CELL_MATH_PHYSICS)
        DEST="$STAGE/Cell-Math-Physics/$SAFE_NAME"
        ;;

      ENGINE_EXECUTION)
        DEST="$STAGE/Engine-Execution/$SAFE_NAME"
        ;;

      WALLET_REVENUE)
        DEST="$STAGE/Wallet-Revenue/$SAFE_NAME"
        ;;

      API_SERVER)
        DEST="$STAGE/API-Server/$SAFE_NAME"
        ;;

      UI)
        DEST="$STAGE/UI/$SAFE_NAME"
        ;;

      TEST_EVIDENCE)
        DEST="$STAGE/Tests-Evidence/$SAFE_NAME"
        ;;

      *)
        DEST="$STAGE/Unknown/$SAFE_NAME"
        ;;
    esac

    # NEVER overwrite
    if [ -e "$DEST" ]; then
        BASE="${DEST%.*}"
        EXT="${DEST##*.}"
        DEST="${BASE}-DUP-${SCORE}-${TS}.${EXT}"
    fi

    cp -p "$F" "$DEST" 2>/dev/null || true

done < "$CANDIDATE"

# ------------------------------------------------------
# 9. JAVASCRIPT REAL SYNTAX TEST
# ------------------------------------------------------

echo
echo "===== 9. REAL SYNTAX VALIDATION ====="

JS_TEST="$EVID/javascript-syntax.txt"
: > "$JS_TEST"

JS_COUNT=0
JS_PASS=0

while IFS= read -r JS; do

    JS_COUNT=$((JS_COUNT+1))

    if node --check "$JS" >/dev/null 2>&1; then
        echo "PASS_REAL|$JS" >> "$JS_TEST"
        JS_PASS=$((JS_PASS+1))
    else
        echo "FAIL_REAL|$JS" >> "$JS_TEST"
    fi

done < <(find "$STAGE" -type f -name '*.js' 2>/dev/null)

echo "JS_TOTAL=$JS_COUNT" >> "$JS_TEST"
echo "JS_PASS=$JS_PASS" >> "$JS_TEST"

# ------------------------------------------------------
# 10. HASH STAGED MATERIAL
# ------------------------------------------------------

echo
echo "===== 10. STAGED EVIDENCE HASH ====="

STAGE_HASH="$EVID/staging-sha256.txt"

find "$STAGE" -type f -print0 2>/dev/null |
while IFS= read -r -d '' F; do
    sha256sum "$F"
done > "$STAGE_HASH"

# ------------------------------------------------------
# 11. PRIORITY REPORT
# ------------------------------------------------------

echo
echo "===== 11. PRIORITY SUMMARY ====="

for C in \
  LAW2558 \
  BRAIN_NEURON \
  P2P_NODE \
  CELL_MATH_PHYSICS \
  ENGINE_EXECUTION \
  WALLET_REVENUE \
  API_SERVER \
  UI \
  TEST_EVIDENCE
do
    N="$(awk -F'\t' -v c="$C" '$2==c{n++} END{print n+0}' "$CANDIDATE")"
    echo "$C=$N"
done

UNKNOWN_COUNT="$(awk 'NR>1{n++}END{print n+0}' "$UNKNOWN")"

echo "UNKNOWN=$UNKNOWN_COUNT"

# ------------------------------------------------------
# 12. FINAL CONTROL RECORD
# ------------------------------------------------------

cat > "$EVID/REVIVAL-CONTROL.txt" <<EOF2
GANDOM 1470 CONTROLLED REVIVAL

RUN=$RUN

SOURCE_COUNT=$SOURCE_COUNT
CANDIDATE_COUNT=$(awk 'NR>1{n++}END{print n+0}' "$CANDIDATE")
UNKNOWN_COUNT=$UNKNOWN_COUNT

CURRENT_LIVE_BACKUP=CREATED

RESTORE=NO
DELETE=NO
OVERWRITE=NO
LIVE_CODE_MODIFIED=NO
FAKE_PASS=FORBIDDEN

STAGING=CREATED
HASH_EVIDENCE=CREATED
SYNTAX_TEST=EXECUTED

LAW2558_PRIORITY=1
BRAIN_NEURON_PRIORITY=2
P2P_NODE_PRIORITY=3
CELL_MATH_PHYSICS_PRIORITY=4
ENGINE_EXECUTION_PRIORITY=5
OTHER_LIVE_SECTIONS=AFTER_VERIFICATION

IMPORTANT:
Staging is NOT production activation.
No candidate becomes live merely because it exists in a backup.
EOF2

# ------------------------------------------------------
# 13. FINAL OUTPUT
# ------------------------------------------------------

echo
echo "======================================================"
echo " DISCOVERY + ANALYSIS + CONTROLLED STAGING COMPLETE"
echo "======================================================"

echo "RUN=$RUN"
echo "SOURCE_COUNT=$SOURCE_COUNT"
echo "CANDIDATES=$(awk 'NR>1{n++}END{print n+0}' "$CANDIDATE")"
echo "UNKNOWN=$UNKNOWN_COUNT"
echo "LIVE_CODE_MODIFIED=NO"
echo "OVERWRITE=NO"
echo "DELETE=NO"
echo "RESTORE=NO"
echo "FAKE_PASS=FORBIDDEN"

echo
echo "MAIN_REPORT=$REPORT"
echo "CANONICAL=$CANON"
echo "STAGING=$STAGE"
echo "EVIDENCE=$EVID"

echo
echo "NEXT=INDEPENDENT_ANALYSIS_OF_CANONICAL_CANDIDATES"
echo "NEXT_PRIORITY=LAW2558 -> BRAIN_NEURON -> P2P_NODE -> ALL_LIVE_SECTIONS"

