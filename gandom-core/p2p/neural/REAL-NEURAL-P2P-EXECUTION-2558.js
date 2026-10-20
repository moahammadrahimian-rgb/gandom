'use strict';

const http = require('http');
const WebSocket = require('ws');

const {
  NeuralP2PBus2558
} = require('./REAL-NEURAL-P2P-BUS-2558');

const PORT = 19451;

const nodeA = new NeuralP2PBus2558({
  nodeId: 'GANDOM-NEURAL-NODE-A'
});

const nodeB = new NeuralP2PBus2558({
  nodeId: 'GANDOM-NEURAL-NODE-B'
});

nodeA.registerNeuron('CELL-A', 'N-A-1', 0);
nodeB.registerNeuron('CELL-B', 'N-B-1', 0);

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let receivedByB = null;
let acknowledgement = null;

wss.on('connection', socket => {

  socket.on('message', raw => {

    const message = JSON.parse(raw.toString());

    if (message.type === 'NEURAL_SIGNAL') {

      receivedByB =
        nodeB.receive(message);

      socket.send(JSON.stringify(
        nodeB.acknowledge(message.messageId)
      ));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {

  const socket =
    new WebSocket(`ws://127.0.0.1:${PORT}`);

  socket.on('open', () => {

    const message =
      nodeA.createSignal({
        sourceCell: 'CELL-A',
        sourceNeuron: 'N-A-1',
        destinationNode: 'GANDOM-NEURAL-NODE-B',
        destinationCell: 'CELL-B',
        destinationNeuron: 'N-B-1',
        generation: 1,
        signal: 1
      });

    console.log('===== REAL NEURAL P2P =====');
    console.log('LAW=2558');
    console.log('NO_FAKE_PASS=1');
    console.log('TRANSPORT=WEBSOCKET');
    console.log(`SOURCE_NODE=${message.sourceNode}`);
    console.log(`SOURCE_CELL=${message.sourceCell}`);
    console.log(`SOURCE_NEURON=${message.sourceNeuron}`);
    console.log(`DESTINATION_NODE=${message.destinationNode}`);
    console.log(`DESTINATION_CELL=${message.destinationCell}`);
    console.log(`DESTINATION_NEURON=${message.destinationNeuron}`);
    console.log(`GENERATION=${message.generation}`);
    console.log(`MESSAGE_ID=${message.messageId}`);

    socket.send(JSON.stringify(message));
  });

  socket.on('message', raw => {

    acknowledgement =
      JSON.parse(raw.toString());

    const checks = {

      REAL_MESSAGE_TRANSFER:
        receivedByB &&
        receivedByB.accepted === true,

      REAL_DESTINATION:
        receivedByB &&
        receivedByB.newState !==
        receivedByB.oldState,

      REAL_GENERATION:
        receivedByB &&
        receivedByB.generation === 1,

      REAL_ACK:
        acknowledgement &&
        acknowledgement.type === 'NEURAL_ACK',

      REAL_MESSAGE_ID:
        acknowledgement &&
        acknowledgement.messageId ===
        receivedByB.messageId,

      REAL_P2P:
        nodeA.metrics.sent === 0 &&
        nodeB.metrics.received === 1 &&
        nodeB.metrics.delivered === 1
    };

    console.log('===== DESTINATION STATE =====');
    console.log(JSON.stringify(
      nodeB.snapshot(),
      null,
      2
    ));

    console.log('===== INDEPENDENT CHECK =====');

    for (const [name, value] of
         Object.entries(checks)) {

      console.log(
        `${name}=${value ? 'PASS_REAL' : 'FAIL'}`
      );
    }

    const pass =
      Object.values(checks).every(Boolean);

    console.log(
      `NEURAL_P2P_EXECUTION=${pass ? 'PASS_REAL' : 'FAIL'}`
    );

    socket.close();
    server.close(() => {
      process.exit(pass ? 0 : 1);
    });
  });

  socket.on('error', error => {
    console.error(
      'NEURAL_P2P_SOCKET_ERROR=' +
      error.message
    );

    server.close(() => process.exit(1));
  });
});
