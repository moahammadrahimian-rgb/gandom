#!/data/data/com.termux/files/usr/bin/bash

set -u
cd "$HOME/gandom" || exit 1

LAW=2558
export NO_FAKE_PASS=1

LOGDIR="$HOME/gandom/runtime-logs"
mkdir -p "$LOGDIR"

echo "=== GANDOM GLOBAL SERVICE RECOVERY | LAW=$LAW ==="
echo "TIME=$(date -Iseconds)"
echo "MODE=SAFE_START_NO_DELETE"

command -v node >/dev/null 2>&1 || {
  echo "FATAL=NODE_NOT_INSTALLED"
  exit 1
}

start_service() {
  local name="$1"
  local port="$2"
  local file="$3"
  local logfile="$LOGDIR/${name}.log"

  echo
  echo "=== SERVICE=$name PORT=$port ==="

  if [ ! -f "$file" ]; then
    echo "STATUS=BLOCKED_SCRIPT_NOT_FOUND FILE=$file"
    return
  fi

  local code
  code=$(curl -sS --max-time 2 -o /dev/null \
    -w '%{http_code}' "http://127.0.0.1:$port/health" 2>/dev/null || true)

  if [ "$code" = "200" ]; then
    echo "STATUS=ALREADY_HEALTHY HTTP=200"
    curl -sS --max-time 3 "http://127.0.0.1:$port/health" 2>/dev/null
    echo
    return
  fi

  if command -v ss >/dev/null 2>&1 &&
     ss -ltn 2>/dev/null | grep -Eq ":${port}[[:space:]]"; then
    echo "STATUS=BLOCKED_PORT_OCCUPIED HTTP=${code:-000}"
    echo "ACTION=NO_DUPLICATE_PROCESS_STARTED"
    return
  fi

  echo "ACTION=START"
  nohup node "$file" >>"$logfile" 2>&1 </dev/null &
  echo "$!" > "$LOGDIR/${name}.pid"

  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    code=$(curl -sS --max-time 2 -o /dev/null \
      -w '%{http_code}' "http://127.0.0.1:$port/health" 2>/dev/null || true)

    if [ "$code" = "200" ]; then
      echo "STATUS=HEALTHY HTTP=200"
      curl -sS --max-time 3 "http://127.0.0.1:$port/health" 2>/dev/null
      echo
      return
    fi

    if ! kill -0 "$(cat "$LOGDIR/${name}.pid")" 2>/dev/null; then
      echo "STATUS=START_FAILED"
      tail -n 25 "$logfile"
      return
    fi
  done

  echo "STATUS=HEALTH_NOT_CONFIRMED HTTP=${code:-000}"
  tail -n 20 "$logfile"
}

# Canonical services only: do not launch random test servers.
start_service "backend-8787" 8787 "$HOME/gandom/server.js"
start_service "audit-8888" 8888 "$HOME/gandom/audit-service/server.js"

echo
echo "=== FINAL LIVE HEALTH ==="
for port in 8787 8788 8789 8790 8888 9000 8080; do
  printf 'PORT=%s ' "$port"
  result=$(curl -sS --max-time 2 \
    "http://127.0.0.1:$port/health" 2>/dev/null || true)

  if [ -n "$result" ]; then
    echo "$result"
  else
    echo "HEALTH_NOT_CONFIRMED"
  fi
done

echo
echo "=== PROCESS CHECK ==="
ps -A -o PID,ARGS 2>/dev/null |
  grep -E '[n]ode server\.js|[n]ode audit-service/server\.js' || true

echo
echo "=== RECOVERY REPORT ==="
echo "LOGDIR=$LOGDIR"
echo "NO_FILES_DELETED=1"
echo "GLOBAL_NETWORK=NOT_CLAIMED"
