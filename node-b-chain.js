const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');

const NODE_A_URL = 'ws://127.0.0.1:8787';
let ws;

function mineBlock() {
    try {
        // خواندن طول زنجیره از فایل (فقط برای شماره‌گذاری)
        let index = Date.now() % 10000; 
        
        let block = {
            index: index,
            timestamp: Date.now(),
            tx: "MINED_BY_NODE_B",
            hash: crypto.createHash('sha256').update(index.toString()).digest('hex')
        };

        console.log('⛏️ Mined Block:', index);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'NEW_BLOCK', payload: block }));
        }
    } catch (e) {
        console.error('❌ MINING ERROR:', e.message);
    }
}

function connect() {
    ws = new WebSocket(NODE_A_URL);
    ws.on('open', () => {
        console.log('✅ Connected to Node A');
        ws.send(JSON.stringify({ type: 'HELLO', node_id: 'NODE-B' }));
        
        // این خط تضمین می‌کند که هر 5 ثانیه یکبار بلاک ساخته شود
        setInterval(mineBlock, 5000); 
    });
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type !== 'PING') console.log('📩 Received:', msg.type);
        } catch(e){}
    });
    
    ws.on('close', () => setTimeout(connect, 3000));
    ws.on('error', (err) => console.log('Error:', err.message));
}
connect();
