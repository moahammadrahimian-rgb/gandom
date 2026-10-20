#!/usr/bin/env node
'use strict';
// GANDOM P2P + LEDGER VALIDATOR — LAW 2558
// فارسی: وضعیت peer و ارتفاع زنجیره را از APIهای واقعی می‌خواند؛ داده زنجیره را دست‌کاری نمی‌کند.
// English: reads live peer/height APIs; never overwrites ledger files.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ROOT = (() => { const i = process.argv.indexOf('--root'); return path.resolve(i >= 0 ? process.argv[i + 1] : process.cwd()); })();

function get(port, route) {
  return new Promise(resolve => {
    const req = http.get({ hostname: '127.0.0.1', port, path: route, timeout: 2500 }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', x => { if (body.length < 2_000_000) body += x; });
      res.on('end', () => {
        let json = null; try { json = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, json, body: body.slice(0, 1000) });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', e => resolve({ status: 0, error: e.message }));
  });
}
function heightOf(x) {
  if (!x || !x.json) return null;
  const j = x.json;
  for (const v of [j.height, j.chain_height, j.chainHeight, j.block_height, j.blockHeight, j.length]) {
    if (Number.isInteger(v) && v >= 0) return v;
  }
  if (Array.isArray(j.chain)) return j.chain.length ? (Number(j.chain[j.chain.length - 1].height ?? j.chain.length - 1)) : 0;
  if (Array.isArray(j.blocks)) return j.blocks.length ? (Number(j.blocks[j.blocks.length - 1].height ?? j.blocks.length - 1)) : 0;
  return null;
}
function peersOf(x) {
  if (!x || !x.json) return null;
  const j = x.json;
  if (Number.isInteger(j.peers_count)) return j.peers_count;
  if (Number.isInteger(j.peersCount)) return j.peersCount;
  if (Array.isArray(j.peers)) return j.peers.length;
  return null;
}
async function main() {
  const [healthA, healthB, peersA, peersB] = await Promise.all([
    get(8787, '/health'), get(8788, '/health'),
    get(8787, '/api/peers'), get(8788, '/api/peers')
  ]);
  const aHeight = heightOf(await get(8787, '/api/chain'));
  const bHeight = heightOf(await get(8788, '/api/chain'));
  const aPeers = peersOf(peersA), bPeers = peersOf(peersB);
  const report = {
    law: 2558, checkedAt: new Date().toISOString(),
    health: { A: healthA.status, B: healthB.status },
    peers: { A: aPeers, B: bPeers },
    height: { A: aHeight, B: bHeight },
    state: 'BLOCKED',
    notes: []
  };
  if (healthA.status !== 200 || healthB.status !== 200) {
    report.notes.push('Both /health endpoints must return HTTP 200.');
  } else if (aPeers === null || bPeers === null) {
    report.notes.push('Could not parse peer count from /api/peers.');
  } else if (aHeight === null || bHeight === null) {
    report.notes.push('No recognized live chain-height API was found at /api/chain. No file-based height is treated as live node proof.');
  } else if (aPeers > 0 && bPeers > 0 && aHeight === bHeight) {
    report.state = 'PASS_REAL';
    report.notes.push('Both nodes report peers > 0 and equal live chain heights.');
  } else {
    report.notes.push('Peer count or chain height mismatch detected.');
    // Ask the existing API to sync only if an explicitly recognized endpoint is available.
    // We do not invent a sync route and do not copy chain.json between nodes.
    const routes = ['/api/chain/sync', '/api/sync/chain'];
    for (const port of [8787, 8788]) {
      for (const route of routes) {
        const probe = await new Promise(resolve => {
          const req = http.request({ hostname: '127.0.0.1', port, path: route, method: 'OPTIONS', timeout: 1200 }, res => {
            res.resume(); resolve(res.statusCode || 0);
          });
          req.on('error', () => resolve(0)); req.on('timeout', () => req.destroy());
          req.end();
        });
        if (probe >= 200 && probe < 500) {
          report.notes.push(`Sync route candidate detected by OPTIONS: port ${port} ${route}; not invoked automatically because its write semantics are unknown.`);
        }
      }
    }
  }
  const file = path.join(ROOT, 'p2p-sync-evidence.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
  if (report.state !== 'PASS_REAL') process.exitCode = 2;
}
main().catch(e => { console.log(JSON.stringify({ state: 'FAIL', error: e.message })); process.exitCode = 1; });
