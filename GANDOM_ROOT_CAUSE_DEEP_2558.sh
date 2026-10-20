#!/data/data/com.termux/files/usr/bin/bash
set -u
cd "$(dirname "$0")" || exit 1

TS="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT="$PWD/GANDOM_ROOT_CAUSE_DEEP_2558_${TS}.txt"

{
  echo "=================================================="
  echo "GANDOM ROOT CAUSE DEEP AUDIT"
  echo "MOTHER_LOCK=2558"
  echo "MODE=READ_ONLY"
  echo "UTC=$(date -u +%FT%TZ)"
  echo "ROOT=$PWD"
  echo "=================================================="

  echo
  echo "===== 1. REPOSITORY STATUS ====="
  git rev-parse --show-toplevel 2>&1 || true
  git status --short 2>&1 || true
  git log -1 --oneline 2>&1 || true

  echo
  echo "===== 2. VALIDATOR DEFINITIONS AND CALL SITES ====="
  rg -n --hidden \
    -g '*.js' -g '*.cjs' -g '*.mjs' \
    -g '!node_modules/**' -g '!**/BACKUPS/**' \
    'isValidBlock|validateBlock|validateChain|\.isValid\(' . 2>&1 || true

  echo
  echo "===== 3. GENESIS AND NONDETERMINISTIC INPUTS ====="
  rg -n --hidden \
    -g '*.js' -g '*.cjs' -g '*.mjs' \
    -g '!node_modules/**' -g '!**/BACKUPS/**' \
    'createGenesis|GENESIS|Math\.random|randomUUID|randomBytes|Date\.now|new Date\(' . 2>&1 || true

  echo
  echo "===== 4. BLOCK ACCEPTANCE AND DIRECT MUTATION ====="
  rg -n --hidden \
    -g '*.js' -g '*.cjs' -g '*.mjs' \
    -g '!node_modules/**' -g '!**/BACKUPS/**' \
    'NEW_BLOCK_FROM_PEER|chain\.push|chain\.splice|chain\s*=|fromJSON|\.save\(\)' . 2>&1 || true

  echo
  echo "===== 5. TRANSACTION AND ACCOUNTING VALIDATION ====="
  rg -n --hidden \
    -g '*.js' -g '*.cjs' -g '*.mjs' \
    -g '!node_modules/**' -g '!**/BACKUPS/**' \
    'COINBASE|INSUFFICIENT_BALANCE|publicKey|signature|verify\(|nonce|calculateReward|amount|fee|balance' . 2>&1 || true

  echo
  echo "===== 6. CHAIN FILE METADATA ONLY ====="
  for f in blockchain-data/chain.json blockchain-data-b/chain.json; do
    if [ -f "$f" ]; then
      echo "FILE=$f"
      wc -c -l "$f" 2>&1 || true
      sha256sum "$f" 2>&1 || true
    else
      echo "FILE_MISSING=$f"
    fi
  done

  echo
  echo "===== 7. SYNTAX CHECK — NO EXECUTION ====="
  for f in blockchain-100.js node-b-chain.js blockchain-p2p-handler.js server.js; do
    if [ -f "$f" ]; then
      if node --check "$f" 2>&1; then
        echo "SYNTAX_$f=PASS"
      else
        echo "SYNTAX_$f=FAIL"
      fi
    else
      echo "SOURCE_MISSING=$f"
    fi
  done

  echo
  echo "===== 8. FINAL SAFETY GATE ====="
  echo "CHAIN_FILES_MODIFIED=NO"
  echo "AUTOMATIC_REPAIR=NO"
  echo "SERVICE_RESTARTED=NO"
  echo "PRIVATE_KEYS_READ=NO"
  echo "GENESIS_CANONICALITY=UNRESOLVED"
  echo "CONSENSUS_VALIDITY=NOT_ESTABLISHED"
  echo "PRODUCTION_APPROVAL=NOT_GRANTED"
  echo "PASS_REAL_FULL_SYSTEM=NOT_CLAIMED"
  echo "AUDIT_REPORT=$REPORT"
} 2>&1 | tee "$REPORT"

printf '\nREPORT=%s\n' "$REPORT"
printf 'AUDIT_EXIT_CODE=%s\n' "${PIPESTATUS[0]}"
