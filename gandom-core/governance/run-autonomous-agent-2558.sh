#!/data/data/com.termux/files/usr/bin/bash
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REG="$ROOT/gandom-core/governance/GANDOM-AUTONOMOUS-AGENT-REGISTRY-2558.json"
AGENT="$ROOT/GANDOM-AUTONOMOUS-AGENT-2558.js"
cd "$ROOT"
[ -f "$REG" ] || { echo "STOP: LAW_REGISTRY_MISSING"; exit 1; }
[ -f "$AGENT" ] || { echo "STOP: AGENT_MISSING"; exit 1; }
node - "$REG" "$AGENT" <<'NODE'
const fs=require('fs'),path=require('path');
const [rp,ap]=process.argv.slice(2),r=JSON.parse(fs.readFileSync(rp,'utf8'));
if(r.law!==2558) throw new Error('LAW_NUMBER_MISMATCH');
const a=r.agents.find(x=>x && x.id==='GANDOM-AUTONOMOUS-AGENT-2558' && x.enabled===true);
if(!a) throw new Error('AGENT_NOT_ENABLED');
if(path.resolve(a.file)!==path.resolve(ap)) throw new Error('AGENT_PATH_MISMATCH');
console.log('LAW_2558_REGISTRY_VALID=YES');
console.log('AGENT_ENABLED=YES');
NODE
node --check "$AGENT"
exec node "$AGENT"
