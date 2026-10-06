const WebSocket = require('ws');

const start = 10001;
const end = 11000;

let ok = 0;
let fail = 0;
let pending = end - start + 1;

for (let port = start; port <= end; port++) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);

  const timer = setTimeout(() => {
    fail++;
    try { ws.close(); } catch {}
    done();
  }, 3000);

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'PING',
      payload: {
        source: 'CH02_REAL_NETWORK_TEST',
        targetPort: port
      }
    }));
  });

  ws.on('message', () => {
    clearTimeout(timer);
    ok++;
    try { ws.close(); } catch {}
    done();
  });

  ws.on('error', () => {
    clearTimeout(timer);
    fail++;
    done();
  });
}

function done() {
  pending--;
  if (pending === 0) {
    console.log(`NETWORK_ACK_OK=${ok}`);
    console.log(`NETWORK_ACK_FAIL=${fail}`);

    if (ok !== 1000 || fail !== 0) {
      process.exit(1);
    }
  }
}
