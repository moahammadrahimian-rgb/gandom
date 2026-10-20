#!/usr/bin/env node
'use strict';
// GANDOM CORE MASTER — bounded process manager, LAW 2558
// فارسی: فقط فایل‌های سرویسِ کشف‌شده را اجرا می‌کند؛ سرویس فرضی جعل نمی‌کند.
// English: launches only discovered service entry points; it does not fake missing services.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const ROOT = path.resolve(arg('--root', process.cwd()));
const BACKUP = arg('--backup', '');
const EVIDENCE = path.join(ROOT, 'execution_evidence.json');
const LOGDIR = path.join(ROOT, 'logs');
fs.mkdirSync(LOGDIR, { recursive: true });

const services = [
  { name: 'Node A', port: 8787, candidates: ['server.js'], required: true },
  { name: 'Node B', port: 8788, candidates: ['node-b/server.js', 'server-b.js', 'node-b.js'], required: true },
  { name: 'Web UI', port: 8080, candidates: ['web/server.js', 'frontend/server.js', 'ui/server.js'], required: true },
  { name: 'Audit', port: 8888, candidates: ['audit-service/server.js'], required: true },
  { name: 'Wallet', port: 9000, candidates: ['wallet-service/server.js', 'wallet/server.js'], required: true }
];

function writeEvidence(report) {
  const tmp = `${EVIDENCE}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, EVIDENCE);
}
function requestHealth(port, timeoutMs = 1800) {
  return new Promise(resolve => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/health', timeout: timeoutMs }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (body.length < 8192) body += chunk; });
      res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body: body.slice(0, 8192) }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', e => resolve({ ok: false, status: 0, error: e.message }));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function discover(candidates) {
  for (const rel of candidates) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}
async function startOne(s) {
  const entry = discover(s.candidates);
  s.entry = entry ? path.relative(ROOT, entry) : null;
  s.attempts = 0;
  s.state = 'BLOCKED';
  s.detail = entry ? '' : 'No configured entry point found; no substitute service was invented.';
  s.httpStatus = 0;
  if (!entry) return s;

  // If a service already answers health, reuse it instead of starting a duplicate.
  let probe = await requestHealth(s.port);
  if (probe.ok) {
    s.state = 'HEALTHY_EXISTING'; s.httpStatus = probe.status; s.detail = 'Existing service answered /health.';
    return s;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    s.attempts = attempt;
    const log = fs.createWriteStream(path.join(LOGDIR, `${s.port}.service.log`), { flags: 'a', mode: 0o600 });
    const child = spawn(process.execPath, [entry], {
      cwd: ROOT, env: { ...process.env, PORT: String(s.port), GANDOM_PORT: String(s.port) },
      stdio: ['ignore', 'pipe', 'pipe'], detached: true
    });
    s.pid = child.pid;
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.on('error', e => { s.detail = `spawn error: ${e.message}`; });
    child.unref();
    // Bounded health wait; don't block other services from launching.
    for (let n = 0; n < 12; n++) {
      await sleep(1000);
      probe = await requestHealth(s.port);
      if (probe.ok) {
        s.state = 'HEALTHY'; s.httpStatus = probe.status; s.detail = `HTTP 200 /health; attempt ${attempt}.`;
        return s;
      }
      // If another process owns the port but is not healthy, avoid endless retries.
      if (probe.error && /ECONNREFUSED/.test(probe.error) === false && /timeout/.test(probe.error) === false) {
        s.detail = probe.error;
      }
    }
    s.detail = `No HTTP 200 on /health after attempt ${attempt}; last=${probe.error || probe.status || 'unknown'}`;
  }
  s.state = 'FAIL';
  return s;
}

async function main() {
  const report = {
    law: 2558, noFakePass: true, startedAt: new Date().toISOString(),
    root: ROOT, backup: BACKUP || null,
    policy: 'Existing data is not overwritten; absent services are BLOCKED, not fabricated.',
    services: [], p2p: { state: 'NOT_TESTED', detail: 'Validator is run separately after startup.' }
  };
  // Start attempts concurrently, avoiding serial startup delays.
  report.services = await Promise.all(services.map(startOne));
  const a = report.services.find(x => x.port === 8787);
  const b = report.services.find(x => x.port === 8788);
  if (a && b && ['HEALTHY', 'HEALTHY_EXISTING'].includes(a.state) &&
      ['HEALTHY', 'HEALTHY_EXISTING'].includes(b.state)) {
    const validator = path.join(ROOT, 'p2p-sync-validator.js');
    if (fs.existsSync(validator)) {
      const result = await new Promise(resolve => {
        const c = spawn(process.execPath, [validator, '--root', ROOT], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '';
        c.stdout.on('data', x => out += x); c.stderr.on('data', x => err += x);
        c.on('close', code => resolve({ code, stdout: out, stderr: err }));
      });
      try { report.p2p = JSON.parse(result.stdout.trim().split('\n').filter(Boolean).slice(-1)[0]); }
      catch { report.p2p = { state: result.code === 0 ? 'UNPARSEABLE' : 'FAIL', detail: (result.stderr || result.stdout).slice(-3000) }; }
    }
  } else {
    report.p2p = { state: 'BLOCKED', detail: 'Both nodes must have healthy /health endpoints before P2P validation.' };
  }
  report.finishedAt = new Date().toISOString();
  const servicePass = report.services.every(s => ['HEALTHY', 'HEALTHY_EXISTING'].includes(s.state));
  const p2pPass = report.p2p.state === 'PASS_REAL';
  report.overall = servicePass && p2pPass ? 'PASS_REAL' :
    report.services.some(s => s.state === 'FAIL') ? 'FAIL' : 'BLOCKED';
  writeEvidence(report);
  console.log(JSON.stringify({ overall: report.overall, evidence: EVIDENCE, services: report.services.map(s => ({
    name: s.name, port: s.port, state: s.state, attempts: s.attempts, httpStatus: s.httpStatus, detail: s.detail
  })), p2p: report.p2p }, null, 2));
  // Keep manager's process exit status honest; detached services continue independently.
  if (report.overall !== 'PASS_REAL') process.exitCode = 2;
}
main().catch(err => {
  const report = { law: 2558, overall: 'FAIL', error: err.stack || String(err), finishedAt: new Date().toISOString() };
  try { writeEvidence(report); } catch {}
  console.error(err);
  process.exitCode = 1;
});
