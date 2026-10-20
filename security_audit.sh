#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
# GANDOM MAIN — SECURITY AUDIT
# MOTHER LOCK: 2558
# READ-ONLY AUDIT — NO AUTOMATIC REPAIR
# ============================================================

set -u
umask 077

ROOT="$(pwd)"
REPORT="$ROOT/security_audit_2558_$(date +%Y%m%d_%H%M%S).log"

exec > >(tee "$REPORT") 2>&1

PASS=0
WARN=0
FAIL=0

pass() { PASS=$((PASS+1)); printf '[PASS] %s\n' "$*"; }
warn() { WARN=$((WARN+1)); printf '[WARN] %s\n' "$*"; }
fail() { FAIL=$((FAIL+1)); printf '[FAIL] %s\n' "$*"; }
section() { printf '\n========== %s ==========\n' "$*"; }

section "GANDOM 2558 SECURITY AUDIT"
printf 'ROOT=%s\n' "$ROOT"
printf 'TIME=%s\n' "$(date -Iseconds 2>/dev/null || date)"
printf 'MODE=READ_ONLY_AUDIT\n'
printf 'CHAIN_FILES_MODIFIED=NO\n'
printf 'SOURCE_FILES_MODIFIED=NO\n'
printf 'SERVICE_RESTARTED=NO\n'
printf 'AUTOMATIC_REPAIR=NO\n'

# ------------------------------------------------------------
section "1. REQUIRED SOURCE FILES"
# ------------------------------------------------------------

for f in \
  blockchain-100.js \
  blockchain-p2p-handler.js \
  node-b-chain.js \
  server.js
do
  if [ -f "$f" ]; then
    pass "SOURCE_EXISTS=$f"
  else
    warn "SOURCE_MISSING=$f"
  fi
done

# ------------------------------------------------------------
section "2. JAVASCRIPT SYNTAX"
# ------------------------------------------------------------

if command -v node >/dev/null 2>&1; then
  for f in blockchain-100.js blockchain-p2p-handler.js node-b-chain.js server.js
  do
    [ -f "$f" ] || continue

    if node --check "$f"; then
      pass "SYNTAX_PASS=$f"
    else
      fail "SYNTAX_FAIL=$f"
    fi
  done
else
  fail "NODE_NOT_AVAILABLE"
fi

# ------------------------------------------------------------
section "3. BLOCK VALIDATION ENTRY POINTS"
# ------------------------------------------------------------

for f in blockchain-100.js blockchain-p2p-handler.js node-b-chain.js
do
  [ -f "$f" ] || continue

  printf '\n--- FILE=%s ---\n' "$f"

  grep -n -E \
    'isValidBlock|NEW_BLOCK_FROM_PEER|chain\.push|addBlock|calculateHash|merkleRoot|\.verify\(\)' \
    "$f" || true
done

# ------------------------------------------------------------
section "4. DIRECT BLOCK APPEND REVIEW"
# ------------------------------------------------------------

DIRECT_COUNT=0

for f in blockchain-p2p-handler.js node-b-chain.js
do
  [ -f "$f" ] || continue

  if grep -nE 'chain\.push[[:space:]]*\(' "$f"; then
    DIRECT_COUNT=$((DIRECT_COUNT+1))
    warn "DIRECT_CHAIN_MUTATION_REVIEW_REQUIRED=$f"
  fi
done

if [ "$DIRECT_COUNT" -eq 0 ]; then
  pass "NO_DIRECT_APPEND_PATTERN_FOUND_IN_P2P_HANDLERS"
else
  warn "DIRECT_APPEND_FILES=$DIRECT_COUNT"
  warn "STATIC_MATCHES_ARE_NOT_PROOF_OF_EXPLOITABILITY"
fi

# ------------------------------------------------------------
section "5. CONSENSUS VALIDATOR PRESENCE"
# ------------------------------------------------------------

if [ -f blockchain-100.js ]; then
  if grep -qE 'isValidBlock[[:space:]]*\(' blockchain-100.js; then
    pass "IS_VALID_BLOCK_METHOD_PRESENT"
  else
    fail "IS_VALID_BLOCK_METHOD_MISSING"
  fi

  if grep -qE 'isValid[[:space:]]*\(' blockchain-100.js; then
    pass "CHAIN_VALIDATOR_PRESENT"
  else
    fail "CHAIN_VALIDATOR_MISSING"
  fi
fi

if [ -f blockchain-p2p-handler.js ]; then
  if grep -q 'isValidBlock' blockchain-p2p-handler.js; then
    pass "P2P_VALIDATOR_REFERENCE_PRESENT"
  else
    fail "P2P_VALIDATOR_REFERENCE_MISSING"
  fi
fi

if [ -f node-b-chain.js ]; then
  if grep -q 'isValidBlock' node-b-chain.js; then
    pass "NODE_B_VALIDATOR_REFERENCE_PRESENT"
  else
    fail "NODE_B_VALIDATOR_REFERENCE_MISSING"
  fi
fi

# ------------------------------------------------------------
section "6. CONSENSUS AND TRANSACTION SECURITY PATTERNS"
# ------------------------------------------------------------

if [ -f blockchain-100.js ]; then
  for pattern in \
    'COINBASE' \
    'publicKey' \
    'signature' \
    'calculateReward' \
    'calculateHash' \
    'merkleRoot' \
    'prevHash'
  do
    if grep -q "$pattern" blockchain-100.js; then
      pass "SOURCE_CONTAINS=$pattern"
    else
      warn "SOURCE_PATTERN_MISSING=$pattern"
    fi
  done

  if grep -nE 'Math\.random|eval[[:space:]]*\(|new Function[[:space:]]*\(' blockchain-100.js; then
    warn "REVIEW_UNSAFE_PATTERN_IN_BLOCKCHAIN_SOURCE"
  else
    pass "NO_SELECTED_UNSAFE_PATTERN_FOUND_IN_BLOCKCHAIN_SOURCE"
  fi
fi

# ------------------------------------------------------------
section "7. CHAIN JSON STRUCTURE — READ ONLY"
# ------------------------------------------------------------

node <<'NODE'
const fs = require('fs');
const path = require('path');

const dirs = ['blockchain-data', 'blockchain-data-b'];
let totalErrors = 0;

for (const dir of dirs) {
  const file = path.join(dir, 'chain.json');

  console.log('\nCHAIN_FILE=' + file);

  if (!fs.existsSync(file)) {
    console.log('CHAIN_STATUS=FILE_NOT_FOUND');
    continue;
  }

  let chain;

  try {
    chain = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.log('CHAIN_STATUS=JSON_PARSE_ERROR');
    console.log('ERROR=' + e.message);
    totalErrors++;
    continue;
  }

  if (!Array.isArray(chain)) {
    console.log('CHAIN_STATUS=NOT_AN_ARRAY');
    totalErrors++;
    continue;
  }

  console.log('BLOCK_COUNT=' + chain.length);

  if (chain.length === 0) {
    console.log('CHAIN_STATUS=EMPTY');
    continue;
  }

  let indexErrors = 0;
  let linkErrors = 0;
  let missingHash = 0;
  let txErrors = 0;

  for (let i = 0; i < chain.length; i++) {
    const b = chain[i];

    if (!b || typeof b !== 'object') {
      indexErrors++;
      continue;
    }

    if (b.index !== i) indexErrors++;

    if (typeof b.hash !== 'string' || !b.hash) {
      missingHash++;
    }

    if (i > 0) {
      if (b.prevHash !== chain[i - 1].hash) {
        linkErrors++;
        console.log(
          'LINK_ERROR index=' + i +
          ' expected_prevHash=' + chain[i - 1].hash +
          ' actual_prevHash=' + b.prevHash
        );
      }
    }

    if (!Array.isArray(b.transactions)) {
      txErrors++;
    }
  }

  const genesis = chain[0];

  console.log('GENESIS_HASH=' + (genesis.hash || 'MISSING'));
  console.log('LAST_INDEX=' + (chain.length - 1));
  console.log('INDEX_ERRORS=' + indexErrors);
  console.log('LINK_ERRORS=' + linkErrors);
  console.log('MISSING_HASHES=' + missingHash);
  console.log('TRANSACTION_ARRAY_ERRORS=' + txErrors);

  if (indexErrors || linkErrors || missingHash || txErrors) {
    console.log('STRUCTURAL_STATUS=ISSUES_FOUND');
    totalErrors++;
  } else {
    console.log('STRUCTURAL_STATUS=STRUCTURE_PASS');
    console.log('NOTE=HASH_POW_MERKLE_SIGNATURES_NOT_VERIFIED_BY_THIS_CHECK');
  }
}

console.log('\nCHAIN_STRUCTURAL_ERROR_GROUPS=' + totalErrors);
console.log('CHAIN_FILES_MODIFIED=NO');
NODE

# ------------------------------------------------------------
section "8. GENESIS CONSISTENCY"
# ------------------------------------------------------------

node <<'NODE'
const fs = require('fs');

function load(file) {
  try {
    const x = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(x) && x.length ? x[0] : null;
  } catch {
    return null;
  }
}

const a = load('blockchain-data/chain.json');
const b = load('blockchain-data-b/chain.json');

if (!a || !b) {
  console.log('GENESIS_COMPARISON=INCOMPLETE');
  console.log('REASON=ONE_OR_BOTH_CHAINS_UNAVAILABLE');
} else {
  console.log('GENESIS_A=' + a.hash);
  console.log('GENESIS_B=' + b.hash);
  console.log('GENESIS_MATCH=' + String(a.hash === b.hash));

  if (a.hash !== b.hash) {
    console.log('CONSENSUS_GATE=BLOCKED');
    console.log('REPAIR=NOT_PERFORMED');
    console.log('REASON=GENESIS_MISMATCH');
  } else {
    console.log('GENESIS_HASH_MATCH=YES');
    console.log('NOTE=HASH_MATCH_ALONE_DOES_NOT_PROVE_GENESIS_VALIDITY');
  }
}

console.log('CHAIN_FILES_MODIFIED=NO');
NODE

# ------------------------------------------------------------
section "9. DEPENDENCY AUDIT"
# ------------------------------------------------------------

if [ -f package-lock.json ]; then
  if command -v npm >/dev/null 2>&1; then
    printf 'DEPENDENCY_LOCK=package-lock.json\n'
    printf 'DEPENDENCY_AUDIT_MODE=PRODUCTION_DEPENDENCIES\n'

    # npm audit is a network-based dependency query.
    # It does not install, update, or repair packages.
    npm audit --omit=dev --audit-level=high || \
      warn "NPM_AUDIT_REPORTED_ISSUES_OR_COULD_NOT_REACH_REGISTRY"
  else
    warn "NPM_NOT_AVAILABLE"
  fi
else
  warn "PACKAGE_LOCK_MISSING_DEPENDENCY_AUDIT_NOT_REPRODUCIBLE"
fi

# ------------------------------------------------------------
section "10. LISTENING PORTS"
# ------------------------------------------------------------

if command -v ss >/dev/null 2>&1; then
  ss -lnt 2>/dev/null || warn "PORT_LIST_FAILED"
elif command -v netstat >/dev/null 2>&1; then
  netstat -lnt 2>/dev/null || warn "PORT_LIST_FAILED"
else
  warn "NO_SS_OR_NETSTAT_AVAILABLE"
fi

printf 'NOTE=LISTENING_PORTS_ALONE_DO_NOT_PROVE_REMOTE_REACHABILITY\n'

# ------------------------------------------------------------
section "11. GIT WORKTREE"
# ------------------------------------------------------------

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf 'GIT_BRANCH='
  git branch --show-current 2>/dev/null || true

  printf 'GIT_HEAD='
  git rev-parse --short HEAD 2>/dev/null || true

  printf '\nGIT_STATUS_BEGIN\n'
  git status --short
  printf 'GIT_STATUS_END\n'
else
  warn "GIT_METADATA_UNAVAILABLE"
fi

# ------------------------------------------------------------
section "12. FINAL GATE"
# ------------------------------------------------------------

printf 'PASS_COUNT=%s\n' "$PASS"
printf 'WARN_COUNT=%s\n' "$WARN"
printf 'FAIL_COUNT=%s\n' "$FAIL"

printf 'CHAIN_FILES_MODIFIED=NO\n'
printf 'SOURCE_FILES_MODIFIED=NO\n'
printf 'SERVICE_RESTARTED=NO\n'
printf 'AUTOMATIC_REPAIR=NO\n'
printf 'PASS_REAL_FULL_SYSTEM=NOT_CLAIMED\n'
printf 'PRODUCTION_APPROVAL=NO\n'
printf 'REPORT=%s\n' "$REPORT"

printf '\nAUDIT_FINISHED\n'
