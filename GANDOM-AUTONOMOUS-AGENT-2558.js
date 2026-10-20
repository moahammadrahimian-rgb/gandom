'use strict';
/*
 GANDOM AUTONOMOUS EXECUTION AGENT — LAW 2558
 Safety contract:
 - inspect first; do not delete backups or source files
 - do not run package scripts or arbitrary discovered programs
 - syntax-check JavaScript only, with bounded work and timeouts
 - persist resumable state and evidence
 - never claim whole-project PASS_REAL from inventory/syntax checks
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname);
const HOME = path.join(ROOT, '.gandom-agent-2558');
const STATE_FILE = path.join(HOME, 'state.json');
const TASK_FILE = path.join(HOME, 'tasks-17-sections.json');
const EVIDENCE_FILE = path.join(HOME, 'evidence.jsonl');
const REPORT_FILE = path.join(HOME, 'latest-report.json');
const LAW = 2558;
const MAX_FILES = Math.max(100, Math.min(20000, Number(process.env.GANDOM_AGENT_MAX_FILES || 12000)));
const MAX_JS_CHECKS = Math.max(1, Math.min(1000, Number(process.env.GANDOM_AGENT_MAX_JS_CHECKS || 300)));
const TIMEOUT_MS = Math.max(1000, Math.min(15000, Number(process.env.GANDOM_AGENT_TIMEOUT_MS || 5000)));
const IGNORE = new Set([
  '.git', 'node_modules', '.gradle', 'build', '.next', 'dist',
  '.idea', '.vscode', '.expo', '.cache'
]);

const SECTIONS = [
  {id:1, name:'Identity and permissions', goal:'Validate agent identity, root path and allowed operations.'},
  {id:2, name:'Mother Law 2558 gate', goal:'Check law artifacts and never infer project PASS from partial checks.'},
  {id:3, name:'Project discovery', goal:'Inventory bounded project files and hash eligible files.'},
  {id:4, name:'Central planner', goal:'Prioritize blocked prerequisites before dependent tasks.'},
  {id:5, name:'Task management', goal:'Persist section tasks and resume statuses without duplicate tasks.'},
  {id:6, name:'Controlled code execution', goal:'Run bounded syntax checks only; never run arbitrary package scripts.'},
  {id:7, name:'Brain and experience memory', goal:'Persist verified observations and evidence references.'},
  {id:8, name:'Cell-life engine', goal:'Locate cell engine and tests; do not claim live cell health without runtime evidence.'},
  {id:9, name:'Neural engine', goal:'Locate neural modules and tests; inspect wiring before claiming integration.'},
  {id:10, name:'P2P networking', goal:'Locate P2P modules/tests; loopback is not proof of independent nodes.'},
  {id:11, name:'Server and APIs', goal:'Inventory server/API code; do not kill or restart unrelated processes.'},
  {id:12, name:'UI, wallet, market and APK', goal:'Locate UI/build artifacts; never claim install or transaction success from source alone.'},
  {id:13, name:'Math, geometry and physics', goal:'Locate computational modules/tests; require reference tests for correctness.'},
  {id:14, name:'Security', goal:'Avoid secrets in evidence; flag risky patterns for review without executing them.'},
  {id:15, name:'Backup audit and deduplication', goal:'Inventory only; never delete backups or infer duplicates from names alone.'},
  {id:16, name:'Persistence and resume', goal:'Use atomic state writes and resume after interruption.'},
  {id:17, name:'Independent verification', goal:'Report exact verified scope and leave project-wide status unclaimed.'}
];

function now() { return new Date().toISOString(); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function atomicWrite(file, text) {
  const tmp = file + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, text, {mode: 0o600});
  JSON.parse(file.endsWith('.json') ? fs.readFileSync(tmp, 'utf8') : '{}');
  fs.renameSync(tmp, file);
}
function appendEvidence(obj) {
  fs.appendFileSync(EVIDENCE_FILE, JSON.stringify(obj) + '\n', {mode: 0o600});
}
function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function insideRoot(abs) {
  const rel = path.relative(ROOT, abs);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
function inventory() {
  const files = [];
  const stack = [ROOT];
  let truncated = false;
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, {withFileTypes:true}); } catch (_) { continue; }
    for (const ent of entries) {
      if (ent.name === '.gandom-agent-2558') continue;
      const abs = path.join(dir, ent.name);
      if (!insideRoot(abs)) continue;
      if (ent.isDirectory()) {
        if (!IGNORE.has(ent.name)) stack.push(abs);
      } else if (ent.isFile()) {
        files.push(abs);
        if (files.length >= MAX_FILES) { truncated = true; stack.length = 0; break; }
      }
    }
  }
  return {files, truncated};
}
function classify(rel) {
  const s = rel.toLowerCase();
  if (/law|constitution|governance/.test(s)) return 'law_governance';
  if (/neural|neuron|brain/.test(s)) return 'neural';
  if (/cell-life|cell|organ/.test(s)) return 'cell_life';
  if (/p2p|peer|websocket|network/.test(s)) return 'p2p';
  if (/server|api|health/.test(s)) return 'server_api';
  if (/android|apk|capacitor|public|www|index\.html/.test(s)) return 'android_ui';
  if (/math|geometry|physics|derivative/.test(s)) return 'math_physics';
  if (/backup|snapshot|archive|restore/.test(s)) return 'backup';
  if (/test|spec/.test(s)) return 'tests';
  if (/package\.json|gradle|manifest/.test(s)) return 'build_config';
  return 'other';
}
function checkJavaScript(abs) {
  const started = now();
  const result = spawnSync(process.execPath, ['--check', abs], {
    cwd: ROOT, encoding:'utf8', timeout:TIMEOUT_MS, maxBuffer:1024*1024,
    env: {PATH: process.env.PATH || '', HOME: process.env.HOME || '', TMPDIR: process.env.TMPDIR || '/tmp'}
  });
  return {
    file: path.relative(ROOT, abs),
    started_at: started,
    finished_at: now(),
    exit_code: result.status,
    timed_out: !!result.error && result.error.code === 'ETIMEDOUT',
    error_code: result.error ? result.error.code || result.error.message : null,
    stdout: String(result.stdout || '').slice(0,4000),
    stderr: String(result.stderr || '').slice(0,4000),
    status: result.status === 0 ? 'PASS_REAL_SYNTAX_ONLY' : 'FAIL_REAL_SYNTAX'
  };
}
function main() {
  fs.mkdirSync(HOME, {recursive:true});
  const oldState = loadJson(STATE_FILE, {law:LAW, run_count:0, last_run:null, tasks:{}});
  if (oldState.law !== LAW) throw new Error('State law mismatch; refusing to overwrite state');
  const runId = 'RUN-' + Date.now() + '-' + process.pid;
  const start = now();
  const inv = inventory();
  const rows = [];
  let syntaxCount = 0, syntaxPass = 0, syntaxFail = 0;
  const pkgPath = path.join(ROOT, 'package.json');
  let packageStatus = 'NOT_FOUND';
  if (fs.existsSync(pkgPath)) {
    try {
      const p = JSON.parse(fs.readFileSync(pkgPath,'utf8'));
      packageStatus = 'VALID_JSON';
      rows.push({kind:'package', path:'package.json', name:p.name || null, version:p.version || null, main:p.main || null, scripts_listed:Object.keys(p.scripts || {})});
    } catch (e) {
      packageStatus = 'INVALID_JSON';
      rows.push({kind:'package', path:'package.json', error:String(e.message)});
    }
  }

  for (const abs of inv.files) {
    const rel = path.relative(ROOT, abs);
    let stat;
    try { stat = fs.statSync(abs); } catch (_) { continue; }
    let digest = null;
    if (stat.size <= 10*1024*1024) {
      try { digest = sha256(fs.readFileSync(abs)); } catch (_) {}
    }
    rows.push({kind:'file', path:rel, category:classify(rel), size_bytes:stat.size, sha256:digest});
  }

  const jsFiles = inv.files.filter(f => /\.c?js$/i.test(f) && !f.split(path.sep).some(x=>IGNORE.has(x)));
  for (const abs of jsFiles.slice(0, MAX_JS_CHECKS)) {
    const r = checkJavaScript(abs);
    syntaxCount++;
    if (r.exit_code === 0) syntaxPass++; else syntaxFail++;
    appendEvidence({law:LAW, run_id:runId, kind:'syntax_check', ...r});
  }

  let lawArtifacts = [];
  for (const rel of [
    'constitution/GOLDEN-MOTHER-LAW-2558.json',
    'gandom-core/governance/GOLDEN-MOTHER-LAW-2558.json',
    'gandom-core/governance/GOLDEN-MOTHER-LAW-2558.js',
    'gandom-core/governance/bin/law2558.sh'
  ]) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      let h = null;
      try { h = sha256(fs.readFileSync(abs)); } catch (_) {}
      lawArtifacts.push({path:rel, sha256:h});
    }
  }

  const tasks = SECTIONS.map(s => {
    const prior = oldState.tasks && oldState.tasks[String(s.id)];
    return {
      ...s,
      status: prior && prior.status === 'PASS_REAL' ? 'PASS_REAL' : 'DISCOVERED',
      execution_status: 'NOT_EXECUTED_BY_THIS_SAFE_ORCHESTRATOR',
      evidence: prior && Array.isArray(prior.evidence) ? prior.evidence : []
    };
  });
  // Section 3 is only inventory-complete, not overall project completion.
  tasks[2].status = 'PASS_REAL';
  tasks[2].execution_status = 'PASS_REAL_BOUNDED_INVENTORY';
  tasks[2].evidence = [runId];

  const report = {
    schema_version:1, law:LAW, project:'GANDOM',
    agent:'GANDOM-AUTONOMOUS-AGENT-2558',
    run_id:runId, started_at:start, finished_at:now(),
    root:ROOT,
    summary:{
      files_discovered:inv.files.length,
      inventory_truncated:inv.truncated,
      javascript_files_found:jsFiles.length,
      javascript_checks_run:syntaxCount,
      javascript_syntax_pass:syntaxPass,
      javascript_syntax_fail:syntaxFail,
      javascript_checks_limit:MAX_JS_CHECKS,
      package_json:packageStatus,
      law_artifacts_found:lawArtifacts.length,
      sections:17,
      sections_fully_implemented_and_verified:0,
      project_pass_real:false,
      project_status:'NOT_YET_VERIFIED'
    },
    law_artifacts:lawArtifacts,
    package_summary:rows.find(r=>r.kind==='package') || null,
    file_inventory:rows.filter(r=>r.kind==='file'),
    section_tasks:tasks,
    safety:{
      source_files_modified_by_agent:false,
      backups_deleted:false,
      package_scripts_executed:false,
      project_services_stopped:false,
      network_connections_created:false,
      wallet_transactions_created:false
    },
    limitations:[
      'This run performs bounded inventory and JavaScript syntax checks only.',
      'It does not implement or verify all 17 subsystems.',
      'A syntax PASS is not runtime, integration, security, P2P, APK-install, or project-wide PASS.',
      'The agent does not delete backups or rewrite project source automatically.'
    ]
  };

  atomicWrite(REPORT_FILE, JSON.stringify(report,null,2)+'\n');
  atomicWrite(TASK_FILE, JSON.stringify({law:LAW, updated_at:now(), tasks},null,2)+'\n');
  const newState = {
    law:LAW, run_count:(oldState.run_count||0)+1, last_run:runId,
    last_run_at:now(), last_report:path.relative(ROOT, REPORT_FILE),
    tasks:Object.fromEntries(tasks.map(t=>[String(t.id),{status:t.status,evidence:t.evidence}])),
    project_status:'NOT_YET_VERIFIED'
  };
  atomicWrite(STATE_FILE, JSON.stringify(newState,null,2)+'\n');
  appendEvidence({
    law:LAW, run_id:runId, kind:'agent_run_summary', started_at:start, finished_at:now(),
    files_discovered:inv.files.length, inventory_truncated:inv.truncated,
    javascript_checks_run:syntaxCount, javascript_syntax_pass:syntaxPass,
    javascript_syntax_fail:syntaxFail, project_status:'NOT_YET_VERIFIED',
    report:path.relative(ROOT,REPORT_FILE)
  });
  console.log('LAW=2558');
  console.log('AGENT_RUN_ID='+runId);
  console.log('FILES_DISCOVERED='+inv.files.length);
  console.log('INVENTORY_TRUNCATED='+inv.truncated);
  console.log('JS_SYNTAX_CHECKS='+syntaxCount);
  console.log('JS_SYNTAX_PASS='+syntaxPass);
  console.log('JS_SYNTAX_FAIL='+syntaxFail);
  console.log('PACKAGE_JSON='+packageStatus);
  console.log('LAW_ARTIFACTS_FOUND='+lawArtifacts.length);
  console.log('REPORT='+path.relative(ROOT,REPORT_FILE));
  console.log('TASKS='+path.relative(ROOT,TASK_FILE));
  console.log('STATE='+path.relative(ROOT,STATE_FILE));
  console.log('PROJECT_PASS_REAL=NOT_CLAIMED');
  console.log('PROJECT_STATUS=NOT_YET_VERIFIED');
}
main();
