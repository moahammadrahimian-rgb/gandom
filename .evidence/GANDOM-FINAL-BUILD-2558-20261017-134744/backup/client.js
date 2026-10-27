'use strict';

const WebSocket = require('ws');

const url = process.argv[2] || 'ws://127.0.0.1:8787';
const NODE_ID = `client-${Date.now()}`;

console.log('GANDUM-P2P CLIENT');
console.log('NODE_ID=' + NODE_ID);
console.log('CONNECT=' + url);

const ws = new WebSocket(url, {
  headers: {
    'x-gandom-node': NODE_ID
  }
});

ws.on('open', () => {
  console.log('CONNECTION=OPEN');

  ws.send(JSON.stringify({
    type: 'HELLO',
    from: NODE_ID,
    payload: {
      node_id: NODE_ID
    }
  }));

  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'DATA',
      from: NODE_ID,
      payload: {
        message_id: `msg-${Date.now()}`,
        text: 'GANDUM P2P REAL DATA'
      }
    }));
  }, 1000);
});

ws.on('message', raw => {
  console.log('RECEIVED=' + raw.toString());
});

ws.on('close', () => {
  console.log('CONNECTION=CLOSED');
});

ws.on('error', error => {
  console.error('CONNECTION=ERROR');
  console.error(error.message);
});
