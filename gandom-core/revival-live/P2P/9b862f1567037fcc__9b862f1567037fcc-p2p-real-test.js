const WebSocket = require('ws');

const URL = 'ws://127.0.0.1:8787';
const N = 50;
let opened = 0, pong = 0, errors = 0;

const sockets = [];

for (let i = 0; i < N; i++) {
  const ws = new WebSocket(URL);
  sockets.push(ws);

  ws.on('open', () => {
    opened++;
    ws.ping();
  });

  ws.on('pong', () => {
    pong++;
    ws.close();
  });

  ws.on('error', () => {
    errors++;
  });
}

setTimeout(() => {
  console.log('===== REAL P2P RESULT =====');
  console.log(`URL=${URL}`);
  console.log(`TARGET=${N}`);
  console.log(`OPENED=${opened}`);
  console.log(`PONG=${pong}`);
  console.log(`ERRORS=${errors}`);

  if (opened === N && pong === N && errors === 0) {
    console.log('REAL_P2P_TEST=PASS');
    process.exit(0);
  }

  console.log('REAL_P2P_TEST=FAIL');
  process.exit(1);
}, 7000);
