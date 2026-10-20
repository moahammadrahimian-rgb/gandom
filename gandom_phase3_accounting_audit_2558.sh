#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$PWD"
STAMP="$(date +%Y%m%d_%H%M%S)"
REPORT="$ROOT/gandom_phase3_accounting_2558_${STAMP}.log"
BACKUP="$ROOT/.gandom-audit-2558-${STAMP}"

mkdir -p "$BACKUP" || exit 1

exec > >(tee "$REPORT") 2>&1

echo "GANDOM_PHASE3_ACCOUNTING_AUDIT_2558=START"
echo "ROOT=$ROOT"
echo "BACKUP_DIR=$BACKUP"
echo "REPORT=$REPORT"
echo "MODE=READ_ONLY_SOURCE_AND_LEDGER_AUDIT"
echo "LAW=2558"

for f in blockchain-100.js blockchain-p2p-handler.js node-b-chain.js server.js package.json; do
  if [ -f "$f" ]; then
    cp -p "$f" "$BACKUP/$f" || {
      echo "ERROR=SOURCE_BACKUP_FAILED:$f"
      exit 2
    }
    echo "SOURCE_BACKUP=OK:$f"
  else
    echo "SOURCE_FILE=MISSING:$f"
  fi
done

echo
echo "===== 1. ACCOUNTING IMPLEMENTATION ====="

if [ -f blockchain-100.js ]; then
  grep -nE \
    'addTransaction|getBalance|getTotalSupply|calculateReward|isValidBlock|isValid\(|pendingTx|COINBASE|tx\.verify|wallets\[|nonce|double.?spend' \
    blockchain-100.js || true
fi

echo
echo "===== 2. P2P BLOCK INGESTION ====="

for f in blockchain-p2p-handler.js node-b-chain.js; do
  [ -f "$f" ] || continue
  echo "--- $f ---"
  grep -n -B 5 -A 9 -E \
    'NEW_BLOCK_FROM_PEER|chain\.push|isValidBlock|chainB\.save|gandomChain\.save' \
    "$f" || true
done

echo
echo "===== 3. JAVASCRIPT SYNTAX ====="

for f in blockchain-100.js blockchain-p2p-handler.js node-b-chain.js server.js; do
  [ -f "$f" ] || continue
  if node --check "$f"; then
    echo "SYNTAX_PASS=$f"
  else
    echo "SYNTAX_FAIL=$f"
  fi
done

echo
echo "===== 4. PACKAGE TEST COMMANDS ====="

if [ -f package.json ]; then
  node - <<'NODE'
const p = require('./package.json');
console.log('PACKAGE_NAME=' + (p.name || 'UNDEFINED'));
console.log('START_SCRIPT=' + (p.scripts?.start || 'UNDEFINED'));
console.log('TEST_SCRIPT=' + (p.scripts?.test || 'UNDEFINED'));
console.log('AVAILABLE_SCRIPTS=' + Object.keys(p.scripts || {}).join(','));
NODE
fi

echo
echo "===== 5. LEDGER CONSISTENCY REQUIREMENTS ====="

cat <<'RULES'
REQUIRED_CHECKS:
- Recalculate balances from the canonical genesis and accepted blocks.
- Reject negative, non-finite, or invalid monetary values.
- Verify every transfer signature and transaction identifier.
- Reserve pending spends per sender; reject conflicting pending transactions.
- Revalidate pending transactions against the state immediately before block application.
- Reject duplicate transaction IDs across accepted blocks.
- Reject unauthorized COINBASE transactions and incorrect subsidy/reward amounts.
- Define explicitly whether miner payout equals subsidy alone or subsidy plus fees.
- Check conservation of value and fee accounting for every accepted block.
- Apply the same validation function to every P2P block-ingress path.
- Make block application atomic: invalid blocks must not partially change balances.
- Require all nodes to agree on canonical genesis and the same accepted chain tip.
RULES

echo
echo "===== 6. FINAL GATE ====="
echo "CHAIN_FILES_MODIFIED=NO"
echo "SOURCE_FILES_MODIFIED=NO"
echo "SERVICE_RESTARTED=NO"
echo "AUTOMATIC_REPAIR=NO"
echo "ACCOUNTING_TESTS_EXECUTED=NO"
echo "GENESIS_CANONICALITY=UNRESOLVED_UNTIL_VERIFIED"
echo "CONSENSUS_GATE=BLOCKED_UNTIL_GENESIS_AND_INGRESS_VALIDATION"
echo "PRODUCTION_APPROVAL=NO"
echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
echo "GANDOM_PHASE3_ACCOUNTING_AUDIT=FINISHED"
