#!/data/data/com.termux/files/usr/bin/bash

set +e

PROJECT="$HOME/gandom"
cd "$PROJECT" || exit 1

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$PROJECT/backups/final-build-$STAMP"

mkdir -p "$BACKUP"
mkdir -p "$PROJECT/.github/workflows"

echo "========================================"
echo " GANDOM FINAL BUILD / AUDIT"
echo "========================================"
echo "PROJECT=$PROJECT"
echo "BACKUP=$BACKUP"
echo

PASS=0
FAIL=0

pass() {
  echo "PASS: $1"
  PASS=$((PASS+1))
}

fail() {
  echo "FAIL: $1"
  FAIL=$((FAIL+1))
}

echo "=== 1. PROJECT STRUCTURE ==="

[ -d "$PROJECT/www" ] && pass "WWW_EXISTS" || fail "WWW_EXISTS"
[ -d "$PROJECT/android" ] && pass "ANDROID_EXISTS" || fail "ANDROID_EXISTS"
[ -d "$PROJECT/gandom-core" ] && pass "CORE_EXISTS" || fail "CORE_EXISTS"
[ -f "$PROJECT/server.js" ] && pass "SERVER_EXISTS" || fail "SERVER_EXISTS"
[ -f "$PROJECT/capacitor.config.json" ] && pass "CAPACITOR_CONFIG_EXISTS" || fail "CAPACITOR_CONFIG_EXISTS"
[ -f "$PROJECT/package.json" ] && pass "PACKAGE_JSON_EXISTS" || fail "PACKAGE_JSON_EXISTS"

echo
echo "=== 2. SAFE BACKUP ==="

for item in \
  package.json \
  capacitor.config.json \
  server.js \
  client.js \
  www \
  android \
  gandom-core
do
  if [ -e "$PROJECT/$item" ]; then
    cp -a "$PROJECT/$item" "$BACKUP/" 2>/dev/null
  fi
done

[ -d "$BACKUP" ] && pass "BACKUP_CREATED" || fail "BACKUP_CREATED"

echo
echo "=== 3. VERSION AUDIT ==="

node --version
npm --version

if [ -x "$PROJECT/android/gradlew" ]; then
  "$PROJECT/android/gradlew" --version
  pass "GRADLE_WRAPPER_AVAILABLE"
else
  fail "GRADLE_WRAPPER_AVAILABLE"
fi

echo
echo "=== 4. AGP / GRADLE AUDIT ==="

grep -RniE \
"com\.android\.tools\.build:gradle|distributionUrl=.*gradle" \
"$PROJECT/android" \
--include='*.gradle' \
--include='*.gradle.kts' \
--include='gradle-wrapper.properties' \
2>/dev/null

echo
echo "=== 5. JAVASCRIPT SYNTAX ==="

for f in \
  server.js \
  client.js \
  GANDUM-REAL-RUNTIME.js \
  peer-discovery.js \
  p2p-report-bus.js
do
  if [ -f "$PROJECT/$f" ]; then
    if node --check "$PROJECT/$f" >/dev/null 2>&1; then
      pass "NODE_CHECK_$f"
    else
      fail "NODE_CHECK_$f"
    fi
  fi
done

echo
echo "=== 6. UI AUDIT ==="

[ -f "$PROJECT/www/index.html" ] \
  && pass "UI_INDEX" \
  || fail "UI_INDEX"

[ -f "$PROJECT/www/assets/css/gandom-ui.css" ] \
  && pass "UI_CSS" \
  || fail "UI_CSS"

[ -f "$PROJECT/www/assets/js/gandom-ui.js" ] \
  && pass "UI_JS" \
  || fail "UI_JS"

if [ -f "$PROJECT/www/index.html" ]; then
  grep -qi "GANDOM" "$PROJECT/www/index.html" \
    && pass "UI_GANDOM_IDENTITY" \
    || fail "UI_GANDOM_IDENTITY"

  grep -qiE "market|exchange|economy|GDM" "$PROJECT/www/index.html" \
    && pass "UI_ECONOMY_MARKET" \
    || fail "UI_ECONOMY_MARKET"

  grep -qiE "network|security|backup|evidence" "$PROJECT/www/index.html" \
    && pass "UI_SYSTEM_SECTIONS" \
    || fail "UI_SYSTEM_SECTIONS"
fi

echo
echo "=== 7. CAPACITOR AUDIT ==="

if command -v npx >/dev/null 2>&1; then
  npx cap --version
  pass "CAPACITOR_AVAILABLE"
else
  fail "CAPACITOR_AVAILABLE"
fi

echo
echo "=== 8. REAL SERVER HEALTH CODE AUDIT ==="

if [ -f "$PROJECT/server.js" ]; then
  grep -q "/health" "$PROJECT/server.js" \
    && pass "HEALTH_ROUTE_PRESENT" \
    || fail "HEALTH_ROUTE_PRESENT"
fi

echo
echo "=== 9. GITHUB ACTIONS BUILD PIPELINE ==="

cat > "$PROJECT/.github/workflows/gandom-android.yml" <<'YAML'
name: GANDOM Android Build

on:
  workflow_dispatch:
  push:
    branches:
      - main
      - master

permissions:
  contents: read

jobs:
  android:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout GANDOM
        uses: actions/checkout@v6

      - name: Setup JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Verify Java
        run: java -version

      - name: Verify Gradle Wrapper
        working-directory: android
        run: ./gradlew --version

      - name: Capacitor Sync
        run: npx cap sync android

      - name: Build Debug APK
        working-directory: android
        run: ./gradlew assembleDebug --stacktrace

      - name: Locate APK
        run: |
          echo "=== APK FILES ==="
          find android -type f -name "*.apk" -print

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: gandom-debug-apk
          path: android/app/build/outputs/apk/debug/*.apk
          if-no-files-found: error
YAML

if [ -s "$PROJECT/.github/workflows/gandom-android.yml" ]; then
  pass "GITHUB_ANDROID_WORKFLOW_CREATED"
else
  fail "GITHUB_ANDROID_WORKFLOW_CREATED"
fi

echo
echo "=== 10. LOCAL CAPACITOR SYNC ==="

cd "$PROJECT"

if npx cap sync android; then
  pass "CAPACITOR_SYNC"
else
  fail "CAPACITOR_SYNC"
fi

echo
echo "=== 11. LOCAL ANDROID BUILD ==="

cd "$PROJECT/android"

if ./gradlew assembleDebug --stacktrace; then
  pass "LOCAL_ANDROID_BUILD"
else
  fail "LOCAL_ANDROID_BUILD"
fi

echo
echo "=== 12. APK SEARCH ==="

APK_COUNT="$(find "$PROJECT/android" -type f -name "*.apk" 2>/dev/null | wc -l)"

echo "APK_COUNT=$APK_COUNT"

if [ "$APK_COUNT" -gt 0 ]; then
  find "$PROJECT/android" -type f -name "*.apk" -print
  pass "APK_FOUND"
else
  fail "APK_FOUND"
fi

echo
echo "=== 13. GIT STATUS ==="

cd "$PROJECT"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --short
  pass "GIT_REPOSITORY"
else
  fail "GIT_REPOSITORY"
fi

echo
echo "=== 14. FINAL REPORT ==="

echo "BACKUP_PATH=$BACKUP"
echo "PASS_COUNT=$PASS"
echo "FAIL_COUNT=$FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo "GANDOM_FINAL_BUILD_AUDIT=PASS"
else
  echo "GANDOM_FINAL_BUILD_AUDIT=FAIL"
fi

echo
echo "========================================"
echo " END GANDOM FINAL BUILD / AUDIT"
echo "========================================"
