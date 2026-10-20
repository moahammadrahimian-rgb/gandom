#!/data/data/com.termux/files/usr/bin/bash
set -e
SCRIPT="$1"
if [ -z "$SCRIPT" ]; then
  echo "Usage: bash start-server.sh <script-name>"
  exit 1
fi
cd ~/gandom
mkdir -p logs
mkdir -p logs/pids
if pgrep -f "node.*$SCRIPT" > /dev/null 2>&1; then
  echo "already running: $SCRIPT"
  pgrep -fa "node.*$SCRIPT"
  exit 1
fi
LOG="logs/$(basename $SCRIPT).log"
PIDFILE="logs/pids/$(basename $SCRIPT).pid"
nohup node "$SCRIPT" > "$LOG" 2>&1 &
PID=$!
echo $PID > "$PIDFILE"
sleep 2
if ps -p $PID > /dev/null 2>&1; then
  echo "STARTED: $SCRIPT"
  echo "PID: $PID"
  echo "LOG: $LOG"
else
  echo "FAILED: $SCRIPT"
  tail -20 "$LOG"
  exit 1
fi
