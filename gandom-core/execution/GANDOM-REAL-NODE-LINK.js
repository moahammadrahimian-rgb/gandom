'use strict';

const net = require('net');
const crypto = require('crypto');

const PORT = 18777;
const HOST = '127.0.0.1';
const CELLS = 400000;

function makeState(nodeId, epoch) {
  const state = new Float32Array(CELLS);

  for (let i = 0; i < CELLS; i++) {
    state[i] = 1 + ((i + nodeId) % 17) / 1000;
  }

  const digest = crypto
    .createHash('sha256')
    .update(Buffer.from(state.buffer))
    .digest('hex');

  return {
    nodeId,
    epoch,
    cells: CELLS,
    stateDigest: digest
  };
}

function sendMessage(socket, message) {
  socket.write(JSON.stringify(message) + '\n');
}

function runServer() {
  const server = net.createServer(socket => {
    let buffer = '';

    socket.on('data', data => {
      buffer += data.toString();

      let index;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);

        if (!line.trim()) continue;

        const msg = JSON.parse(line);

        if (msg.type === 'HELLO') {
          const local = makeState(0, 1);

          sendMessage(socket, {
            type: 'HELLO_ACK',
            nodeId: local.nodeId,
            epoch: local.epoch,
            cells: local.cells,
            stateDigest: local.stateDigest
          });
        }

        if (msg.type === 'STATE') {
          const valid =
            msg.cells === CELLS &&
            typeof msg.stateDigest === 'string' &&
            /^[a-f0-9]{64}$/.test(msg.stateDigest);

          console.log(`REMOTE_NODE=${msg.nodeId}`);
          console.log(`REMOTE_CELLS=${msg.cells}`);
          console.log(`REMOTE_EPOCH=${msg.epoch}`);
          console.log(`REMOTE_STATE_SHA256=${msg.stateDigest}`);
          console.log(`REMOTE_STATE_VALID=${valid}`);

          sendMessage(socket, {
            type: 'VERIFY',
            accepted: valid
          });
        }
      }
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`NODE_0_LISTENING=${HOST}:${PORT}`);
  });
}

function runClient() {
  const socket = net.createConnection(PORT, HOST, () => {
    const local = makeState(1, 1);

    sendMessage(socket, {
      type: 'HELLO',
      nodeId: local.nodeId,
      epoch: local.epoch
    });

    sendMessage(socket, {
      type: 'STATE',
      nodeId: local.nodeId,
      epoch: local.epoch,
      cells: local.cells,
      stateDigest: local.stateDigest
    });
  });

  let buffer = '';

  socket.on('data', data => {
    buffer += data.toString();

    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);

      if (!line.trim()) continue;

      const msg = JSON.parse(line);

      if (msg.type === 'HELLO_ACK') {
        console.log(`REMOTE_NODE=${msg.nodeId}`);
        console.log(`REMOTE_CELLS=${msg.cells}`);
        console.log(`REMOTE_EPOCH=${msg.epoch}`);
        console.log(`REMOTE_STATE_SHA256=${msg.stateDigest}`);
      }

      if (msg.type === 'VERIFY') {
        console.log(`REMOTE_STATE_ACCEPTED=${msg.accepted}`);
        socket.end();
      }
    }
  });
}

const role = process.argv[2];

if (role === 'server') runServer();
else if (role === 'client') runClient();
else throw new Error('ROLE_REQUIRED: server|client');
