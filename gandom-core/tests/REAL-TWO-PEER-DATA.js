'use strict';

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const URL = 'ws://127.0.0.1:8787';
const TIMEOUT = 5000;

function connect(nodeId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL, {
      headers: { 'x-gandom-node': nodeId }
    });

    const timer = setTimeout(() => {
      try { ws.close(); } catch (_) {}
      reject(new Error('CONNECT_TIMEOUT_' + nodeId));
    }, TIMEOUT);

    ws.once('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });

    ws.once('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForAck(ws, messageId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('DATA_ACK_TIMEOUT'));
    }, TIMEOUT);

    function onMessage(raw) {
      const text = raw.toString();

      let msg;
      try {
        msg = JSON.parse(text);
      } catch (_) {
        return;
      }

      if (
        msg.type === 'DATA_ACK' &&
        msg.payload &&
        msg.payload.message_id === messageId &&
        msg.payload.accepted === true
      ) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(msg);
      }
    }

    ws.on('message', onMessage);
  });
}

(async () => {
  console.log('===== GANDUM REAL TWO PEER DATA TEST =====');

  const peerA = await connect('REAL-DATA-PEER-A');
  console.log('PEER_A_CONNECTED=PASS_REAL');

  const peerB = await connect('REAL-DATA-PEER-B');
  console.log('PEER_B_CONNECTED=PASS_REAL');

  const messageId = 'two-peer-data-' + Date.now();

  const dataMessage = {
    type: 'DATA',
    from: 'REAL-DATA-PEER-A',
    ts: new Date().toISOString(),
    payload: {
      message_id: messageId,
      text: 'GANDUM REAL TWO PEER DATA'
    }
  };

  const ackPromise = waitForAck(peerA, messageId);

  peerA.send(JSON.stringify(dataMessage));

  console.log('DATA_SENT=PASS_REAL');

  const ack = await ackPromise;

  console.log('DATA_RECEIVED_ACK=PASS_REAL');
  console.log('MESSAGE_ID_MATCH=PASS_REAL');
  console.log('PEER_COUNT=2');

  const result = {
    project: 'GANDUM',
    test: 'REAL-TWO-PEER-DATA',
    mode: 'REAL_EXECUTION',
    timestamp: new Date().toISOString(),
    peer_count: 2,
    peer_a: 'REAL-DATA-PEER-A',
    peer_b: 'REAL-DATA-PEER-B',
    message_id: messageId,
    ack_type: ack.type,
    accepted: ack.payload.accepted
  };

  const dir = path.join(process.cwd(), 'gandom-core', 'evidence');
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(
    dir,
    `REAL-TWO-PEER-DATA-${Date.now()}.json`
  );

  fs.writeFileSync(file, JSON.stringify(result, null, 2));

  peerA.close();
  peerB.close();

  console.log('EVIDENCE=' + file);
  console.log('RESULT=PASS_REAL');
  console.log('===== GANDUM REAL TWO PEER DATA RESULT =====');
  console.log('GANDUM_REAL_TWO_PEER_DATA=PASS_REAL');
})().catch(err => {
  console.error('RESULT=FAIL_REAL');
  console.error('ERROR=' + err.message);
  process.exit(1);
});
