'use strict';

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const URL = 'ws://127.0.0.1:8787';
const TIMEOUT = 5000;

function connect(nodeId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL, {
      headers: {
        'x-gandom-node': nodeId
      }
    });

    const timer = setTimeout(() => {
      try { ws.close(); } catch (_) {}
      reject(new Error('PEER_CONNECTION_TIMEOUT_' + nodeId));
    }, TIMEOUT);

    ws.once('open', () => {
      clearTimeout(timer);
      resolve({
        nodeId,
        ws
      });
    });

    ws.once('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

(async () => {
  console.log('===== GANDUM REAL TWO PEER TEST =====');

  const peerA = await connect('REAL-PEER-A');
  console.log('PEER_A_CONNECTED=PASS_REAL');

  const peerB = await connect('REAL-PEER-B');
  console.log('PEER_B_CONNECTED=PASS_REAL');

  console.log('PEER_COUNT=2');
  console.log('TWO_PEERS_CONNECTION=PASS_REAL');

  const result = {
    project: 'GANDUM',
    test: 'REAL-TWO-PEER-CONNECTION',
    mode: 'REAL_EXECUTION',
    timestamp: new Date().toISOString(),
    peer_a: peerA.nodeId,
    peer_b: peerB.nodeId,
    peer_count: 2
  };

  const dir = path.join(process.cwd(), 'gandom-core', 'evidence');
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(
    dir,
    `REAL-TWO-PEER-${Date.now()}.json`
  );

  fs.writeFileSync(file, JSON.stringify(result, null, 2));

  peerA.ws.close();
  peerB.ws.close();

  console.log('EVIDENCE=' + file);
  console.log('RESULT=PASS_REAL');
  console.log('===== GANDUM REAL TWO PEER RESULT =====');
  console.log('GANDUM_REAL_TWO_PEER=PASS_REAL');
})().catch(err => {
  console.error('RESULT=FAIL_REAL');
  console.error('ERROR=' + err.message);
  process.exit(1);
});
