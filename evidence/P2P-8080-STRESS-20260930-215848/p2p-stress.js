const WebSocket = require('ws');
const fs = require('fs');

const URL = 'ws://127.0.0.1:8080';
const CLIENTS = 50;
const ROUNDS = 5;
const TIMEOUT = 5000;

let connected = 0;
let opened = 0;
let closed = 0;
let errors = 0;
let pong = 0;
let reconnectOpened = 0;
let reconnectErrors = 0;

const latency = [];
const clients = [];

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function connectOne(index, reconnect=false) {
  return new Promise(resolve => {
    const start = Date.now();
    let done = false;

    const ws = new WebSocket(URL);

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        errors++;
        try { ws.terminate(); } catch {}
        resolve(false);
      }
    }, TIMEOUT);

    ws.on('open', () => {
      if (done) return;
      done = true;
      clearTimeout(timer);

      opened++;
      if (reconnect) reconnectOpened++;

      const t = Date.now() - start;
      latency.push(t);

      try {
        ws.ping();
      } catch {}

      connected++;

      if (!reconnect) clients[index] = ws;

      resolve(true);
    });

    ws.on('pong', () => {
      pong++;
    });

    ws.on('error', () => {
      errors++;
      if (reconnect) reconnectErrors++;
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(false);
      }
    });

    ws.on('close', () => {
      closed++;
    });
  });
}

(async () => {
  console.log('P2P_STRESS_START');
  console.log('CLIENTS=' + CLIENTS);
  console.log('ROUNDS=' + ROUNDS);

  console.log('\nROUND_1_INITIAL_CONNECTIONS');

  const first = [];
  for (let i=0;i<CLIENTS;i++) {
    first.push(connectOne(i,false));
  }

  const firstResults = await Promise.all(first);
  const firstOK = firstResults.filter(Boolean).length;

  console.log('INITIAL_OPEN=' + firstOK + '/' + CLIENTS);

  await wait(1500);

  console.log('\nPING_PHASE');

  for (const ws of clients) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.ping(); } catch {}
    }
  }

  await wait(1500);

  console.log('PONG_RECEIVED=' + pong);

  console.log('\nRECONNECT_PHASE');

  const reconnectIndexes = [];
  for (let i=0;i<CLIENTS;i+=2) {
    const ws = clients[i];
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.close(); } catch {}
      reconnectIndexes.push(i);
    }
  }

  await wait(1000);

  const reconnectResults = [];
  for (const i of reconnectIndexes) {
    reconnectResults.push(await connectOne(i,true));
  }

  const reconnectOK = reconnectResults.filter(Boolean).length;

  console.log(
    'RECONNECT_OPEN=' +
    reconnectOK +
    '/' +
    reconnectIndexes.length
  );

  console.log('\nMULTI_ROUND_CONNECTION_TEST');

  let roundSuccess = 0;
  let roundAttempts = 0;

  for (let r=1;r<=ROUNDS;r++) {
    const local = [];

    for (let i=0;i<CLIENTS;i++) {
      local.push(connectOne(i,false));
    }

    const result = await Promise.all(local);
    const ok = result.filter(Boolean).length;

    roundSuccess += ok;
    roundAttempts += CLIENTS;

    console.log(
      'ROUND_' + r +
      '=' + ok + '/' + CLIENTS
    );

    await wait(500);

    for (const ws of clients) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.close(); } catch {}
      }
    }

    await wait(500);
  }

  const avg =
    latency.length ?
    latency.reduce((a,b)=>a+b,0) / latency.length :
    0;

  const max =
    latency.length ?
    Math.max(...latency) :
    0;

  const min =
    latency.length ?
    Math.min(...latency) :
    0;

  const final = {
    clients: CLIENTS,
    rounds: ROUNDS,
    initial_open: firstOK,
    initial_total: CLIENTS,
    pong_received: pong,
    reconnect_open: reconnectOK,
    reconnect_total: reconnectIndexes.length,
    round_success: roundSuccess,
    round_attempts: roundAttempts,
    websocket_open_events: opened,
    websocket_close_events: closed,
    websocket_errors: errors,
    reconnect_errors: reconnectErrors,
    latency_ms: {
      min,
      avg: Number(avg.toFixed(2)),
      max
    }
  };

  fs.writeFileSync(
    process.argv[2],
    JSON.stringify(final,null,2)
  );

  console.log('\nP2P_STRESS_RESULT');
  console.log(JSON.stringify(final,null,2));

  const initialPass = firstOK === CLIENTS;
  const reconnectPass =
    reconnectIndexes.length === 0 ||
    reconnectOK === reconnectIndexes.length;

  const roundPass =
    roundSuccess === roundAttempts;

  const pingPass = pong > 0;

  const PASS =
    initialPass &&
    reconnectPass &&
    roundPass &&
    pingPass &&
    errors === 0;

  console.log('\nINITIAL_CONNECTION=' + (initialPass ? 'PASS' : 'FAIL'));
  console.log('PING_PONG=' + (pingPass ? 'PASS' : 'FAIL'));
  console.log('RECONNECT=' + (reconnectPass ? 'PASS' : 'FAIL'));
  console.log('MULTI_ROUND=' + (roundPass ? 'PASS' : 'FAIL'));
  console.log('ERROR_COUNT=' + errors);
  console.log('P2P_8080_STRESS=' + (PASS ? 'PASS' : 'FAIL'));

  process.exit(PASS ? 0 : 2);
})();
