#!/usr/bin/env node
'use strict';

/*
 * GANDOM Engineering Agent — Law 2558
 * Read-only observability / evidence service.
 * No shell execution, no arbitrary file writes inside the project,
 * no process termination, no restart, no package installation.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const ROOT = path.resolve(arg('--root', process.env.GANDOM_ROOT || path.join(process.env.HOME || '.', 'gandom')));
const PORT = Number(arg('--port', process.env.GANDOM_AGENT_PORT || '8895'));
const LISTEN = arg('--listen', '127.0.0.1');
const ONCE = args.includes('--once');
const EVIDENCE_DIR = path.join(ROOT, 'runtime-logs', 'ops-2558');
const timeoutMs = 3500;

const endpoints = [
  ['UI_ROOT', process.env.GANDOM_UI_URL || 'http://127.0.0.1:8080/'],
  ['API_HEALTH', process.env.GANDOM_API_HEALTH_URL || 'http://127.0.0.1:8787/health'],
  ['AUDIT_HEALTH', process.env.GANDOM_AUDIT_HEALTH_URL || 'http://127.0.0.1:8888/health'],
  ['PEERS_API', process.env.GANDOM_PEERS_URL || 'http://127.0.0.1:8787/api/peers'],
  ['CELLS_API', process.env.GANDOM_CELLS_URL || 'http://127.0.0.1:8787/api/cells'],
  ['WORKERS_API', process.env.GANDOM_WORKERS_URL || 'http://127.0.0.1:8787/api/workers'],
];

function now() { return new Date().toISOString(); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function add(checks, id, status, detail, extra = {}) {
  checks.push({ id, status, detail: String(detail || ''), ...extra });
}
function safeRead(p, maxBytes = 8 * 1024 * 1024) {
  try {
    const st = fs.statSync(p);
    if (!st.isFile()) return { ok: false, error: 'NOT_A_FILE' };
    if (st.size > maxBytes) return { ok: false, error: 'SIZE_LIMIT', size: st.size };
    const data = fs.readFileSync(p);
    return { ok: true, data, size: st.size, sha256: sha256(data) };
  } catch (e) { return { ok: false, error: e.code || e.message }; }
}
function runGit(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 2500, stdio: ['ignore','pipe','pipe'] }).trim();
  } catch (e) {
    return `GIT_UNAVAILABLE: ${(e.stderr || e.message || '').toString().trim().slice(0, 300)}`;
  }
}
function httpProbe(url) {
  return new Promise(resolve => {
    let u;
    try { u = new URL(url); } catch { return resolve({ status: 'UNKNOWN', detail: 'INVALID_URL' }); }
    if (!['http:', 'https:'].includes(u.protocol)) return resolve({ status: 'UNKNOWN', detail: 'UNSUPPORTED_PROTOCOL' });
    const lib = u.protocol === 'https:' ? require('node:https') : http;
    const req = lib.request(u, { method: 'GET', timeout: timeoutMs, headers: { 'cache-control': 'no-cache' } }, res => {
      let bytes = 0, chunks = [];
      res.on('data', d => { bytes += d.length; if (bytes <= 4096) chunks.push(d); });
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        resolve({
          status: ok ? 'PASS' : (res.statusCode === 404 ? 'UNKNOWN' : 'FAIL'),
          http_status: res.statusCode,
          bytes_seen: bytes,
          content_type: res.headers['content-type'] || '',
          detail: res.statusCode === 404 ? 'ROUTE_NOT_FOUND_NOT_EQUIVALENT_TO_SERVICE_FAILURE' : `HTTP_${res.statusCode}`,
          body_excerpt: body.slice(0, 350)
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error('TIMEOUT')));
    req.on('error', e => resolve({ status: 'UNKNOWN', detail: e.code || e.message }));
    req.end();
  });
}
function fileChecks(checks) {
  const required = [
    'package.json', 'server.js', 'public/index.html',
    'audit-service/server.js', 'gandom-core/index.js'
  ];
  for (const rel of required) {
    const p = path.join(ROOT, rel);
    const r = safeRead(p);
    add(checks, `FILE:${rel}`, r.ok ? 'PASS' : (r.error === 'ENOENT' ? 'MISSING' : 'UNKNOWN'),
      r.ok ? `bytes=${r.size};sha256=${r.sha256}` : r.error);
  }
  const pkg = safeRead(path.join(ROOT, 'package.json'));
  if (pkg.ok) {
    try {
      const p = JSON.parse(pkg.data.toString('utf8'));
      add(checks, 'PACKAGE_JSON_PARSE', 'PASS', `name=${p.name || 'unset'}; scripts=${Object.keys(p.scripts || {}).join(',')}`);
      for (const dep of ['ws', '@capacitor/core', '@capacitor/cli', '@capacitor/android']) {
        const r = safeRead(path.join(ROOT, 'node_modules', dep, 'package.json'), 1024 * 1024);
        add(checks, `DEPENDENCY:${dep}`, r.ok ? 'PASS' : 'MISSING', r.ok ? 'package metadata exists' : r.error);
      }
    } catch (e) { add(checks, 'PACKAGE_JSON_PARSE', 'FAIL', e.message); }
  }
  for (const rel of ['server.js', 'client.js', 'audit-service/server.js']) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    try {
      execFileSync(process.execPath, ['--check', p], { cwd: ROOT, timeout: 3000, stdio: 'pipe' });
      add(checks, `JS_SYNTAX:${rel}`, 'PASS', 'node --check exit 0');
    } catch (e) {
      add(checks, `JS_SYNTAX:${rel}`, 'FAIL', (e.stderr || e.message || '').toString().slice(0, 350));
    }
  }
}
function chainCheck(checks) {
  const candidates = [
    process.env.GANDOM_CHAIN_FILE,
    path.join(ROOT, 'blockchain-data', 'chain.json'),
    path.join(ROOT, 'blockchain-data-b', 'chain.json')
  ].filter(Boolean);
  for (const p of [...new Set(candidates)]) {
    const r = safeRead(p, 32 * 1024 * 1024);
    if (!r.ok) { add(checks, `CHAIN:${path.relative(ROOT,p)}`, r.error === 'ENOENT' ? 'MISSING' : 'UNKNOWN', r.error); continue; }
    try {
      const value = JSON.parse(r.data.toString('utf8'));
      const len = Array.isArray(value) ? value.length :
        Array.isArray(value.chain) ? value.chain.length :
        Array.isArray(value.blocks) ? value.blocks.length : null;
      add(checks, `CHAIN:${path.relative(ROOT,p)}`, 'PASS',
        `valid JSON; structure_length=${len === null ? 'unknown' : len}; sha256=${r.sha256}`,
        { chain_length: len });
    } catch (e) {
      add(checks, `CHAIN:${path.relative(ROOT,p)}`, 'FAIL', `invalid JSON: ${e.message}`);
    }
  }
}
async function buildReport() {
  const checks = [];
  add(checks, 'LAW', 'PASS', '2558; read-only; no fake pass');
  add(checks, 'PROJECT_ROOT', fs.existsSync(ROOT) ? 'PASS' : 'MISSING', ROOT);
  if (!fs.existsSync(ROOT)) {
    return { schema: 'GANDOM-OPS-2558/v1', generated_at: now(), root: ROOT, checks, summary: summarize(checks) };
  }

  fileChecks(checks);
  chainCheck(checks);

  const isGit = fs.existsSync(path.join(ROOT, '.git'));
  add(checks, 'GIT_WORKTREE', isGit ? 'PASS' : 'UNKNOWN', isGit ? runGit(['rev-parse','--show-toplevel']) : 'No .git directory');
  if (isGit) {
    add(checks, 'GIT_BRANCH', 'PASS', runGit(['branch','--show-current']) || 'detached/empty');
    add(checks, 'GIT_HEAD', 'PASS', runGit(['log','-1','--format=%H %cI %s']));
    add(checks, 'GIT_STATUS', 'PASS', runGit(['status','--short']).slice(0, 3000) || 'clean');
    add(checks, 'GIT_UNTRACKED_COUNT', 'PASS', runGit(['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean).length);
  } else {
    add(checks, 'GIT_STATUS', 'UNKNOWN', 'not a Git worktree');
  }

  const probes = await Promise.all(endpoints.map(async ([id, url]) => {
    const r = await httpProbe(url);
    add(checks, `HTTP:${id}`, r.status, `${url}; ${r.detail}`, {
      http_status: r.http_status ?? null,
      content_type: r.content_type || '',
      body_excerpt: r.body_excerpt || ''
    });
  }));
  return {
    schema: 'GANDOM-OPS-2558/v1',
    generated_at: now(),
    law: { id: 2558, no_fake_pass: true, project_mutations: false, process_control: false },
    root: ROOT,
    checks,
    summary: summarize(checks)
  };
}
function summarize(checks) {
  const count = {};
  for (const c of checks) count[c.status] = (count[c.status] || 0) + 1;
  return {
    checks: checks.length,
    pass: count.PASS || 0,
    fail: count.FAIL || 0,
    missing: count.MISSING || 0,
    unknown: count.UNKNOWN || 0,
    pass_real: false,
    interpretation: 'Operational observations only; no end-to-end release approval.'
  };
}
let latest = null;
async function refresh() {
  latest = await buildReport();
  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true, mode: 0o700 });
    const stamp = latest.generated_at.replace(/[:.]/g, '-');
    const output = path.join(EVIDENCE_DIR, `evidence-${stamp}.json`);
    const tmp = output + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(latest, null, 2), { mode: 0o600, flag: 'wx' });
    fs.renameSync(tmp, output);
    latest.evidence_file = output;
  } catch (e) {
    latest.evidence_write_error = e.code || e.message;
  }
  return latest;
}
if (ONCE) {
  refresh().then(r => {
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
    process.exitCode = (r.summary.fail || r.summary.missing) ? 1 : 0;
  }).catch(e => { console.error(e.stack || e); process.exitCode = 2; });
} else {
  const server = http.createServer(async (req, res) => {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    if (req.method !== 'GET') { res.writeHead(405); return res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' })); }
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    if (url.pathname === '/health') {
      res.writeHead(200); return res.end(JSON.stringify({ ok: true, service: 'GANDOM-OPS-2558', generated_at: latest?.generated_at || null }));
    }
    if (url.pathname === '/report' || url.pathname === '/evidence') {
      if (!latest || url.searchParams.get('refresh') === '1') await refresh();
      res.writeHead(200); return res.end(JSON.stringify(latest));
    }
    res.writeHead(404); return res.end(JSON.stringify({ error: 'NOT_FOUND' }));
  });
  refresh().finally(() => {
    server.listen(PORT, LISTEN, () => {
      console.log(`GANDOM_OPS_2558_LISTEN=${LISTEN}:${PORT}`);
      console.log(`PROJECT_ROOT=${ROOT}`);
      console.log('READ_ONLY=1; NO_RESTART=1; NO_DELETE=1; PASS_REAL=NOT_ESTABLISHED');
    });
  });
  const timer = setInterval(() => refresh().catch(e => console.error(e.message)), 60000);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => {
    clearInterval(timer);
    server.close(() => process.exit(0));
  });
}
