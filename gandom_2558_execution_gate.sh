#!/data/data/com.termux/files/usr/bin/bash

set -u
umask 077

ROOT="$(pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT="$ROOT/GANDOM_2558_AUDIT_${STAMP}.txt"

export ROOT REPORT STAMP

node --version >/dev/null 2>&1 || {
  echo "ERROR: Node.js is required."
  exit 2
}

{
  echo "======================================================"
  echo " GANDOM 2558 — EXECUTION AND SECURITY GATE"
  echo "======================================================"
  echo "UTC_TIME=$STAMP"
  echo "ROOT=$ROOT"
  echo "MODE=READ_ONLY_AUDIT"
  echo "CHAIN_MUTATION=FORBIDDEN"
  echo "PRIVATE_KEY_ACCESS=FORBIDDEN"
  echo

  echo "===== 1. REQUIRED FILES ====="

  for f in \
    blockchain-100.js \
    node-b-chain.js \
    blockchain-p2p-handler.js \
    package.json
  do
    if [ -f "$ROOT/$f" ]; then
      echo "FILE_PRESENT=$f"
    else
      echo "FILE_MISSING=$f"
    fi
  done

  echo
  echo "===== 2. SOURCE VALIDATION AUDIT ====="

  for f in \
    blockchain-100.js \
    node-b-chain.js \
    blockchain-p2p-handler.js
  do
    [ -f "$ROOT/$f" ] || continue

    echo "--- SOURCE=$f ---"

    grep -n -E \
      'isValidBlock|validateBlock|isValid\(|NEW_BLOCK_FROM_PEER|REQUEST_FULL_SYNC|GET_CHAIN|createGenesis|chain\.push|chainB\.push|\.verify\(|COINBASE|calculateReward|calculateHash|merkleRoot|prevHash' \
      "$ROOT/$f" 2>/dev/null || true
  done

  echo
  echo "===== 3. BLOCKCHAIN DATA AUDIT ====="

  ROOT="$ROOT" node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.ROOT;

const files = [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
];

const chains = {};

function fail(msg) {
  console.log('DATA_ERROR=' + msg);
}

for (const rel of files) {
  const full = path.join(root, rel);

  if (!fs.existsSync(full)) {
    console.log(`CHAIN_FILE_MISSING=${rel}`);
    continue;
  }

  let raw;

  try {
    raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    fail(`${rel}:INVALID_JSON`);
    continue;
  }

  let chain;

  if (Array.isArray(raw)) {
    chain = raw;
  } else if (raw && Array.isArray(raw.chain)) {
    chain = raw.chain;
  } else {
    console.log(`CHAIN_FORMAT_UNRECOGNIZED=${rel}`);
    continue;
  }

  chains[rel] = chain;

  console.log(`CHAIN_FILE=${rel}`);
  console.log(`BLOCK_COUNT=${chain.length}`);

  let errors = 0;
  const seenIndexes = new Set();

  for (let i = 0; i < chain.length; i++) {
    const b = chain[i];

    if (!b || typeof b !== 'object') {
      console.log(`ERROR=INVALID_BLOCK_OBJECT INDEX=${i}`);
      errors++;
      continue;
    }

    if (!Number.isSafeInteger(b.index) || b.index !== i) {
      console.log(
        `ERROR=BLOCK_INDEX_MISMATCH POSITION=${i} INDEX=${b.index}`
      );
      errors++;
    }

    if (seenIndexes.has(b.index)) {
      console.log(`ERROR=DUPLICATE_BLOCK_INDEX INDEX=${b.index}`);
      errors++;
    }

    seenIndexes.add(b.index);

    if (typeof b.hash !== 'string' || !b.hash.length) {
      console.log(`ERROR=MISSING_BLOCK_HASH INDEX=${i}`);
      errors++;
    }

    if (i === 0) {
      if (b.prevHash !== '0'.repeat(64)) {
        console.log('ERROR=GENESIS_PREVHASH_INVALID');
        errors++;
      }

      console.log(`GENESIS_HASH=${b.hash}`);
      console.log(`GENESIS_TIMESTAMP=${b.timestamp}`);
      console.log(`GENESIS_TX_COUNT=${
        Array.isArray(b.transactions) ? b.transactions.length : 'INVALID'
      }`);
    } else {
      const prev = chain[i - 1];

      if (b.prevHash !== prev.hash) {
        console.log(
          `ERROR=LINK_MISMATCH INDEX=${i}` +
          ` EXPECTED=${prev.hash} ACTUAL=${b.prevHash}`
        );
        errors++;
      }
    }

    if (!Array.isArray(b.transactions)) {
      console.log(`ERROR=TRANSACTIONS_NOT_ARRAY INDEX=${i}`);
      errors++;
    }

    if (
      b.transactions &&
      Array.isArray(b.transactions)
    ) {
      for (let j = 0; j < b.transactions.length; j++) {
        const tx = b.transactions[j];

        if (!tx || typeof tx !== 'object') {
          console.log(`ERROR=INVALID_TX BLOCK=${i} TX=${j}`);
          errors++;
          continue;
        }

        if (
          typeof tx.amount !== 'number' ||
          !Number.isFinite(tx.amount) ||
          tx.amount < 0
        ) {
          console.log(`ERROR=INVALID_AMOUNT BLOCK=${i} TX=${j}`);
          errors++;
        }

        if (
          tx.fee !== undefined &&
          (
            typeof tx.fee !== 'number' ||
            !Number.isFinite(tx.fee) ||
            tx.fee < 0
          )
        ) {
          console.log(`ERROR=INVALID_FEE BLOCK=${i} TX=${j}`);
          errors++;
        }
      }
    }
  }

  console.log(`STRUCTURAL_ERROR_COUNT=${errors}`);
  console.log(
    `STRUCTURAL_STATUS=${errors === 0 ? 'PASS' : 'ISSUES_FOUND'}`
  );
  console.log('');
}

const a = chains['blockchain-data/chain.json'];
const b = chains['blockchain-data-b/chain.json'];

if (a && b && a.length && b.length) {
  const genesisA = a[0].hash;
  const genesisB = b[0].hash;

  console.log('===== CROSS-NODE CONSENSUS =====');
  console.log(`GENESIS_A=${genesisA}`);
  console.log(`GENESIS_B=${genesisB}`);

  const same = genesisA === genesisB;

  console.log(`GENESIS_MATCH=${same}`);

  if (!same) {
    console.log('CONSENSUS_GATE=BLOCKED_GENESIS_MISMATCH');
  } else {
    console.log('GENESIS_COMPARISON=PASS');
  }

  const common = Math.min(a.length, b.length);
  let prefixMismatch = -1;

  for (let i = 0; i < common; i++) {
    if (a[i].hash !== b[i].hash) {
      prefixMismatch = i;
      break;
    }
  }

  console.log(`FIRST_HASH_DIVERGENCE=${prefixMismatch}`);

  if (prefixMismatch >= 0) {
    console.log('CHAIN_PREFIX_MATCH=NO');
  } else {
    console.log('CHAIN_PREFIX_MATCH=YES_FOR_COMMON_BLOCKS');
  }
}

console.log('');
console.log('CHAIN_FILES_MODIFIED=NO');
console.log('AUTOMATIC_REPAIR=NO');
console.log('PRIVATE_KEYS_READ=NO');
NODE

  echo
  echo "===== 4. SECURITY-SENSITIVE SOURCE PATTERNS ====="

  for f in \
    blockchain-100.js \
    node-b-chain.js \
    blockchain-p2p-handler.js \
    server.js
  do
    [ -f "$ROOT/$f" ] || continue

    echo "--- REVIEW=$f ---"

    grep -n -E \
      'eval\(|new Function|Math\.random|child_process|execSync|spawnSync|process\.env|writeFileSync|unlinkSync|rmSync|chain\.push|chainB\.push' \
      "$ROOT/$f" 2>/dev/null || true
  done

  echo
  echo "===== 5. DEPENDENCY AUDIT ====="

  if [ -f "$ROOT/package-lock.json" ]; then
    echo "PACKAGE_LOCK=PRESENT"

    if command -v npm >/dev/null 2>&1; then
      echo "NPM_AUDIT_START"

      (
        cd "$ROOT" &&
        npm audit --omit=dev --json 2>/dev/null |
          node -e '
            let s = "";
            process.stdin.on("data", d => s += d);
            process.stdin.on("end", () => {
              try {
                const x = JSON.parse(s);
                const v = x.metadata && x.metadata.vulnerabilities || {};
                console.log("PROD_VULNERABILITIES_CRITICAL=" + (v.critical || 0));
                console.log("PROD_VULNERABILITIES_HIGH=" + (v.high || 0));
                console.log("PROD_VULNERABILITIES_MODERATE=" + (v.moderate || 0));
                console.log("PROD_VULNERABILITIES_LOW=" + (v.low || 0));
                console.log("NPM_AUDIT_EXIT=" + (x.error ? "ERROR" : "COMPLETED"));
              } catch {
                console.log("NPM_AUDIT_RESULT=UNAVAILABLE_OR_INVALID_JSON");
              }
            });
          '
      ) || echo "NPM_AUDIT=FAILED_OR_UNAVAILABLE"
    else
      echo "NPM_AUDIT=SKIPPED_NPM_NOT_INSTALLED"
    fi
  else
    echo "PACKAGE_LOCK=MISSING"
    echo "DEPENDENCY_AUDIT=INCOMPLETE"
  fi

  echo
  echo "===== 6. TESTS AND SCRIPTS AVAILABLE ====="

  if [ -f "$ROOT/package.json" ]; then
    node -e '
      const p = require("./package.json");
      console.log("PACKAGE_NAME=" + (p.name || "UNKNOWN"));
      console.log("PACKAGE_VERSION=" + (p.version || "UNKNOWN"));
      console.log("AVAILABLE_SCRIPTS:");
      for (const [k, v] of Object.entries(p.scripts || {})) {
        console.log("  " + k + " = " + v);
      }
    '
  fi

  echo
  echo "===== 7. FINAL SAFETY GATE ====="
  echo "CHAIN_MUTATION=NO"
  echo "AUTOMATIC_REPAIR=NO"
  echo "SERVICE_RESTARTED=NO"
  echo "PRODUCTION_APPROVAL=NOT_GRANTED"
  echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
  echo "AUDIT_RESULT=EVIDENCE_COLLECTED"
  echo "======================================================"

} 2>&1 | tee "$REPORT"

RC=${PIPESTATUS[0]:-0}

echo
echo "REPORT=$REPORT"
echo "AUDIT_EXIT_CODE=$RC"
echo "CHAIN_FILES_MODIFIED=NO"
echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
