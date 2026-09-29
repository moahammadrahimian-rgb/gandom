'use strict';

const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = 8787;
const HOST = '127.0.0.1';

function health() {
  return new Promise((resolve, reject) => {
    http.get(`http://${HOST}:${PORT}/health`, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(body)
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function testData() {
  return new Promise((resolve, reject) => {
    const nodeId = `REAL-DATA-${crypto.randomUUID()}`;
    const messageId = `msg-${crypto.randomUUID()}`;

    const ws = new WebSocket(`ws://${HOST}:${PORT}`, {
      headers: {
        'x-gandom-node': nodeId
      }
    });

    const timeout = setTimeout(() => {
      try { ws.close(); } catch (_) {}
      reject(new Error('DATA_ACK_TIMEOUT'));
    }, 5000);

    ws.on('open', () => {
      const message = {
        type: 'DATA',
        from: nodeId,
        ts: new Date().toISOString(),
        payload: {
          message_id: messageId,
          text: 'GANDUM REAL DATA EXECUTION'
        }
      };

      console.log('DATA_SENT=' + JSON.stringify(message));
      ws.send(JSON.stringify(message));
    });

    ws.on('message', raw => {
      const text = raw.toString();
      console.log('DATA_RECEIVED=' + text);

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        return;
      }

      if (
        parsed.type === 'DATA_ACK' &&
        parsed.payload &&
        parsed.payload.accepted === true &&
        parsed.payload.message_id === messageId
      ) {
        clearTimeout(timeout);

        try { ws.close(); } catch (_) {}

        resolve({
          node_id: nodeId,
          message_id: messageId,
          ack_type: parsed.type,
          accepted: parsed.payload.accepted
        });
      }
    });

    ws.on('error', reject);
  });
}

(async () => {
  console.log('===== GANDUM REAL DATA CONTRACT =====');

  const h = await health();

  if (h.status !== 200 || !h.body || h.body.ok !== true) {
    throw new Error('HEALTH_CONTRACT_FAILED');
  }

  console.log('HTTP_HEALTH=PASS_REAL');

  const result = await testData();

  console.log('DATA_CONTRACT=PASS_REAL');
  console.log('DATA_ACK=PASS_REAL');
  console.log('MESSAGE_ID_MATCH=PASS_REAL');

  const evidence = {
    project: 'GANDUM',
    test: 'REAL-DATA-CONTRACT',
    mode: 'REAL_EXECUTION',
    timestamp: new Date().toISOString(),
    health: h.body,
    result
  };

  const fs = require('fs');
  const path = require('path');

  const file = path.join(
    process.cwd(),
    'gandom-core',
    'evidence',
    `REAL-DATA-${Date.now()}.json`
  );

  fs.writeFileSync(file, JSON.stringify(evidence, null, 2));

  console.log('EVIDENCE=' + file);
  console.log('RESULT=PASS_REAL');
})().catch(err => {
  console.error('RESULT=FAIL_REAL');
  console.error('ERROR=' + err.message);
  process.exit(1);
});
