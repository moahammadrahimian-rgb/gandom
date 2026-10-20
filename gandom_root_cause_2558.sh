#!/data/data/com.termux/files/usr/bin/bash

set -u
cd "$(dirname "$0")" || exit 1

STAMP="$(date +%Y%m%dT%H%M%S)"
REPORT="$PWD/GANDOM_ROOT_CAUSE_2558_${STAMP}.txt"

exec > >(tee "$REPORT") 2>&1

section() {
  printf '\n\n========== %s ==========\n' "$1"
}

section "GANDOM ROOT CAUSE ENGINE / LAW 2558"
printf 'TIME=%s\n' "$STAMP"
printf 'ROOT=%s\n' "$PWD"
printf 'CHAIN_MUTATION=PROHIBITED\n'
printf 'AUTOMATIC_REPAIR=NO\n'
printf 'SERVICE_RESTART=NO\n'

section "1. REPOSITORY AND RUNTIME"

node --version 2>&1 || true
npm --version 2>&1 || true

for f in package.json package-lock.json \
  blockchain-100.js node-b-chain.js \
  blockchain-p2p-handler.js server.js; do
  if [ -f "$f" ]; then
    printf 'FILE_PRESENT=%s\n' "$f"
  else
    printf 'FILE_MISSING=%s\n' "$f"
  fi
done

section "2. READ-ONLY CHAIN FORENSICS"

node <<'NODE'
const fs = require('fs');
const crypto = require('crypto');

const files = [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
];

const loaded = [];

function readChain(file) {
  if (!fs.existsSync(file)) {
    console.log(`CHAIN_MISSING=${file}`);
    return null;
  }

  try {
    const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
    const chain = Array.isArray(obj) ? obj : obj.chain;

    if (!Array.isArray(chain)) {
      console.log(`CHAIN_FORMAT_UNKNOWN=${file}`);
      return null;
    }

    console.log(`CHAIN_FILE=${file}`);
    console.log(`BLOCK_COUNT=${chain.length}`);

    let errors = 0;
    const seen = new Set();

    for (let i = 0; i < chain.length; i++) {
      const b = chain[i];

      if (!b || typeof b !== 'object') {
        console.log(`INVALID_BLOCK_OBJECT=${i}`);
        errors++;
        continue;
      }

      console.log(`BLOCK_${i}_INDEX=${b.index}`);
      console.log(`BLOCK_${i}_HASH=${b.hash}`);
      console.log(`BLOCK_${i}_PREV_HASH=${b.prevHash}`);

      if (b.index !== i) {
        console.log(`INDEX_MISMATCH=position:${i},index:${b.index}`);
        errors++;
      }

      if (i === 0) {
        const zero = '0'.repeat(64);

        if (b.prevHash !== zero) {
          console.log('GENESIS_PREV_HASH_INVALID=YES');
          errors++;
        }
      } else if (b.prevHash !== chain[i - 1]?.hash) {
        console.log(`BROKEN_LINK_AT=${i}`);
        console.log(`EXPECTED_PREV=${chain[i - 1]?.hash}`);
        console.log(`ACTUAL_PREV=${b.prevHash}`);
        errors++;
      }

      for (const tx of (Array.isArray(b.transactions) ? b.transactions : [])) {
        if (tx && tx.txid) {
          if (seen.has(tx.txid)) {
            console.log(`DUPLICATE_TXID=${tx.txid}`);
            errors++;
          }
          seen.add(tx.txid);
        }
      }
    }

    console.log(`STRUCTURAL_ERRORS=${errors}`);
    console.log(`STRUCTURE_STATUS=${errors === 0 ? 'PASS_STRUCTURAL_ONLY' : 'FAIL'}`);

    return { file, chain };
  } catch (e) {
    console.log(`CHAIN_READ_ERROR=${file}:${e.message}`);
    return null;
  }
}

for (const file of files) {
  const result = readChain(file);
  if (result) loaded.push(result);
}

if (loaded.length >= 2) {
  const a = loaded[0].chain;
  const b = loaded[1].chain;

  console.log(`GENESIS_HASH_MATCH=${a[0]?.hash === b[0]?.hash}`);
  console.log(`TIP_HASH_MATCH=${a.at(-1)?.hash === b.at(-1)?.hash}`);

  if (a[0]?.hash !== b[0]?.hash) {
    console.log('ROOT_CAUSE_CANDIDATE=DIFFERENT_GENESIS');
  }

  if (b[1] && b[1].prevHash !== b[0]?.hash) {
    console.log('ROOT_CAUSE_CONFIRMED=NODE_B_BROKEN_GENESIS_LINK');
  }
}

console.log('CHAIN_FILES_MODIFIED=NO');
console.log('PRIVATE_KEYS_READ=NO');
NODE

section "3. GENESIS CREATION AND DETERMINISM"

if [ -f blockchain-100.js ]; then
  grep -n -B 12 -A 35 -E \
    'createGenesis|GENESIS-WALLET|COINBASE-|Date\.now|Math\.random|randomBytes|calculateHash' \
    blockchain-100.js || true
fi

section "4. BLOCK VALIDATION IMPLEMENTATION"

if [ -f blockchain-100.js ]; then
  grep -n -B 12 -A 40 -E \
    'isValidBlock|isValid\(|calculateHash|calculateReward|addBlock|mine\(|verify\(' \
    blockchain-100.js || true
fi

section "5. NETWORK INGRESS AND BYPASS AUDIT"

for f in node-b-chain.js blockchain-p2p-handler.js server.js; do
  [ -f "$f" ] || continue

  printf '\n--- SOURCE=%s ---\n' "$f"

  grep -n -B 12 -A 32 -E \
    'NEW_BLOCK_FROM_PEER|REQUEST_FULL_SYNC|GET_CHAIN|isValidBlock|chain\.push|chainB\.chain\.push|save\(\)|Block\.fromJSON' \
    "$f" || true
done

section "6. HTTP SECURITY AND EXTERNAL INPUT"

if [ -f server.js ]; then
  grep -n -B 5 -A 14 -E \
    'createServer|req\.url|decodeURIComponent|JSON\.parse|writeHead|Access-Control-Allow-Origin|Authorization|limit|rate|listen\(' \
    server.js || true
fi

section "7. DEPENDENCY STATUS"

if [ -f package-lock.json ]; then
  echo "PACKAGE_LOCK=PRESENT"

  if [ -d node_modules ]; then
    echo "NODE_MODULES=PRESENT"

    npm audit --omit=dev --json > /dev/null 2>&1
    code=$?
    echo "NPM_AUDIT_EXIT=$code"
    echo "NOTE=NPM_AUDIT_EXIT_ALONE_IS_NOT_A_SECURITY_VERDICT"
  else
    echo "NODE_MODULES=MISSING"
    echo "NPM_AUDIT=NOT_RUN_NO_INSTALL"
  fi
else
  echo "PACKAGE_LOCK=MISSING"
  echo "NPM_AUDIT=NOT_RUN"
fi

section "8. ROOT CAUSE GATES"

if [ -f blockchain-100.js ]; then
  if grep -Eq 'isValidBlock[[:space:]]*\(' blockchain-100.js; then
    echo "VALIDATOR_REFERENCE_FOUND=YES"
    echo "NOTE=CHECK_CLASS_METHOD_AND_ALL_CALL_SITES_MANUALLY"
  else
    echo "VALIDATOR_REFERENCE_FOUND=NO"
    echo "BLOCK_VALIDATION_GATE=BLOCKED"
  fi

  if grep -Eq 'Date\.now\(\)|Math\.random\(\)' blockchain-100.js; then
    echo "NONDETERMINISTIC_VALUE_SOURCE_FOUND=YES"
    echo "NOTE=VERIFY_WHETHER_USED_IN_GENESIS"
  fi
fi

if [ -f node-b-chain.js ] &&
   grep -n -A 15 'NEW_BLOCK_FROM_PEER' node-b-chain.js |
   grep -Eq 'chainB\.chain\.push'; then
  echo "DIRECT_BLOCK_INSERTION_PATTERN=FOUND"
  echo "NOTE=VERIFY_VALIDATION_EXECUTES_BEFORE_INSERTION"
fi

section "9. FINAL SAFETY GATE"

echo "CHAIN_FILES_MODIFIED=NO"
echo "AUTOMATIC_REPAIR=NO"
echo "SERVICE_RESTARTED=NO"
echo "GENESIS_REPAIR=NOT_PERFORMED"
echo "PRODUCTION_APPROVAL=NOT_GRANTED"
echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
echo "AUDIT_REPORT=$REPORT"
echo "AUDIT_COMPLETE=YES"
