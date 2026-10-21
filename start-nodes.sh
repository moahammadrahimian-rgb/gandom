#!/data/data/com.termux/files/usr/bin/bash
set -u
cd "$HOME/gandom" || exit 1
mkdir -p logs

echo "LAW=2558"
echo "NO_FAKE_PASS=1"

# جلوگیری از اجرای تکراری Node A
if pgrep -f '[n]ode server.js' >/dev/null; then
  echo "NODE_A=ALREADY_RUNNING"
else
  if curl -fsS --max-time 2 http://127.0.0.1:8787/health >/dev/null 2>&1; then
    echo "ERROR: PORT_8787_ALREADY_SERVING"
    echo "Inspect the existing service before starting another Node A."
    exit 1
  fi

  nohup node "$HOME/gandom/server.js" \
    >> "$HOME/gandom/logs/node-A.log" 2>&1 \
    < /dev/null &
  echo "$!" > "$HOME/gandom/logs/node-A.pid"
  echo "NODE_A_START_REQUESTED"
fi

sleep 2

# Node A باید قبل از Node B آماده باشد
if ! curl -fsS --max-time 3 http://127.0.0.1:8787/health; then
  echo
  echo "ERROR: NODE_A_HEALTH_FAILED"
  tail -n 40 "$HOME/gandom/logs/node-A.log" 2>/dev/null || true
  exit 1
fi
echo

# جلوگیری از اجرای تکراری Node B
if pgrep -f '[n]ode node-b-chain.js' >/dev/null; then
  echo "NODE_B=ALREADY_RUNNING"
else
  nohup node "$HOME/gandom/node-b-chain.js" \
    >> "$HOME/gandom/logs/node-B.log" 2>&1 \
    < /dev/null &
  echo "$!" > "$HOME/gandom/logs/node-B.pid"
  echo "NODE_B_START_REQUESTED"
fi

sleep 2

echo "===== PROCESS CHECK ====="
pgrep -af '[n]ode server.js|[n]ode node-b-chain.js' || true

echo "===== PEER CHECK ====="
curl -sS --max-time 3 http://127.0.0.1:8787/api/peers || true
echo

echo "===== RESULT ====="
echo "PROCESS_EXISTENCE_CHECK_ONLY=NOT_FULL_RUNTIME_VERIFICATION"
echo "PASS_REAL=NOT_CLAIMED"
