#!/data/data/com.termux/files/usr/bin/bash
set -u

OUT="audit/33-LIVE-ORGANS-MAP-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "===== GANDOM 2558 — LIVE ORGANISM MAP =====" | tee "$OUT/report.txt"
echo "BRAIN=Core/Engine/Law2558" | tee -a "$OUT/report.txt"
echo "HEART=Wallet/Revenue/Settlement" | tee -a "$OUT/report.txt"
echo "EYES=UI/Market/Observation" | tee -a "$OUT/report.txt"
echo "EARS=P2P/Event/Messaging" | tee -a "$OUT/report.txt"
echo "LUNGS=Heartbeat/Health/Runtime" | tee -a "$OUT/report.txt"
echo "NEURONS=Neural-P2P" | tee -a "$OUT/report.txt"
echo "HANDS=Execution/API/Transactions" | tee -a "$OUT/report.txt"
echo "FEET=Node/Network/Installation" | tee -a "$OUT/report.txt"
echo "IMMUNE=Evidence/Verification/Law2558" | tee -a "$OUT/report.txt"
echo "DNA=Contracts/Identity/Data" | tee -a "$OUT/report.txt"

for f in \
  gandom-core \
  public \
  www \
  server.js \
  package.json \
  android \
  final-apk \
  evidence \
  backups
do
  if [ -e "$f" ]; then
    echo "LIVE_ROOT|$f" | tee -a "$OUT/report.txt"
  fi
done

echo "===== CANDIDATES =====" | tee -a "$OUT/report.txt"

find gandom-core -type f \
  \( -iname '*brain*' \
  -o -iname '*neural*' \
  -o -iname '*p2p*' \
  -o -iname '*node*' \
  -o -iname '*heartbeat*' \
  -o -iname '*execution*' \
  -o -iname '*engine*' \
  -o -iname '*wallet*' \
  -o -iname '*revenue*' \
  -o -iname '*payment*' \
  -o -iname '*evidence*' \
  -o -iname '*law2558*' \
  -o -iname '*identity*' \) \
  -print | sort | tee "$OUT/candidates.txt"

echo "===== MISSING DEPENDENCY =====" | tee -a "$OUT/report.txt"

find . -type f -name 'REAL-NEURAL-P2P-BUS-2558.js' -print \
  | tee "$OUT/bus-files.txt"

find . -type f -name 'REAL-NEURAL-P2P-EXECUTION-2558.js' -print \
  | tee "$OUT/execution-files.txt"

echo "===== CONTROL =====" | tee -a "$OUT/report.txt"
echo "DELETE=NO" | tee -a "$OUT/report.txt"
echo "LIVE_MODIFICATION=NO" | tee -a "$OUT/report.txt"
echo "BACKUP_REQUIRED_BEFORE_REPAIR=YES" | tee -a "$OUT/report.txt"
echo "33_SECTIONS=ONE_LIVING_SYSTEM" | tee -a "$OUT/report.txt"
echo "STATUS=MAP_ONLY" | tee -a "$OUT/report.txt"

echo
echo "REPORT=$OUT"
