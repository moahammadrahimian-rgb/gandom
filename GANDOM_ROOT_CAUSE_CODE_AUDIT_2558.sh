#!/data/data/com.termux/files/usr/bin/bash

set -u
cd "$(dirname "$0")" || exit 1

REPORT="GANDOM_ROOT_CAUSE_CODE_$(date -u +%Y%m%dT%H%M%SZ).txt"

{
  echo "GANDOM_ROOT_CAUSE_CODE_AUDIT=START"
  echo "LAW=2558"
  echo "MODE=READ_ONLY"
  echo "UTC=$(date -u +%FT%TZ)"
  echo "ROOT=$PWD"

  echo
  echo "===== 1. SOURCE FILES ====="
  for f in \
    blockchain-100.js \
    node-b-chain.js \
    blockchain-p2p-handler.js \
    server.js \
    package.json
  do
    if [ -f "$f" ]; then
      echo "PRESENT=$f"
      wc -l "$f"
      sha256sum "$f"
    else
      echo "MISSING=$f"
    fi
  done

  echo
  echo "===== 2. GENESIS CREATION AND HASH ====="
  grep -n -C 5 -E \
    'createGenesis|GENESIS-WALLET|calculateHash|calculateReward|randomUUID|Math\.random|randomBytes|Date\.now' \
    blockchain-100.js node-b-chain.js blockchain-p2p-handler.js 2>/dev/null || true

  echo
  echo "===== 3. BLOCK VALIDATION DEFINITIONS AND CALLS ====="
  grep -n -C 4 -E \
    'isValidBlock|isValid\(|Block\.fromJSON|NEW_BLOCK_FROM_PEER|chain\.push|addBlock\(' \
    blockchain-100.js node-b-chain.js blockchain-p2p-handler.js server.js 2>/dev/null || true

  echo
  echo "===== 4. BLOCK INGRESS AND P2P HANDLERS ====="
  grep -n -C 6 -E \
    'NEW_BLOCK_FROM_PEER|REQUEST_FULL_SYNC|GET_CHAIN|broadcastNewBlock|handleBlockchainMessage' \
    node-b-chain.js blockchain-p2p-handler.js server.js 2>/dev/null || true

  echo
  echo "===== 5. GIT WORKTREE STATUS ====="
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git status --short
    echo "--- CURRENT BRANCH ---"
    git branch --show-current
    echo "--- RECENT COMMITS ---"
    git log -5 --oneline --decorate
    echo "--- CHANGE SUMMARY ---"
    git diff --stat
  else
    echo "GIT_REPOSITORY=NOT_DETECTED"
  fi

  echo
  echo "===== 6. EXISTING CHAIN FILES — READ ONLY ====="
  node - <<'NODE'
const fs = require('fs');

for (const file of [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
]) {
  console.log('\nCHAIN_FILE=' + file);

  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    const chain = Array.isArray(data) ? data :
      (Array.isArray(data.chain) ? data.chain : null);

    if (!chain) {
      console.log('CHAIN_FORMAT=UNRECOGNIZED');
      console.log('TOP_LEVEL_KEYS=' + Object.keys(data).join(','));
      continue;
    }

    console.log('BLOCK_COUNT=' + chain.length);

    for (let i = 0; i < chain.length; i++) {
      const b = chain[i];
      console.log(JSON.stringify({
        index: b.index,
        hash: b.hash,
        prevHash: b.prevHash,
        difficulty: b.difficulty,
        nonce: b.nonce,
        transactionCount: Array.isArray(b.transactions)
          ? b.transactions.length : null
      }));
    }

    let brokenLinks = 0;
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].prevHash !== chain[i - 1].hash) {
        brokenLinks++;
        console.log('BROKEN_LINK_AT=' + i);
      }
    }

    console.log('BROKEN_LINK_COUNT=' + brokenLinks);
  } catch (e) {
    console.log('READ_ERROR=' + e.message);
  }
}
NODE

  echo
  echo "===== 7. SAFETY GATE ====="
  echo "CHAIN_FILES_MODIFIED=NO"
  echo "SOURCE_FILES_MODIFIED=NO"
  echo "PRIVATE_KEYS_READ=NO"
  echo "SERVICE_RESTARTED=NO"
  echo "GENESIS_REPAIR=NOT_PERFORMED"
  echo "PRODUCTION_APPROVAL=NOT_GRANTED"
  echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
  echo "AUDIT_RESULT=SOURCE_EVIDENCE_COLLECTED"
} 2>&1 | tee "$REPORT"

rc=${PIPESTATUS[0]}
echo
echo "REPORT=$PWD/$REPORT"
echo "AUDIT_EXIT_CODE=$rc"
