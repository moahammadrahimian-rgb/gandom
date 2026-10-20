#!/data/data/com.termux/files/usr/bin/bash
set -u
umask 077

ROOT="$(pwd)"
REPORT="$ROOT/GANDOM_DEEP_AUDIT_$(date -u +%Y%m%dT%H%M%SZ).txt"

{
echo "GANDOM_AUDIT=2558"
echo "MODE=READ_ONLY"
echo "ROOT=$ROOT"
echo "CHAIN_MUTATION=NO"
echo "AUTOMATIC_REPAIR=NO"
echo "SERVICE_RESTART=NO"

echo
echo "===== 1. SOURCE FILES ====="
for f in server.js blockchain-100.js node-b-chain.js blockchain-p2p-handler.js package.json package-lock.json; do
  if [ -f "$f" ]; then
    echo "PRESENT=$f"
    sha256sum "$f"
  else
    echo "MISSING=$f"
  fi
done

echo
echo "===== 2. JAVASCRIPT SYNTAX ====="
for f in server.js blockchain-100.js node-b-chain.js blockchain-p2p-handler.js; do
  [ -f "$f" ] || continue
  if node --check "$f" 2>&1; then
    echo "SYNTAX_CHECK_COMPLETED=$f"
  else
    echo "SYNTAX_ERROR=$f"
  fi
done

echo
echo "===== 3. CONSENSUS AND P2P ====="
grep -nE 'isValidBlock|isValid\(|calculateHash|calculateReward|createGenesis|NEW_BLOCK_FROM_PEER|REQUEST_FULL_SYNC|chainB?\.push|prevHash|merkleRoot' \
  blockchain-100.js node-b-chain.js blockchain-p2p-handler.js 2>/dev/null || true

echo
echo "===== 4. TRANSACTIONS AND ACCOUNTING ====="
grep -nE 'COINBASE|INSUFFICIENT_BALANCE|signature|publicKey|amount|fee|nonce|balance|verify\(' \
  blockchain-100.js node-b-chain.js 2>/dev/null || true

echo
echo "===== 5. API AND STATIC FILE SECURITY ====="
grep -nE 'handlePaymentAPI|handleExchangeAPI|handleMarketAPI|handleUsersAPI|handleBlockchainAPI|Authorization|authenticate|authorize|rateLimit|decodeURIComponent|path\.resolve|path\.normalize' \
  server.js 2>/dev/null || true

echo
echo "===== 6. CHAIN LINK INTEGRITY ====="
node <<'NODE'
const fs = require('fs');

for (const file of [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
]) {
  if (!fs.existsSync(file)) {
    console.log('CHAIN_MISSING=' + file);
    continue;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const chain = Array.isArray(raw) ? raw : raw.chain;

    if (!Array.isArray(chain)) {
      console.log('UNKNOWN_CHAIN_FORMAT=' + file);
      continue;
    }

    let errors = 0;
    console.log('CHAIN=' + file);
    console.log('BLOCK_COUNT=' + chain.length);

    for (let i = 0; i < chain.length; i++) {
      const b = chain[i];

      if (!b || b.index !== i) {
        console.log('INDEX_ERROR=' + i);
        errors++;
      }

      if (i === 0) {
        console.log('GENESIS_HASH=' + b.hash);
        if (b.prevHash !== '0'.repeat(64)) {
          console.log('GENESIS_PREVHASH_ERROR=YES');
          errors++;
        }
      } else if (b.prevHash !== chain[i - 1].hash) {
        console.log('BROKEN_LINK=' + i);
        console.log('EXPECTED_PREV=' + chain[i - 1].hash);
        console.log('ACTUAL_PREV=' + b.prevHash);
        errors++;
      }

      if (!Array.isArray(b.transactions)) {
        console.log('TRANSACTION_FORMAT_ERROR=' + i);
        errors++;
      }
    }

    console.log('STRUCTURAL_ERRORS=' + errors);
  } catch (e) {
    console.log('CHAIN_READ_ERROR=' + file + ':' + e.message);
  }
}
NODE

echo
echo "===== 7. DEPENDENCIES ====="
if [ -f package-lock.json ] && command -v npm >/dev/null 2>&1; then
  npm audit --omit=dev --json 2>/dev/null |
    node -e '
      let s="";
      process.stdin.on("data",d=>s+=d);
      process.stdin.on("end",()=>{
        try {
          const x=JSON.parse(s);
          const v=x.metadata?.vulnerabilities||{};
          console.log("CRITICAL="+(v.critical||0));
          console.log("HIGH="+(v.high||0));
          console.log("MODERATE="+(v.moderate||0));
          console.log("LOW="+(v.low||0));
        } catch {
          console.log("NPM_AUDIT_RESULT=UNAVAILABLE");
        }
      });
    '
else
  echo "DEPENDENCY_AUDIT=SKIPPED"
fi

echo
echo "===== 8. FINAL SAFETY GATE ====="
echo "CHAIN_FILES_MODIFIED=NO"
echo "AUTOMATIC_REPAIR=NO"
echo "SERVICE_RESTARTED=NO"
echo "PRODUCTION_APPROVAL=NOT_GRANTED"
echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
} 2>&1 | tee "$REPORT"

echo
echo "REPORT=$REPORT"
