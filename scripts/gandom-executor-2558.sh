#!/data/data/com.termux/files/usr/bin/bash

set -uo pipefail
umask 077

export LAW=2558
export NO_FAKE_PASS=1

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE="$ROOT/evidence/GANDOM_EXECUTOR_2558_$STAMP"
mkdir -p "$EVIDENCE"

REPORT="$EVIDENCE/EXECUTION_REPORT.txt"
LOG="$EVIDENCE/execution.log"
BUILD_LOG="$EVIDENCE/android-build.log"

exec > >(tee -a "$LOG") 2>&1

BUILD_TRIGGERED=NO
BUILD_RESULT=NOT_RUN
REPAIR_APPLIED=NO
PROJECT_FILES_DELETED=NO
WALLETS_OR_DATABASES_TOUCHED=NO
PASS_REAL=NOT_ISSUED

finish() {
  local rc=$?
  trap - EXIT
  {
    echo
    echo "===== GANDOM EXECUTOR FINAL REPORT ====="
    echo "LAW=2558"
    echo "TIMESTAMP_UTC=$STAMP"
    echo "PROJECT=$ROOT"
    echo "BUILD_TRIGGERED=$BUILD_TRIGGERED"
    echo "BUILD_RESULT=$BUILD_RESULT"
    echo "REPAIR_APPLIED=$REPAIR_APPLIED"
    echo "PROJECT_FILES_DELETED=$PROJECT_FILES_DELETED"
    echo "WALLETS_OR_DATABASES_TOUCHED=$WALLETS_OR_DATABASES_TOUCHED"
    echo "PASS_REAL=$PASS_REAL"
    echo "EXIT_CODE=$rc"
    echo "EXECUTION_LOG=$LOG"
    echo "BUILD_LOG=$BUILD_LOG"
  } > "$REPORT"
  echo
  cat "$REPORT"
}
trap finish EXIT

echo "================================================"
echo " GANDOM EXECUTION AGENT | LAW 2558"
echo "================================================"
echo "ROOT=$ROOT"
echo "EVIDENCE=$EVIDENCE"
echo "TIME_UTC=$STAMP"

echo
echo "===== 1. ENVIRONMENT ====="
uname -a
printf 'ARCH='
uname -m
printf 'LONG_BIT='
getconf LONG_BIT 2>/dev/null || true
printf 'NODE='
node --version 2>/dev/null || echo MISSING
printf 'NPM='
npm --version 2>/dev/null || echo MISSING
printf 'JAVA='
java -version 2>&1 | head -n 2 || true

echo
echo "===== 2. PRESERVATION PRECHECK ====="
for p in \
  package.json \
  android/gradlew \
  android/build.gradle \
  android/settings.gradle \
  android/gradle/wrapper/gradle-wrapper.properties
do
  if [ -f "$p" ]; then
    echo "FOUND=$p"
  else
    echo "MISSING=$p"
  fi
done

echo
echo "===== 3. PROJECT SCRIPTS ====="
if [ -f package.json ]; then
  node -e '
    try {
      const p = require("./package.json");
      console.log(JSON.stringify({
        name:p.name,
        version:p.version,
        scripts:p.scripts || {},
        capacitorAndroid:p.dependencies?.["@capacitor/android"] ||
                         p.devDependencies?.["@capacitor/android"] || null,
        capacitorCore:p.dependencies?.["@capacitor/core"] ||
                      p.devDependencies?.["@capacitor/core"] || null
      }, null, 2));
    } catch(e) {
      console.log("PACKAGE_READ_ERROR=" + e.message);
      process.exitCode=1;
    }
  ' || true
fi

echo
echo "===== 4. GRADLE AND ANDROIDX CONFIGURATION ====="
for f in \
  android/build.gradle \
  android/settings.gradle \
  android/gradle.properties \
  android/gradle/wrapper/gradle-wrapper.properties \
  node_modules/@capacitor/android/capacitor/build.gradle \
  node_modules/@capacitor/android/package.json \
  node_modules/@capacitor/android/capacitor/build.gradle
do
  [ -f "$f" ] || continue
  echo "--- $f"
  grep -nE \
    'com\.android\.tools\.build:gradle|com\.android\.(application|library)|distributionUrl|android\.useAndroidX|classpath|version' \
    "$f" 2>/dev/null | head -n 100 || true
done

echo
echo "===== 5. ANDROIDX SAFE CHECK ====="
GP="android/gradle.properties"

if [ -f "$GP" ]; then
  if grep -Eq '^[[:space:]]*android\.useAndroidX[[:space:]]*=[[:space:]]*true([[:space:]]|$)' "$GP"; then
    echo "ANDROIDX=ENABLED"
  elif grep -Eq '^[[:space:]]*android\.useAndroidX[[:space:]]*=' "$GP"; then
    echo "ANDROIDX=EXPLICIT_NON_TRUE"
    echo "AUTO_REPAIR=SKIPPED_TO_PRESERVE_EXISTING_CONFIGURATION"
  else
    echo "ANDROIDX=UNSET"
    echo "AUTO_REPAIR=SKIPPED; EXISTING_CONFIGURATION_PRESERVED"
  fi
else
  echo "GRADLE_PROPERTIES=MISSING"
  echo "AUTO_REPAIR=SKIPPED"
fi

echo
echo "===== 6. PREVIOUS FAILURE EVIDENCE ====="
find evidence . -type f \
  \( -name '*.log' -o -name 'build.log' \) \
  -not -path './node_modules/*' \
  -not -path './.git/*' \
  -not -path './evidence/GANDOM_EXECUTOR_2558_*/*' \
  2>/dev/null |
while IFS= read -r f; do
  if grep -qiE \
    'What went wrong|Could not resolve|Could not find|No matching variant|BufferOverflowException|SDK location not found|BUILD FAILED' \
    "$f" 2>/dev/null; then
    echo "--- FAILURE EVIDENCE: $f"
    grep -ni -A 6 -B 3 -E \
      'What went wrong|Could not resolve|Could not find|No matching variant|BufferOverflowException|SDK location not found|BUILD FAILED|Caused by:' \
      "$f" 2>/dev/null | tail -n 70 || true
  fi
done

echo
echo "===== 7. TOOLCHAIN CHECK ====="
if ! command -v node >/dev/null 2>&1; then
  echo "STOP: NODE_MISSING"
  BUILD_RESULT=BLOCKED_NODE_MISSING
  exit 20
fi

if ! command -v java >/dev/null 2>&1; then
  echo "STOP: JAVA_MISSING"
  BUILD_RESULT=BLOCKED_JAVA_MISSING
  exit 21
fi

if [ ! -f android/gradlew ]; then
  echo "STOP: ANDROID_GRADLE_WRAPPER_MISSING"
  BUILD_RESULT=BLOCKED_WRAPPER_MISSING
  exit 22
fi

if [ ! -f android/build.gradle ]; then
  echo "STOP: ANDROID_BUILD_CONFIGURATION_MISSING"
  BUILD_RESULT=BLOCKED_CONFIG_MISSING
  exit 23
fi

if [ ! -d node_modules/@capacitor/android ]; then
  echo "STOP: CAPACITOR_ANDROID_DEPENDENCY_MISSING"
  echo "No npm install is started automatically; dependency changes require review."
  BUILD_RESULT=BLOCKED_CAPACITOR_MISSING
  exit 24
fi

echo
echo "===== 8. GRADLE WRAPPER VALIDATION ====="
WRAPPER_PROPS="android/gradle/wrapper/gradle-wrapper.properties"

if [ -f "$WRAPPER_PROPS" ]; then
  grep -n 'distributionUrl=' "$WRAPPER_PROPS" || true
else
  echo "STOP: WRAPPER_PROPERTIES_MISSING"
  BUILD_RESULT=BLOCKED_WRAPPER_PROPERTIES_MISSING
  exit 25
fi

echo
echo "===== 9. REAL ANDROID DEBUG BUILD ====="
echo "BUILD_TRIGGERED=YES"
BUILD_TRIGGERED=YES

(
  cd android || exit 1
  chmod u+x gradlew
  ./gradlew --no-daemon --stacktrace assembleDebug
) > "$BUILD_LOG" 2>&1
GRADLE_RC=$?

echo "GRADLE_EXIT_CODE=$GRADLE_RC"
echo "--- BUILD OUTPUT: FAILURE SUMMARY"
grep -ni -A 12 -B 4 -E \
  'What went wrong|Execution failed for task|Could not resolve|Could not find|No matching variant|Caused by:|BufferOverflowException|SDK location not found|BUILD SUCCESSFUL|BUILD FAILED' \
  "$BUILD_LOG" | tail -n 180 || true

if [ "$GRADLE_RC" -eq 0 ]; then
  APK="$(find android -type f -path '*/build/outputs/apk/debug/*.apk' -print -quit 2>/dev/null)"
  if [ -n "$APK" ] && [ -s "$APK" ]; then
    echo "BUILD_RESULT=SUCCESS"
    echo "APK=$APK"
    sha256sum "$APK" 2>/dev/null || true
    BUILD_RESULT=SUCCESS
    echo "APK_FILE_PRESENT=YES"
    echo "APK_SIGNATURE_VERIFICATION=NOT_CHECKED"
    echo "DEVICE_INSTALLATION=NOT_CHECKED"
    echo "END_TO_END_FUNCTIONALITY=NOT_CHECKED"
  else
    echo "GRADLE_SUCCEEDED_BUT_APK_NOT_FOUND"
    BUILD_RESULT=APK_NOT_FOUND
  fi
else
  echo "BUILD_RESULT=FAILED"
  BUILD_RESULT=FAILED
fi

echo
echo "===== 10. FINAL EVIDENCE BOUNDARY ====="
echo "BUILD_RESULT=$BUILD_RESULT"
echo "SOURCE_REPAIR=NOT_APPLIED"
echo "SERVERS_RESTARTED=NO"
echo "WALLETS_OR_DATABASES_TOUCHED=NO"
echo "PROJECT_FILES_DELETED=NO"

if [ "$BUILD_RESULT" = "SUCCESS" ]; then
  echo "PASS_REAL=NOT_ISSUED"
  echo "REASON=APK_BUILD_ONLY_DOES_NOT_PROVE_INSTALLATION_OR_FULL_FUNCTIONALITY"
else
  echo "PASS_REAL=NOT_ISSUED"
  echo "REASON=BUILD_NOT_VERIFIED_SUCCESSFULLY"
fi

exit 0
