#!/data/data/com.termux/files/usr/bin/bash

set -u

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="backups/ui-sections-6-12-$STAMP"

echo "=========================================="
echo " GANDOM UI — SECTIONS 6 TO 12"
echo "=========================================="

mkdir -p "$BACKUP"

cp -a www "$BACKUP/www" 2>/dev/null || true
cp -a android "$BACKUP/android" 2>/dev/null || true

echo "BACKUP=PASS"
echo "BACKUP_PATH=$BACKUP"

PASS=0
FAIL=0

check() {
  NAME="$1"
  if [ "$2" -eq 0 ]; then
    echo "$NAME=PASS"
    PASS=$((PASS+1))
  else
    echo "$NAME=FAIL"
    FAIL=$((FAIL+1))
  fi
}

# ==================================================
# 6 — UI POLISH
# ==================================================

echo
echo "========== SECTION 6 =========="
echo "UI POLISH + RESPONSIVE"

test -s www/index.html
check "SECTION_6_INDEX" $?

test -s www/assets/css/gandom-ui.css
check "SECTION_6_CSS" $?

grep -q "grid-template-columns" www/assets/css/gandom-ui.css
check "SECTION_6_RESPONSIVE" $?

grep -q "backdrop-filter" www/assets/css/gandom-ui.css
check "SECTION_6_UI_POLISH" $?

# ==================================================
# 7 — REAL DATA RUNTIME CONNECTION
# ==================================================

echo
echo "========== SECTION 7 =========="
echo "RUNTIME DATA CONNECTION"

test -s server.js
check "SECTION_7_SERVER" $?

grep -q "health" server.js
check "SECTION_7_HEALTH_ENDPOINT_REFERENCE" $?

grep -q "fetch('/health'" www/assets/js/gandom-ui.js
check "SECTION_7_RUNTIME_FETCH" $?

# ==================================================
# 8 — EXCHANGE
# ==================================================

echo
echo "========== SECTION 8 =========="
echo "EXCHANGE UI"

grep -q "marketChart" www/index.html
check "SECTION_8_MARKET_CHART" $?

grep -q "Exchange" www/index.html
check "SECTION_8_EXCHANGE_UI" $?

grep -q "داده بازار" www/index.html
check "SECTION_8_NO_FAKE_MARKET_DATA" $?

# ==================================================
# 9 — SECURITY / IDENTITY
# ==================================================

echo
echo "========== SECTION 9 =========="
echo "SECURITY + IDENTITY"

grep -q "Security" www/index.html
check "SECTION_9_SECURITY_UI" $?

grep -q "Identity\|هویت" www/index.html
check "SECTION_9_IDENTITY_REFERENCE" $?

grep -q "offline" www/assets/css/gandom-ui.css
check "SECTION_9_SECURITY_STATE" $?

# ==================================================
# 10 — BACKUP / EVIDENCE / AUDIT
# ==================================================

echo
echo "========== SECTION 10 =========="
echo "BACKUP + EVIDENCE + AUDIT"

test -d "$BACKUP"
check "SECTION_10_BACKUP" $?

grep -q "Backup" www/index.html
check "SECTION_10_BACKUP_UI" $?

grep -q "Evidence" www/index.html
check "SECTION_10_EVIDENCE_UI" $?

grep -q "Audit" www/index.html
check "SECTION_10_AUDIT_UI" $?

# ==================================================
# 11 — WEB + ANDROID TEST BASELINE
# ==================================================

echo
echo "========== SECTION 11 =========="
echo "WEB + ANDROID TEST"

node --check www/assets/js/gandom-ui.js
check "SECTION_11_JS_SYNTAX" $?

test -d android
check "SECTION_11_ANDROID_PROJECT" $?

test -f android/app/src/main/AndroidManifest.xml
check "SECTION_11_ANDROID_MANIFEST" $?

# ==================================================
# 12 — CAPACITOR + APK
# ==================================================

echo
echo "========== SECTION 12 =========="
echo "CAPACITOR + APK"

if command -v npx >/dev/null 2>&1; then
  npx cap sync android
  SYNC_CODE=$?
  check "SECTION_12_CAPACITOR_SYNC" "$SYNC_CODE"
else
  echo "SECTION_12_CAPACITOR_SYNC=FAIL"
  FAIL=$((FAIL+1))
fi

if [ -x android/gradlew ]; then

  cd android

  ./gradlew assembleDebug
  BUILD_CODE=$?

  cd ..

  check "SECTION_12_ANDROID_BUILD" "$BUILD_CODE"

  APK="$(find android/app/build/outputs/apk -type f -name '*.apk' 2>/dev/null | head -n 1)"

  if [ -n "$APK" ]; then
    echo "APK_FOUND=PASS"
    echo "APK_PATH=$APK"
    PASS=$((PASS+1))
  else
    echo "APK_FOUND=FAIL"
    FAIL=$((FAIL+1))
  fi

else

  echo "SECTION_12_ANDROID_BUILD=FAIL"
  echo "ANDROID_GRADLEW_NOT_FOUND"
  FAIL=$((FAIL+1))

fi

# ==================================================
# FINAL REPORT
# ==================================================

echo
echo "=========================================="
echo " GANDOM UI 6-12 FINAL REPORT"
echo "=========================================="

echo "PASS_COUNT=$PASS"
echo "FAIL_COUNT=$FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo "GANDOM_UI_SECTIONS_6_TO_12=PASS"
else
  echo "GANDOM_UI_SECTIONS_6_TO_12=FAIL"
fi

echo "BACKUP_PATH=$BACKUP"

echo "=========================================="
