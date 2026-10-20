#!/data/data/com.termux/files/usr/bin/bash
SCRIPT="$1"
if [ -z "$SCRIPT" ]; then
  echo "Usage: bash stop-server.sh <script-name>"
  exit 1
fi
PIDFILE="$HOME/gandom/logs/pids/$(basename $SCRIPT).pid"
if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if kill "$PID" 2>/dev/null; then
    echo "STOPPED: $SCRIPT (PID: $PID)"
    rm "$PIDFILE"
  else
    echo "PID $PID not alive. PID file removed."
    rm "$PIDFILE"
  fi
else
  echo "PID file not found. Searching..."
  PIDS=$(pgrep -f "node.*$SCRIPT" 2>/dev/null || true)
  if [ -z "$PIDS" ]; then
    echo "No process found for $SCRIPT"
    exit 0
  fi
  echo "Found: $PIDS"
  echo "$PIDS" | while read PID; do
    if kill "$PID" 2>/dev/null; then
      echo "STOPPED: PID $PID"
    fi
  done
fi
