#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$PWD"
STAGING="$ROOT/audit/REVIVAL-1470-20261007-210838/staging"
LIVE="$ROOT"

RUN="$ROOT/audit/33-LIVE-DEDUP-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN"

echo "===== GANDOM 2558 — 33 LIVE DEDUP ENGINE ====="
echo "MODE=LIVE-CANONICAL-CLEAN"
echo "STAGING=$STAGING"
echo

# 33 canonical sections
cat > "$RUN/CANONICAL-33.txt" <<'LIST'
01 DASHBOARD
02 GDM-MARKET
03 EXCHANGE
04 BUY
05 SELL
06 ORDERS
07 MARKET-CHART
08 GOLD-JEWELRY
09 REAL-ESTATE
10 CARS
11 COPPER-SILVER
12 WALLET
13 DEPOSIT
14 WITHDRAW
15 KYC
16 PROFILE
17 OWNER-PANEL
18 OWNER-5-PERCENT
19 LEDGER
20 TRANSACTION-HISTORY
21 P2P
22 DHT
23 IPFS
24 BLOCKCHAIN
25 NETWORK-HEALTH
26 AI-CORE
27 AI-INDUSTRY-ADS
28 SOCIAL-NETWORK
29 ADVERTISING-ENGINE
30 INDUSTRY-ADS
31 WORKER-BOT
32 SECURITY-AUDIT
33 API-SYSTEM-HEALTH
LIST

echo "CANONICAL_SECTIONS=33"

echo
echo "===== LIVE ROOTS ====="
printf '%s\n' \
  "$ROOT/gandom-core" \
  "$ROOT/public" \
  "$ROOT/www" \
  "$ROOT/server.js" \
  "$ROOT/package.json" \
  "$ROOT/android" \
  "$ROOT/final-apk" \
  "$ROOT/evidence" \
  "$ROOT/backups"

echo
echo "===== STAGING INVENTORY ====="

find "$STAGING" -type f -printf '%s\t%p\n' |
sort -n > "$RUN/STAGING.tsv"

echo "STAGING_FILES=$(wc -l < "$RUN/STAGING.tsv")"
echo "STAGING_SIZE=$(du -sh "$STAGING" | cut -f1)"

echo
echo "===== EXACT CONTENT DUPLICATES ====="

# Hash only staging files.
# Same-size files are grouped first.
awk -F '\t' '
{
  n[$1]++
  files[$1]=files[$1] "\n" $2
}
END {
  for (s in n)
    if (n[s] > 1) {
      split(files[s], a, "\n")
      for (i=2;i<=n[s]+0;i++)
        print s "\t" a[i]
    }
}' "$RUN/STAGING.tsv" > "$RUN/SAME-SIZE.tsv"

: > "$RUN/HASH.tsv"

while IFS=$'\t' read -r size file; do
  [ -f "$file" ] || continue
  sha256sum "$file"
done < "$RUN/SAME-SIZE.tsv" |
awk '{print $1 "\t" $2}' > "$RUN/HASH.tsv"

awk -F '\t' '
{
  n[$1]++
  f[$1]=f[$1] "\n" $2
}
END {
  for (h in n)
    if (n[h] > 1) {
      split(f[h], a, "\n")
      for (i=2;i<=n[h]+0;i++)
        print h "\t" a[i]
    }
}' "$RUN/HASH.tsv" > "$RUN/EXACT-DUPLICATES.tsv"

echo "EXACT_DUPLICATES=$(wc -l < "$RUN/EXACT-DUPLICATES.tsv")"

echo
echo "===== CANONICAL SECTION SIGNALS ====="

grep -RIlE \
'DASHBOARD|GDM|MARKET|EXCHANGE|BUY|SELL|ORDERS|WALLET|DEPOSIT|WITHDRAW|KYC|PROFILE|OWNER|LEDGER|P2P|DHT|IPFS|BLOCKCHAIN|AI|SOCIAL|ADVERT|WORKER|AUDIT|API|HEALTH' \
"$STAGING" 2>/dev/null |
wc -l

echo
echo "===== RESULT ====="
echo "33_CANONICAL=DEFINED"
echo "LIVE_AREAS=PROTECTED"
echo "DUPLICATES_DETECTED=$(wc -l < "$RUN/EXACT-DUPLICATES.tsv")"
echo "OUTPUT=$RUN"
echo
echo "NEXT=DELETE_ONLY_EXACT_DUPLICATES"
