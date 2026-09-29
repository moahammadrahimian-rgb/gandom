'use strict';

const http = require('http');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const HOST = '127.0.0.1';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function health() {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `http://${HOST}:${PORT}/health`,
      res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('HEALTH_TIMEOUT'));
    });
  });
}

function connect(label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${HOST}:${PORT}`, {
      headers: {
        'x-gandom-node': label
      }
    });

    let settled = false;

    ws.on('open', () => {
      if (!settled) {
        settled = true;
        resolve(ws);
      }
    });

    ws.on('error', err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}

(async () => {
  let server = null;
  let peerA = null;
  let peerB = null;

  try {
    console.log('===== GANDUM REAL LIFECYCLE TEST =====');

    server = spawn(
      process.execPath,
      [path.join(process.cwd(), 'server.js')],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: String(PORT)
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    server.stdout.on('data', d => {
      process.stdout.write('[SERVER] ' + d.toString());
    });

    server.stderr.on('data', d => {
      process.stderr.write('[SERVER_ERR] ' + d.toString());
    });

    let initial = null;
    let serverReady = false;

    for (let i = 0; i < 20; i++) {
      try {
        initial = await health();
        serverReady = true;
        break;
      } catch (_) {
        await wait(250);
      }
    }

    if (!serverReady || !initial) {
      throw new Error('SERVER_DID_NOT_BECOME_READY');
    }

    if (initial.ok !== true) {
      throw new Error('INITIAL_HEALTH_FAILED');
    }

    console.log('SERVER_HEALTH=PASS_REAL');
    console.log('INITIAL_PEERS=' + initial.peers);

    peerA = await connect('LIFECYCLE-PEER-A');
    console.log('PEER_A_CONNECTED=PASS_REAL');

    peerB = await connect('LIFECYCLE-PEER-B');
    console.log('PEER_B_CONNECTED=PASS_REAL');

    await wait(250);

    const connected = await health();

    if (connected.peers !== 2) {
      throw new Error(
        'PEER_COUNT_DID_NOT_REACH_2:' + connected.peers
      );
    }

    console.log('PEER_COUNT_2=PASS_REAL');
    console.log('CONNECTED_PEERS=' + connected.peers);

    peerA.close();
    peerB.close();

    await wait(500);

    const after = await health();

    if (after.peers !== 0) {
      throw new Error(
        'PEERS_DID_NOT_RETURN_TO_ZERO:' + after.peers
      );
    }

    console.log('PEER_CLOSE=PASS_REAL');
    console.log('PEER_COUNT_0=PASS_REAL');

    const evidence = {
      project: 'GANDUM',
      test: 'REAL-LIFECYCLE-PEERS',
      mode: 'REAL_EXECUTION',
      timestamp: new Date().toISOString(),
      initial_peers: initial.peers,
      connected_peers: connected.peers,
      final_peers: after.peers,
      peer_a: 'CONNECTED_AND_CLOSED',
      peer_b: 'CONNECTED_AND_CLOSED',
      result: 'PASS_REAL'
    };

    const evidenceDir = path.join(
      process.cwd(),
      'gandom-core',
      'evidence'
    );

    fs.mkdirSync(evidenceDir, { recursive: true });

    const file = path.join(
      evidenceDir,
      `REAL-LIFECYCLE-${Date.now()}.json`
    );

    fs.writeFileSync(
      file,
      JSON.stringify(evidence, null, 2)
    );

    console.log('EVIDENCE=' + file);
    console.log('RESULT=PASS_REAL');
    console.log('===== GANDUM REAL LIFECYCLE RESULT =====');
    console.log('GANDUM_REAL_LIFECYCLE=PASS_REAL');

    peerA = null;
    peerB = null;

    server.kill('SIGTERM');
    await wait(300);

    process.exit(0);

  } catch (err) {
    console.error('RESULT=FAIL_REAL');
    console.error('ERROR=' + err.message);

    try {
      if (peerA) peerA.close();
      if (peerB) peerB.close();
      if (server) server.kill('SIGTERM');
    } catch (_) {}

    process.exit(1);
  }
})();
