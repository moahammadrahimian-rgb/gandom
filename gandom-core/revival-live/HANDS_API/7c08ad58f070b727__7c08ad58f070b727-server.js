'use strict';

const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 8787);
const NODE_ID = process.env.NODE_ID || crypto.randomUUID();
const PEER_ADDRESS = process.env.PEER_ADDRESS || '';
const RECONNECT_DELAY = Number(process.env.PEER_RECONNECT_MS || 3000);
let outboundPeer = null;
let reconnectTimer = null;
let shuttingDown = false;

const peers = new Map();

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    const body = JSON.stringify({
      ok: true,
      project: 'GANDUM-P2P',
      node_id: NODE_ID,
      peers: peers.size,
      uptime: process.uptime()
    });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    });

    return res.end(body);
  }

  if (req.url === '/') {
    const html = require("fs").readFileSync("./public/index.html","utf8"); res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}); return res.end(html); const body = "GANDUM-P2P NODE\\n";
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(body)
    });
    return res.end(body);
  }

  res.writeHead(404);
  res.end('NOT_FOUND');
});

const wss = new WebSocket.Server({ server: httpServer });

function log(event, data = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    event,
    node_id: NODE_ID,
    ...data
  }));
}

function send(ws, type, payload = {}) {
  if (ws.readyState !== WebSocket.OPEN) return false;

  ws.send(JSON.stringify({
    type,
    from: NODE_ID,
    ts: new Date().toISOString(),
    payload
  }));

  return true;
}

wss.on('connection', (ws, req) => {
  const peerId =
    req.headers['x-gandom-node'] ||
    crypto.randomUUID();

  peers.set(peerId, {
    id: peerId,
    ws,
    direction: 'inbound',
    address: req.socket.remoteAddress || null,
    connectedAt: Date.now()
  });

  log('PEER_CONNECTED', {
    peer_id: peerId,
    peers: peers.size
  });

  send(ws, 'WELCOME', {
    node_id: NODE_ID,
    peer_id: peerId
  });

  ws.on('message', raw => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(ws, 'ERROR', {
        code: 'INVALID_JSON'
      });
      return;
    }

    log('MESSAGE_RECEIVED', {
      peer_id: peerId,
      type: message.type || 'UNKNOWN'
    });

    if (message.type === 'PING') {
      send(ws, 'PONG', {
        received: Date.now()
      });
      return;
    }

    if (message.type === 'HELLO') {
      send(ws, 'HELLO_ACK', {
        node_id: NODE_ID,
        received_node: message.payload?.node_id || null
      });
      return;
    }

    if (message.type === 'DATA') {
      send(ws, 'DATA_ACK', {
        accepted: true,
        message_id: message.payload?.message_id || null
      });
      return;
    }

    send(ws, 'ERROR', {
      code: 'UNKNOWN_MESSAGE_TYPE',
      received_type: message.type || null
    });
  });

  ws.on('close', () => {
    peers.delete(peerId);

    log('PEER_DISCONNECTED', {
      peer_id: peerId,
      peers: peers.size
    });
  });

  ws.on('error', error => {
    log('PEER_ERROR', {
      peer_id: peerId,
      error: error.message
    });
  });
});


function connectOutbound() {
  if (shuttingDown || !PEER_ADDRESS) return;

  if (outboundPeer &&
      outboundPeer.readyState !== WebSocket.CLOSED &&
      outboundPeer.readyState !== WebSocket.CLOSING) {
    return;
  }

  log('PEER_OUTBOUND_CONNECTING', {
    address: PEER_ADDRESS,
    node_id: NODE_ID
  });

  const ws = new WebSocket(PEER_ADDRESS, {
    headers: {
      'x-gandom-node': NODE_ID
    }
  });

  outboundPeer = ws;

  const peerId = `outbound:${PEER_ADDRESS}`;

  ws.on('open', () => {
    if (shuttingDown) {
      try { ws.close(); } catch {}
      return;
    }

    peers.set(peerId, {
      ws,
      direction: 'outbound',
      address: PEER_ADDRESS,
      connectedAt: Date.now()
    });

    log('PEER_OUTBOUND_CONNECTED', {
      peer_id: peerId,
      address: PEER_ADDRESS,
      peers: peers.size
    });

    send(ws, 'HELLO', {
      node_id: NODE_ID,
      direction: 'outbound'
    });
  });

  ws.on('message', raw => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch (error) {
      log('PEER_OUTBOUND_INVALID_MESSAGE', {
        peer_id: peerId,
        error: error.message
      });
      return;
    }

    log('PEER_OUTBOUND_MESSAGE', {
      peer_id: peerId,
      type: message.type || null
    });

    if (message.type === 'PING') {
      send(ws, 'PONG', {
        node_id: NODE_ID,
        uptime: process.uptime()
      });
      return;
    }

    if (message.type === 'HELLO_ACK') {
      log('PEER_OUTBOUND_HELLO_ACK', {
        peer_id: peerId,
        remote_node_id:
          message.payload && message.payload.node_id
            ? message.payload.node_id
            : null
      });
      return;
    }

    if (message.type === 'DATA_ACK') {
      log('PEER_OUTBOUND_DATA_ACK', {
        peer_id: peerId,
        accepted:
          message.payload && typeof message.payload.accepted !== 'undefined'
            ? message.payload.accepted
            : null
      });
      return;
    }

    if (message.type === 'PONG') {
      log('PEER_OUTBOUND_PONG', {
        peer_id: peerId
      });
    }
  });

  ws.on('close', () => {
    peers.delete(peerId);

    if (outboundPeer === ws) {
      outboundPeer = null;
    }

    log('PEER_OUTBOUND_DISCONNECTED', {
      peer_id: peerId,
      peers: peers.size,
      reconnect_in_ms: shuttingDown ? 0 : RECONNECT_DELAY
    });

    if (!shuttingDown && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectOutbound();
      }, RECONNECT_DELAY);
    }
  });

  ws.on('error', error => {
    log('PEER_OUTBOUND_ERROR', {
      peer_id: peerId,
      address: PEER_ADDRESS,
      error: error.message
    });
  });
}

const heartbeat = setInterval(() => {
  for (const [peerId, peer] of peers) {
    if (peer.ws.readyState === WebSocket.OPEN) {
      send(peer.ws, 'PING', {
        node_id: NODE_ID,
        uptime: process.uptime()
      });
    } else {
      peers.delete(peerId);
    }
  }
}, 15000);

httpServer.listen(PORT, '0.0.0.0', () => {
  log('NODE_STARTED', {
    port: PORT,
    websocket: `ws://0.0.0.0:${PORT}`,
    health: `http://127.0.0.1:${PORT}/health`
  });

  if (PEER_ADDRESS) {
    connectOutbound();
  }
});

function shutdown(signal) {
  shuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (outboundPeer) {
    try { outboundPeer.close(); } catch {}
    outboundPeer = null;
  }
  log('NODE_SHUTDOWN', { signal });

  clearInterval(heartbeat);

  for (const peer of peers.values()) {
    try {
      peer.ws.close();
    } catch {}
  }

  wss.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
