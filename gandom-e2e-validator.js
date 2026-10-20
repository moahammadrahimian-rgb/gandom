'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const ROOT = __dirname;
const WS = require('ws');

const NODE_A_WS = 'ws://127.0.0.1:8787';
const NODE_B_WS = 'ws://127.0.0.1:8788';
const WALLET_URL = 'http://127.0.0.1:9000';
const WALLET_SOURCE = path.join(ROOT, 'wallet-server-wrapper.js');
const WALLET_STATE = path.join(ROOT, 'wallet', 'wallet-state.json');
const CHAIN_FILE = path.join(ROOT, 'blockchain-data', 'chain.json');
const VICTORY_FILE = path.join(ROOT, 'GANDOM-VICTORY.json');

const TEST_ID = `GANDOM-E2E-2558-${Date.now()}`;
const TIMEOUT_MS = 8000;

function log(message) {
  console.log(`[E2E] ${message}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function httpRequest(urlString, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const data = body === null ? null : JSON.stringify(body);

    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: data === null ? {} : {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: TIMEOUT_MS
    }, (res) => {
      let text = '';

      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => {
        let json = null;

        try {
          json = JSON.parse(text);
        } catch (_) {}

        resolve({
          status: res.statusCode,
          headers: res.headers,
          text,
          json
        });
      });
    });

    req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
    req.on('error', reject);

    if (data !== null) req.write(data);
    req.end();
  });
}

function p2pPing(url) {
  return new Promise((resolve) => {
    let socket;
    let finished = false;
    let pingSentAt = 0;

    const timer = setTimeout(() => {
      finish({
        pass: false,
        reason: 'TIMEOUT_WAITING_FOR_PONG'
      });
    }, TIMEOUT_MS);

    function finish(result) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);

      try {
        if (socket && socket.readyState !== WS.CLOSED) socket.close();
      } catch (_) {}

      resolve(result);
    }

    try {
      socket = new WS(url);
    } catch (err) {
      finish({ pass: false, reason: err.message });
      return;
    }

    socket.on('open', () => {
      pingSentAt = Date.now();

      socket.send(JSON.stringify({
        type: 'PING',
        data: 'TEST_2558',
        test_id: TEST_ID
      }), (err) => {
        if (err) finish({ pass: false, reason: err.message });
      });
    });

    socket.on('message', (raw) => {
      const receivedAt = Date.now();
      const text = raw.toString();

      let message;
      try {
        message = JSON.parse(text);
      } catch (_) {
        return;
      }

      const type = String(message.type || message.event || '').toUpperCase();
      const payload = JSON.stringify(message);

      // قبول فقط پاسخ صریح PONG که با آزمون مرتبط باشد.
      const isPong = type === 'PONG' || type === 'PING_ACK';
      const echoesTest =
        payload.includes(TEST_ID) ||
        payload.includes('TEST_2558');

      if (isPong && echoesTest) {
        finish({
          pass: true,
          endpoint: url,
          latency_ms: receivedAt - pingSentAt,
          response: message
        });
      }
    });

    socket.on('error', (err) => {
      finish({ pass: false, reason: err.message });
    });

    socket.on('close', () => {
      if (!finished) {
        finish({ pass: false, reason: 'SOCKET_CLOSED_BEFORE_PONG' });
      }
    });
  });
}

function inspectWalletSource() {
  if (!fs.existsSync(WALLET_SOURCE)) {
    return {
      found: false,
      reason: 'wallet-server-wrapper.js not found'
    };
  }

  const source = fs.readFileSync(WALLET_SOURCE, 'utf8');

  // صرفاً کشف مسیرهای قابل مشاهده در کد؛ این کار قرارداد API را
  // اثبات نمی‌کند و هیچ تراکنشی ارسال نمی‌کند.
  const candidates = [];
  const patterns = [
    /(?:req\.method\s*===?\s*['"]POST['"])[\s\S]{0,250}?req\.url[\s\S]{0,100}/g,
    /(?:app|server)\.(?:post)\s*\(\s*['"][^'"]+['"]/g,
    /(?:pathname|req\.url)[\s\S]{0,160}['"]\/(?:transfer|send|transactions?)[^'"]*['"]/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      candidates.push(match[0].slice(0, 220));
    }
  }

  return {
    found: true,
    sha256: sha256(source),
    candidates: [...new Set(candidates)]
  };
}

async function main() {
  console.log('==============================================');
  console.log(' GANDOM E2E VALIDATOR — LAW 2558');
  console.log('==============================================');

  // 1. Verify that Node A and Node B expose HTTP health.
  let healthA = false;
  let healthB = false;

  try {
    const response = await httpRequest('http://127.0.0.1:8787/health');
    healthA = response.status === 200;
    log(`NODE_A_HTTP=${response.status}`);
  } catch (err) {
    log(`NODE_A_HTTP=FAIL (${err.message})`);
  }

  try {
    const response = await httpRequest('http://127.0.0.1:8788/health');
    healthB = response.status === 200;
    log(`NODE_B_HTTP=${response.status}`);
  } catch (err) {
    log(`NODE_B_HTTP=FAIL (${err.message})`);
  }

  // 2. Test actual WebSocket PING/PONG on both endpoints.
  let p2pResult = { pass: false, reason: 'NOT_TESTED' };

  for (const endpoint of [NODE_A_WS, NODE_B_WS]) {
    log(`P2P_TEST_TARGET=${endpoint}`);

    const result = await p2pPing(endpoint);
    log(JSON.stringify(result));

    if (result.pass) {
      p2pResult = result;
      console.log(`P2P_LIVE_TEST=PASS`);
      break;
    }
  }

  if (!p2pResult.pass) {
    console.log('P2P_LIVE_TEST=FAIL');
  }

  // 3. Snapshot chain and wallet state without changing either.
  let chainBefore = null;
  let walletBefore = null;

  try {
    if (!fs.existsSync(CHAIN_FILE)) {
      throw new Error(`Chain file missing: ${CHAIN_FILE}`);
    }

    const chain = readJson(CHAIN_FILE);
    chainBefore = {
      length: Array.isArray(chain) ? chain.length :
        Array.isArray(chain.chain) ? chain.chain.length : null,
      sha256: sha256(fs.readFileSync(CHAIN_FILE))
    };

    log(`CHAIN_BEFORE=${JSON.stringify(chainBefore)}`);
  } catch (err) {
    log(`CHAIN_READ=FAIL (${err.message})`);
  }

  try {
    if (fs.existsSync(WALLET_STATE)) {
      walletBefore = {
        sha256: sha256(fs.readFileSync(WALLET_STATE)),
        state: readJson(WALLET_STATE)
      };
      log('WALLET_STATE_READ=PASS');
    } else {
      log('WALLET_STATE_READ=NOT_AVAILABLE');
    }
  } catch (err) {
    log(`WALLET_STATE_READ=FAIL (${err.message})`);
  }

  // Confirm the actual exposed Wallet API, without assuming a POST route.
  let walletHealth = false;

  try {
    const response = await httpRequest(`${WALLET_URL}/health`);
    walletHealth = response.status === 200;
    log(`WALLET_HTTP=${response.status}`);
  } catch (err) {
    log(`WALLET_HTTP=FAIL (${err.message})`);
  }

  const walletRoutes = inspectWalletSource();
  log(`WALLET_SOURCE_INSPECTION=${JSON.stringify(walletRoutes)}`);

  let walletTransaction = {
    pass: false,
    reason: 'NO_VERIFIED_TRANSACTION_API'
  };

  console.log('LIVE_TRANSACTION_TEST=BLOCKED');
  console.log('Reason: No verified POST route and transaction schema were established.');
  console.log('No funds were transferred; no wallet or chain data was modified.');

  // 4. Record evidence honestly. Do not claim a transaction occurred.
  const evidence = {
    status: 'E2E_INCOMPLETE',
    law: 2558,
    timestamp: new Date().toISOString(),
    test_id: TEST_ID,
    nodeA_http_200: healthA,
    nodeB_http_200: healthB,
    p2p_independently_verified: p2pResult.pass,
    p2p_result: p2pResult,
    wallet_http_200: walletHealth,
    wallet_source: walletRoutes,
    live_transaction: walletTransaction,
    chain_before: chainBefore,
    wallet_before_sha256: walletBefore ? walletBefore.sha256 : null,
    blockchain_length: chainBefore ? chainBefore.length : null,
    production_approval: false
  };

  fs.writeFileSync(VICTORY_FILE, JSON.stringify(evidence, null, 2) + '\n');

  console.log(`EVIDENCE_FILE=${VICTORY_FILE}`);
  console.log(`P2P_INDEPENDENTLY_VERIFIED=${p2pResult.pass}`);
  console.log('PRODUCTION_APPROVAL=false');

  // P2P success alone is insufficient for the requested absolute pass.
  process.exitCode = p2pResult.pass && healthA && healthB && walletHealth ? 2 : 1;
}

main().catch((err) => {
  console.error('[E2E_FATAL]', err.stack || err);
  process.exitCode = 1;
});
