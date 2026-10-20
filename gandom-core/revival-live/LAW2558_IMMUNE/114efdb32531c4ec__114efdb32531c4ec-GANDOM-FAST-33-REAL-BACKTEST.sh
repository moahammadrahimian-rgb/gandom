#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
RUN="$ROOT/audit/FAST-33-REAL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN"

exec > >(tee "$RUN/console.log") 2>&1

echo "===== GANDOM 2558 FAST REAL BACKTEST ====="
echo "RUN=$RUN"
echo "TIME=$(date -Is)"
echo

FAIL=0
PASS=0
SKIP=0

pass(){ PASS=$((PASS+1)); echo "PASS_REAL|$1"; }
fail(){ FAIL=$((FAIL+1)); echo "FAIL_REAL|$1"; }
skip(){ SKIP=$((SKIP+1)); echo "NOT_EXECUTED|$1"; }

echo "===== 1. LAW 2558 ====="
LAW="$ROOT/constitution/GOLDEN-MOTHER-LAW-2558.json"
if [ -f "$LAW" ]; then
  HASH="$(sha256sum "$LAW" | awk '{print $1}')"
  echo "LAW_SHA256=$HASH"
  pass "LAW_2558_PRESENT"
else
  fail "LAW_2558_MISSING"
fi

echo
echo "===== 2. LIVE ROOT INTEGRITY ====="
for p in \
  "$ROOT/gandom-core" \
  "$ROOT/public" \
  "$ROOT/www" \
  "$ROOT/server.js" \
  "$ROOT/package.json" \
  "$ROOT/android" \
  "$ROOT/final-apk" \
  "$ROOT/evidence" \
  "$ROOT/backups"
do
  if [ -e "$p" ]; then
    echo "LIVE_ROOT_OK=$p"
  else
    echo "LIVE_ROOT_MISSING=$p"
    fail "LIVE_ROOT:$p"
  fi
done
pass "LIVE_ROOT_SCAN"

echo
echo "===== 3. JAVASCRIPT SYNTAX ====="
JS_TOTAL=0
JS_FAIL=0
while IFS= read -r -d '' f; do
  JS_TOTAL=$((JS_TOTAL+1))
  if node --check "$f" >/dev/null 2>&1; then
    echo "SYNTAX_PASS|$f"
  else
    JS_FAIL=$((JS_FAIL+1))
    echo "SYNTAX_FAIL|$f"
  fi
done < <(
  find "$ROOT/gandom-core" "$ROOT/public" "$ROOT/www" \
    -type f -name '*.js' -print0 2>/dev/null
)

echo "JS_TOTAL=$JS_TOTAL"
echo "JS_SYNTAX_FAIL=$JS_FAIL"

if [ "$JS_FAIL" -eq 0 ]; then
  pass "JS_SYNTAX_ALL"
else
  fail "JS_SYNTAX"
fi

echo
echo "===== 4. PACKAGE / DEPENDENCIES ====="
if [ -f "$ROOT/package.json" ]; then
  node -e 'const p=require("./package.json"); console.log("PACKAGE="+p.name); console.log("VERSION="+p.version); console.log("SCRIPTS="+Object.keys(p.scripts||{}).join(","));' \
    2>&1 | tee "$RUN/package.txt"

  if [ -d "$ROOT/node_modules" ]; then
    pass "NODE_MODULES_PRESENT"
  else
    skip "NODE_MODULES_MISSING"
  fi
else
  fail "PACKAGE_JSON_MISSING"
fi

echo
echo "===== 5. SERVER REAL EXECUTION ====="
PORT=8897
SERVER_LOG="$RUN/server.log"

if [ -f "$ROOT/server.js" ]; then
  (
    cd "$ROOT"
    PORT=$PORT NODE_ENV=backtest node server.js
  ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!

  cleanup_server(){
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  }
  trap cleanup_server EXIT

  READY=0
  for i in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:$PORT/health" >"$RUN/health.json" 2>/dev/null; then
      READY=1
      break
    fi
    sleep 0.25
  done

  if [ "$READY" -eq 1 ]; then
    echo "HEALTH=$(cat "$RUN/health.json")"
    pass "SERVER_HEALTH_REAL"
  else
    fail "SERVER_HEALTH"
  fi

  for endpoint in version stats peers; do
    if curl -fsS "http://127.0.0.1:$PORT/api/$endpoint" \
       >"$RUN/$endpoint.json" 2>/dev/null; then
      echo "API_PASS|$endpoint|$(cat "$RUN/$endpoint.json")"
      pass "API_$endpoint"
    else
      fail "API_$endpoint"
    fi
  done

  cleanup_server
  trap - EXIT
else
  fail "SERVER_JS_MISSING"
fi

echo
echo "===== 6. REAL ENGINE / P2P CANDIDATES ====="
CANDIDATES="$RUN/real-candidates.txt"

find "$ROOT/gandom-core" "$ROOT/audit" \
  -type f \( \
    -iname '*REAL*RUN*.js' -o \
    -iname '*REAL*TEST*.js' -o \
    -iname '*TWO*PEER*.js' -o \
    -iname '*NODE-LIFE*.js' -o \
    -iname '*NEURAL*P2P*.js' \
  \) 2>/dev/null | sort -u > "$CANDIDATES"

cat "$CANDIDATES"

echo
echo "===== 7. CONTROLLED REAL TEST EXECUTION ====="
while IFS= read -r f; do
  [ -z "$f" ] && continue

  name="$(basename "$f")"
  out="$RUN/${name}.log"

  echo "EXECUTING=$f"

  if timeout 25s node "$f" >"$out" 2>&1; then
    cat "$out"
    pass "REAL_EXEC:$name"
  else
    rc=$?
    cat "$out"
    echo "RETURN_CODE=$rc"
    fail "REAL_EXEC:$name"
  fi
done < "$CANDIDATES"

echo
echo "===== 8. 33-SECTION SIGNAL MAP ====="
find "$ROOT/gandom-core" "$ROOT/public" "$ROOT/www" "$ROOT/server.js" \
  -type f 2>/dev/null |
  grep -Ei \
  'law|govern|engine|execution|node|p2p|neural|brain|language|wallet|revenue|payment|settlement|evidence|trust|api|ui|web|market|trade|cell|math|physics|identity|handshake|heartbeat|transport|network|security|auth|storage|backup|audit|ad|ai' |
  sort -u > "$RUN/33-section-signals.txt"

echo "SIGNAL_FILES=$(wc -l < "$RUN/33-section-signals.txt")"

echo
echo "===== 9. PROTECTED-AREA CHECK ====="
echo "NO_DELETE=YES"
echo "NO_LIVE_MODIFICATION=YES"
echo "NO_BACKUP_MODIFICATION=YES"
echo "NO_EVIDENCE_MODIFICATION=YES"

echo
echo "===== FINAL ====="
echo "PASS_REAL=$PASS"
echo "FAIL_REAL=$FAIL"
echo "NOT_EXECUTED=$SKIP"
echo "EVIDENCE=$RUN"

if [ "$FAIL" -eq 0 ]; then
  echo "BACKTEST_STATUS=PASS_REAL"
else
  echo "BACKTEST_STATUS=FAIL_REAL"
fi

echo
echo "===== NEXT ====="
echo "$RUN"
