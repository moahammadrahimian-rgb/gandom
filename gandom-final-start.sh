#!/data/data/com.termux/files/usr/bin/bash

set -u

ROOT="$HOME/gandom"
LOGDIR="$ROOT/logs"
CORE="$ROOT/gandom-core/revival-live/LAW2558_IMMUNE/ae6b1745c4b4d617__ae6b1745c4b4d617-index.js"

mkdir -p "$LOGDIR"

echo "===== GANDOM CONTROLLED START | LAW 2558 ====="
echo "TIME=$(date)"
echo "ROOT=$ROOT"

cd "$ROOT" || exit 1

port_state() {
  node -e '
    const net = require("net");
    const p = Number(process.argv[1]);
    const s = net.connect(p, "127.0.0.1");
    let done = false;
    const finish = v => {
      if (done) return;
      done = true;
      console.log(v);
      s.destroy();
    };
    s.setTimeout(1500);
    s.once("connect", () => finish("BUSY"));
    s.once("error", e =>
      finish(e.code === "ECONNREFUSED" ? "FREE" : "UNKNOWN")
    );
    s.once("timeout", () => finish("UNKNOWN"));
  ' "$1" 2>/dev/null
}

start_node_service() {
  local name="$1"
  local port="$2"
  local file="$3"

  echo
  echo "--- $name : $port ---"

  if [ ! -f "$file" ]; then
    echo "SKIP: FILE_MISSING=$file"
    return
  fi

  if ! node --check "$file"; then
    echo "STOP: SYNTAX_ERROR=$file"
    return
  fi

  local state
  state="$(port_state "$port")"
  echo "PORT_STATE=$state"

  if [ "$state" = "BUSY" ]; then
    echo "PRESERVED: existing process not touched"
    return
  fi

  if [ "$state" != "FREE" ]; then
    echo "SKIP: port state uncertain"
    return
  fi

  if [ "$file" = "server.js" ]; then
    nohup env PORT="$port" node "$ROOT/server.js" \
      >> "$LOGDIR/server-$port.log" 2>&1 </dev/null &
  else
    nohup node "$file" "$port" \
      >> "$LOGDIR/core-$port.log" 2>&1 </dev/null &
  fi

  echo "START_ATTEMPTED_PID=$!"
  sleep 2

  state="$(port_state "$port")"
  echo "PORT_STATE_AFTER_START=$state"

  if [ "$state" = "BUSY" ]; then
    echo "PROCESS_ACCEPTING_CONNECTIONS"
  else
    echo "START_NOT_CONFIRMED; inspect logs"
  fi
}

start_node_service "GANDOM_NODE_A" 8787 "server.js"
start_node_service "GANDOM_NODE_B" 8788 "server.js"
start_node_service "GANDOM_WEBSOCKET_CORE" 8080 \
  "$CORE"

echo
echo "--- AUDIT SERVICE : 8888 ---"

if [ -f "$ROOT/audit-service/server.js" ]; then
  state="$(port_state 8888)"
  echo "PORT_STATE=$state"

  if [ "$state" = "FREE" ]; then
    nohup node "$ROOT/audit-service/server.js" \
      >> "$LOGDIR/audit-8888.log" 2>&1 </dev/null &
    echo "START_ATTEMPTED_PID=$!"
    sleep 2
    echo "PORT_STATE_AFTER_START=$(port_state 8888)"
  elif [ "$state" = "BUSY" ]; then
    echo "PRESERVED: existing audit service"
  else
    echo "SKIP: port state uncertain"
  fi
else
  echo "SKIP: audit server file missing"
fi

echo
echo "--- HTTP HEALTH CHECKS ---"

for port in 8787 8788 8888; do
  printf '%s: ' "$port"
  curl -sS --max-time 3 \
    "http://127.0.0.1:$port/health" 2>&1 || true
  echo
done

echo
echo "--- PORT 9000 ---"
echo "NOT STARTED: its intended service is not yet verified."

echo
echo "===== CONTROLLED START FINISHED ====="
echo "Logs: $LOGDIR"
