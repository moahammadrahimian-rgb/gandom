#!/data/data/com.termux/files/usr/bin/bash
set -u
umask 077

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

STAMP="$(date +%Y%m%dT%H%M%S)"
EVIDENCE="$ROOT/evidence/GANDOM_EXECUTOR_2558_$STAMP"
mkdir -p "$EVIDENCE" || exit 1
REPORT="$EVIDENCE/EXECUTION_REPORT.txt"
LOG="$EVIDENCE/build.log"

exec > >(tee -a "$REPORT") 2>&1

echo "=== GANDOM EXECUTOR / LAW 2558 ==="
echo "TIME=$(date -Iseconds)"
echo "ROOT=$ROOT"
echo "EVIDENCE=$EVIDENCE"
echo "LAW=2558"
echo "NO_FAKE_PASS=1"
echo "PROJECT_FILES_DELETED=NO"
echo "WALLETS_OR_DATABASES_TOUCHED=NO"

echo
echo "=== 1. PREFLIGHT ==="
for cmd in node npm java git; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf '%s=' "$cmd"
    command -v "$cmd"
  else
    echo "MISSING_TOOL=$cmd"
  fi
done

node --version 2>&1 || true
npm --version 2>&1 || true
java -version 2>&1 || true
printf 'ARCH='
uname -m 2>&1 || true
printf 'LONG_BIT='
getconf LONG_BIT 2>&1 || true

echo
echo "=== 2. PROJECT INVENTORY ==="
git status --short 2>&1 || true
for f in package.json capacitor.config.json capacitor.config.ts \
         android/gradle.properties android/gradle/wrapper/gradle-wrapper.properties \
         android/settings.gradle android/settings.gradle.kts \
         android/build.gradle android/build.gradle.kts \
         android/app/build.gradle android/app/build.gradle.kts \
         gradle.properties; do
  if [ -f "$f" ]; then
    echo "FOUND=$f"
    sha256sum "$f" 2>/dev/null || true
  fi
done

echo
echo "=== 3. PREVIOUS FAILURE SIGNATURES ==="
find "$ROOT/evidence" -maxdepth 3 -type f \
  \( -iname '*build*.log' -o -iname '*gradle*.log' -o -iname '*execution_report*.txt' \) \
  -print 2>/dev/null | tail -80

grep -RniE -m 4 \
  'BufferOverflowException|What went wrong:|Could not resolve|Could not find|Execution failed for task|AndroidX|BUILD FAILED' \
  "$ROOT/evidence" "$ROOT/android" \
  --include='*.log' --include='*.txt' 2>/dev/null | tail -120 || true

echo
echo "=== 4. BUILD TOOLCHAIN ==="
if [ ! -d android ]; then
  echo "BUILD_STATUS=BLOCKED"
  echo "REASON=android_directory_missing"
  echo "PASS_REAL=NOT_ISSUED"
  echo "REPORT=$REPORT"
  exit 2
fi

if [ ! -f android/gradlew ]; then
  echo "BUILD_STATUS=BLOCKED"
  echo "REASON=android_gradlew_missing"
  echo "PASS_REAL=NOT_ISSUED"
  echo "REPORT=$REPORT"
  exit 2
fi

chmod u+x android/gradlew 2>/dev/null || true

if [ -f android/gradle/wrapper/gradle-wrapper.properties ]; then
  echo "--- Wrapper distribution ---"
  grep -nE 'distributionUrl|distributionSha256Sum' \
    android/gradle/wrapper/gradle-wrapper.properties || true
fi

echo
echo "=== 5. EXISTING ANDROIDX CONFIG ==="
for f in gradle.properties android/gradle.properties; do
  if [ -f "$f" ]; then
    echo "--- $f ---"
    grep -nE 'android\.useAndroidX|android\.enableJetifier|org\.gradle\.jvmargs' \
      "$f" || true
  fi
done

echo
echo "=== 6. REAL DEBUG BUILD ==="
echo "BUILD_TRIGGERED=YES"
(
  cd android || exit 1
  bash ./gradlew --no-daemon --stacktrace --warning-mode all assembleDebug
) > "$LOG" 2>&1
BUILD_RC=$?

echo "BUILD_EXIT_CODE=$BUILD_RC"
echo "--- Exact failure details ---"
grep -n -A 12 -B 5 -E \
  'What went wrong:|Caused by:|BufferOverflowException|Could not resolve|Could not find|Execution failed for task|BUILD SUCCESSFUL|BUILD FAILED' \
  "$LOG" | tail -220 || true

echo
echo "=== 7. APK ARTIFACT CHECK ==="
find "$ROOT/android" -type f -name '*.apk' -print 2>/dev/null \
  | while IFS= read -r apk; do
      echo "APK=$apk"
      stat -c 'SIZE_BYTES=%s' "$apk" 2>/dev/null || true
      sha256sum "$apk" 2>/dev/null || true
    done

if [ "$BUILD_RC" -eq 0 ]; then
  APK="$(find "$ROOT/android" -type f -path '*/build/outputs/apk/debug/*.apk' -print -quit 2>/dev/null)"
  if [ -n "$APK" ] && [ -s "$APK" ]; then
    echo "BUILD_STATUS=BUILD_SUCCESS"
    echo "APK_ARTIFACT=EXISTS"
    echo "APK_PATH=$APK"
    echo "PASS_REAL=NOT_ISSUED"
    echo "NOTE=Build success alone does not prove install, launch, or end-to-end functionality."
  else
    echo "BUILD_STATUS=FAILED_ARTIFACT_CHECK"
    echo "REASON=No non-empty debug APK found"
    echo "PASS_REAL=NOT_ISSUED"
  fi
else
  echo "BUILD_STATUS=BUILD_FAILED"
  echo "PASS_REAL=NOT_ISSUED"
fi

echo
echo "=== 8. PRESERVATION ==="
echo "PROJECT_FILES_DELETED=NO"
echo "WALLETS_OR_DATABASES_TOUCHED=NO"
echo "SERVERS_RESTARTED=NO"
echo "SOURCE_CONFIGURATION_CHANGED=NO"
echo "REPORT=$REPORT"
echo "BUILD_LOG=$LOG"
echo "=== END ==="
