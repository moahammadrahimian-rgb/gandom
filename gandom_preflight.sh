#!/usr/bin/env bash
set -u

ROOT="${1:-.}"
cd "$ROOT" || exit 1

OUT="GANDOM_PREFLIGHT_$(date -u +%Y%m%dT%H%M%SZ).txt"

{
  echo "=== GANDOM READ-ONLY PREFLIGHT ==="
  date -u
  echo "ROOT=$PWD"

  echo
  echo "=== RUNTIME ==="
  node --version 2>&1 || true
  npm --version 2>&1 || true
  docker --version 2>&1 || true
  docker compose version 2>&1 || true

  echo
  echo "=== GIT STATE ==="
  git status --short 2>&1 || true
  git rev-parse --show-toplevel 2>&1 || true

  echo
  echo "=== PACKAGE SCRIPTS ==="
  node -e '
    const fs = require("fs");
    if (!fs.existsSync("package.json")) {
      console.log("package.json NOT FOUND");
      process.exit(0);
    }
    const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
    console.log(JSON.stringify({
      name: p.name,
      version: p.version,
      main: p.main,
      scripts: p.scripts,
      dependencies: p.dependencies,
      devDependencies: p.devDependencies
    }, null, 2));
  ' 2>&1 || true

  echo
  echo "=== PROJECT CONFIG FILES ==="
  for f in \
    server.js package.json package-lock.json \
    docker-compose.yml docker-compose.yaml \
    Dockerfile .env.example security_audit.sh
  do
    if [ -f "$f" ]; then
      ls -lh "$f"
    fi
  done

  echo
  echo "=== JS SYNTAX CHECK ==="
  find . \
    -path './node_modules' -prune -o \
    -path './.git' -prune -o \
    -type f -name '*.js' -print0 |
  while IFS= read -r -d '' f; do
    if node --check "$f" >/dev/null 2>&1; then
      printf 'PASS %s\n' "$f"
    else
      printf 'FAIL %s\n' "$f"
      node --check "$f" 2>&1 || true
    fi
  done

  echo
  echo "=== LOCAL HEALTH ENDPOINT ==="
  node -e '
    const http = require("http");
    const req = http.get(
      "http://127.0.0.1:3000/health",
      { timeout: 4000 },
      res => {
        console.log("HTTP_STATUS=" + res.statusCode);
        res.pipe(process.stdout);
        res.on("end", () => console.log());
      }
    );
    req.on("timeout", () => {
      console.log("HEALTH_TIMEOUT");
      req.destroy();
    });
    req.on("error", e => console.log("HEALTH_ERROR=" + e.message));
  ' 2>&1 || true

  echo
  echo "=== LISTENING SOCKETS ==="
  if command -v ss >/dev/null 2>&1; then
    ss -lnt 2>&1 || true
  elif command -v netstat >/dev/null 2>&1; then
    netstat -lnt 2>&1 || true
  else
    echo "Neither ss nor netstat is installed."
  fi

  echo
  echo "=== END ==="
} > "$OUT" 2>&1

echo "Report created: $OUT"
echo "No project files were modified by the checks."
