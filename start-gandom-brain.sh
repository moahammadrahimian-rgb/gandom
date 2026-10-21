#!/data/data/com.termux/files/usr/bin/bash
echo "🧠 در حال روشن کردن مغز، سلول‌ها و ربات‌های کارگر..."
mkdir -p logs

# پاکسازی پردازش‌های قبلی این بخش‌ها
pkill -f "worker" || true
pkill -f "brain" || true
pkill -f "ai" || true
sleep 1

echo '[*] روشن کردن: ./.gandom-audit-20261016_155330/blockchain-100.js'
nohup node ./.gandom-audit-20261016_155330/blockchain-100.js > logs/blockchain-100.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./.gandom-audit-20261016_155330/blockchain-p2p-handler.js'
nohup node ./.gandom-audit-20261016_155330/blockchain-p2p-handler.js > logs/blockchain-p2p-handler.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./.gandom-audit-20261016_155330/node-b-chain.js'
nohup node ./.gandom-audit-20261016_155330/node-b-chain.js > logs/node-b-chain.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./.gandom-audit-2558-20261016_160241/blockchain-100.js'
nohup node ./.gandom-audit-2558-20261016_160241/blockchain-100.js > logs/blockchain-100.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./.gandom-audit-2558-20261016_160241/blockchain-p2p-handler.js'
nohup node ./.gandom-audit-2558-20261016_160241/blockchain-p2p-handler.js > logs/blockchain-p2p-handler.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./.gandom-audit-2558-20261016_160241/node-b-chain.js'
nohup node ./.gandom-audit-2558-20261016_160241/node-b-chain.js > logs/node-b-chain.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./.gandom-integration-rollback-20261013-094845/CELL-LIFE-ENGINE-2558.js'
nohup node ./.gandom-integration-rollback-20261013-094845/CELL-LIFE-ENGINE-2558.js > logs/CELL-LIFE-ENGINE-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./.gandom-integration-rollback-20261013-094845/LIVE-CELL-RUNTIME-BRIDGE-2558.js'
nohup node ./.gandom-integration-rollback-20261013-094845/LIVE-CELL-RUNTIME-BRIDGE-2558.js > logs/LIVE-CELL-RUNTIME-BRIDGE-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./BACKUP_SYNC_FIX_20261017-081230/blockchain-persistent.js'
nohup node ./BACKUP_SYNC_FIX_20261017-081230/blockchain-persistent.js > logs/blockchain-persistent.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./BACKUP_SYNC_FIX_20261017-081230/node-b-chain.js'
nohup node ./BACKUP_SYNC_FIX_20261017-081230/node-b-chain.js > logs/node-b-chain.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./GANDOM-AUTONOMOUS-AGENT-2558.js'
nohup node ./GANDOM-AUTONOMOUS-AGENT-2558.js > logs/GANDOM-AUTONOMOUS-AGENT-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./GANDOM-FINAL-AUTONOMOUS-AGENT-2558.js'
nohup node ./GANDOM-FINAL-AUTONOMOUS-AGENT-2558.js > logs/GANDOM-FINAL-AUTONOMOUS-AGENT-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./ai-accountant-bridge.js'
nohup node ./ai-accountant-bridge.js > logs/ai-accountant-bridge.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./ai-runner.js'
nohup node ./ai-runner.js > logs/ai-runner.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./ai-worker.js'
nohup node ./ai-worker.js > logs/ai-worker.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./blockchain-100.js'
nohup node ./blockchain-100.js > logs/blockchain-100.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./blockchain-api.js'
nohup node ./blockchain-api.js > logs/blockchain-api.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./blockchain-core.js'
nohup node ./blockchain-core.js > logs/blockchain-core.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./blockchain-p2p-handler.js'
nohup node ./blockchain-p2p-handler.js > logs/blockchain-p2p-handler.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./blockchain-persistent.js'
nohup node ./blockchain-persistent.js > logs/blockchain-persistent.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./blockchain.js'
nohup node ./blockchain.js > logs/blockchain.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./cell-life-api.js'
nohup node ./cell-life-api.js > logs/cell-life-api.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./cell-life-engine-v2.js'
nohup node ./cell-life-engine-v2.js > logs/cell-life-engine-v2.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./cell-life-engine.js'
nohup node ./cell-life-engine.js > logs/cell-life-engine.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./cell-life-runner.js'
nohup node ./cell-life-runner.js > logs/cell-life-runner.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./employees/AI-ACCOUNTANT-038.js'
nohup node ./employees/AI-ACCOUNTANT-038.js > logs/AI-ACCOUNTANT-038.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./employees/AI-MARKETER-037.js'
nohup node ./employees/AI-MARKETER-037.js > logs/AI-MARKETER-037.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./employees/AI-TREASURER-039.js'
nohup node ./employees/AI-TREASURER-039.js > logs/AI-TREASURER-039.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core-master.js'
nohup node ./gandom-core-master.js > logs/gandom-core-master.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/CHAPTER-01-MATH-EXECUTION.js'
nohup node ./gandom-core/CHAPTER-01-MATH-EXECUTION.js > logs/CHAPTER-01-MATH-EXECUTION.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/EVIDENCE-HASH-VERIFY.js'
nohup node ./gandom-core/EVIDENCE-HASH-VERIFY.js > logs/EVIDENCE-HASH-VERIFY.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/INDEPENDENT-BACKUP-VERIFIER.js'
nohup node ./gandom-core/INDEPENDENT-BACKUP-VERIFIER.js > logs/INDEPENDENT-BACKUP-VERIFIER.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/INDEPENDENT-EVIDENCE-VERIFIER.js'
nohup node ./gandom-core/INDEPENDENT-EVIDENCE-VERIFIER.js > logs/INDEPENDENT-EVIDENCE-VERIFIER.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/INDEPENDENT-VERIFIER.js'
nohup node ./gandom-core/INDEPENDENT-VERIFIER.js > logs/INDEPENDENT-VERIFIER.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/TREASURE-CLEAN-STREAM-2558.js'
nohup node ./gandom-core/TREASURE-CLEAN-STREAM-2558.js > logs/TREASURE-CLEAN-STREAM-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/automation-2558/GANDOM-AUTONOMOUS-CYCLE-2558.js'
nohup node ./gandom-core/automation-2558/GANDOM-AUTONOMOUS-CYCLE-2558.js > logs/GANDOM-AUTONOMOUS-CYCLE-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/cell-life-2558/CELL-LIFE-ENGINE-2558.js'
nohup node ./gandom-core/cell-life-2558/CELL-LIFE-ENGINE-2558.js > logs/CELL-LIFE-ENGINE-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/cell-life-2558/CELL-LIFE-EXECUTION-2558.js'
nohup node ./gandom-core/cell-life-2558/CELL-LIFE-EXECUTION-2558.js > logs/CELL-LIFE-EXECUTION-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/cell-life-2558/GANDOM-LUNG-GLOBAL-2558.js'
nohup node ./gandom-core/cell-life-2558/GANDOM-LUNG-GLOBAL-2558.js > logs/GANDOM-LUNG-GLOBAL-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/cell-life-2558/REAL-CELL-LIFE-8-ENGINES-2558.js'
nohup node ./gandom-core/cell-life-2558/REAL-CELL-LIFE-8-ENGINES-2558.js > logs/REAL-CELL-LIFE-8-ENGINES-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-02-GEOMETRY.js'
nohup node ./gandom-core/chapters/CHAPTER-02-GEOMETRY.js > logs/CHAPTER-02-GEOMETRY.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-03-FUNCTIONS-MODELING.js'
nohup node ./gandom-core/chapters/CHAPTER-03-FUNCTIONS-MODELING.js > logs/CHAPTER-03-FUNCTIONS-MODELING.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-04-LIMITS-CONTINUITY.js'
nohup node ./gandom-core/chapters/CHAPTER-04-LIMITS-CONTINUITY.js > logs/CHAPTER-04-LIMITS-CONTINUITY.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-05-DERIVATIVE-CHANGE.js'
nohup node ./gandom-core/chapters/CHAPTER-05-DERIVATIVE-CHANGE.js > logs/CHAPTER-05-DERIVATIVE-CHANGE.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-06-INTEGRAL-ANALYSIS.js'
nohup node ./gandom-core/chapters/CHAPTER-06-INTEGRAL-ANALYSIS.js > logs/CHAPTER-06-INTEGRAL-ANALYSIS.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-07-EQUATIONS-DYNAMICS.js'
nohup node ./gandom-core/chapters/CHAPTER-07-EQUATIONS-DYNAMICS.js > logs/CHAPTER-07-EQUATIONS-DYNAMICS.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-08-CLASSICAL-PHYSICS.js'
nohup node ./gandom-core/chapters/CHAPTER-08-CLASSICAL-PHYSICS.js > logs/CHAPTER-08-CLASSICAL-PHYSICS.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-09-ELECTROMAGNETISM-FIELDS.js'
nohup node ./gandom-core/chapters/CHAPTER-09-ELECTROMAGNETISM-FIELDS.js > logs/CHAPTER-09-ELECTROMAGNETISM-FIELDS.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-09-ELECTROMAGNETISM.js'
nohup node ./gandom-core/chapters/CHAPTER-09-ELECTROMAGNETISM.js > logs/CHAPTER-09-ELECTROMAGNETISM.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/chapters/CHAPTER-10-MODERN-PHYSICS.js'
nohup node ./gandom-core/chapters/CHAPTER-10-MODERN-PHYSICS.js > logs/CHAPTER-10-MODERN-PHYSICS.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/discovery/REAL-DISCOVERY.js'
nohup node ./gandom-core/discovery/REAL-DISCOVERY.js > logs/REAL-DISCOVERY.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/engine/GANDOM-REAL-ENGINE.js'
nohup node ./gandom-core/engine/GANDOM-REAL-ENGINE.js > logs/GANDOM-REAL-ENGINE.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/engine/GANDOM-REAL-STATE-TCP.js'
nohup node ./gandom-core/engine/GANDOM-REAL-STATE-TCP.js > logs/GANDOM-REAL-STATE-TCP.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution-lock/REAL-NODE-REGISTRY.js'
nohup node ./gandom-core/execution-lock/REAL-NODE-REGISTRY.js > logs/REAL-NODE-REGISTRY.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution/GANDOM-20K-8B-COMPLETE.js'
nohup node ./gandom-core/execution/GANDOM-20K-8B-COMPLETE.js > logs/GANDOM-20K-8B-COMPLETE.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution/GANDOM-20K-8B-GANDUM33-INTEGRATION.js'
nohup node ./gandom-core/execution/GANDOM-20K-8B-GANDUM33-INTEGRATION.js > logs/GANDOM-20K-8B-GANDUM33-INTEGRATION.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution/GANDOM-20K-8B-LIVE.js'
nohup node ./gandom-core/execution/GANDOM-20K-8B-LIVE.js > logs/GANDOM-20K-8B-LIVE.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution/GANDOM-33-EXECUTION.js'
nohup node ./gandom-core/execution/GANDOM-33-EXECUTION.js > logs/GANDOM-33-EXECUTION.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution/GANDOM-REAL-CELL-MATH.js'
nohup node ./gandom-core/execution/GANDOM-REAL-CELL-MATH.js > logs/GANDOM-REAL-CELL-MATH.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution/GANDOM-REAL-CELL-NODE.js'
nohup node ./gandom-core/execution/GANDOM-REAL-CELL-NODE.js > logs/GANDOM-REAL-CELL-NODE.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution/GANDOM-REAL-NODE-LINK.js'
nohup node ./gandom-core/execution/GANDOM-REAL-NODE-LINK.js > logs/GANDOM-REAL-NODE-LINK.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/execution/GANDOM-SECTION-01-REAL.js'
nohup node ./gandom-core/execution/GANDOM-SECTION-01-REAL.js > logs/GANDOM-SECTION-01-REAL.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/GANDOM-LAW2558-MASTER-EXECUTOR.js'
nohup node ./gandom-core/governance/GANDOM-LAW2558-MASTER-EXECUTOR.js > logs/GANDOM-LAW2558-MASTER-EXECUTOR.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/GANDOM-LAYER-GATE-EXECUTOR-2558.js'
nohup node ./gandom-core/governance/GANDOM-LAYER-GATE-EXECUTOR-2558.js > logs/GANDOM-LAYER-GATE-EXECUTOR-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/GANDOM-SOUL-2558.js'
nohup node ./gandom-core/governance/GANDOM-SOUL-2558.js > logs/GANDOM-SOUL-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/HISTORY-INDEX-2558.js'
nohup node ./gandom-core/governance/HISTORY-INDEX-2558.js > logs/HISTORY-INDEX-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/INDEX-LOOKUP-2558.js'
nohup node ./gandom-core/governance/INDEX-LOOKUP-2558.js > logs/INDEX-LOOKUP-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/Law2558ExecutionGate.js'
nohup node ./gandom-core/governance/Law2558ExecutionGate.js > logs/Law2558ExecutionGate.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/Law2558Run.js'
nohup node ./gandom-core/governance/Law2558Run.js > logs/Law2558Run.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/STREAMING-AUDIT-2558.js'
nohup node ./gandom-core/governance/STREAMING-AUDIT-2558.js > logs/STREAMING-AUDIT-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/governance/STREAMING-EVENT-SEARCH-2558.js'
nohup node ./gandom-core/governance/STREAMING-EVENT-SEARCH-2558.js > logs/STREAMING-EVENT-SEARCH-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/identity/GANDOM-GLOBAL-LANGUAGE-2558.js'
nohup node ./gandom-core/identity/GANDOM-GLOBAL-LANGUAGE-2558.js > logs/GANDOM-GLOBAL-LANGUAGE-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/live-node/LIVE-CELL-RUNTIME-BRIDGE-2558.js'
nohup node ./gandom-core/live-node/LIVE-CELL-RUNTIME-BRIDGE-2558.js > logs/LIVE-CELL-RUNTIME-BRIDGE-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/live-node/TEST-GOLDEN-INTEGRATION-2558.js'
nohup node ./gandom-core/live-node/TEST-GOLDEN-INTEGRATION-2558.js > logs/TEST-GOLDEN-INTEGRATION-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/live-node/TEST-LIVE-CELL-RUNTIME-BRIDGE-2558.js'
nohup node ./gandom-core/live-node/TEST-LIVE-CELL-RUNTIME-BRIDGE-2558.js > logs/TEST-LIVE-CELL-RUNTIME-BRIDGE-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/math-physics-2558/cross-verify-2558.js'
nohup node ./gandom-core/math-physics-2558/cross-verify-2558.js > logs/cross-verify-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/math-physics-2558/engine.js'
nohup node ./gandom-core/math-physics-2558/engine.js > logs/engine.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/math-physics-2558/independent-gate.js'
nohup node ./gandom-core/math-physics-2558/independent-gate.js > logs/independent-gate.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/math-physics-2558/verify.js'
nohup node ./gandom-core/math-physics-2558/verify.js > logs/verify.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/neural/GANDOM-NEURAL-BRAIN-2558.js'
nohup node ./gandom-core/neural/GANDOM-NEURAL-BRAIN-2558.js > logs/GANDOM-NEURAL-BRAIN-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/neural/REAL-NEURAL-SAFETY-GOVERNOR-2558.js'
nohup node ./gandom-core/neural/REAL-NEURAL-SAFETY-GOVERNOR-2558.js > logs/REAL-NEURAL-SAFETY-GOVERNOR-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/neural/REAL-NEURAL-SAFETY-INTEGRATION-2558.js'
nohup node ./gandom-core/neural/REAL-NEURAL-SAFETY-INTEGRATION-2558.js > logs/REAL-NEURAL-SAFETY-INTEGRATION-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/neural/REAL-NEURON-EXPERIENCE-MEMORY-2558.js'
nohup node ./gandom-core/neural/REAL-NEURON-EXPERIENCE-MEMORY-2558.js > logs/REAL-NEURON-EXPERIENCE-MEMORY-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/real-node-agent/REAL-NODE-AGENT.js'
nohup node ./gandom-core/real-node-agent/REAL-NODE-AGENT.js > logs/REAL-NODE-AGENT.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/revenue/GANDOM-AI-REVENUE-ENGINE-2558.js'
nohup node ./gandom-core/revenue/GANDOM-AI-REVENUE-ENGINE-2558.js > logs/GANDOM-AI-REVENUE-ENGINE-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/revenue/GANDOM-FPAY-ADAPTER-2558.js'
nohup node ./gandom-core/revenue/GANDOM-FPAY-ADAPTER-2558.js > logs/GANDOM-FPAY-ADAPTER-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/revenue/GANDOM-PADDLE-ADAPTER-2558.js'
nohup node ./gandom-core/revenue/GANDOM-PADDLE-ADAPTER-2558.js > logs/GANDOM-PADDLE-ADAPTER-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/revenue/GANDOM-REAL-PAYMENT-ADAPTER-2558.js'
nohup node ./gandom-core/revenue/GANDOM-REAL-PAYMENT-ADAPTER-2558.js > logs/GANDOM-REAL-PAYMENT-ADAPTER-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/revenue/GANDOM-ZARINPAL-ADAPTER-2558.js'
nohup node ./gandom-core/revenue/GANDOM-ZARINPAL-ADAPTER-2558.js > logs/GANDOM-ZARINPAL-ADAPTER-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/revival-live/GANDOM-EXPERIENCE-INJECTOR-2558.js'
nohup node ./gandom-core/revival-live/GANDOM-EXPERIENCE-INJECTOR-2558.js > logs/GANDOM-EXPERIENCE-INJECTOR-2558.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-core/state-api-adapter.js'
nohup node ./gandom-core/state-api-adapter.js > logs/state-api-adapter.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./gandom-force-sync-and-repair.js'
nohup node ./gandom-force-sync-and-repair.js > logs/gandom-force-sync-and-repair.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./node-b-chain.js'
nohup node ./node-b-chain.js > logs/node-b-chain.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./ops-2558/agent.js'
nohup node ./ops-2558/agent.js > logs/agent.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./patch-blockchain-final.js'
nohup node ./patch-blockchain-final.js > logs/patch-blockchain-final.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./public/gandom-brain.js'
nohup node ./public/gandom-brain.js > logs/gandom-brain.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./start-ai.js'
nohup node ./start-ai.js > logs/start-ai.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./worker-api.js'
nohup node ./worker-api.js > logs/worker-api.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./worker-coordinator.js'
nohup node ./worker-coordinator.js > logs/worker-coordinator.log 2>&1 &
sleep 1
echo '[*] روشن کردن: ./worker-node.js'
nohup node ./worker-node.js > logs/worker-node.log 2>&1 &
sleep 1

sleep 3
echo "✅ تمام اجزای مغز و کارگرها در پس‌زمینه اجرا شدند."
echo "📊 برای مشاهده لاگ‌ها: tail -f logs/*.log"
