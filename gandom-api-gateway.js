cd "$HOME" || exit 1

REPORT="$HOME/GANDOM-UNIFIED-INVENTORY-2558.txt"

{
  echo "=================================================="
  echo "GANDOM UNIFIED INVENTORY"
  echo "LAW=2558"
  echo "MODE=READ_ONLY"
  echo "DATE=$(date -Is 2>/dev/null)"
  echo "=================================================="

  echo
  echo "===== 1. DEVICE AND STORAGE ====="
  uname -a
  getprop ro.product.model 2>/dev/null
  getprop ro.build.version.release 2>/dev/null
  node --version 2>/dev/null
  npm --version 2>/dev/null
  df -h "$HOME" /sdcard 2>/dev/null

  echo
  echo "===== 2. MAIN PROJECT ====="
  echo "HOME=$HOME"
  ls -ld "$HOME/gandom" 2>&1
  if [ -d "$HOME/gandom" ]; then
    du -sh "$HOME/gandom" 2>/dev/null
    git -C "$HOME/gandom" rev-parse --show-toplevel 2>&1
    git -C "$HOME/gandom" branch --show-current 2>&1
    git -C "$HOME/gandom" log -1 --format='%H%n%cI%n%s' 2>&1
    git -C "$HOME/gandom" remote -v 2>&1
    git -C "$HOME/gandom" status --short --branch 2>&1
  fi

  echo
  echo "===== 3. ALL LOCAL GIT REPOSITORIES ====="
  find "$HOME" -maxdepth 6 -type d -name .git -prune -print 2>/dev/null |
  while IFS= read -r g; do
    r="${g%/.git}"
    echo
    echo "--- REPO: $r"
    git -C "$r" rev-parse --show-toplevel 2>&1
    git -C "$r" branch --show-current 2>&1
    git -C "$r" log -1 --format='%H | %cI | %s' 2>&1
    git -C "$r" remote -v 2>&1
    git -C "$r" status --short --branch 2>&1
  done

  echo
  echo "===== 4. GANDOM FILES AND VARIANTS ====="
  find "$HOME" -maxdepth 5 -type f \
    \( -iname '*gandom*' \
       -o -iname '*2558*' \
       -o -iname '*alpha6*' \
       -o -iname '*treasure*' \
       -o -iname '*execution*index*' \
       -o -iname '*audit*' \
       -o -iname '*manifest*' \) \
    -printf '%TY-%Tm-%Td %TH:%TM | %s bytes | %p\n' 2>/dev/null |
  sort

  echo
  echo "===== 5. PROJECT ENTRY POINTS ====="
  for f in \
    "$HOME/gandom/package.json" \
    "$HOME/gandom/server.js" \
    "$HOME/gandom/client.js" \
    "$HOME/gandom/start-gandom.sh" \
    "$HOME/gandom/status.sh" \
    "$HOME/gandom/public/index.html" \
    "$HOME/gandom/www/index.html" \
    "$HOME/gandom/audit-service/server.js" \
    "$HOME/gandom/gandom-core/index.js" \
    "$HOME/gandom/constitution/GOLDEN-MOTHER-LAW-2558.json" \
    "$HOME/gandom/gandom-core/governance/GOLDEN-MOTHER-LAW-2558.json"
  do
    if [ -f "$f" ]; then
      ls -l "$f"
      sha256sum "$f" 2>/dev/null
    else
      echo "MISSING: $f"
    fi
  done

  echo
  echo "===== 6. RUNNING SERVICES ====="
  ps -A 2>/dev/null |
    grep -E 'node|python|java|gradle|chromium' |
    grep -v grep

  echo
  echo "===== 7. LOCAL HTTP HEALTH ====="
  for port in 8080 8787 8788 8888 9000; do
    echo "--- PORT $port"
    curl --max-time 3 -sS -i \
      "http://127.0.0.1:$port/health" 2>&1 |
      head -c 1600
    echo
  done

  echo
  echo "===== 8. P2P AND CELL ENDPOINTS ====="
  for port in 8787 8788; do
    for path in /api/peers /api/cells; do
      echo "--- $port$path"
      curl --max-time 3 -sS \
        "http://127.0.0.1:$port$path" 2>&1 |
        head -c 1200
      echo
    done
  done

  echo
  echo "===== 9. APK AND ARCHIVE FILES ====="
  for root in "$HOME" /sdcard/Download /sdcard/Documents; do
    [ -d "$root" ] || continue
    find "$root" -maxdepth 5 -type f \
      \( -iname '*.apk' \
         -o -iname '*.aab' \
         -o -iname '*.tar.gz' \
         -o -iname '*.tgz' \
         -o -iname '*.zip' \
         -o -iname '*.7z' \
         -o -iname '*.bak' \
         -o -iname '*.backup' \) \
      -printf '%TY-%Tm-%Td %TH:%TM | %s bytes | %p\n' 2>/dev/null
  done

  echo
  echo "===== 10. BLOCKCHAIN DATA FILES ====="
  if [ -d "$HOME/gandom" ]; then
    find "$HOME/gandom" -maxdepth 6 -type f \
      \( -iname '*chain*.json' \
         -o -iname '*block*.json' \
         -o -iname '*ledger*' \
         -o -iname '*wallet*' \
         -o -iname '*accounting*' \) \
      -printf '%s bytes | %p\n' 2>/dev/null
  fi

  echo
  echo "===== 11. REPORT END ====="
  echo "NO_FILES_DELETED=1"
  echo "NO_SERVICES_RESTARTED=1"
  echo "NO_FAKE_PASS=1"

} 2>&1 | tee "$REPORT"

echo
echo "REPORT_PATH=$REPORT"
echo "REPORT_SHA256=$(sha256sum "$REPORT" | awk '{print $1}')"

