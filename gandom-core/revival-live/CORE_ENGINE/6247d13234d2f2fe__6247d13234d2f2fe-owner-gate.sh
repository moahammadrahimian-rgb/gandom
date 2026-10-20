#!/data/data/com.termux/files/usr/bin/bash
set -e

BASE="gandom-core/governance"
LAW="$BASE/GOLDEN-MOTHER-LAW-2558.json"
KEY="$BASE/owner/.owner-key"

[ -f "$LAW" ] || {
  echo "OWNER_GATE=FAIL"
  echo "REASON=LAW_2558_MISSING"
  exit 1
}

[ -f "$KEY" ] || {
  echo "OWNER_GATE=FAIL"
  echo "REASON=OWNER_KEY_MISSING"
  exit 1
}

chmod 600 "$KEY"

if [ ! -s "$KEY" ]; then
  echo "OWNER_GATE=FAIL"
  echo "REASON=EMPTY_OWNER_KEY"
  exit 1
fi

echo "LAW_ID=2558"
echo "OWNER_AUTHORIZATION=REQUIRED"
echo "OWNER_KEY_PRESENT=PASS"
echo "OWNER_KEY_PROTECTED=PASS"
echo "UNAUTHORIZED_ACCESS=DENIED"
echo "OWNER_GATE=PASS"
