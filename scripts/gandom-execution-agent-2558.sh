#!/data/data/com.termux/files/usr/bin/bash

set -u
umask 077

LAW=2558
export NO_FAKE_PASS=1

ROOT="$HOME/gandom"
NRN="$HOME/nrn-alpha6"
GLOBAL="$(find "$HOME" -maxdepth 1 -type d \
  -name 'GANDOM_GLOBAL_EXTRACTION_2558_*' 2>/dev/null |
  sort | tail -n 1)"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$ROOT/evidence/GANDOM_EXECUTION_AGENT_2558_$STAMP"
mkdir -p "$OUT" || exit 1
REPORT="$OUT/EXECUTION_REPORT.txt"

exec > >(tee "$REPORT") 2>&1

echo "=== GANDOM EXECUTION AGENT ==="
echo "LAW=$LAW"
echo "PROJECT=$ROOT"
echo "NRN_PROJECT=$NRN"
echo "UTC=$STAMP"
echo "MODE=SAFE_DIAGNOSIS"
echo "PROJECT_FILES_MODIFIED=NO"
echo "PROJECT_FILES_DELETED=NO"
echo "SERVERS_RESTARTED=NO"
echo "WALLETS_OR_DATABASES_TOUCHED=NO"
echo "BUILD_TRIGGERED=NO"
echo "PASS_REAL=NOT_ISSUED"
echo

echo "=== 1. ENVIRONMENT ==="
uname -a 2>/dev/null || true
printf 'ARCH='
uname -m 2>/dev/null || true
printf 'LONG_BIT='
getconf LONG_BIT 2>/dev/null || true
node --version 2>/dev/null || true
java -version 2>&1 | head -n 3
printf 'GRADLE='
gradle --version 2>/dev/null | grep -m1 '^Gradle ' || true
echo

echo "=== 2. GLOBAL EXTRACTION REPORT ==="
if [ -n "$GLOBAL" ] && [ -d "$GLOBAL" ]; then
  echo "GLOBAL_DIR=$GLOBAL"
  for f in \
    "$GLOBAL/GLOBAL_MASTER_REPORT.txt" \
    "$GLOBAL/GITHUB_REPOSITORIES.json" \
    "$GLOBAL/LOCAL_PROJECTS.json" \
    "$GLOBAL/PROJECT_FILE_INVENTORY.txt" \
    "$GLOBAL/NETWORK_AND_SCAN_STATUS.txt"; do
    if [ -f "$f" ]; then
      echo "--- FILE: $f"
      if [[ "$f" == *.txt ]]; then
        sed -n '1,180p' "$f"
      else
        head -c 12000 "$f"
        echo
      fi
    fi
  done
else
  echo "GLOBAL_EXTRACTION_REPORT=NOT_FOUND"
fi
echo

echo "=== 3. ANDROID/GRADLE CONFIGURATION ==="
for P in "$ROOT" "$NRN"; do
  [ -d "$P" ] || continue
  echo "--- PROJECT: $P"

  for F in \
    android/build.gradle \
    android/build.gradle.kts \
    android/settings.gradle \
    android/settings.gradle.kts \
    android/gradle.properties \
    android/gradle/wrapper/gradle-wrapper.properties \
    gradle.properties \
    settings.gradle \
    settings.gradle.kts \
    build.gradle \
    build.gradle.kts \
    package.json \
    node_modules/@capacitor/android/capacitor/build.gradle \
    node_modules/@capacitor/android/package.json; do

    FILE="$P/$F"
    [ -f "$FILE" ] || continue
    echo "### $F"

    case "$F" in
      package.json)
        grep -nE '"(@capacitor/(android|core)|@capacitor/cli)"|"version"|"scripts"' \
          "$FILE" 2>/dev/null | head -n 50 || true
        ;;
      *)
        grep -nEi \
          'com\.android\.tools\.build:gradle|com\.android\.tools\.build:gradle:|com\.android\.tools\.build|distributionUrl|useAndroidX|google\(\)|mavenCentral\(\)|repositories|aliyun|capacitor|8\.6\.0|8\.13\.0' \
          "$FILE" 2>/dev/null | head -n 100 || true
        ;;
    esac
  done
  echo
done

echo "=== 4. RECENT BUILD LOGS ==="
for P in "$ROOT" "$NRN"; do
  [ -d "$P" ] || continue
  find "$P/.evidence" "$P" -maxdepth 3 -type f \
    \( -iname '*build*.log' -o -iname '*gradle*.log' \
       -o -iname '*agp*.log' \) \
    ! -path '*/node_modules/*' 2>/dev/null |
    sort -u | tail -n 15 |
    while IFS= read -r F; do
      echo "--- LOG: $F"
      grep -nEi -C 3 \
        'What went wrong|Could not resolve|Could not find|No matching variant|Plugin .* not found|Failed to resolve|AndroidX|BUILD FAILED|BUILD SUCCESSFUL|Caused by:|requires|Required by:' \
        "$F" 2>/dev/null | tail -n 100 || true
    done
done
echo

echo "=== 5. ROOT-CAUSE EVALUATION ==="
CONFIGS=0
for P in "$ROOT" "$NRN"; do
  [ -d "$P" ] || continue
  for F in \
    "$P/android/build.gradle" \
    "$P/android/settings.gradle" \
    "$P/android/gradle/wrapper/gradle-wrapper.properties" \
    "$P/node_modules/@capacitor/android/capacitor/build.gradle"; do
    [ -f "$F" ] && CONFIGS=$((CONFIGS + 1))
  done
done
echo "ANDROID_CONFIG_FILES_FOUND=$CONFIGS"

if grep -RInE \
  'com\.android\.tools\.build:gradle:8\.13\.0|com\.android\.tools\.build:gradle:8\.6\.0' \
  "$ROOT/android" "$ROOT/node_modules/@capacitor/android" \
  --include='*.gradle' --include='*.gradle.kts' 2>/dev/null; then
  echo "AGP_DECLARATIONS_ABOVE=FOUND"
else
  echo "AGP_DECLARATIONS_ABOVE=NOT_FOUND_IN_SCANNED_FILES"
fi

if [ -f "$ROOT/android/gradle.properties" ] &&
   grep -qE '^[[:space:]]*android\.useAndroidX=true' \
   "$ROOT/android/gradle.properties"; then
  echo "ANDROIDX_FLAG=ENABLED"
else
  echo "ANDROIDX_FLAG=NOT_CONFIRMED_IN_ANDROID_GRADLE_PROPERTIES"
fi

echo
echo "=== 6. VERIFICATION BOUNDARY ==="
echo "This run inspects configuration and existing logs only."
echo "A version appearing in Gradle cache does not prove it is the required version."
echo "An AndroidX warning alone does not prove it caused BUILD FAILED."
echo "A dependency-resolution error must be matched to the exact requested coordinate and repository."
echo "No source/configuration repair was applied."
echo "PROJECT_FILES_MODIFIED=NO"
echo "PROJECT_FILES_DELETED=NO"
echo "SERVERS_RESTARTED=NO"
echo "WALLETS_OR_DATABASES_TOUCHED=NO"
echo "BUILD_TRIGGERED=NO"
echo "PASS_REAL=NOT_ISSUED"
echo "REPORT=$REPORT"
