#!/data/data/com.termux/files/usr/bin/bash

set -u
export LAW=2558
export NO_FAKE_PASS=1

ROOT="$HOME/gandom"
ANDROID="$ROOT/android"
REPORT="$ROOT/GANDOM-INTEGRATION-2558-REPORT.txt"

cd "$ROOT" || exit 1

{
  echo "===== GANDOM INTEGRATION PREFLIGHT ====="
  echo "LAW=$LAW"
  echo "NO_FAKE_PASS=$NO_FAKE_PASS"
  echo "DATE=$(date -Iseconds)"
  echo "ROOT=$ROOT"
  echo

  echo "===== GIT STATE (READ ONLY) ====="
  git status --short 2>&1 | head -150
  echo

  echo "===== RUNTIME VERSIONS ====="
  node --version 2>&1
  npm --version 2>&1
  java -version 2>&1
  echo

  echo "===== ACTIVE GRADLE CONFIGURATION ====="
  for f in \
    "$ANDROID/settings.gradle" \
    "$ANDROID/settings.gradle.kts" \
    "$ANDROID/build.gradle" \
    "$ANDROID/build.gradle.kts" \
    "$ANDROID/capacitor-cordova-android-plugins/build.gradle" \
    "$ANDROID/capacitor-cordova-android-plugins/build.gradle.kts" \
    "$ROOT/node_modules/@capacitor/android/capacitor/build.gradle"
  do
    if [ -f "$f" ]; then
      echo "--- $f"
      grep -nE \
        'com\.android\.tools\.build:gradle|com\.android\.application|com\.android\.library|repositoriesMode|google\(\)|mavenCentral\(\)|include.*capacitor-android' \
        "$f" 2>/dev/null | head -100
    fi
  done
  echo

  echo "===== CAPACITOR PACKAGE VERSIONS ====="
  node -e '
    for (const p of [
      "@capacitor/core",
      "@capacitor/android",
      "@capacitor/cli"
    ]) {
      try {
        const x = require(p + "/package.json");
        console.log(p + "=" + x.version);
      } catch (e) {
        console.log(p + "=NOT_FOUND: " + e.message);
      }
    }
  ' 2>&1
  echo

  echo "===== GRADLE WRAPPER ====="
  if [ -f "$ANDROID/gradle/wrapper/gradle-wrapper.properties" ]; then
    grep -n 'distributionUrl' \
      "$ANDROID/gradle/wrapper/gradle-wrapper.properties"
  else
    echo "WRAPPER_PROPERTIES_NOT_FOUND"
  fi
  echo

  echo "===== AGP 8.13.0 ARTIFACT CONNECTIVITY ====="
  URL="https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/8.13.0/gradle-8.13.0.pom"
  if command -v curl >/dev/null 2>&1; then
    curl -L -sS --connect-timeout 10 --max-time 25 \
      -o /dev/null \
      -w 'GOOGLE_MAVEN_HTTP=%{http_code}\n' \
      "$URL" 2>&1 || true
  else
    echo "CURL_NOT_INSTALLED"
  fi
  echo

  echo "===== BUILD ATTEMPT ====="
  if [ ! -f "$ANDROID/gradlew" ]; then
    echo "BUILD_BLOCKED: android/gradlew not found"
  else
    cd "$ANDROID" || exit 1
    chmod u+x gradlew 2>/dev/null || true

    ./gradlew assembleDebug \
      --stacktrace \
      --no-daemon

    BUILD_CODE=$?
    echo
    echo "BUILD_EXIT_CODE=$BUILD_CODE"

    APK="$ANDROID/app/build/outputs/apk/debug/app-debug.apk"

    if [ "$BUILD_CODE" -eq 0 ] && [ -f "$APK" ]; then
      echo "APK_FOUND=YES"
      ls -lh "$APK"
      sha256sum "$APK"
      echo "APK_BUILD_RESULT=PASS_FOR_BUILD_ONLY"
    else
      echo "APK_FOUND=$([ -f "$APK" ] && echo YES || echo NO)"
      echo "APK_BUILD_RESULT=FAIL"
      echo "NO_FAKE_PASS=1"
    fi
  fi

  echo
  echo "===== END: FULL SYSTEM PASS NOT CLAIMED ====="
} 2>&1 | tee "$REPORT"

echo
echo "REPORT_SAVED=$REPORT"
