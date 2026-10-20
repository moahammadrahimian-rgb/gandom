#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
# GANDOM MOTHER 2558
# EVIDENCE-FIRST | NO BLIND RETEST | REAL EXECUTION
# PRESERVE LIVE SERVER | PRESERVE EXISTING EVIDENCE
# ============================================================

set -uo pipefail
umask 077

ROOT="$HOME/gandom"
cd "$ROOT" || exit 1

TS="$(date -u +%Y%m%dT%H%M%SZ)"
RUN="$ROOT/evidence/GANDOM-MOTHER-2558-$TS-$$"
mkdir -p "$RUN" || exit 1

LOG="$RUN/execution.log"
exec > >(tee -a "$LOG") 2>&1

declare -i FAILURES=0
declare -i WARNINGS=0

record() {
  printf '%s | %s\n' "$(date -u -Is)" "$*" |
    tee -a "$RUN/events.log"
}

section() {
  printf '\n========== %s ==========\n' "$*"
}

pass() {
  record "PASS | $*"
}

fail() {
  record "FAIL | $*"
  FAILURES=$((FAILURES + 1))
}

warn() {
  record "NOT_PROVEN | $*"
  WARNINGS=$((WARNINGS + 1))
}

section "0. EXECUTION IDENTITY"
echo "PROJECT=GANDOM"
echo "LAW=2558"
echo "RUN_ID=GANDOM-MOTHER-2558-$TS-$$"
echo "ROOT=$ROOT"
echo "EVIDENCE_DIR=$RUN"
echo "START_UTC=$(date -u -Is)"
echo "MODE=EVIDENCE_FIRST_CONTROLLED_EXECUTION"
echo "LIVE_SERVER_RESTART=FORBIDDEN"
echo "BLIND_RETEST=FORBIDDEN"
echo "EXISTING_EVIDENCE_DELETE=FORBIDDEN"

section "1. ENVIRONMENT"
echo "NODE=$(node --version 2>&1 || true)"
echo "NPM=$(npm --version 2>&1 || true)"
echo "OS=$(uname -a 2>&1 || true)"
echo "DISK:"
df -h "$ROOT" 2>&1 || true

section "2. PROJECT ENTRYPOINTS"
for f in package.json server.js client.js; do
  if [ -f "$f" ]; then
    stat -c 'FILE=%n SIZE=%s MTIME=%y' "$f" 2>&1 || ls -l "$f"
  else
    echo "MISSING=$f"
  fi
done

section "3. PACKAGE CONFIGURATION"
node - <<'NODE' 2>&1 | tee "$RUN/package-info.txt"
const fs = require("fs");
try {
  const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log("PACKAGE_NAME=" + (p.name || "unknown"));
  console.log("ENTRYPOINT=" + (p.main || "unspecified"));
  console.log("SCRIPTS=" + JSON.stringify(p.scripts || {}, null, 2));
  console.log("DEPENDENCIES=" + JSON.stringify(p.dependencies || {}, null, 2));
} catch (e) {
  console.log("PACKAGE_METADATA_ERROR=" + e.message);
}
NODE

section "4. EXISTING SERVER PROCESS — READ ONLY"
ps -A -o PID,ARGS 2>&1 |
  tee "$RUN/processes.txt" |
  grep -E '[n]ode|[w]ebsocket' || true

section "5. EXISTING EVIDENCE DISCOVERY"
find "$ROOT/evidence" -maxdepth 3 -type f \
  \( -name 'execution.log' \
     -o -name 'server.log' \
     -o -name '*health*.json' \
     -o -name '*response*.txt' \
     -o -name '*SHA256SUMS.txt' \
     -o -name '*audit*.txt' \
     -o -name '*p2p*.log' \) \
  -printf '%T@ %s %p\n' 2>/dev/null |
  sort -nr |
  head -n 200 |
  tee "$RUN/existing-evidence-index.txt"

section "6. LIVE HEALTH CHECK"
HEALTH_200=0

for PORT in 3000 8080 8081 8787; do
  OUT="$RUN/health-$PORT.txt"

  CODE="$(curl --connect-timeout 2 --max-time 5 \
    -sS -o "$OUT" -w '%{http_code}' \
    "http://127.0.0.1:$PORT/health" 2>"$RUN/curl-$PORT.err" || true)"

  echo "PORT=$PORT HTTP_STATUS=${CODE:-NO_RESPONSE}"

  if [ -s "$OUT" ]; then
    cat "$OUT"
    echo
  fi

  if [ "$CODE" = "200" ]; then
    HEALTH_200=1
    pass "HTTP_HEALTH_200 port=$PORT"
  fi
done

if [ "$HEALTH_200" -eq 0 ]; then
  warn "No /health endpoint returned HTTP 200 on the checked ports"
fi

section "7. SOURCE SYNTAX — CHANGED ENTRYPOINTS ONLY"
SYNTAX_FAILURE=0

for FILE in server.js client.js; do
  [ -f "$FILE" ] || continue

  # Do not repeat a syntax test if an existing result is available
  # for the same file hash in the most recent evidence directory.
  HASH="$(sha256sum "$FILE" | awk '{print $1}')"
  echo "FILE=$FILE SHA256=$HASH"

  echo "Checking current syntax of $FILE"
  if node --check "$FILE"; then
    pass "SYNTAX_OK file=$FILE sha256=$HASH"
  else
    fail "SYNTAX_ERROR file=$FILE sha256=$HASH"
    SYNTAX_FAILURE=1
  fi
done

section "8. P2P IMPLEMENTATION MAP"
grep -nE \
  'PEER_ADDRESS|connectOutbound|WebSocket\.Server|new WebSocket|PEER_CONNECTED|PEER_DISCONNECTED|HELLO_ACK|DATA_ACK|message\.type.*DATA|BLOCK|CHAIN|heartbeat|reconnect' \
  server.js client.js 2>/dev/null |
  head -n 250 |
  tee "$RUN/p2p-source-map.txt" || true

section "9. CONFIGURATION SAFETY"
if [ -f .env ]; then
  echo ".env exists; secret values will not be printed."
  stat -c 'ENV_FILE_SIZE=%s ENV_FILE_MTIME=%y' .env 2>/dev/null || true
else
  echo ".env not found."
fi

echo "PEER_ADDRESS presence:"
if grep -q 'PEER_ADDRESS' server.js 2>/dev/null; then
  echo "PEER_ADDRESS_REFERENCE=FOUND"
else
  warn "PEER_ADDRESS reference not found in server.js"
fi

section "10. AUTOMATED TEST DISCOVERY"
node - <<'NODE' 2>&1 | tee "$RUN/test-discovery.txt"
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
console.log("TEST_SCRIPT=" + (p.scripts?.test || "NOT_DEFINED"));
console.log("HEALTH_SCRIPT=" + (p.scripts?.health || "NOT_DEFINED"));
console.log("START_SCRIPT=" + (p.scripts?.start || "NOT_DEFINED"));
NODE

find . -maxdepth 3 -type f \
  \( -iname '*test*.js' -o -iname '*.test.js' -o -iname '*.spec.js' \) \
  ! -path './node_modules/*' \
  ! -path './evidence/*' \
  -print 2>/dev/null |
  sort |
  tee "$RUN/test-files.txt"

section "11. LIVE P2P STATUS"
echo "A health response or a source-code match is not proof of a working peer connection."

if [ "$HEALTH_200" -eq 1 ]; then
  warn "Health endpoint responded; real peer handshake and DATA/ACK delivery still require protocol-event evidence."
else
  warn "P2P status unavailable through the checked health endpoints."
fi

section "12. TEST EXECUTION POLICY"
echo "No generic test suite is launched automatically."
echo "Reason: existing test scripts and their side effects must be inspected first."
echo "No server restart, kill, source overwrite, dependency installation, or database mutation is performed."
echo "Previously successful tests must be matched by test identity and source hash before being skipped."
echo "Failed tests require root-cause correction before a justified rerun."

section "13. EVIDENCE INTEGRITY"
(
  cd "$RUN" || exit 1
  find . -maxdepth 1 -type f \
    ! -name SHA256SUMS.txt \
    ! -name FINAL-RESULT.txt \
    -print0 |
    sort -z |
    xargs -0 -r sha256sum > SHA256SUMS.txt
)

cat "$RUN/SHA256SUMS.txt"

section "14. FINAL RESULT"
if [ "$FAILURES" -eq 0 ]; then
  RESULT="PARTIAL_AUDIT_COMPLETED"
else
  RESULT="AUDIT_HAS_FAILURES"
fi

cat > "$RUN/FINAL-RESULT.txt" <<EOF
PROJECT=GANDOM
LAW=2558
RUN_ID=GANDOM-MOTHER-2558-$TS-$$
RESULT=$RESULT
HEALTH_HTTP_200=$HEALTH_200
SYNTAX_FAILURE=$SYNTAX_FAILURE
FAILURES=$FAILURES
WARNINGS=$WARNINGS
P2P_PASS=NOT_PROVEN
BLOCKCHAIN_SYNC=NOT_PROVEN
DATA_ACK=NOT_PROVEN
RESTART_PERSISTENCE=NOT_PROVEN
PRODUCTION_APPROVAL=NO
EVIDENCE_DIR=$RUN
END_UTC=$(date -u -Is)
EOF

cat "$RUN/FINAL-RESULT.txt"

echo
echo "NEXT_ACTION_REQUIRED=Inspect evidence, identify unresolved tests, and execute only justified next steps."
echo "FINAL_REPORT=$RUN/FINAL-RESULT.txt"
echo "LOG=$LOG"
echo "===== END GANDOM MOTHER 2558 ====="

exit 0
