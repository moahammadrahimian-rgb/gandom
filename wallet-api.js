const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WALLET_FILE = path.join(__dirname, 'wallet-data', 'wallet.json');
const OWNER_KEY = "GANDOM_OWNER_MASTER_2558"; // کلید مخفی مالک

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-owner-key');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let wallet = fs.existsSync(WALLET_FILE) ? JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8')) : { balance: 0 };

    // 1. دریافت موجودی
    if (req.url === '/api/wallet' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify(wallet));
    }

    // 2. واریز سود (فقط برای ایجنت‌ها و حسابدار آزاد است)
    if (req.url === '/api/wallet/deposit' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { amount } = JSON.parse(body);
                wallet.balance += amount;
                fs.writeFileSync(WALLET_FILE, JSON.stringify(wallet, null, 2));
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ success: true, newBalance: wallet.balance }));
            } catch (e) {
                res.writeHead(400); res.end(e.message);
            }
        });
        return;
    }

    // 3. برداشت یا انتقال (فقط با کلید مالک)
    if (req.url === '/api/wallet/withdraw' && req.method === 'POST') {
        const ownerKey = req.headers['x-owner-key'];
        if (ownerKey !== OWNER_KEY) {
            res.writeHead(403, {'Content-Type': 'application/json'});
            return res.end(JSON.stringify({ error: '403 Forbidden: Only the Owner can withdraw.' }));
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { amount } = JSON.parse(body);
                if (wallet.balance >= amount) {
                    wallet.balance -= amount;
                    fs.writeFileSync(WALLET_FILE, JSON.stringify(wallet, null, 2));
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ success: true, newBalance: wallet.balance }));
                } else {
                    res.writeHead(400); res.end(JSON.stringify({ error: 'Insufficient balance' }));
                }
            } catch (e) {
                res.writeHead(400); res.end(e.message);
            }
        });
        return;
    }

    res.writeHead(404); res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`🔐 [SECURE-WALLET] Live on port ${PORT}. Withdrawals locked to Owner Key.`);
});
