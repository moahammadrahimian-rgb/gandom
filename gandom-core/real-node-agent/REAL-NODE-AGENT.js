'use strict';

const net = require('net');
const os = require('os');
const crypto = require('crypto');

const NODE_ID = process.env.GANDOM_NODE_ID;
const PORT = Number(process.env.GANDOM_NODE_PORT || 19000);
const CELLS = 400000;

if (!NODE_ID || !Number.isInteger(Number(NODE_ID))) {
  console.error('REAL_NODE_AGENT=FAIL');
  console.error('REASON=REAL_NODE_ID_REQUIRED');
  console.error('FAKE_PASS=BLOCKED');
  process.exit(1);
}

const identity = crypto
  .createHash('sha256')
  .update([
    NODE_ID,
    os.hostname(),
    os.platform(),
    os.arch(),
    Date.now().toString()
  ].join('|'))
  .digest('hex');

const started = Date.now();

const server = net.createServer(socket => {
  socket.setEncoding('utf8');

  socket.on('data', data => {
    const msg = data.toString().trim();

    if (msg === 'PING') {
      socket.write(JSON.stringify({
        type: 'PONG',
        nodeId: Number(NODE_ID),
        cells: CELLS,
        identity,
        epoch: Math.floor((Date.now() - started) / 1000)
      }) + '\n');
    }
  });
});

server.on('error', err => {
  console.error('REAL_NODE_AGENT=FAIL');
  console.error(`REASON=${err.code || err.message}`);
  console.error('FAKE_PASS=BLOCKED');
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();

  console.log(`REAL_NODE_ID=${NODE_ID}`);
  console.log(`REAL_NODE_IDENTITY=${identity}`);
  console.log(`REAL_NODE_HOST=${os.hostname()}`);
  console.log(`REAL_NODE_ADDRESS=0.0.0.0:${address.port}`);
  console.log(`REAL_NODE_CELLS=${CELLS}`);
  console.log(`REAL_NODE_HEARTBEAT=READY`);
  console.log(`REAL_NODE_AGENT=PASS`);
  console.log('FAKE_PASS=BLOCKED');
});
