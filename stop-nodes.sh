#!/data/data/com.termux/files/usr/bin/bash
set -u
cd "$HOME/gandom" || exit 1

echo "LAW=2558"
echo "NO_FAKE_PASS=1"

for name in node-A node-B; do
  case "$name" in
    node-A) pattern='[n]ode server.js' ;;
    node-B) pattern='[n]ode node-b-chain.js' ;;
  esac

  pgrep -f "$pattern" | while read -r pid; do
    [ "$pid" = "$$" ] && continue
    echo "STOP_REQUEST: $name PID=$pid"
    kill -TERM "$pid" 2>/dev/null || true
  done
done

sleep 2

echo "===== REMAINING PROCESSES ====="
pgrep -af '[n]ode server.js|[n]ode node-b-chain.js' || true
echo "STOP_REQUEST_SENT=1"
echo "PASS_REAL=NOT_CLAIMED"
