#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
ST="$ROOT/audit/REVIVAL-1470-20261007-210838/staging"
OUT="$ROOT/audit/TREASURE-1470-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"/{inventory,hashes,candidates,archives,report}

echo "===== GANDOM 2558 — FULL 1470 TREASURE MINING ====="
echo "STAGING=$ST"
echo "OUTPUT=$OUT"

echo "===== ALL FILES ====="
find "$ST" -type f -print0 |
while IFS= read -r -d '' f; do
    sha256sum "$f"
done > "$OUT/hashes/all.sha256"

echo "FILES=$(wc -l < "$OUT/hashes/all.sha256")"

echo "===== CANDIDATES ====="

grep -Ei \
'REAL-|NEURAL|BRAIN|P2P|NODE|SELFHEAL|LANGUAGE|HEART|HEARTBEAT|ENGINE|EXECUTION|WALLET|REVENUE|PAYMENT|SETTLEMENT|TREASURE|LAW2558|EVIDENCE|VERIFY|CONTRACT|IDENTITY|HEALTH|RUNTIME|UI|MARKET|TRADE|API|SECURITY|SAFETY|GOVERNOR|PHYSICS|MATH|CELL|8B|20K|DEPENDENCY' \
"$OUT/hashes/all.sha256" \
> "$OUT/candidates/all-candidates.txt" || true

echo "CANDIDATE_LINES=$(wc -l < "$OUT/candidates/all-candidates.txt")"

echo "===== ARCHIVES ====="
find "$ST" -type f \
\( -name '*.tar.gz' -o -name '*.tgz' -o -name '*.tar' -o -name '*.zip' \) \
-print > "$OUT/archives/list.txt"

echo "ARCHIVES=$(wc -l < "$OUT/archives/list.txt")"

echo "===== IMPORTANT LIVE/BACKUP PAIRS ====="

for name in \
REAL-NEURAL-P2P-BUS-2558.js \
REAL-NEURAL-P2P-EXECUTION-2558.js \
REAL-NEURAL-P2P-SAFETY-GOVERNOR-2558.js \
REAL-NEURAL-P2P-SAFETY-INTEGRATION-2558.js \
GANDOM-AI-REVENUE-ENGINE-2558.js \
GANDOM-REAL-PAYMENT-ADAPTER-2558.js \
GANDOM-PAYMENT-SETTLEMENT-CONTRACT-2558.json \
GANDOM-REAL-ENGINE.js \
REAL-NODE-AGENT.js
do
    echo "===== $name =====" >> "$OUT/report/live-backup-pairs.txt"
    find "$ROOT" -type f -name "$name" \
        -not -path "$ROOT/node_modules/*" \
        -print >> "$OUT/report/live-backup-pairs.txt"
done

echo "===== UNIQUE CONTENT ====="

sort "$OUT/hashes/all.sha256" |
awk '
{
    hash=$1
    file=$0
    sub(/^[^ ]+  /,"",file)
    count[hash]++
    files[hash]=files[hash] "\n" file
}
END {
    for (h in count) {
        if (count[h] == 1)
            print h files[h]
    }
}' > "$OUT/hashes/unique-content.txt"

echo "UNIQUE_GROUPS=$(grep -c '^[0-9a-f]' "$OUT/hashes/unique-content.txt" 2>/dev/null || true)"

echo "===== CONTROL ====="
cat > "$OUT/report/CONTROL.txt" <<CONTROL
LAW_2558=ACTIVE
DELETE=NO
LIVE_MODIFICATION=NO
BACKUP_MODIFICATION=NO
EVIDENCE_MODIFICATION=NO

SOURCE=FULL_1470_REVIVAL_STAGING
MODE=TREASURE_MINING

RULE:
1. Every useful unique capability must be recovered.
2. Existing live capability must never be replaced blindly.
3. Backup and live versions must be compared by content/hash.
4. Unknown files are NOT junk.
5. Exact duplicates may be deleted only after dependency verification.
6. No PASS is claimed from this analysis.

NEXT=CLASSIFY_AND_MERGE_REAL_TREASURES
CONTROL

echo "===== RESULT ====="
echo "TREASURE_SCAN=COMPLETE"
echo "DELETE=NO"
echo "LIVE_MODIFICATION=NO"
echo "BACKUP_MODIFICATION=NO"
echo "REPORT=$OUT"
