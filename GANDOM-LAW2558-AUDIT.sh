#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
# GANDOM FINAL — LAW 2558
# REAL PROJECT AUDIT — NON-DESTRUCTIVE
#
# هدف:
# 1. کشف فایل‌ها و موتورهای واقعی موجود
# 2. بررسی APIها، P2P، مغز، نورون، سلول و اندروید
# 3. شناسایی آزمون‌ها، بکاپ‌ها و وابستگی‌ها
# 4. ثبت شواهد واقعی بدون ادعای PASS جعلی
#
# ممنوع:
# - حذف فایل
# - بازنویسی فایل اصلی
# - نصب خودکار وابستگی
# - اجرای عملیات مالی
# - چاپ مقادیر محرمانه
# - ساخت بکاپ حجیم
# ============================================================

set -u
umask 077

ROOT="$HOME/gandom"
LAW="2558"

if [ ! -d "$ROOT" ]; then
    echo "ERROR: PROJECT_NOT_FOUND"
    exit 1
fi

cd "$ROOT" || exit 1

echo
echo "============================================================"
echo " GANDOM FINAL — GOLDEN MOTHER LAW 2558"
echo " REAL PROJECT AUDIT"
echo "============================================================"
echo

# فایل گزارش در خود پروژه ساخته می‌شود.
# نام یکتا برای جلوگیری از بازنویسی گزارش قبلی.
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="$ROOT/GANDOM-LAW2558-AUDIT-$STAMP.txt"

# از ساخت گزارش در خارج از پروژه یا ایجاد بکاپ حجیم خودداری می‌شود.
touch "$REPORT" || {
    echo "ERROR: CANNOT_CREATE_AUDIT_REPORT"
    exit 1
}

chmod 600 "$REPORT" 2>/dev/null || true

exec 3>&1

log() {
    printf '%s\n' "$*" | tee -a "$REPORT"
}

section() {
    log ""
    log "============================================================"
    log "$1"
    log "============================================================"
}

# ------------------------------------------------------------
# 1. قانون مادر و وضعیت ممیزی
# ------------------------------------------------------------

section "01 — GOVERNANCE / LAW 2558"

log "PROJECT=GANDOM FINAL"
log "LAW=2558"
log "AUDIT_MODE=READ_ONLY_WITH_LOCAL_REPORT"
log "NO_FAKE_PASS=1"
log "REPORT=$REPORT"
log "START_TIME=$(date -Iseconds 2>/dev/null || date)"

log "RULE: AUDIT_SUCCESS_DOES_NOT_MEAN_PROJECT_SUCCESS"
log "RULE: NO_CAPABILITY_IS_VERIFIED_WITHOUT_EXECUTED_TEST_EVIDENCE"

# ------------------------------------------------------------
# 2. مشخصات محیط واقعی
# ------------------------------------------------------------

section "02 — REAL ENVIRONMENT"

log "PWD=$ROOT"
log "OS=$(uname -s 2>/dev/null || echo UNKNOWN)"
log "KERNEL=$(uname -r 2>/dev/null || echo UNKNOWN)"
log "ARCH=$(uname -m 2>/dev/null || echo UNKNOWN)"
log "TERMUX_PREFIX=${PREFIX:-UNKNOWN}"

if command -v node >/dev/null 2>&1; then
    log "NODE_VERSION=$(node --version 2>/dev/null)"
else
    log "NODE_VERSION=NOT_INSTALLED"
fi

if command -v npm >/dev/null 2>&1; then
    log "NPM_VERSION=$(npm --version 2>/dev/null)"
else
    log "NPM_VERSION=NOT_INSTALLED"
fi

if command -v git >/dev/null 2>&1; then
    log "GIT_VERSION=$(git --version 2>/dev/null)"
else
    log "GIT=NOT_INSTALLED"
fi

if command -v java >/dev/null 2>&1; then
    log "JAVA_VERSION=$(java -version 2>&1 | head -n 1)"
else
    log "JAVA=NOT_INSTALLED"
fi

if command -v gradle >/dev/null 2>&1; then
    log "GRADLE_VERSION=$(gradle --version 2>/dev/null | grep -m1 'Gradle ' || true)"
else
    log "GRADLE=NOT_INSTALLED_OR_NOT_ON_PATH"
fi

# ------------------------------------------------------------
# 3. فضای ذخیره‌سازی
# ------------------------------------------------------------

section "03 — STORAGE AND RESOURCE BASELINE"

df -h "$ROOT" 2>/dev/null | tee -a "$REPORT" || true

if command -v du >/dev/null 2>&1; then
    log ""
    log "PROJECT_SIZE:"
    du -sh "$ROOT" 2>/dev/null | tee -a "$REPORT" || true

    log ""
    log "TOP_LEVEL_DIRECTORY_SIZES:"
    du -sh "$ROOT"/*/ 2>/dev/null |
        sort -h |
        tail -n 35 |
        tee -a "$REPORT" || true
fi

# ------------------------------------------------------------
# 4. Git و تاریخچه تغییرات
# ------------------------------------------------------------

section "04 — GIT / CHANGE HISTORY"

if [ -d "$ROOT/.git" ] && command -v git >/dev/null 2>&1; then
    log "GIT_REPOSITORY=FOUND"

    log ""
    log "CURRENT_BRANCH:"
    git branch --show-current 2>&1 | tee -a "$REPORT" || true

    log ""
    log "LATEST_COMMITS:"
    git log -5 --format='%h %cs %s' 2>&1 |
        tee -a "$REPORT" || true

    log ""
    log "WORKTREE_STATUS:"
    git status --short 2>&1 |
        tee -a "$REPORT" || true

    log ""
    log "TRACKED_FILE_COUNT:"
    git ls-files 2>/dev/null | wc -l | tee -a "$REPORT"

    log ""
    log "REMOTE_NAMES_ONLY:"
    git remote 2>/dev/null | tee -a "$REPORT" || true

    log ""
    log "NOTE: REMOTE URLS AND CREDENTIALS ARE NOT PRINTED."
else
    log "GIT_REPOSITORY=NOT_FOUND"
    log "STATUS=BLOCKED_FOR_GIT_HISTORY_AUDIT"
fi

# ------------------------------------------------------------
# 5. شمارش فایل‌ها بدون بازکردن فایل‌های حجیم
# ------------------------------------------------------------

section "05 — PROJECT INVENTORY"

log "FILE_COUNT:"
find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type f -print 2>/dev/null |
    wc -l |
    tee -a "$REPORT"

log "DIRECTORY_COUNT:"
find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type d -print 2>/dev/null |
    wc -l |
    tee -a "$REPORT"

log ""
log "TOP_LEVEL_ENTRIES:"
find "$ROOT" -mindepth 1 -maxdepth 1 \
    -printf '%f\n' 2>/dev/null |
    sort |
    tee -a "$REPORT"

if ! find "$ROOT" -maxdepth 1 -type f -print -quit 2>/dev/null |
    grep -q .; then
    log "NOTE: find -printf MAY NOT BE SUPPORTED ON THIS TERMUX BUILD."
fi

# ------------------------------------------------------------
# 6. فایل‌های اصلی و تنظیمات
# ------------------------------------------------------------

section "06 — CORE FILE DISCOVERY"

find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type f \( \
        -name 'server.js' -o \
        -name 'client.js' -o \
        -name 'index.js' -o \
        -name 'package.json' -o \
        -name 'package-lock.json' -o \
        -name 'tsconfig.json' -o \
        -name 'capacitor.config.*' -o \
        -name 'build.gradle' -o \
        -name 'build.gradle.kts' -o \
        -name 'AndroidManifest.xml' -o \
        -name 'settings.gradle' -o \
        -name 'settings.gradle.kts' -o \
        -name 'Dockerfile' -o \
        -name 'docker-compose.yml' -o \
        -name 'docker-compose.yaml' -o \
        -name 'Makefile' -o \
        -name 'README*' -o \
        -name '*2558*' \
    \) -print 2>/dev/null |
    sort |
    tee -a "$REPORT"

# ------------------------------------------------------------
# 7. بررسی package.json بدون نمایش اطلاعات محرمانه
# ------------------------------------------------------------

section "07 — NODE.JS DEPENDENCIES"

if [ -f "$ROOT/package.json" ] && command -v node >/dev/null 2>&1; then
    node - "$ROOT/package.json" <<'NODE_AUDIT' 2>&1 |
const fs = require('fs');

const path = process.argv[2];

try {
  const p = JSON.parse(fs.readFileSync(path, 'utf8'));

  console.log('PACKAGE_NAME=' + (p.name || 'UNSET'));
  console.log('PACKAGE_VERSION=' + (p.version || 'UNSET'));
  console.log('PACKAGE_MAIN=' + (p.main || 'UNSET'));

  console.log('\nSCRIPTS:');

  for (const [name, command] of Object.entries(p.scripts || {})) {
    // فرمان‌های تعریف‌شده نمایش داده می‌شوند؛
    // هیچ فرمانی در این مرحله اجرا نمی‌شود.
    console.log(name + ' = ' + command);
  }

  console.log('\nPRODUCTION_DEPENDENCIES:');

  for (const [name, version] of Object.entries(p.dependencies || {})) {
    console.log(name + ' = ' + version);
  }

  console.log('\nDEVELOPMENT_DEPENDENCIES:');

  for (const [name, version] of Object.entries(p.devDependencies || {})) {
    console.log(name + ' = ' + version);
  }

} catch (e) {
  console.log('PACKAGE_JSON_STATUS=INVALID');
  console.log('ERROR_TYPE=' + e.name);
  process.exitCode = 1;
}
NODE_AUDIT
    tee -a "$REPORT"
else
    log "PACKAGE_JSON_STATUS=MISSING_OR_NODE_UNAVAILABLE"
fi

if [ -d "$ROOT/node_modules" ]; then
    log "NODE_MODULES=PRESENT"

    if [ -f "$ROOT/node_modules/.package-lock.json" ]; then
        log "NODE_MODULES_LOCK=PRESENT"
    else
        log "NODE_MODULES_LOCK=NOT_FOUND"
    fi
else
    log "NODE_MODULES=MISSING"
fi

# ------------------------------------------------------------
# 8. کشف API و سرور
# ------------------------------------------------------------

section "08 — SERVER AND API DISCOVERY"

log "SEARCH_TARGETS:"
log "/health"
log "/api/peers"
log "/api/stats"
log "/api/version"
log "/api/cells"
log "/api/neurons"
log "/api/profit"
log "/api/orders"

if command -v grep >/dev/null 2>&1; then
    grep -RInE \
        --include='*.js' \
        --include='*.mjs' \
        --include='*.cjs' \
        --include='*.ts' \
        --include='*.json' \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude='*AUDIT*' \
        --exclude='*.map' \
        '(\/health|\/api\/peers|\/api\/stats|\/api\/version|\/api\/cells|\/api\/neurons|\/api\/profit|\/api\/orders)' \
        "$ROOT" 2>/dev/null |
        head -n 180 |
        tee -a "$REPORT" || true
fi

# ------------------------------------------------------------
# 9. مغز، نورون، حافظه، سلول و DNA
# ------------------------------------------------------------

section "09 — BRAIN / NEURAL / CELLULAR / DNA DISCOVERY"

PATTERN='neuron|neural|brain|memory|short.term|long.term|experience|reasoning|planner|decision|learning|alpha.?6|cellular|cell.?id|metabolism|mutation|inheritance|digital.?dna|self.?heal|evolution'

grep -RIlE \
    --include='*.js' \
    --include='*.mjs' \
    --include='*.cjs' \
    --include='*.ts' \
    --include='*.py' \
    --include='*.json' \
    --include='*.md' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude='*AUDIT*' \
    "$PATTERN" "$ROOT" 2>/dev/null |
    head -n 300 |
    tee -a "$REPORT" || true

# ------------------------------------------------------------
# 10. موتورهای اندام دیجیتال
# ------------------------------------------------------------

section "10 — DIGITAL ORGANS DISCOVERY"

PATTERN='heart|lung|kidney|liver|eye|ear|tongue|hand|foot|organ|health.?check|resource.?filter|event.?bus|scheduler|task.?queue|orchestrator'

grep -RIlE \
    --include='*.js' \
    --include='*.mjs' \
    --include='*.cjs' \
    --include='*.ts' \
    --include='*.py' \
    --include='*.json' \
    --include='*.md' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude='*AUDIT*' \
    "$PATTERN" "$ROOT" 2>/dev/null |
    head -n 300 |
    tee -a "$REPORT" || true

# ------------------------------------------------------------
# 11. شبکه و P2P
# ------------------------------------------------------------

section "11 — P2P / NETWORK / MESSAGE DELIVERY"

PATTERN='WebSocket|createServer|node_id|nodeId|peer|P2P|HELLO_ACK|HEARTBEAT|PING|PONG|message.?id|dedup|reconnect|handshake|crypto|signature|ack'

grep -RInE \
    --include='*.js' \
    --include='*.mjs' \
    --include='*.cjs' \
    --include='*.ts' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude='*AUDIT*' \
    "$PATTERN" "$ROOT" 2>/dev/null |
    head -n 220 |
    tee -a "$REPORT" || true

log ""
log "IMPORTANT:"
log "SOURCE_CODE_MATCHES_DO_NOT_PROVE_LIVE_P2P"
log "LOCALHOST_TEST_DOES_NOT_PROVE_INDEPENDENT_DEVICE_CONNECTIVITY"

# ------------------------------------------------------------
# 12. امنیت بدون چاپ کلیدها یا مقادیر محرمانه
# ------------------------------------------------------------

section "12 — SECURITY CONTROL DISCOVERY"

PATTERN='createHmac|createHash|createSign|createVerify|timingSafeEqual|randomBytes|scrypt|pbkdf2|bcrypt|argon2|Authorization|Bearer|rate.?limit|rateLimit|authenticate|authorize|permission|role|validate|schema|sanitize|audit.?log'

grep -RIlE \
    --include='*.js' \
    --include='*.mjs' \
    --include='*.cjs' \
    --include='*.ts' \
    --include='*.json' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude='*AUDIT*' \
    "$PATTERN" "$ROOT" 2>/dev/null |
    head -n 300 |
    tee -a "$REPORT" || true

log ""
log "SECRET_SCAN_POLICY=PATHS_AND_PRESENCE_ONLY"
log "SECRET_VALUES_WILL_NOT_BE_PRINTED"

# فقط وجود احتمالی فایل‌های حساس گزارش می‌شود.
find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type f \( \
        -name '.env' -o \
        -name '.env.*' -o \
        -name '*.pem' -o \
        -name '*.key' -o \
        -name '*.p12' -o \
        -name '*.pfx' \
    \) -print 2>/dev/null |
    sed "s|$ROOT/||g" |
    tee -a "$REPORT" || true

# ------------------------------------------------------------
# 13. اقتصاد، سوددهی، کیف پول و تجارت
# ------------------------------------------------------------

section "13 — ECONOMY / PROFIT / WALLET / COMMERCE"

PATTERN='profit|loss|revenue|expense|cash.?flow|accounting|invoice|payment|withdraw|deposit|refund|wallet|ledger|transaction|order|customer|merchant|market|GDM|USDT|commission|fraud|risk'

grep -RIlE \
    --include='*.js' \
    --include='*.mjs' \
    --include='*.cjs' \
    --include='*.ts' \
    --include='*.py' \
    --include='*.json' \
    --include='*.sql' \
    --include='*.md' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude='*AUDIT*' \
    "$PATTERN" "$ROOT" 2>/dev/null |
    head -n 300 |
    tee -a "$REPORT" || true

log ""
log "FINANCIAL_REALITY_RULE:"
log "PREDICTED_REVENUE_IS_NOT_COLLECTED_REVENUE"
log "ORDER_IS_NOT_PROOF_OF_PAYMENT"
log "WALLET_BALANCE_IS_NOT_PROOF_OF_NET_PROFIT"

# ------------------------------------------------------------
# 14. وب، اندروید، APK و رابط کاربری
# ------------------------------------------------------------

section "14 — ANDROID / WEB UI / APK"

for path in \
    "$ROOT/public" \
    "$ROOT/www" \
    "$ROOT/android" \
    "$ROOT/app" \
    "$ROOT/final-apk" \
    "$ROOT/dist" \
    "$ROOT/build"; do

    if [ -d "$path" ]; then
        log "DIRECTORY_PRESENT=${path#"$ROOT"/}"

        find "$path" -maxdepth 3 -type f \
            \( \
                -name '*.html' -o \
                -name '*.css' -o \
                -name '*.js' -o \
                -name '*.json' -o \
                -name '*.xml' -o \
                -name '*.gradle' -o \
                -name '*.gradle.kts' -o \
                -name '*.apk' -o \
                -name '*.aab' \
            \) -print 2>/dev/null |
            head -n 120 |
            tee -a "$REPORT" || true
    fi
done

log ""
log "APK_FILE_INVENTORY:"

find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type f -name '*.apk' -print 2>/dev/null |
    while IFS= read -r apk; do
        ls -lh "$apk" 2>/dev/null
        sha256sum "$apk" 2>/dev/null
    done |
    tee -a "$REPORT" || true

# ------------------------------------------------------------
# 15. آزمون‌ها و شواهد
# ------------------------------------------------------------

section "15 — TESTS / EVIDENCE / VERIFICATION"

find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type f \( \
        -name '*.test.js' -o \
        -name '*.spec.js' -o \
        -name '*.test.ts' -o \
        -name '*.spec.ts' -o \
        -iname '*test*' -o \
        -iname '*verify*' -o \
        -iname '*evidence*' -o \
        -iname '*gate*' \
    \) -print 2>/dev/null |
    head -n 300 |
    tee -a "$REPORT" || true

log ""
log "TEST_EXECUTION_POLICY=NO_TESTS_AUTOMATICALLY_EXECUTED"
log "REASON=INITIAL_AUDIT_MUST_NOT_TRIGGER_UNKNOWN_SIDE_EFFECTS"

# ------------------------------------------------------------
# 16. قانون مادر و اسناد حاکمیت
# ------------------------------------------------------------

section "16 — LAW 2558 GOVERNANCE ARTIFACTS"

find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type f \( \
        -iname '*GOLDEN*MOTHER*LAW*' -o \
        -iname '*LAW*2558*' -o \
        -iname '*constitution*' -o \
        -iname '*governance*' \
    \) -print 2>/dev/null |
    tee -a "$REPORT" || true

log ""
log "LAW_HASH_VERIFICATION:"

LAWFILE="$ROOT/constitution/GOLDEN-MOTHER-LAW-2558.json"

if [ -f "$LAWFILE" ]; then
    sha256sum "$LAWFILE" 2>/dev/null | tee -a "$REPORT"

    EXPECTED="a27f951a47c4fc8a0214970782655dc900d52a49ec2381273a81a60568f0b8aa"

    ACTUAL="$(sha256sum "$LAWFILE" 2>/dev/null | awk '{print $1}')"

    if [ "$ACTUAL" = "$EXPECTED" ]; then
        log "LAW_ARTIFACT_HASH=PASS_REAL"
    else
        log "LAW_ARTIFACT_HASH=BLOCKED_HASH_MISMATCH"
        log "EXPECTED_HASH=$EXPECTED"
        log "ACTUAL_HASH=$ACTUAL"
    fi
else
    log "LAW_ARTIFACT_HASH=BLOCKED_FILE_NOT_FOUND_AT_EXPECTED_PATH"
fi

# ------------------------------------------------------------
# 17. بکاپ‌ها: شمارش و فهرست‌برداری اولیه
# ------------------------------------------------------------

section "17 — BACKUP INVENTORY / NO DELETION"

log "BACKUP_DIRECTORIES:"

find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type d \( \
        -iname '*backup*' -o \
        -iname '*backups*' -o \
        -iname '*snapshot*' -o \
        -iname '*archive*' \
    \) -print 2>/dev/null |
    head -n 200 |
    tee -a "$REPORT" || true

log ""
log "ARCHIVE_COUNTS:"

find "$ROOT" \
    -path "$ROOT/.git" -prune -o \
    -path "$ROOT/node_modules" -prune -o \
    -type f \( \
        -iname '*.tar' -o \
        -iname '*.tar.gz' -o \
        -iname '*.tgz' -o \
        -iname '*.zip' -o \
        -iname '*.7z' -o \
        -iname '*.gz' \
    \) -print 2>/dev/null |
    awk '
      /\.tar\.gz$/ || /\.tgz$/ || /\.gz$/ {gz++}
      /\.zip$/ {zip++}
      /\.7z$/ {seven++}
      /\.tar$/ {tar++}
      END {
        print "GZIP_OR_TGZ=" gz+0
        print "ZIP=" zip+0
        print "SEVEN_ZIP=" seven+0
        print "TAR=" tar+0
      }
    ' |
    tee -a "$REPORT"

log ""
log "BACKUP_DELETION=PROHIBITED_DURING_AUDIT"
log "DUPLICATE_CLASSIFICATION=NOT_ESTABLISHED_BY_FILENAME"
log "CONTENT_HASH_AND_DEPENDENCY_ANALYSIS_REQUIRED_BEFORE_DELETION"

# ------------------------------------------------------------
# 18. وضعیت اولیه قابلیت‌ها
# ------------------------------------------------------------

section "18 — PRELIMINARY STATUS CLASSIFICATION"

log "STATUS DEFINITIONS:"
log "VERIFIED_EXISTING=REAL_EXECUTION_AND_EVIDENCE_CONFIRM_CAPABILITY"
log "IMPLEMENTED_NOT_VERIFIED=CODE_EXISTS_BUT_REQUIRED_TEST_NOT_CONFIRMED"
log "PARTIAL=ONLY_SOME_REQUIRED_BEHAVIOR_EXISTS"
log "MISSING=REQUIRED_IMPLEMENTATION_NOT_FOUND"
log "BLOCKED=INSUFFICIENT_ACCESS_OR_EVIDENCE"
log "DEPRECATED=REPLACEMENT_AND_NONUSE_REQUIRE_PROOF"
log "DUPLICATE_CANDIDATE=CONTENT_AND_DEPENDENCIES_REQUIRE_REVIEW"

log ""
log "INITIAL_STATUS=BLOCKED_PENDING_EVIDENCE_REVIEW"
log "REASON=SOURCE_DISCOVERY_ALONE_DOES_NOT_VERIFY_RUNTIME_BEHAVIOR"

# ------------------------------------------------------------
# 19. خلاصه نهایی ممیزی
# ------------------------------------------------------------

section "19 — AUDIT RESULT"

log "AUDIT_FINISHED_AT=$(date -Iseconds 2>/dev/null || date)"
log "AUDIT_REPORT=$REPORT"
log "PROJECT_ROOT=$ROOT"
log "LAW=$LAW"

log ""
log "REAL_TESTS_EXECUTED=0"
log "FILES_DELETED=0"
log "CORE_FILES_REPLACED=0"
log "DEPENDENCIES_INSTALLED=0"
log "BULK_BACKUPS_CREATED=0"
log "FINANCIAL_OPERATIONS_EXECUTED=0"

log ""
log "OVERALL_PROJECT_STATUS=NOT_YET_VERIFIED"
log "AUDIT_SCRIPT_STATUS=COMPLETED_IF_NO_FATAL_ERROR"
log "PASS_REAL=NOT_ISSUED"

log ""
log "NEXT_STEP:"
log "REVIEW_THIS_REPORT_AND_MAP_FOUND_FILES_TO_THE_228_REQUIREMENTS"
log "THEN_EXECUTE_SMALL_SCOPED_TESTS_WITH_CAPTURED_EVIDENCE"
log "NO_DELETION_BEFORE_HASH_DEPENDENCY_AND_ROLLBACK_REVIEW"

# ------------------------------------------------------------
# 20. کنترل صحت فایل گزارش
# ------------------------------------------------------------

section "20 — REPORT INTEGRITY"

if [ -s "$REPORT" ]; then
    log "REPORT_EXISTS=YES"
    log "REPORT_SIZE=$(wc -c < "$REPORT" | tr -d ' ')"
    log "REPORT_SHA256=$(sha256sum "$REPORT" 2>/dev/null | awk '{print $1}')"
else
    log "REPORT_EXISTS=NO"
fi

exec 3>&-

echo
echo "============================================================"
echo " GANDOM LAW 2558 — AUDIT FINISHED"
echo "============================================================"
echo
echo "گزارش واقعی در مسیر زیر ذخیره شد:"
echo "$REPORT"
echo
echo "هیچ PASS نهایی برای کل پروژه صادر نشده است."
echo "هیچ فایل اصلی یا بکاپی حذف نشده است."
echo
echo "برای مشاهده گزارش:"
echo "cat \"$REPORT\""
echo
echo "============================================================"

exit 0
