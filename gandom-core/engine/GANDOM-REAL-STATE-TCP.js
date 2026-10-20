'use strict';

const net = require('net');
const crypto = require('crypto');

const {
  GandomRealEngine,
  CELLS_PER_NODE
} = require('./GANDOM-REAL-ENGINE');

const HOST = '127.0.0.1';
const PORT = 18888;

function sha256(buffer) {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

function makeFrame(engine) {
  const state = engine.runtime.block.stateBytes();

  const header = Buffer.from(JSON.stringify({
    nodeId: engine.runtime.nodeId,
    epoch: engine.runtime.heartbeat,
    cells: CELLS_PER_NODE,
    byteLength: state.length,
    sha256: sha256(state)
  }), 'utf8');

  const frame = Buffer.allocUnsafe(
    4 + header.length + state.length
  );

  frame.writeUInt32BE(header.length, 0);
  header.copy(frame, 4);
  state.copy(frame, 4 + header.length);

  return {
    frame,
    state,
    header: JSON.parse(header.toString('utf8'))
  };
}

const nodeId =
  Number(process.argv[2] || 0);

const mode =
  process.argv[3] || 'server';

const engine =
  new GandomRealEngine(nodeId, 1);

engine.execute();

if (mode === 'server') {

  const server = net.createServer(socket => {

    let chunks = [];
    let total = 0;

    socket.on('data', chunk => {
      chunks.push(chunk);
      total += chunk.length;
    });

    socket.on('end', () => {

      const frame =
        Buffer.concat(chunks, total);

      try {

        if (frame.length < 4) {
          throw new Error('FRAME_TOO_SHORT');
        }

        const headerLength =
          frame.readUInt32BE(0);

        const header =
          JSON.parse(
            frame
              .subarray(4, 4 + headerLength)
              .toString('utf8')
          );

        const state =
          frame.subarray(
            4 + headerLength
          );

        const receiverHash =
          sha256(state);

        const validLength =
          state.length === header.byteLength;

        const validHash =
          receiverHash === header.sha256;

        const validCells =
          header.cells === CELLS_PER_NODE;

        console.log(`RECEIVER_NODE=${nodeId}`);
        console.log(`SENDER_NODE=${header.nodeId}`);
        console.log(`RECEIVED_BYTES=${state.length}`);
        console.log(`EXPECTED_BYTES=${header.byteLength}`);
        console.log(`RECEIVED_CELLS=${header.cells}`);
        console.log(`RECEIVED_EPOCH=${header.epoch}`);
        console.log(`SENDER_SHA256=${header.sha256}`);
        console.log(`RECEIVER_SHA256=${receiverHash}`);
        console.log(`LENGTH_VALID=${validLength}`);
        console.log(`CELL_COUNT_VALID=${validCells}`);
        console.log(`HASH_MATCH=${validHash}`);

        if (!validLength ||
            !validHash ||
            !validCells) {
          console.log('FULL_STATE_ACCEPTED=false');
          process.exit(2);
        }

        console.log('FULL_STATE_ACCEPTED=true');
        console.log('REAL_FULL_STATE_REHASH=PASS');

        process.exit(0);

      } catch (e) {
        console.error(`RECEIVER_ERROR=${e.message}`);
        process.exit(3);
      }
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`TCP_READY=${HOST}:${PORT}`);

    /*
     * Signal readiness to the test harness.
     */
    process.stdout.write('SERVER_READY\n');
  });

  return;
}

/* ==========================================================
   CLIENT
   ========================================================== */

if (mode === 'client') {

  const {
    frame,
    state,
    header
  } = makeFrame(engine);

  console.log(`SENDER_NODE=${nodeId}`);
  console.log(`SENDER_CELLS=${header.cells}`);
  console.log(`SENDER_EPOCH=${header.epoch}`);
  console.log(`SENDER_STATE_BYTES=${state.length}`);
  console.log(`SENDER_SHA256=${header.sha256}`);

  const socket =
    net.createConnection(
      PORT,
      HOST,
      () => {

        socket.end(frame);

        console.log(
          `FULL_STATE_BYTES_SENT=${state.length}`
        );
      }
    );

  socket.on('error', e => {
    console.error(
      `CLIENT_ERROR=${e.message}`
    );
    process.exit(4);
  });

  socket.on('close', () => {
    process.exit(0);
  });

  return;
}

throw new Error('MODE_INVALID');
