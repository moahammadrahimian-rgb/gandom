#!/data/data/com.termux/files/usr/bin/bash
set +e

OUT="security-audit-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "GANDOM SECURITY AUDIT"
  date -Iseconds

  echo
  echo "=== SYNTAX ==="
  for f in server.js blockchain-api.js blockchain-p2p-handler.js node-b-chain.js; do
    node --check "./$f" >/dev/null 2>&1 \
      && echo "PASS $f" \
      || echo "FAIL $f"
  done

  echo
  echo "=== SECRET FILE NAMES ONLY ==="
  grep -RIlE 'private.?key|mnemonic|seed.?phrase|api.?key|password|secret|token' . \
    --include='*.js' \
    --include='*.json' \
    --include='*.env' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=evidence \
    --exclude-dir=audit \
    2>/dev/null | head -100

  echo
  echo "=== HARD-CODED NETWORK RISKS ==="
  grep -RniE '0\.0\.0\.0|127\.0\.0\.1|http://|ws://|cors|origin|eval\(|child_process|exec\(|spawn\(' . \
    --include='*.js' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=evidence \
    --exclude-dir=audit \
    2>/dev/null | head -150

  echo
  echo "=== INPUT AND AUTH CHECK ==="
  grep -RniE 'req\.body|req\.query|req\.url|JSON\.parse|authorization| bearer |jwt|signature|rate.?limit|validate|sanitize|helmet' . \
    --include='*.js' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=evidence \
    --exclude-dir=audit \
    2>/dev/null | head -200

  echo
  echo "=== LIVE SAFETY CHECK ==="
  for p in /health /api/peers /api/chain /api/chain/pending /api/chain/validate; do
    echo "--- $p"
    curl -sS --max-time 5 "http://127.0.0.1:8787$p"
    echo
  done

  echo
  echo "=== FILE PERMISSIONS ==="
  find . -type f \
    \( -name '*.env' -o -iname '*key*' -o -iname '*secret*' -o -iname '*wallet*' \) \
    -not -path './node_modules/*' \
    -not -path './.git/*' \
    -exec ls -l {} \; 2>/dev/null | head -100

  echo
  echo "=== DEPENDENCIES ==="
  if command -v npm >/dev/null 2>&1 && [ -f package-lock.json ]; then
    npm audit --omit=dev --json 2>/dev/null | node -e '
      let s="";
      process.stdin.on("data",d=>s+=d);
      process.stdin.on("end",()=>{
        try {
          const x=JSON.parse(s);
          console.log(JSON.stringify({
            total:x.metadata?.vulnerabilities?.total,
            critical:x.metadata?.vulnerabilities?.critical,
            high:x.metadata?.vulnerabilities?.high,
            moderate:x.metadata?.vulnerabilities?.moderate,
            low:x.metadata?.vulnerabilities?.low
          },null,2));
        } catch {
          console.log("NPM_AUDIT_UNAVAILABLE");
        }
      });
    '
  else
    echo "NPM_AUDIT_SKIPPED_NO_LOCKFILE"
  fi

  echo
  echo "=== STATUS ==="
  echo "READ_ONLY_AUDIT"
  echo "NO_KEYS_EXPORTED"
  echo "NO_PRODUCTION_APPROVAL"

} > "$OUT"

echo "REPORT_CREATED: $OUT"
wc -l "$OUT"
