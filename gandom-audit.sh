#!/data/data/com.termux/files/usr/bin/bash

OUT="gandom-audit-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "GANDOM TECHNICAL AUDIT"
  date -Iseconds
  echo

  echo "=== SIZE ==="
  du -sh .
  printf "SOURCE_FILES: "
  find . -type f \
    -not -path './node_modules/*' \
    -not -path './.git/*' \
    -not -path './evidence/*' \
    -not -path './audit/*' | wc -l

  echo
  echo "=== PACKAGE ==="
  if [ -f package.json ]; then
    node -e '
      const p=require("./package.json");
      console.log(JSON.stringify({
        name:p.name,
        version:p.version,
        main:p.main,
        scripts:p.scripts,
        dependencies:p.dependencies
      },null,2))
    ' 2>&1
  else
    echo "NO_PACKAGE_JSON"
  fi

  echo
  echo "=== CORE FILES ==="
  find . -maxdepth 2 -type f \
    -not -path './node_modules/*' \
    -not -path './.git/*' \
    \( -name 'server.js' -o -name 'package.json' -o -name 'blockchain*.js' -o -name 'node-*.js' \) \
    -print | sort

  echo
  echo "=== LIVE NODE ==="
  for p in /health /api/peers /api/chain /api/chain/pending /api/chain/validate; do
    echo "--- $p"
    curl -sS --max-time 5 "http://127.0.0.1:8787$p"
    echo
  done

  echo
  echo "=== JAVASCRIPT SYNTAX ==="
  find . -maxdepth 2 -type f -name '*.js' \
    -not -path './node_modules/*' \
    -not -path './.git/*' |
  while read -r f; do
    if node --check "$f" >/dev/null 2>&1; then
      echo "PASS $f"
    else
      echo "FAIL $f"
    fi
  done

  echo
  echo "=== P2P EVIDENCE ==="
  grep -RniE 'WebSocket|broadcast|WELCOME|blocksReceived|peer|isValidBlock|save' . \
    --include='*.js' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=evidence \
    --exclude-dir=audit 2>/dev/null | head -100

  echo
  echo "=== SECRET FILE NAMES ONLY ==="
  grep -RIlE 'private.?key|mnemonic|seed.?phrase|api.?key|password|secret' . \
    --include='*.js' \
    --include='*.json' \
    --include='*.env' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=evidence \
    --exclude-dir=audit 2>/dev/null | head -50

  echo
  echo "=== STATUS ==="
  echo "EVIDENCE_ONLY"
  echo "NOT_PRODUCTION_APPROVED"
} > "$OUT"

echo "REPORT_CREATED: $OUT"
wc -l "$OUT"
