#!/bin/bash
GANDOM_ROOT="$HOME/gandom"
LUNG_FILE="$GANDOM_ROOT/gandom-core/cell-life-2558/GANDOM-LUNG-GLOBAL-2558.js"
LOG_DIR="$GANDOM_ROOT/runtime-logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/LUNG-DAEMON-$(date +%Y%m%d-%H%M%S).log"

echo "==========================================" | tee -a "$LOG"
echo "GANDOM LUNG DAEMON STARTING..." | tee -a "$LOG"
echo "==========================================" | tee -a "$LOG"

cd "$GANDOM_ROOT" || exit 1
pkill -f "GANDOM-LUNG-GLOBAL" 2>/dev/null
sleep 1

nohup bash -c '
while true; do
    node '"$LUNG_FILE"' >> "'"$LOG"'" 2>&1
    sleep 5
done
' > /dev/null 2>&1 &

LUNG_PID=$!
echo "LUNG_DAEMON_PID=$LUNG_PID" | tee -a "$LOG"
sleep 3

if ps -p $LUNG_PID > /dev/null 2>&1; then
    echo "LUNG_DAEMON=ALIVE" | tee -a "$LOG"
else
    echo "LUNG_DAEMON=DEAD" | tee -a "$LOG"
fi
echo "LOG=$LOG" | tee -a "$LOG"
echo "==========================================" | tee -a "$LOG"
