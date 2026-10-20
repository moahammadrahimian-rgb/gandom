#!/data/data/com.termux/files/usr/bin/bash
set +e

OUT="gandom-investor-audit-$(date +%Y%m%d-%H%M%S).txt"
ROOT="$PWD"

{
  echo "GANDOM TECHNICAL AUDIT"
  echo "DATE: $(date -Iseconds)"
  echo "ROOT: $ROOT"
  echo

  echo "=== PROJECT SIZE ==="
  find . -type f \
    -not -path './node_modules/*' \
    -not -path './.git/*' \
    -not -path './evidence/*' \
    -not -path './audit/*' \
    -printf '%s
' 2>/dev/null | awk '{sum+=$1} END{printf "FILES_SIZE_BYTES: %d
FILES_SIZE_MB: %.2f
",sum,sum/1024/1024}'
  find . -type f \
    -not -path './node_modules/*' \
    -not -path './.git/*' \
    -not -path './evidence/*' \
    -not -path './audit/*' | wc -l | awk '{print "SOURCE_FILES:",$1}'
  echo

  echo "=== GIT ==="
  if [ -d .git ]; then
    git branch --show-current
    git log -1 --oneline
    echo "UNCOMMITTED_FILES: $(git status --porcelain | wc -l)"
  else
    echo "NO_GIT_REPOSITORY"
  fi
  echo

  echo "=== PACKAGE ==="
  if [ -f package.json ]; then
    node -e '
      const p=require("./package.json");
      console.log("NAME:",p.name||"");
      console.log("VERSION:",p.version||"");
      console.log("MAIN:",p.main||"");
      console.log("SCRIPTS:",JSON.stringify(p.scripts||{}));
      console.log("DEPENDENCIES:",Object.keys({...p.dependencies,...p.devDependencies}).join(","));
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

  echo "=== SYNTAX ==="
  find . -maxdepth 2 -type f -name '*.js' \
    -not -path './node_modules/*' \
    -not -path './.git/*' | while read -r f; do
      node --check "$f" >/dev/null 2>&1 \
        && echo "PASS $f" \
        || echo "FAIL $f"
    done
  echo

  echo "=== LIVE NODE ==="
  for path in /health /api/peers /api/chain /api/chain/pending /api/chain/validate; do
    echo "--- $path"
    curl -sS --max-time 5 "http://127.0.0.1:8787$path" 2>&1
    echo
  done
  echo

  echo "=== WEBSOCKET SOURCE EVIDENCE ==="
  grep -RniE 'WebSocket|broadcast|peer|WELCOME|blocksReceived|isValidBlock|save' . \
    --include='*.js' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=evidence \
    --exclude-dir=audit 2>/dev/null | head -100
  echo

  echo "=== SECRETS CHECK ==="
  grep -RIlE 'private.?key|mnemonic|seed.?phrase|api.?key|password|secret' . \
    --include='*.js' \
    --include='*.json' \
    --include='*.env' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=evidence \
    --exclude-dir=audit 2>/dev/null | head -50
  echo "Review manually. Do not upload secret contents."
  echo

  echo "=== FINAL STATUS ==="
  echo "This report is evidence only."
  echo "Do not claim production readiness from this report alone."
} > "$OUT"

echo "REPORT_CREATED: $OUT"
wc -l "$OUT"
