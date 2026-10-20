'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = process.cwd();
const BACKUPS = path.join(ROOT, 'backups');
const LOGDIR = path.join(ROOT, 'runtime-logs');
const stamp = process.env.STAMP || new Date().toISOString()
  .replace(/[-:]/g,'').replace(/\..+/,'');

const REPORT = path.join(LOGDIR, `TREASURE-STREAM-2558-${stamp}.jsonl`);

fs.mkdirSync(LOGDIR, {recursive:true});

const KEEP = new Set([
  'constitution',
  'gandom-core',
  'package.json',
  'server.js',
  'public',
  'www',
  'start-gandom.sh',
  'android'
]);

const SAFE_GENERATED = [
  /(^|\/)node_modules\//,
  /(^|\/)\.git\//,
  /(^|\/)cache\//i,
  /(^|\/)tmp\//i,
  /(^|\/)temp\//i
];

function write(obj) {
  fs.appendFileSync(REPORT, JSON.stringify(obj) + '\n');
}

function classifyMember(name) {
  name = name.replace(/^\.?\//,'').replace(/\/$/,'');
  const top = name.split('/')[0];

  if (KEEP.has(top)) return 'KEEP_CORE';
  if (/^gandom-core\/evidence\//.test(name)) return 'KEEP_EVIDENCE_REVIEW';
  if (/^gandom-core\/governance\//.test(name)) return 'KEEP_GOVERNANCE';
  if (/^gandom-core\/tests?\//.test(name)) return 'KEEP_TEST';
  if (/^gandom-core\/.*\.(js|json|sh|md)$/.test(name))
    return 'KEEP_SOURCE_REVIEW';

  for (const r of SAFE_GENERATED) {
    if (r.test(name)) return 'GENERATED_REVIEW';
  }

  if (/backup|snapshot|restore/i.test(name))
    return 'BACKUP_REVIEW';

  if (/\.log$|\.txt$|\.jsonl$/.test(name))
    return 'EVIDENCE_OR_REPORT_REVIEW';

  return 'REVIEW';
}

function listArchives() {
  return fs.readdirSync(BACKUPS)
    .filter(x => x.endsWith('.tar.gz'))
    .map(x => path.join(BACKUPS,x))
    .sort();
}

async function scanArchive(file) {
  return new Promise((resolve) => {
    let entries = 0;
    let bytes = 0;
    const classes = Object.create(null);
    let stderr = '';

    const p = spawn('tar', ['-tzf', file], {
      cwd: ROOT,
      stdio: ['ignore','pipe','pipe']
    });

    let carry = '';

    p.stdout.on('data', chunk => {
      carry += chunk.toString('utf8');
      const lines = carry.split('\n');
      carry = lines.pop();

      for (const raw of lines) {
        const name = raw.trim();
        if (!name) continue;
        entries++;
        const c = classifyMember(name);
        classes[c] = (classes[c] || 0) + 1;
      }
    });

    p.stderr.on('data', d => {
      stderr += d.toString();
      if (stderr.length > 2000) stderr = stderr.slice(-2000);
    });

    p.on('close', code => {
      write({
        type:'ARCHIVE',
        archive:path.relative(ROOT,file),
        size:fs.statSync(file).size,
        entries,
        classes,
        tar_exit:code,
        stderr:stderr || null
      });
      resolve();
    });
  });
}

(async()=>{
  write({
    type:'START',
    law:2558,
    no_fake_pass:1,
    mode:'STREAMING_ARCHIVE_CONTENT_TRIAGE',
    deletion:false,
    code_changed:false,
    money_moved:false
  });

  const archives = listArchives();

  write({
    type:'ARCHIVE_SET',
    count:archives.length
  });

  for (const file of archives) {
    process.stdout.write(
      `SCAN ${path.basename(file)}\n`
    );
    await scanArchive(file);
  }

  write({
    type:'FINAL',
    files_deleted:0,
    law_deleted:false,
    core_code_deleted:false,
    canonical_evidence_deleted:false,
    money_moved:false,
    final_project_pass:'NOT_CLAIMED',
    next:'SELECT_ONLY_SAFE_GENERATED_CANDIDATES'
  });

  console.log('');
  console.log('===== TREASURE STREAM SCAN COMPLETE =====');
  console.log('REPORT=' + path.relative(ROOT,REPORT));
  console.log('FILES_DELETED=0');
  console.log('LAW_DELETED=FALSE');
  console.log('CORE_CODE_DELETED=FALSE');
  console.log('CANONICAL_EVIDENCE_DELETED=FALSE');
  console.log('MONEY_MOVED=FALSE');
  console.log('FINAL_PROJECT_PASS=NOT_CLAIMED');
  console.log('NEXT=SELECT_ONLY_SAFE_GENERATED_CANDIDATES');
})().catch(e=>{
  console.error('SCAN_ERROR=' + e.message);
  process.exitCode=1;
});
