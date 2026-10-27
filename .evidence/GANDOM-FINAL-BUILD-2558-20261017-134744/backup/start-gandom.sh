#!/data/data/com.termux/files/usr/bin/bash

set -u

ROOT="$HOME/gandom"
BACKEND_PORT=8787
FRONTEND_PORT=8080
NODE_ID="GANDOM-NODE-A"

BACKEND_LOG="$ROOT/backend.log"
FRONTEND_LOG="$ROOT/frontend.log"

echo "===== GANDOM 2558 START ====="

termux-wake-lock 2>/dev/null || true
cd "$ROOT" || exit 1

echo "===== STOP OLD SERVICES ====="
sleep 2

echo "===== START BACKEND ====="
nohup env \
  PORT="$BACKEND_PORT" \
  NODE_ID="$NODE_ID" \
  node "$ROOT/server.js" \
  > "$BACKEND_LOG" 2>&1 < /dev/null &

BACKEND_PID=$!
echo "BACKEND_PID=$BACKEND_PID"

echo "===== WAIT BACKEND REAL READY ====="

BACKEND_READY=0

for i in $(seq 1 15); do
    if curl -fsS \
      "http://127.0.0.1:${BACKEND_PORT}/health" \
      > "$ROOT/.backend-health.json" 2>/dev/null
    then
        BACKEND_READY=1
        break
    fi
    sleep 1
done

if [ "$BACKEND_READY" != "1" ]; then
    echo "BACKEND_RUNTIME=FAIL"
    echo "===== BACKEND LOG ====="
    tail -100 "$BACKEND_LOG"
    exit 1
fi

echo "BACKEND_RUNTIME=PASS"

echo "===== START FRONTEND ====="

if command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
else
  echo "PYTHON_BINARY=FAIL"
  exit 1
fi

nohup "$PYTHON_BIN" -m http.server "$FRONTEND_PORT" \
  --bind 0.0.0.0 --directory "$ROOT/public" \
  > "$FRONTEND_LOG" 2>&1 < /dev/null &

FRONTEND_PID=$!
echo "FRONTEND_PID=$FRONTEND_PID"

echo "===== WAIT FRONTEND REAL READY ====="

FRONTEND_READY=0

for i in $(seq 1 15); do
    UI_CODE="$(curl -sS -o /dev/null \
      -w '%{http_code}' \
      "http://127.0.0.1:${FRONTEND_PORT}/" 2>/dev/null || true)"

    if [ "$UI_CODE" = "200" ]; then
        FRONTEND_READY=1
        break
    fi

    sleep 1
done

if [ "$FRONTEND_READY" != "1" ]; then
    echo "UI_RUNTIME=FAIL"
    echo "===== FRONTEND LOG ====="
    tail -100 "$FRONTEND_LOG"
    exit 1
fi

echo "UI_RUNTIME=PASS"

echo "===== API VERSION ====="
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/version"
echo

echo "===== API PEERS ====="
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/peers"
echo

echo "===== REAL PROCESSES ====="
pgrep -af "node server.js" || true
pgrep -af "serve public" || true

echo "===== 2558 FINAL RUNTIME GATE ====="

if curl -fsS \
   "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null \
   && [ "$(curl -sS -o /dev/null -w '%{http_code}' \
       "http://127.0.0.1:${FRONTEND_PORT}/" 2>/dev/null)" = "200" ]
then
    echo "BACKEND=PASS"
    echo "UI=PASS"
    echo "RUNTIME_GATE=PASS"
else
    echo "RUNTIME_GATE=FAIL"
    exit 1
fi

echo "===== GANDOM 2558 RUNNING ====="
echo "BACKEND=http://127.0.0.1:${BACKEND_PORT}"
echo "FRONTEND=http://127.0.0.1:${FRONTEND_PORT}"
