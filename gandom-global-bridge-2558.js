'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPORT = path.join(__dirname, 'GANDOM_GLOBAL_BRIDGE_2558.json');
const TIMEOUT_MS = 8000;

const targets = [
  {
    name: 'GITHUB_REPOSITORY',
    url: 'https://github.com/moahammadrahimian-rgb/gandom',
    kind: 'https'
  },
  {
    name: 'ETHEREUM_CONSENSUS_REFERENCE',
    url: 'https://ethereum.org/developers/docs/consensus-mechanisms/',
    kind: 'https'
  },
  {
    name: 'NODEJS_REFERENCE',
    url: 'https://nodejs.org/api/',
    kind: 'https'
  },
  {
    name: 'LOCAL_GANDOM_HEALTH',
    url: 'http://127.0.0.1:8787/health',
    kind: 'http'
  }
];

function probe(target) {
  return new Promise(resolve => {
    const started = Date.now();
    let settled = false;

    function finish(result) {
      if (settled) return;
      settled = true;
      resolve({
        name: target.name,
        url: target.url,
        ...result,
        latency_ms: Date.now() - started,
        checked_at: new Date().toISOString()
      });
    }

    let parsed;
    try {
      parsed = new URL(target.url);
    } catch {
      finish({ status: 'INVALID_URL' });
      return;
    }

    const transport = target.kind === 'http' ? http : https;

    const req = transport.request(parsed, {
      method: 'GET',
      headers: {
        'User-Agent': 'GANDOM-Global-Bridge/2558',
        'Accept': 'application/json,text/html,*/*'
      }
    }, res => {
      res.resume();
      finish({
        status: res.statusCode >= 200 && res.statusCode < 400
          ? 'REACHABLE'
          : 'HTTP_ERROR',
        http_status: res.statusCode
      });
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error('TIMEOUT'));
    });

    req.on('error', err => {
      finish({
        status: err.message === 'TIMEOUT' ? 'TIMEOUT' : 'UNREACHABLE',
        error: err.message
      });
    });

    req.end();
  });
}

async function main() {
  console.log('\n=== GANDOM GLOBAL BRIDGE | LAW 2558 ===');
  console.log('MODE=CONNECTIVITY_CHECK');
  console.log('CHAIN_MUTATION=DISABLED\n');

  const results = await Promise.all(targets.map(probe));

  for (const r of results) {
    console.log(
      `${r.name}=${r.status}` +
      ` | HTTP=${r.http_status ?? 'N/A'}` +
      ` | LATENCY_MS=${r.latency_ms}`
    );
  }

  const report = {
    system: 'GANDOM',
    law: 2558,
    mode: 'CONNECTIVITY_CHECK_ONLY',
    generated_at: new Date().toISOString(),
    summary: {
      total: results.length,
      reachable: results.filter(r => r.status === 'REACHABLE').length,
      failed: results.filter(r => r.status !== 'REACHABLE').length
    },
    results,
    safety: {
      chain_data_modified: false,
      source_files_modified_by_probe: false,
      service_restarted: false,
      consensus_verified: false,
      pass_real_full_system: false
    }
  };

  const temp = REPORT + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(report, null, 2) + '\n', {
    mode: 0o600
  });
  fs.renameSync(temp, REPORT);

  console.log('\nREPORT=' + REPORT);
  console.log('REACHABLE=' + report.summary.reachable + '/' + report.summary.total);
  console.log('CHAIN_DATA_MODIFIED=NO');
  console.log('SERVICE_RESTARTED=NO');
  console.log('PASS_REAL_FULL_SYSTEM=NOT_CLAIMED');
}

main().catch(err => {
  console.error('BRIDGE_FATAL=' + err.message);
  process.exitCode = 1;
});
