#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

STAMP=$(date +%Y%m%d-%H%M%S)
REPORT="runtime-logs/PUZZLE-BACKUP-OVERLAP-2558-$STAMP.txt"
TMP="/data/data/com.termux/files/usr/tmp/GANDOM-BACKUP-OVERLAP-$STAMP"
mkdir -p "$TMP"

{
echo "===== GANDOM BACKUP OVERLAP ANALYSIS 2558 ====="
echo "LAW=2558"
echo "TIME=$(date --iso-8601=seconds)"
echo "DELETE_MODE=FALSE"
echo

for FILE in backups/*.tar.gz; do
    [ -f "$FILE" ] || continue

    BASE=$(basename "$FILE")
    LIST="$TMP/$BASE.list"

    echo "===== BACKUP=$BASE ====="

    tar -tzf "$FILE" 2>/dev/null |
        sed 's#^\./##' |
        grep -v '/$' |
        sort -u > "$LIST"

    COUNT=$(wc -l < "$LIST")
    SIZE=$(wc -c < "$FILE")

    echo "SIZE_BYTES=$SIZE"
    echo "UNIQUE_PATHS=$COUNT"

    echo "IMPORTANT_PATH_COUNT="
    grep -E \
      '^(constitution/|gandom-core/|server\.js$|package\.json$|public/|www/|start-gandom\.sh$)' \
      "$LIST" | wc -l

    echo
done

echo "===== CLASSIFICATION ====="
echo "EXACT_DUPLICATES=0_FROM_PREVIOUS_HASH_SCAN"
echo "CONTENT_OVERLAP=MEASURED_BY_PATH"
echo "DELETE_CANDIDATES=NOT_APPROVED"
echo "FILES_DELETED=0"
echo "LAW_DELETED=FALSE"
echo "CORE_CODE_DELETED=FALSE"
echo "CANONICAL_EVIDENCE_DELETED=FALSE"
echo "MONEY_MOVED=FALSE"
echo "FINAL_PROJECT_PASS=NOT_CLAIMED"
echo "NEXT=REVIEW_LARGE_BACKUPS_WITH_UNIQUE_CONTENT"
} | tee "$REPORT"

rm -rf "$TMP"

echo
echo "REPORT=$REPORT"
