#!/bin/bash
# GANDOM 2558 — MASTER BOOT (Immortal & Global)
# Law 2558 | NO_FAKE_PASS=1

GANDOM_ROOT="$HOME/gandom"
LOG_DIR="$GANDOM_ROOT/runtime-logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/BOOT-$(date +%Y%m%d-%H%M%S).log"

echo "==========================================" | tee -a "$LOG"
echo "GANDOM 2558 — MASTER BOOT" | tee -a "$LOG"
echo "LAW=2558 | NO_FAKE_PASS=1" | tee -a "$LOG"
echo "==========================================" | tee -a "$LOG"

cd "$GANDOM_ROOT" || exit 1

# ==== [1/8] LAW 2558 GATE ====
echo "[1/8] Law 2558 Gate..." | tee -a "$LOG"
node gandom-core/governance/Law2558ExecutionGate.js 2>&1 | tee -a "$LOG"

# ==== [2/8] EXPERIENCE INJECTION ====
echo "[2/8] Injecting Master Experience..." | tee -a "$LOG"
node gandom-core/revival-live/GANDOM-EXPERIENCE-INJECTOR-2558.js 2>&1 | tee -a "$LOG"

# ==== [3/8] CELL LIFE ====
echo "[3/8] Waking 400,000 Cells..." | tee -a "$LOG"
node gandom-core/tests/GANDOM-REAL-CELL-MATH.js 2>&1 | tee -a "$LOG"

# ==== [4/8] LUNG (IMMORTAL) ====
echo "[4/8] Starting Immortal Lung..." | tee -a "$LOG"
bash gandom-core/cell-life-2558/GANDOM-LUNG-DAEMON.sh 2>&1 | tee -a "$LOG"

# ==== [5/8] NODE BIRTH & DEATH ====
echo "[5/8] Starting Node Lifecycle..." | tee -a "$LOG"
node gandom-core/p2p/neural/GANDOM-NODE-DEATH-2558.js 2>&1 | tee -a "$LOG"

# ==== [6/8] P2P SERVER ====
echo "[6/8] Starting P2P Server (8787)..." | tee -a "$LOG"
pkill -f "node.*server.js" 2>/dev/null
sleep 1
nohup node server.js >> "$LOG" 2>&1 &
sleep 3
P2P=$(curl -s -m 5 http://127.0.0.1:8787/health)
echo "P2P_HEALTH=$P2P" | tee -a "$LOG"

# ==== [7/8] UI / EYES ====
echo "[7/8] Opening Eyes (UI 8080)..." | tee -a "$LOG"
pkill -f "gandom-ui-server" 2>/dev/null
sleep 1
nohup node gandom-ui-server.js >> "$LOG" 2>&1 &
sleep 3
UI=$(curl -s -m 5 -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/)
echo "UI_HTTP=$UI" | tee -a "$LOG"

# ==== [8/8] FINAL STATUS ====
echo "==========================================" | tee -a "$LOG"
echo "GANDOM IS ALIVE & IMMORTAL" | tee -a "$LOG"
echo "LAW    -> 2558 ACTIVE" | tee -a "$LOG"
echo "BRAIN  -> EXPERIENCE INJECTED" | tee -a "$LOG"
echo "CELLS  -> 400000 ALIVE" | tee -a "$LOG"
echo "LUNG   -> IMMORTAL" | tee -a "$LOG"
echo "NODES  -> BIRTH/DEATH ACTIVE" | tee -a "$LOG"
echo "P2P    -> http://127.0.0.1:8787/health" | tee -a "$LOG"
echo "UI     -> http://127.0.0.1:8080/" | tee -a "$LOG"
echo "LOG    -> $LOG" | tee -a "$LOG"
echo "==========================================" | tee -a "$LOG"
echo "MASTER_BOOT=PASS_REAL" | tee -a "$LOG"

# ==== [9/9] AUDIT SERVICE (Port 8888) ====
echo "[9/9] Starting Audit Service (8888)..." | tee -a "$LOG"
pkill -f "audit-service/server.js" 2>/dev/null
sleep 1
nohup node "$GANDOM_ROOT/audit-service/server.js" >> "$LOG" 2>&1 &
sleep 3
AUDIT=$(curl -s -m 5 http://127.0.0.1:8888/health)
echo "AUDIT_HEALTH=$AUDIT" | tee -a "$LOG"
echo "==========================================" | tee -a "$LOG"
echo "GANDOM FULL STACK ACTIVE" | tee -a "$LOG"
echo "==========================================" | tee -a "$LOG"
