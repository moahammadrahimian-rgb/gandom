// ==========================================
// Gandom Core - P2P Network (Final Version)
// ==========================================

const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const DHT = require('./dht');

// ==========================================
// تنظیمات اولیه و مدیریت داده‌ها
// ==========================================
const DATA_FILE = 'data.json';
let savedData = { ads: {}, users: {}, coins: {} };

if (fs.existsSync(DATA_FILE)) {
    try {
        savedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log('✅ Data loaded from file.');
    } catch (e) {
        console.log('⚠️ Read error:', e.message);
    }
}

function saveData() {
    try {
        const data = { 
            ads: Object.fromEntries(ads), 
            users: Object.fromEntries(users), 
            coins: Object.fromEntries(coins) 
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('⚠️ Save error:', e.message);
    }
}

// ==========================================
// ساختار داده‌ها (Maps)
// ==========================================
const ads = new Map(Object.entries(savedData.ads || {}));
const users = new Map(Object.entries(savedData.users || {}));
const coins = new Map(Object.entries(savedData.coins || {}));

// ==========================================
// تولید کلید رمزنگاری
// ==========================================
const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// ==========================================
// راه‌اندازی سرور (پورت از خط فرمان گرفته می‌شود)
// ==========================================
const dht = new DHT();
console.log(`🌐 DHT Node ID: ${dht.getNodeId()}`);

const PORT = process.argv[2] ? parseInt(process.argv[2]) : 8080;
const PEER_ADDRESS = process.argv[3] || null; // آدرس نود دیگر برای اتصال

const wss = new WebSocket.Server({ port: PORT });
const clients = new Map();
const clientDhtNodes = new Map();

console.log(`🚀 Gandom Core running on ws://127.0.0.1:${PORT}`);

// ==========================================
// مدیریت اتصالات ورودی
// ==========================================
wss.on('connection', ws => {
    const clientId = crypto.randomBytes(8).toString('hex');

    // ثبت واقعی Client به عنوان Peer در DHT
    const peerNodeId = crypto.createHash('sha1')
      .update(clientId + ':' + PORT)
      .digest('hex');

    const peerAddress =
      ws._socket && ws._socket.remoteAddress
        ? `${ws._socket.remoteAddress}:${ws._socket.remotePort || ''}`
        : `client://${clientId}`;

    clients.set(clientId, ws);

    const addedToDht = dht.addPeer(peerNodeId, peerAddress);

    if (addedToDht) {
      clientDhtNodes.set(clientId, peerNodeId);
      console.log(
        `🔗 P2P → DHT registered: ${clientId} -> ${peerNodeId} -> ${peerAddress}`
      );
    } else {
      console.log(
        `⚠️ P2P client connected but DHT rejected peer: ${clientId}`
      );
    }

    console.log(`✅ Client connected: ${clientId}`);

    // ارسال داده‌های اولیه به کلاینت جدید
    ws.send(JSON.stringify({
        type: 'init',
        ads: Object.fromEntries(ads),
        users: Object.fromEntries(users),
        coins: Object.fromEntries(coins)
    }));

    // دریافت پیام از کلاینت
    ws.on('message', msg => {
        try {
            const data = JSON.parse(msg);
            
            // افزودن آگهی جدید
            if (data.type === 'add_ad') {
                const id = crypto.randomBytes(6).toString('hex');
                ads.set(id, { ...data.ad, id, createdAt: Date.now() });
                saveData();
                broadcast({ type: 'new_ad', ad: { ...data.ad, id } });
                console.log('📢 New ad added:', id);
            }

            // افزودن کاربر جدید
            if (data.type === 'add_user') {
                users.set(data.user.phone, data.user);
                saveData();
                broadcast({ type: 'new_user', user: data.user });
                console.log('👤 New user added:', data.user.phone);
            }

            // انتقال سکه
            if (data.type === 'send_coin') {
                const from = coins.get(data.from) || 0;
                const to = coins.get(data.to) || 0;
                if (from >= data.amount) {
                    coins.set(data.from, from - data.amount);
                    coins.set(data.to, to + data.amount);
                    saveData();
                    broadcast({ type: 'coin_sent', from: data.from, to: data.to, amount: data.amount });
                    console.log(`💰 Coin sent: ${data.amount} from ${data.from} to ${data.to}`);
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Insufficient balance' }));
                }
            }

        } catch (e) {
            console.log('⚠️ Error:', e.message);
        }
    });

    // قطع اتصال کلاینت
    ws.on('close', () => {
        clients.delete(clientId);

        const nodeId = clientDhtNodes.get(clientId);

        if (nodeId) {
            dht.removePeer(nodeId);
            clientDhtNodes.delete(clientId);

            console.log(
                `🗑️ DHT Peer removed: ${nodeId} | Client disconnected: ${clientId}`
            );
        } else {
            console.log(`⚠️ No DHT Peer found for client: ${clientId}`);
        }

        console.log(`❌ Client disconnected: ${clientId}`);
    });

    ws.on('error', (err) => {
        console.log(`⚠️ Socket error: ${err.message}`);
    });
});

// ==========================================
// تابع ارسال پیام به همه کلاینت‌ها (Broadcast)
// ==========================================
function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });
}

// ==========================================
// اتصال خودکار به نود دیگر (P2P Client)
// ==========================================
if (PEER_ADDRESS) {
    console.log(`🔗 Connecting to peer: ${PEER_ADDRESS}...`);
    const client = new WebSocket(`ws://${PEER_ADDRESS}`);

    client.on('open', () => {
        console.log(`✅ Connected to peer: ${PEER_ADDRESS}`);
        clients.set('peer_' + PEER_ADDRESS, client);
    });

    client.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            console.log(`📩 Received from peer:`, data.type);
            // پردازش پیام‌های دریافتی از نود دیگر
            if (data.type === 'new_ad') {
                ads.set(data.ad.id, data.ad);
                saveData();
            }
            if (data.type === 'new_user') {
                users.set(data.user.phone, data.user);
                saveData();
            }
        } catch (e) {
            console.log('⚠️ Peer message error:', e.message);
        }
    });

    client.on('close', () => {
        console.log(`❌ Disconnected from peer: ${PEER_ADDRESS}`);
    });

    client.on('error', (err) => {
        console.log(`⚠️ Peer connection error: ${err.message}`);
    });
}
