#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

TS="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT="$ROOT/GANDOM_GRADLE_ROOT_CAUSE_2558_${TS}.txt"
RAW="$ROOT/.runtime/gradle-root-cause-${TS}.log"

mkdir -p "$ROOT/.runtime" || exit 1

{
  echo "GANDOM GRADLE ROOT CAUSE REPORT"
  echo "LAW=2558"
  echo "TIMESTAMP_UTC=$TS"
  echo "PROJECT=$ROOT"
  echo "MODE=DIAGNOSTIC_BUILD"
  echo "PROJECT_SOURCE_FILES_MODIFIED=NO"
  echo

  echo "===== JAVA ====="
  java -version 2>&1
  echo

  echo "===== GRADLE WRAPPER ====="
  if [ -x "$ROOT/android/gradlew" ]; then
    "$ROOT/android/gradlew" --version 2>&1
  else
    echo "WRAPPER_MISSING_OR_NOT_EXECUTABLE"
  fi
  echo

  echo "===== ANDROID BUILD CONFIG ====="
  for f in \
    android/gradle/wrapper/gradle-wrapper.properties \
    android/settings.gradle \
    android/settings.gradle.kts \
    android/build.gradle \
    android/build.gradle.kts \
    android/app/build.gradle \
    android/app/build.gradle.kts \
    node_modules/@capacitor/android/package.json \
    package.json
  do
    if [ -f "$ROOT/$f" ]; then
      echo "--- $f"
      case "$f" in
        *package.json|*gradle-wrapper.properties)
          sed -n '1,100p' "$ROOT/$f" 2>&1
          ;;
        *settings.gradle|*settings.gradle.kts|*build.gradle|*build.gradle.kts)
          grep -n -E 'include|project|plugin|classpath|repositories|google\(\)|mavenCentral|com.android.tools.build:gradle|distributionUrl|capacitor' "$ROOT/$f" 2>&1 | head -n 100
          ;;
      esac
    else
      echo "MISSING: $f"
    fi
  done
  echo

  echo "===== FRESH BUILD DIAGNOSTIC ====="
  echo "Running Gradle with stacktrace; no clean, no dependency upgrade."
} > "$REPORT"

if [ ! -x "$ROOT/android/gradlew" ]; then
  echo "BUILD_NOT_RUN: android/gradlew missing or not executable" >> "$REPORT"
  echo "REPORT=$REPORT"
  exit 2
fi

set +e
(
  cd "$ROOT/android" &&
  ./gradlew help --no-daemon --stacktrace --warning-mode all
) > "$RAW" 2>&1
RC=$?
set -e

{
  echo
  echo "===== BUILD RESULT ====="
  echo "GRADLE_BUILD_EXIT=$RC"
  echo
  echo "===== ROOT CAUSE SIGNATURES ====="
  grep -n -B 12 -A 24 -E \
    'BufferOverflowException|What went wrong|Caused by:|Could not|FAILURE:|BUILD FAILED|BUILD SUCCESSFUL|ANTLR|Groovy|unexpected token|NoSuchMethodError|UnsupportedClassVersionError|OutOfMemoryError' \
    "$RAW" | tail -n 260 || true

  echo
  echo "===== RAW LOG LOCATION ====="
  echo "$RAW"
  echo
  echo "===== REPORT STATUS ====="
  echo "DIAGNOSTIC_REPORT_CREATED=YES"
  echo "ROOT_CAUSE_CONFIRMED=NO"
  echo "PASS_REAL=NOT_CLAIMED"
  echo "LAW=2558"
} >> "$REPORT"

echo
echo "===== DIAGNOSTIC COMPLETE ====="
echo "GRADLE_BUILD_EXIT=$RC"
echo "REPORT=$REPORT"
echo "RAW_LOG=$RAW"
echo
tail -n 100 "$REPORT"
