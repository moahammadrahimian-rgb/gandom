#!/data/data/com.termux/files/usr/bin/bash
set -u
cd "$HOME/gandom" || exit 1

OUT="$HOME/gandom/GANDOM-FORENSIC-2558-$(date +%Y%m%d-%H%M%S).txt"
exec > >(tee "$OUT") 2>&1

echo "=== GANDOM FORENSIC RECOVERY | LAW=2558 ==="
date -Iseconds
echo "ROOT=$PWD"
echo "MODE=READ_ONLY_DISCOVERY"

echo
echo "=== 1. ACTIVE PROCESSES ==="
ps -A -o PID,PPID,ARGS 2>/dev/null |
grep -Ei '[n]ode|[n]pm|[p]ython|[t]ermux-services' || true

echo
echo "=== 2. LISTENING SOCKETS ==="
ss -ltnp 2>/dev/null || ss -ltn 2>/dev/null || true

echo
echo "=== 3. ALL PROJECT START CANDIDATES ==="
find "$HOME" -type f \
  \( -name 'start-gandom.sh' -o -name 'server.js' \
     -o -name 'client.js' -o -name 'package.json' \
     -o -name 'ecosystem.config.js' -o -name 'ecosystem.config.cjs' \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/objects/*' \
  -not -path '*/gandom-core/revival-live/NODE_RUNTIME/*' \
  -print 2>/dev/null

echo
echo "=== 4. CANONICAL SERVICE CONFIGURATION ==="
for f in server.js client.js start-gandom.sh package.json \
         audit-service/server.js audit-service/package.json; do
  if [ -f "$f" ]; then
    echo "--- $f"
    grep -nE 'listen\(|PORT|process\.env|8787|8788|8789|8790|8888|9000|8080|WebSocket|WebSocketServer|new WebSocket|peers' \
      "$f" 2>/dev/null | head -n 100 || true
  fi
done

echo
echo "=== 5. LOCAL HTTP SERVICE MAP ==="
for p in 8080 8787 8788 8789 8790 8888 9000; do
  for path in /health / /api/peers; do
    printf 'PORT=%s PATH=%s ' "$p" "$path"
    curl -sS --max-time 2 -o /dev/null \
      -w 'HTTP=%{http_code}\n' "http://127.0.0.1:$p$path" 2>/dev/null ||
      echo 'UNREACHABLE'
  done
done

echo
echo "=== 6. PACKAGE SCRIPTS AND DEPENDENCIES ==="
node -e '
for (const f of ["package.json","audit-service/package.json"]) {
 try {
  const p=require("./"+f);
  console.log(JSON.stringify({
   file:f,name:p.name,scripts:p.scripts,
   dependencies:p.dependencies
  },null,2));
 } catch(e) { console.log(f+": "+e.message); }
}'

echo
echo "=== 7. RECENT SERVICE LOGS ==="
for f in runtime-logs/*.log server.log backend.log frontend.log; do
  [ -f "$f" ] || continue
  echo "--- $f"
  tail -n 25 "$f" 2>/dev/null
done

echo
echo "=== 8. GIT STATE (IF AVAILABLE) ==="
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --short
  git branch --show-current
  git remote -v
else
  echo "NO_GIT_WORKTREE_AT_PROJECT_ROOT"
fi

echo
echo "=== COMPLETE ==="
echo "REPORT=$OUT"
echo "FILES_CHANGED=NO"
echo "SERVICES_STARTED=NO"
echo "GLOBAL_NETWORK=NOT_CLAIMED"
