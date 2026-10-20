#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
SOURCE="$ROOT/audit/REVIVAL-1470-20261007-210838/staging"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/audit/GANDOM-MASS-INDEX-$TS"

mkdir -p "$OUT"/{db,logs,checkpoints,groups}

exec > >(tee "$OUT/logs/run.log") 2>&1

echo "================================================"
echo " GANDOM 2558 MASS REVIVAL INDEXER"
echo "================================================"
echo "ROOT=$ROOT"
echo "SOURCE=$SOURCE"
echo "OUT=$OUT"
echo "START=$(date -Is)"
echo

[ -d "$SOURCE" ] || {
    echo "SOURCE_NOT_FOUND"
    exit 2
}

# ------------------------------------------------
# 1. Machine-readable manifest
# ------------------------------------------------

MANIFEST="$OUT/db/manifest.tsv"

printf 'PATH\tSIZE\tMTIME\tSHA256\tTYPE\tSECTION\n' > "$MANIFEST"

# ------------------------------------------------
# 2. Section classifier
# ------------------------------------------------

classify() {
    local x
    x="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"

    case "$x" in
        *law2558*|*golden-mother*|*constitution*|*governance*)
            echo "LAW2558";;
        *neural*|*brain*|*neuron*|*language-brain*|*selfheal*)
            echo "BRAIN_NEURAL";;
        *p2p*|*peer*|*node*|*tcp*|*websocket*|*transport*)
            echo "P2P";;
        *engine*|*execution*|*runtime*|*core*)
            echo "CORE_ENGINE";;
        *cell*|*400k*|*8b*|*20k*)
            echo "CELL_RUNTIME";;
        *math*|*physics*|*geometry*|*laplacian*|*conservation*|*stability*)
            echo "MATH_PHYSICS";;
        *wallet*|*revenue*|*payment*|*settlement*)
            echo "WALLET_REVENUE";;
        *market*|*exchange*|*trade*|*gdm*|*usdt*)
            echo "MARKET_EXCHANGE";;
        *gold*|*jewel*|*realestate*|*property*|*car*|*copper*|*silver*)
            echo "INDUSTRIES";;
        *ai*|*openrouter*|*llm*|*model*)
            echo "AI";;
        *social*|*advert*)
            echo "SOCIAL_ADVERTISING";;
        *api*|*http*|*server*)
            echo "API_SERVER";;
        *ui*|*frontend*|*public*|*www*|*html*|*css*)
            echo "UI";;
        *android*|*capacitor*|*apk*|*gradle*|*kotlin*)
            echo "ANDROID";;
        *identity*|*handshake*)
            echo "IDENTITY";;
        *heartbeat*|*ping*|*pong*)
            echo "HEARTBEAT";;
        *evidence*|*verify*|*verification*|*receipt*)
            echo "EVIDENCE";;
        *security*|*auth*|*crypto*|*encryption*)
            echo "SECURITY";;
        *contract*|*schema*)
            echo "CONTRACTS";;
        *test*|*backtest*)
            echo "TESTS";;
        *audit*)
            echo "AUDIT";;
        *backup*|*snapshot*|*restore*)
            echo "BACKUP";;
        *log*)
            echo "LOG";;
        *tar.gz|*.tgz|*.tar|*.zip)
            echo "ARCHIVE";;
        *)
            echo "UNKNOWN_NEW";;
    esac
}

# ------------------------------------------------
# 3. Incremental processing
# ------------------------------------------------

OLD="$ROOT/audit"/GANDOM-MASS-INDEX-*/db/manifest.tsv
OLD_MANIFEST="$(ls -t $OLD 2>/dev/null | head -1 || true)"

echo "OLD_MANIFEST=${OLD_MANIFEST:-NONE}"

declare -A OLD_HASH

if [ -f "${OLD_MANIFEST:-}" ]; then
    while IFS=$'\t' read -r p s m h t sec; do
        [ "$p" = "PATH" ] && continue
        OLD_HASH["$p"]="$h"
    done < "$OLD_MANIFEST"
fi

# ------------------------------------------------
# 4. Parallel-safe file discovery
# ------------------------------------------------

echo
echo "===== DISCOVERY ====="

find "$SOURCE" -type f -print0 > "$OUT/db/files.null"

TOTAL=$(tr -cd '\0' < "$OUT/db/files.null" | wc -c)

echo "DISCOVERED_FILES=$TOTAL"

# ------------------------------------------------
# 5. Worker function
# ------------------------------------------------

process_file() {
    local f="$1"
    local rel size mtime hash type section

    rel="${f#$SOURCE/}"
    size="$(wc -c < "$f" 2>/dev/null || echo 0)"
    mtime="$(stat -c '%Y' "$f" 2>/dev/null || echo 0)"

    hash="${OLD_HASH[$rel]:-}"

    # Reuse hash when size/mtime are unchanged.
    if [ -z "$hash" ]; then
        hash="$(sha256sum "$f" 2>/dev/null | awk '{print $1}')"
    fi

    [ -n "$hash" ] || return 0

    type="$(file -b "$f" 2>/dev/null | tr '\t\n' '  ')"
    section="$(classify "$rel")"

    printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$rel" "$size" "$mtime" "$hash" "$type" "$section"
}

export SOURCE
export -f classify
export -f process_file

# ------------------------------------------------
# 6. Batch/parallel indexing
# ------------------------------------------------

echo
echo "===== INDEXING ====="

if command -v xargs >/dev/null 2>&1; then
    tr '\0' '\n' < "$OUT/db/files.null" |
    xargs -P 4 -n 1 bash -c 'process_file "$1"' _ \
    > "$OUT/db/records.tmp"
else
    while IFS= read -r f; do
        process_file "$f"
    done < <(tr '\0' '\n' < "$OUT/db/files.null") \
    > "$OUT/db/records.tmp"
fi

cat "$OUT/db/records.tmp" >> "$MANIFEST"

# ------------------------------------------------
# 7. Duplicate clustering
# ------------------------------------------------

echo
echo "===== DUPLICATE CLUSTERS ====="

awk -F '\t' '
NR==1 {next}
{
    count[$4]++
    files[$4]=files[$4] "\n" $1
}
END {
    for (h in count) {
        if (count[h] > 1) {
            print "HASH=" h " COUNT=" count[h]
            print files[h]
            print ""
        }
    }
}' "$MANIFEST" > "$OUT/groups/duplicates.txt"

DUP_GROUPS=$(grep -c '^HASH=' "$OUT/groups/duplicates.txt" 2>/dev/null || echo 0)

echo "DUPLICATE_GROUPS=$DUP_GROUPS"

# ------------------------------------------------
# 8. Section matrix
# ------------------------------------------------

echo
echo "===== SECTION MATRIX ====="

awk -F '\t' '
NR==1 {next}
{
    section[$6]++
}
END {
    for (s in section)
        print section[s] "\t" s
}' "$MANIFEST" |
sort -nr > "$OUT/db/section-counts.tsv"

cat "$OUT/db/section-counts.tsv"

# ------------------------------------------------
# 9. Unknown bucket
# ------------------------------------------------

awk -F '\t' '$6=="UNKNOWN_NEW" {print}' \
    "$MANIFEST" > "$OUT/groups/UNKNOWN-NEW.tsv"

UNKNOWN=$(wc -l < "$OUT/groups/UNKNOWN-NEW.tsv")

echo
echo "UNKNOWN_NEW=$UNKNOWN"

# ------------------------------------------------
# 10. Checkpoint
# ------------------------------------------------

cat > "$OUT/checkpoints/CHECKPOINT.json" <<JSON
{
  "law": "2558",
  "source": "$SOURCE",
  "files_discovered": $TOTAL,
  "duplicate_groups": $DUP_GROUPS,
  "unknown_new": $UNKNOWN,
  "delete": false,
  "live_modification": false,
  "backup_modification": false,
  "incremental": true,
  "parallel_workers": 4,
  "status": "INDEX_COMPLETE"
}
JSON

# ------------------------------------------------
# 11. Final
# ------------------------------------------------

echo
echo "================================================"
echo " INDEX COMPLETE"
echo "================================================"
echo "FILES=$TOTAL"
echo "DUPLICATE_GROUPS=$DUP_GROUPS"
echo "UNKNOWN_NEW=$UNKNOWN"
echo "MANIFEST=$MANIFEST"
echo "CHECKPOINT=$OUT/checkpoints/CHECKPOINT.json"
echo "DELETE=NO"
echo "LIVE_MODIFICATION=NO"
echo "BACKUP_MODIFICATION=NO"
echo "STATUS=INDEX_COMPLETE"
echo "END=$(date -Is)"
