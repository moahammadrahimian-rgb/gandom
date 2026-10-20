const { fatherVault, FATHER_SECRET_KEY } = require("./father-vault.js");
const { privateMemory } = require("./memories/private-chat.js");
const { handleWorkerAPI } = require('./worker-api.js');
const { WorkerCoordinator } = require('./worker-coordinator.js');
const { handleNodeBreedingAPI } = require('./node-breeding-api.js');
const { handleCellLifeAPI } = require('./cell-life-api.js');
const { handlePriceAPI } = require('./price-api.js');
const { handleEcosystemAPI } = require('./ecosystem-api.js');
const { handleAdsAPI } = require('./ads-api.js');
const { handleNeuralAPI } = require('./neural-api.js');
const { handlePaymentAPI } = require('./payment-api.js');
const { handleExchangeAPI } = require('./exchange-api.js');
const { handleMarketAPI } = require('./market-api.js');
const { handleUsersAPI } = require('./users-api.js');

const { handleBlockchainMessage, broadcastNewBlock } = require('./blockchain-p2p-handler.js');

const { GandomBlockchain } = require('./blockchain-100.js');

// ─── Blockchain ───
const { handleBlockchainAPI } = require('./blockchain-api.js');

const gandomChain = new GandomBlockchain();

const { getStateSnapshot } = require('./gandom-core/state-api-adapter');
'use strict';

const http = require('http');
const { LiveCellRuntimeBridge2558 } = require('./gandom-core/live-node/LIVE-CELL-RUNTIME-BRIDGE-2558.js');
// LIVE_CELL_BRIDGE_2558
const cellBridge = new LiveCellRuntimeBridge2558({
  capacity: Number(process.env.GANDOM_CELL_CAPACITY || 1000),
  intervalMs: Number(process.env.GANDOM_CELL_INTERVAL_MS || 5000)
});
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 8787);
const PROJECT_VERSION = process.env.PROJECT_VERSION || '0.1.0';
const NODE_ID = process.env.NODE_ID || crypto.randomUUID();
const PEER_ADDRESS = process.env.PEER_ADDRESS || '';
const RECONNECT_DELAY = Number(process.env.PEER_RECONNECT_MS || 3000);
let outboundPeer = null;
let reconnectTimer = null;
let shuttingDown = false;

const peers = new Map();

const httpServer = http.createServer((req, res) => {
        // --- PRIVATE VOICE MEMORY (FATHER ONLY) ---
        if (req.url.startsWith("/api/memory/private")) {
            if (req.headers["x-father-key"] !== FATHER_SECRET_KEY) {
                res.writeHead(403, {"Content-Type":"application/json"});
                res.end(JSON.stringify({ok:false, error:"PRIVATE ACCESS ONLY"}));
                return;
            }
            if (req.method === "GET" && req.url === "/api/memory/private/stats") {
                res.writeHead(200, {"Content-Type":"application/json"});
                res.end(JSON.stringify({ok:true, stats: privateMemory.stats()}));
                return;
            }
            if (req.method === "GET" && req.url === "/api/memory/private/recall") {
                res.writeHead(200, {"Content-Type":"application/json"});
                res.end(JSON.stringify({ok:true, memories: privateMemory.recall(20)}));
                return;
            }
            if (req.method === "POST" && req.url === "/api/memory/private/record") {
                let body = "";
                req.on("data", c => body += c.toString());
                req.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        if (data.from === "father") privateMemory.fatherSaid(data.text, data.language || "fa");
                        else if (data.from === "gandom") privateMemory.gandomReplied(data.text, data.emotion || "love");
                        res.writeHead(200, {"Content-Type":"application/json"});
                        res.end(JSON.stringify({ok:true, saved:true}));
                    } catch(e) {
                        res.writeHead(400, {"Content-Type":"application/json"});
                        res.end(JSON.stringify({ok:false, error:"Bad Request"}));
                    }
                });
                return;
            }
            res.writeHead(404, {"Content-Type":"application/json"});
            res.end(JSON.stringify({ok:false, error:"Unknown memory route"}));
            return;
        }

        // --- GANDOM 3D HTML ROUTE ---
        if (req.url === "/diagnose.html" || req.url.startsWith("/diagnose.html?")) {
            const path2 = require("path");
            const file = path2.join(__dirname, "public", "diagnose.html");
            require("fs").readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(data);
            });
            return;
        }

        if (req.url === "/voice-test.html" || req.url.startsWith("/voice-test.html?")) {
            const path2 = require("path");
            const file = path2.join(__dirname, "public", "voice-test.html");
            require("fs").readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(data);
            });
            return;
        }

        if (req.url === "/gandom-brain.js") {
            const path2 = require("path");
            const file = path2.join(__dirname, "public", "gandom-brain.js");
            require("fs").readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "application/javascript; charset=utf-8"});
                res.end(data);
            });
            return;
        }
        if (req.url === "/voice-continuous.js") {
            const path2 = require("path");
            const file = path2.join(__dirname, "public", "voice-continuous.js");
            require("fs").readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "application/javascript; charset=utf-8"});
                res.end(data);
            });
            return;
        }

        if (req.url === "/gandom-girl.html" || req.url.startsWith("/gandom-girl.html?")) {
            const path2 = require("path");
            const file = path2.join(__dirname, "public", "gandom-girl.html");
            require("fs").readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(data);
            });
            return;
        }

        if (req.url === "/gandom-test.html" || req.url.startsWith("/gandom-test.html?")) {
            const path2 = require("path");
            const file = path2.join(__dirname, "public", "gandom-test.html");
            require("fs").readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(data);
            });
            return;
        }

        if (req.url.startsWith("/libs/")) {
            const path2 = require("path");
            const file = path2.join(__dirname, "public", req.url.replace("/libs/", "libs/"));
            require("fs").readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "application/javascript; charset=utf-8"});
                res.end(data);
            });
            return;
        }

        if (req.url === "/gandom-3d.html" || req.url.startsWith("/gandom-3d.html?")) {
            const fs2 = require("fs");
            const path2 = require("path");
            const file = path2.join(__dirname, "public", "gandom-3d.html");
            fs2.readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(data);
            });
            return;
        }

        // --- FATHER VAULT APIs (TOP SECRET) ---
        if (req.url.startsWith("/api/father/vault")) {
            if (req.method === "POST") {
                let body = "";
                req.on("data", c => body += c.toString());
                req.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        if (data.secret_key !== FATHER_SECRET_KEY) {
                            res.writeHead(403, {"Content-Type":"application/json"});
                            res.end(JSON.stringify({ok:false, error:"ACCESS DENIED: YOU ARE NOT THE FATHER"}));
                            return;
                        }
                        const ok = fatherVault.executeFatherTransaction(data.action, data.amount, data.signature, data.timestamp);
                        res.writeHead(ok ? 200 : 400, {"Content-Type":"application/json"});
                        res.end(JSON.stringify({ok: ok, wallet: fatherVault.wallet}));
                    } catch (e) {
                        res.writeHead(400, {"Content-Type":"application/json"});
                        res.end(JSON.stringify({ok:false, error:"Invalid Request"}));
                    }
                });
                return;
            } else {
                if (req.headers["x-father-key"] === FATHER_SECRET_KEY) {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({ok:true, audit: fatherVault.getAuditReport()}));
                } else {
                    res.writeHead(403, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({ok:false, error:"ACCESS DENIED"}));
                }
                return;
            }
        }

  // ─── Worker APIs ───
  if (handleWorkerAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Node Breeding APIs ───
  if (handleNodeBreedingAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Cell Life APIs ───
  if (handleCellLifeAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Price APIs ───
  if (handlePriceAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Ecosystem APIs ───
  if (handleEcosystemAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Ads APIs ───
  if (handleAdsAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Neural APIs ───
  if (handleNeuralAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Payment APIs ───
  if (handlePaymentAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Exchange APIs ───
  if (handleExchangeAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Market APIs ───
  if (handleMarketAPI(req, res, req.url, req.method)) {
    return;
  }

  // ─── Users APIs ───
  if (handleUsersAPI(req, res, req.url, req.method)) {
    return;
  }

    // ─── Blockchain APIs ───
    if (handleBlockchainAPI(req, res, req.url, req.method, gandomChain) !== false) {
        return;
    }


    // ================== UI STATIC SERVER ==================
    if (
        req.url === '/' ||
        req.url.startsWith('/index.html') ||
        req.url.startsWith('/assets/') ||
        req.url.startsWith('/css/') ||
        req.url.startsWith('/js/') ||
        req.url.startsWith('/images/') ||
        req.url.startsWith('/static/')
    ) {
        let requestPath = req.url.split('?')[0];

        if (requestPath === '/') {
            requestPath = '/index.html';
        }

        let decodedPath;

        try {
            decodedPath = decodeURIComponent(requestPath);
        } catch {
            res.writeHead(400);
            res.end('Bad Request');
            return;
        }

        const publicRoot = path.resolve(__dirname, 'public');
        const filePath = path.resolve(
            publicRoot,
            '.' + decodedPath
        );

        if (
            filePath !== publicRoot &&
            !filePath.startsWith(publicRoot + path.sep)
        ) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) {

                res.writeHead(404);
                res.end('Not Found');
                return;
            }

            const ext = path.extname(filePath).toLowerCase();

            const mime = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.svg': 'image/svg+xml',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2'
            };

            res.writeHead(200, {
                'Content-Type':
                    mime[ext] || 'application/octet-stream',
                'Cache-Control': 'no-store'
            });

            fs.createReadStream(filePath).pipe(res);
        });

        return;
    }


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


  // API 1: همتاهای متصل واقعی
  if (req.url === '/api/peers') {
    const peerList = Array.from(peers.values()).map((peer) => ({
      peer_id: peer.id,
      direction: peer.direction || 'unknown',
      address: peer.address || null,
      connected_at: peer.connectedAt || null
    }));

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
    });

    return res.end(JSON.stringify({
      ok: true,
      node_id: NODE_ID,
      peers_count: peerList.length,
      peers: peerList
    }));
  }

  // API 2: آمار واقعی نود

  if (req.url === '/api/state') {
    try {
      const snapshot = getStateSnapshot();

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });

      return res.end(JSON.stringify(snapshot));
    } catch (err) {
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });

      return res.end(JSON.stringify({
        ok: false,
        error: 'STATE_API_ERROR',
        message: String(err.message || err)
      }));
    }
  }

if (req.url === '/api/stats') {
    const memoryMB = process.memoryUsage().rss / 1024 / 1024;

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
    });

    return res.end(JSON.stringify({
      ok: true,
      project: 'GANDOM',
      node_id: NODE_ID,
      peers_count: peers.size,
      outbound_peer: outboundPeer ? PEER_ADDRESS : null,
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb: Number(memoryMB.toFixed(2)),
      node_version: process.version
    }));
  }

  // API 3: نسخه واقعی پروژه
  if (req.url === '/api/version') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
    });

    return res.end(JSON.stringify({
      ok: true,
      project: 'GANDOM',
      version: PROJECT_VERSION
    }));
  }

  if (req.url.split('?')[0] === '/api/cells' && req.method === 'GET') {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  return res.end(JSON.stringify({
    ok: true, law: 2558, integration: 'LIVE_CELL_BRIDGE_2558',
    ...cellBridge.snapshot()
  }));
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

            if (message.type === 'PING') {
                send(ws, 'PONG', {
                    node_id: NODE_ID,
                    received_at: Date.now()
                });
                return;
            }

    if (message.type === 'PONG') {

      log('PEER_INBOUND_PONG', {

        peer_id: peerId,

        remote_node_id:

          message.payload && message.payload.node_id

            ? message.payload.node_id

            : null

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

    // ─── Blockchain P2P Messages ───


    // ─── Worker Messages ───
      if (message.type === "WORKER_HELLO") {
        WorkerCoordinator.registerWorker(message.payload, ws);
        send(ws, "WORKER_ACK", { worker_id: message.payload.worker_id, mother_id: "GDM-MOTHER-2558" });
        return;
      }
      if (message.type === "WORKER_PING") {
        WorkerCoordinator.updatePing(message.payload.worker_id, message.payload);
        send(ws, "PONG", {});
        return;
      }
      if (message.type === "TASK_RESULT" || message.type === "TASK_FAILED") {
        WorkerCoordinator.receiveResult(message.payload);
        return;
      }

      if (handleBlockchainMessage(message, ws, peerId, gandomChain, peers, send)) {


        return;


    }



    send(ws, 'ERROR', { code: 'UNKNOWN_MESSAGE_TYPE',
      received_type: message.type || null
    });
  });

  ws.on('close', () => {
    peers.delete(peerId);

    // Cleanup worker
    try { WorkerCoordinator.unregisterWorker(peerId); } catch(e) {}

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

  cellBridge.start();
  log('LIVE_CELL_BRIDGE_STARTED', {
    capacity: cellBridge.capacity,
    intervalMs: cellBridge.intervalMs
  });
  if (PEER_ADDRESS) {
    connectOutbound();
  }
});

function shutdown(signal) {
  cellBridge.stop();
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
