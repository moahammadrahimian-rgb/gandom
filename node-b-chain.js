const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');

const NODE_A_URL = 'ws://127.0.0.1:8787';
let ws;

function mineBlock() {
    try {
        let index = 1;
        let prevHash = '0';

        try {
            const mainChainPath = './blockchain-data/chain.json';
            if (fs.existsSync(mainChainPath)) {
                const d = JSON.parse(fs.readFileSync(mainChainPath, 'utf8'));
                const c = d.chain || d;
                if (Array.isArray(c) && c.length > 0) {
                    const lastBlock = c[c.length - 1];
                    index = lastBlock.index + 1;
                    prevHash = lastBlock.hash;
                }
            }
        } catch (e) {
            console.log('⚠️ Error reading chain file:', e.message);
        }

        let block = {
            index: index,
            previousHash: prevHash,
            timestamp: Date.now(),
            tx: "MINED_BY_NODE_B",
            hash: crypto.createHash('sha256').update(index.toString() + prevHash + Date.now()).digest('hex')
        };

        console.log('⛏ Mined Block:', index);

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'NEW_BLOCK', payload: block }));
        }
    } catch (e) {
        console.error('❌ MINING ERROR:', e.message);
    }
}

let miningTimer = null;
let reconnectTimer = null;

function connect() {
    ws = new WebSocket(NODE_A_URL);
    
    ws.on('open', () => {
        console.log('✅ Connected to Node A');
        ws.send(JSON.stringify({ type: 'HELLO', node_id: 'NODE-B' }));

        if (!miningTimer) {
            miningTimer = setInterval(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    Promise.resolve(mineBlock()).catch(err =>
                        console.error('MINING ERROR:', err.message)
                    );
                }
            }, 500);
        }
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type !== 'PING') console.log('📩 Received:', msg.type);
        } catch(e){}
    });

    ws.on('close', () => {
        if (miningTimer) {
            clearInterval(miningTimer);
            miningTimer = null;
        }
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connect();
            }, 3000);
        }
    });
    
    ws.on('error', (err) => console.log('Error:', err.message));
}

connect();
