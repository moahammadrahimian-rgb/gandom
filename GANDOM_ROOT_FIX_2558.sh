#!/data/data/com.termux/files/usr/bin/bash
set -u

export GANDOM_MOTHER_LOCK=2558
REPORT="$HOME/GANDOM_ROOT_FIX_2558_$(date +%Y%m%d_%H%M%S).log"

exec > >(tee "$REPORT") 2>&1

echo "===== GANDOM ROOT AUDIT | LAW 2558 ====="
echo "DATE=$(date -Iseconds)"
echo "PROJECT=$PWD"
echo "MODE=READ_ONLY"
echo "CHAIN_REBUILT=NO"
echo "SERVICE_RESTARTED=NO"

for f in blockchain-100.js blockchain-p2p-handler.js node-b-chain.js; do
  if [ ! -f "$f" ]; then
    echo "MISSING_SOURCE=$f"
  elif node --check "$f"; then
    echo "SYNTAX_PASS=$f"
  else
    echo "SYNTAX_FAIL=$f"
  fi
done

echo
echo "===== 1. VALIDATOR DEFINITION ====="
grep -n -B 8 -A 35 'isValidBlock' \
  blockchain-100.js blockchain-p2p-handler.js node-b-chain.js || true

echo
echo "===== 2. BLOCK ACCEPTANCE PATHS ====="
grep -n -B 8 -A 18 -E \
'chain(B)?\.chain\.push|this\.chain\.push|addBlock\(block\)|NEW_BLOCK_FROM_PEER|CHAIN_DATA' \
blockchain-100.js blockchain-p2p-handler.js node-b-chain.js || true

echo
echo "===== 3. GENESIS IMPLEMENTATION ====="
grep -n -B 8 -A 28 'createGenesis' blockchain-100.js || true

echo
echo "===== 4. CHAIN FINGERPRINTS ====="
node <<'NODE'
const fs = require('fs');
const crypto = require('crypto');

for (const file of [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
]) {
  if (!fs.existsSync(file)) {
    console.log(`CHAIN_MISSING=${file}`);
    continue;
  }

  const raw = fs.readFileSync(file);
  console.log(`FILE=${file}`);
  console.log(`SHA256=${crypto.createHash('sha256').update(raw).digest('hex')}`);

  try {
    const data = JSON.parse(raw.toString('utf8'));
    const chain = Array.isArray(data) ? data : data.chain;

    if (!Array.isArray(chain)) {
      console.log('CHAIN_FORMAT=UNRESOLVED');
      continue;
    }

    console.log(`BLOCK_COUNT=${chain.length}`);
    console.log(`FIRST_INDEX=${chain[0]?.index ?? 'NONE'}`);
    console.log(`LAST_INDEX=${chain.at(-1)?.index ?? 'NONE'}`);
    console.log(`GENESIS_HASH=${chain[0]?.hash ?? 'NONE'}`);
    console.log(`LAST_HASH=${chain.at(-1)?.hash ?? 'NONE'}`);

    let gaps = 0;
    let links = 0;

    for (let i = 1; i < chain.length; i++) {
      if (chain[i].index !== chain[i - 1].index + 1) gaps++;
      if (chain[i].prevHash !== chain[i - 1].hash) links++;
    }

    console.log(`INDEX_GAPS=${gaps}`);
    console.log(`BROKEN_PREVHASH_LINKS=${links}`);
  } catch (e) {
    console.log(`CHAIN_PARSE_ERROR=${e.message}`);
  }
}
NODE

echo
echo "===== 5. FINAL SAFETY ====="
echo "SOURCE_MODIFIED=NO"
echo "CHAIN_DATA_MODIFIED=NO"
echo "CHAIN_REBUILT=NO"
echo "SERVICE_RESTARTED=NO"
echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
echo "REPORT=$REPORT"
echo "===== AUDIT COMPLETE ====="
