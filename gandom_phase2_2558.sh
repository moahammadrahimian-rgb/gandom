#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$(pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
REPORT="$ROOT/gandom_phase2_2558_${STAMP}.log"

exec > >(tee "$REPORT") 2>&1

echo "GANDOM_PHASE2_2558=START"
echo "ROOT=$ROOT"
echo "TIME=$(date -Iseconds)"
echo "CHAIN_FILES_MODIFIED=NO"
echo "SERVICE_RESTARTED=NO"
echo "AUTOMATIC_REPAIR=NO"

PASS=0
WARN=0
FAIL=0

pass() { PASS=$((PASS+1)); printf 'PASS: %s\n' "$*"; }
warn() { WARN=$((WARN+1)); printf 'WARN: %s\n' "$*"; }
fail() { FAIL=$((FAIL+1)); printf 'FAIL: %s\n' "$*"; }

echo
echo "===== 1. SOURCE VALIDATION ====="

for f in blockchain-100.js blockchain-p2p-handler.js node-b-chain.js server.js; do
  if [ -f "$f" ]; then
    if node --check "$f"; then
      pass "SYNTAX:$f"
    else
      fail "SYNTAX:$f"
    fi
  else
    warn "SOURCE_MISSING:$f"
  fi
done

echo
echo "===== 2. CONSENSUS HOTSPOTS ====="

if grep -nE 'isValidBlock[[:space:]]*\(' \
  blockchain-100.js blockchain-p2p-handler.js node-b-chain.js 2>/dev/null; then
  pass "VALIDATOR_REFERENCES_FOUND_REVIEW_REQUIRED"
else
  fail "NO_BLOCK_VALIDATOR_REFERENCES"
fi

if grep -nE 'chain\.push[[:space:]]*\(' \
  blockchain-100.js blockchain-p2p-handler.js node-b-chain.js 2>/dev/null; then
  warn "DIRECT_CHAIN_MUTATIONS_REQUIRE_INGRESS_VALIDATION"
else
  pass "NO_DIRECT_CHAIN_PUSH_MATCH"
fi

if grep -nE 'NEW_BLOCK_FROM_PEER|REQUEST_FULL_SYNC|GET_CHAIN' \
  blockchain-p2p-handler.js node-b-chain.js 2>/dev/null; then
  pass "P2P_BLOCK_INGRESS_LOCATED"
else
  warn "P2P_INGRESS_NOT_FOUND"
fi

echo
echo "===== 3. CHAIN FILE READ-ONLY CHECK ====="

node <<'NODE'
const fs = require('fs');
const path = require('path');

const candidates = [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
];

let found = 0;
let problems = 0;

for (const file of candidates) {
  if (!fs.existsSync(file)) {
    console.log(`CHAIN_NOT_FOUND=${file}`);
    continue;
  }

  found++;

  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    const chain = Array.isArray(parsed)
      ? parsed
      : (parsed && Array.isArray(parsed.chain) ? parsed.chain : null);

    if (!chain) {
      problems++;
      console.log(`CHAIN_FORMAT_UNKNOWN=${file}`);
      continue;
    }

    console.log(`CHAIN_FILE=${file}`);
    console.log(`BLOCK_COUNT=${chain.length}`);

    const seenTx = new Set();
    let linkErrors = 0;
    let indexErrors = 0;
    let duplicateTx = 0;

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];

      if (!block || typeof block !== 'object') {
        indexErrors++;
        continue;
      }

      if (block.index !== i) indexErrors++;

      if (i > 0) {
        if (!chain[i - 1] ||
            block.prevHash !== chain[i - 1].hash) {
          linkErrors++;
        }
      }

      if (Array.isArray(block.transactions)) {
        for (const tx of block.transactions) {
          if (!tx || typeof tx.txid !== 'string') continue;
          if (seenTx.has(tx.txid)) duplicateTx++;
          seenTx.add(tx.txid);
        }
      }
    }

    console.log(`LINK_ERRORS=${linkErrors}`);
    console.log(`INDEX_ERRORS=${indexErrors}`);
    console.log(`DUPLICATE_TXID_COUNT=${duplicateTx}`);

    if (linkErrors || indexErrors || duplicateTx) problems++;

    console.log(`STRUCTURAL_STATUS=${
      linkErrors || indexErrors || duplicateTx ? 'ISSUES_FOUND' : 'BASIC_STRUCTURE_PASS'
    }`);
  } catch (e) {
    problems++;
    console.log(`CHAIN_READ_ERROR=${file}:${e.message}`);
  }
}

console.log(`CHAIN_FILES_FOUND=${found}`);
console.log(`CHAIN_STRUCTURAL_PROBLEM_FILES=${problems}`);
console.log('CHAIN_FILES_MODIFIED=NO');
NODE

echo
echo "===== 4. ACCOUNTING IMPLEMENTATION REVIEW ====="

if grep -nE 'getBalance|pendingTx|amount|fee|COINBASE|calculateReward|publicKey|signature|nonce' \
  blockchain-100.js 2>/dev/null; then
  pass "ACCOUNTING_SYMBOLS_LOCATED_MANUAL_RULE_VALIDATION_REQUIRED"
else
  warn "ACCOUNTING_IMPLEMENTATION_NOT_LOCATED"
fi

echo
echo "===== 5. NETWORK TEST PREREQUISITES ====="

if command -v node >/dev/null 2>&1; then
  pass "NODE_AVAILABLE:$(node --version)"
else
  fail "NODE_NOT_AVAILABLE"
fi

if [ -f package.json ]; then
  pass "PACKAGE_JSON_FOUND"
  node -e "
    const p=require('./package.json');
    console.log('PACKAGE_NAME='+(p.name||'unknown'));
    console.log('START_SCRIPT='+(p.scripts&&p.scripts.start||'NOT_DEFINED'));
    console.log('TEST_SCRIPT='+(p.scripts&&p.scripts.test||'NOT_DEFINED'));
  "
else
  warn "PACKAGE_JSON_NOT_FOUND"
fi

echo
echo "===== 6. FINAL GATE ====="
echo "PASS_COUNT=$PASS"
echo "WARN_COUNT=$WARN"
echo "FAIL_COUNT=$FAIL"
echo "GENESIS_CANONICALITY=UNRESOLVED"
echo "CONSENSUS_GATE=BLOCKED_UNTIL_GENESIS_AND_INGRESS_VALIDATION"
echo "PRODUCTION_APPROVAL=NO"
echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
echo "CHAIN_FILES_MODIFIED=NO"
echo "SOURCE_FILES_MODIFIED=NO"
echo "SERVICE_RESTARTED=NO"
echo "REPORT=$REPORT"
echo "GANDOM_PHASE2_2558=FINISHED"
