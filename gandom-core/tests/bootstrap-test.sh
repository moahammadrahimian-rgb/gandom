#!/data/data/com.termux/files/usr/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

test -f "$ROOT/contracts/GANDUM-MASTER-CONTRACT.json"
test -f "$ROOT/state/BOOTSTRAP.json"
test -d "$ROOT/evidence"
test -d "$ROOT/logs"
test -d "$ROOT/backups"

node -e "
const fs = require('fs');
const p = JSON.parse(
  fs.readFileSync(
    '$ROOT/contracts/GANDUM-MASTER-CONTRACT.json',
    'utf8'
  )
);

if (p.project !== 'GANDUM') process.exit(1);
if (p.project_id !== 'GND-MASTER-0001') process.exit(1);
if (p.mode !== 'REAL_EXECUTION') process.exit(1);
if (!Array.isArray(p.domains) || p.domains.length < 10) process.exit(1);

console.log('MASTER_CONTRACT=VALID');
console.log('DOMAINS=' + p.domains.length);
console.log('MODE=' + p.mode);
"

echo "BOOTSTRAP_TEST=PASS_REAL"
