GANDOM Global Execution Pack — LAW 2558
بسته هماهنگ‌ساز گندم — قانون مادر ۲۵۵۸

IMPORTANT / مهم:
- This pack is deliberately conservative. It does not use `pkill -f node`.
- A service is started only if its configured entry point exists.
- The known project layout must be confirmed before treating service mappings as complete.
- Generic chain sync cannot be safely implemented without the real node API contract.
- PASS_REAL requires real health, peer, and live chain-height evidence; absent APIs remain BLOCKED.
- Backup path defaults to ~/gandom/backups/backup_YYYYMMDD_HHMMSS because /backups is usually not writable in Termux.
- Script backs up blockchain-data, wallet-data, config, .env, package metadata, server.js and audit-service before any project data changes.
- Missing chain.json gets a minimal genesis only after backup; an existing chain is never overwritten.
- Node B/Web UI/Wallet entry points are discovered from explicit candidate paths. If your actual filenames differ, edit the candidates in gandom-core-master.js after reviewing the project.

Termux commands:
  cd ~/gandom
  pkg update -y
  pkg install -y nodejs curl jq
  # Copy the four files into ~/gandom, then:
  chmod 700 gandom-global-orchestrator.sh teardown-and-restore.sh
  node --check gandom-core-master.js
  node --check p2p-sync-validator.js
  bash ./gandom-global-orchestrator.sh

Verification:
  jq . execution_evidence.json
  curl -sS -i http://127.0.0.1:8787/health
  curl -sS -i http://127.0.0.1:8787/api/peers
  curl -sS -i http://127.0.0.1:8788/health
  curl -sS -i http://127.0.0.1:8788/api/peers
  node ./p2p-sync-validator.js --root "$HOME/gandom"
  cat p2p-sync-evidence.json

Recovery (explicit backup path required):
  bash ./teardown-and-restore.sh
  bash ./teardown-and-restore.sh --restore "$HOME/gandom/backups/backup_YYYYMMDD_HHMMSS"

Do not claim PASS_REAL if any service is BLOCKED, peer counts are zero, or live chain heights cannot be read.
