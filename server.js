const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const { getStateSnapshot } = require('./gandom-core/state-api-adapter');

'use strict';

const PORT = Number(process.env.PORT || 8787);
const PROJECT_VERSION = process.env.PROJECT_VERSION || '0.1.0';
const NODE_ID = process.env.NODE_ID || crypto.randomUUID();
const PEER_ADDRESS = process.env.PEER_ADDRESS || '';
const RECONNECT_DELAY = Number(process.env.PEER_RECONNECT_MAX || 5000);
let outboundPeer = null;
let reconnectTimer = null;
let shuttingDown = false;

const peers = new Map();

const httpServer = http.createServer((req, res) => {
    // ========== UI STATIC SERVER ==========
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
        if (requestPath === '/') requestPath = '/index.html';
        
        let decodedPath;
        try {
            decodedPath = decodeURIComponent(requestPath);
        } catch {
            res.writeHead(400);
            return res.end('Bad Request');
        }

        const publicRoot = path.resolve(__dirname, 'public');
        const filePath = path.resolve(publicRoot, '.' + decodedPath);

        if (filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)) {
            res.writeHead(403);
            return res.end('Forbidden');
        }

        fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) {
                
    // ========== NEW INTEGRATION APIS ==========
    if (req.url === '/api/wallet') {
        try {
            const walletPath = path.join(__dirname, 'wallet/wallet-state.json');
            const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, balance: walletData.balance || 12450, currency: 'GDM' }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    if (req.url === '/api/tokenomics') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, total_supply: 24000000000, owner_share: 1200000000, currency: 'GDM' }));
    }

    if (req.url === '/api/market/chart') {
        const chartData = [
            { time: '10:00', price: 0.1200 }, { time: '11:00', price: 0.1215 },
            { time: '12:00', price: 0.1190 }, { time: '13:00', price: 0.1240 },
            { time: '14:00', price: 0.1284 }
        ];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, data: chartData, pair: 'GDM/USDT' }));
    }
    // ===========================================

    res.writeHead(404);
                return res.end('Not Found');
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
                'Content-Type': mime[ext] || 'application/octet-stream',
                'Cache-Control': 'no-store'
            });
            fs.createReadStream(filePath).pipe(res);
        });
        return;
    }

    // ========== API ROUTES ==========
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            ok: true,
            project: 'GANDUM-P2P',
            node_id: NODE_ID,
            peers: peers.size,
            uptime: process.uptime()
        }));
    }

    if (req.url === '/api/peers') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            ok: true,
            node_id: NODE_ID,
            peers_count: peers.size,
            peers: Array.from(peers.values()).map(p => ({
                peer_id: p.id,
                direction: p.direction,
                address: p.address,
                connected_at: p.connectedAt
            }))
        }));
    }

    if (req.url === '/api/state') {
        try {
            const snapshot = getStateSnapshot();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(snapshot));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: 'STATE_API_ERROR', message: String(err.message || err) }));
        }
    }

    if (req.url === '/api/stats') {
        const memoryMB = process.memoryUsage().rss / 1024 / 1024;
        res.writeHead(200, { 'Content-Type': 'application/json' });
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

    if (req.url === '/api/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, project: 'GANDOM', version: PROJECT_VERSION }));
    }

    res.writeHead(404);
    res.end('NOT_FOUND');
});

const wss = new WebSocket.Server({ server: httpServer });

function log(event, data = {}) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event, node_id: NODE_ID, ...data }));
}

function send(ws, type, payload = {}) {
    if (ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type, from: NODE_ID, ts: new Date().toISOString(), payload }));
    return true;
}

// ========== WEBSOCKET INBOUND ==========
wss.on('connection', (ws, req) => {
    const peerId = req.headers['x-gandom-node'] || crypto.randomUUID();
    peers.set(peerId, { id: peerId, ws, direction: 'inbound', address: req.socket.remoteAddress || null, connectedAt: Date.now() });
    log('PEER_CONNECTED', { peer_id: peerId, peers: peers.size });
    
    send(ws, 'WELCOME', { node_id: NODE_ID, peer_id: peerId });

    ws.on('message', raw => {
        let message;
        try {
            message = JSON.parse(raw.toString());
        } catch {
            send(ws, 'ERROR', { code: 'INVALID_JSON' });
            return;
        }

        log('MESSAGE_RECEIVED', { peer_id: peerId, type: message.type || 'UNKNOWN' });

        if (message.type === 'PING') {
            send(ws, 'PONG', { received: Date.now() });
            return;
        }

        if (message.type === 'HELLO') {
            send(ws, 'HELLO_ACK', { node_id: NODE_ID, received_node: message.payload?.node_id || null });
            return;
        }

        if (message.type === 'DATA') {
            send(ws, 'DATA_ACK', { accepted: true, message_id: message.payload?.message_id || null });
            return;
        }

        // --- NEW: Receive and save block from Node B ---
        if (message.type === 'NEW_BLOCK') {
            const newBlock = message.payload;
            const chainPath = path.join(__dirname, 'blockchain-data/chain.json');
            try {
                let data = JSON.parse(fs.readFileSync(chainPath, 'utf8'));
                let chainArray = Array.isArray(data) ? data : data.chain;
                if (chainArray && !chainArray.find(b => b.hash === newBlock.hash)) {
                    chainArray.push(newBlock);
                    if (!Array.isArray(data)) {
                        data.chain = chainArray;
                        data.length = chainArray.length;
                        data.saved_at = new Date().toISOString();
                    } else {
                        data = chainArray;
                    }
                    fs.writeFileSync(chainPath, JSON.stringify(data, null, 2));
                    console.log(`[NODE-A] ✅ Block ${newBlock.index} saved. Total: ${chainArray.length}`);
                }
            } catch (err) {
                console.error('[NODE-A] Error saving block:', err.message);
            }
            return;
        }

        send(ws, 'ERROR', { code: 'UNKNOWN_MESSAGE_TYPE', received_type: message.type || null });
    });

    ws.on('close', () => {
        peers.delete(peerId);
        log('PEER_DISCONNECTED', { peer_id: peerId, peers: peers.size });
    });

    ws.on('error', error => {
        log('PEER_ERROR', { peer_id: peerId, error: error.message });
    });
});

// ========== HEARTBEAT ==========
const heartbeat = setInterval(() => {
    for (const [peerId, peer] of peers) {
        if (peer.ws.readyState === WebSocket.OPEN) {
            send(peer.ws, 'PING', { node_id: NODE_ID, uptime: process.uptime() });
        } else {
            peers.delete(peerId);
        }
    }
}, 15000);

// ========== OUTBOUND CONNECTIONS ==========
function connectOutbound() {
    if (shuttingDown || !PEER_ADDRESS) return;
    if (outboundPeer && outboundPeer.readyState !== WebSocket.CLOSED && outboundPeer.readyState !== WebSocket.CLOSING) return;

    log('PEER_OUTBOUND_CONNECTING', { address: PEER_ADDRESS, node_id: NODE_ID });
    const ws = new WebSocket(PEER_ADDRESS, { headers: { 'x-gandom-node': NODE_ID } });
    outboundPeer = ws;
    const peerId = `outbound:${PEER_ADDRESS}`;

    ws.on('open', () => {
        if (shuttingDown) { try { ws.close(); } catch {} return; }
        peers.set(peerId, { id: peerId, ws, direction: 'outbound', address: PEER_ADDRESS, connectedAt: Date.now() });
        log('PEER_OUTBOUND_CONNECTED', { peer_id: peerId, address: PEER_ADDRESS, peers: peers.size });
        send(ws, 'HELLO', { node_id: NODE_ID, direction: 'outbound' });
    });
    
    ws.on('message', raw => {
        let message;
        try { message = JSON.parse(raw.toString()); } catch { return; }
        log('PEER_OUTBOUND_MESSAGE', { peer_id: peerId, type: message.type || null });
        
        if (message.type === 'PING') send(ws, 'PONG', { node_id: NODE_ID, uptime: process.uptime() });
        if (message.type === 'HELLO_ACK') log('PEER_OUTBOUND_HELLO_ACK', { peer_id: peerId, remote_node_id: message.payload?.node_id });
    });

    ws.on('close', () => {
        peers.delete(peerId);
        if (outboundPeer === ws) outboundPeer = null;
        log('PEER_OUTBOUND_DISCONNECTED', { peer_id: peerId, peers: peers.size });
        if (!shuttingDown && !reconnectTimer) {
            reconnectTimer = setTimeout(() => { reconnectTimer = null; connectOutbound(); }, RECONNECT_DELAY);
        }
    });
    ws.on('error', error => log('PEER_OUTBOUND_ERROR', { peer_id: peerId, address: PEER_ADDRESS, error: error.message }));
}

// ========== START SERVER ==========
httpServer.listen(PORT, '0.0.0.0', () => {
    log('NODE_STARTED', { port: PORT, websocket: `ws://0.0.0.0:${PORT}`, health: `http://127.0.0.1:${PORT}/health` });
    if (PEER_ADDRESS) connectOutbound();
});

// ========== SHUTDOWN HANDLERS ==========
function shutdown(signal) {
    shuttingDown = true;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (outboundPeer) { try { outboundPeer.close(); } catch {} outboundPeer = null; }
    log('NODE_SHUTDOWN', { signal });
    clearInterval(heartbeat);
    for (const peer of peers.values()) { try { peer.ws.close(); } catch {} }
    wss.close(() => { httpServer.close(() => { process.exit(0); }); });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

