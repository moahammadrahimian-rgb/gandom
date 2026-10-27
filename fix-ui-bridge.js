const fs = require('fs');
const file = './server.js';
let code = fs.readFileSync(file, 'utf8');

// 1. اضافه کردن هدرهای CORS
const corsCode = `
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
`;

// 2. اضافه کردن APIهای Wallet و AI برای داشبورد
const dashboardRoutes = `
        if (req.url === '/api/wallet' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'application/json'});
            return res.end(JSON.stringify({ status: 'ONLINE', balance: 1000, currency: 'GDM' }));
        }
        if (req.url === '/api/ai/status' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'application/json'});
            return res.end(JSON.stringify({ status: 'ONLINE', model: 'Neural-Alpha-6', neurons: 4096 }));
        }
        if (req.url === '/api/chain' && req.method === 'GET') {
            const chainData = fs.existsSync('./blockchain-data/chain.json') ? fs.readFileSync('./blockchain-data/chain.json', 'utf8') : '{"chain":[]}';
            res.writeHead(200, {'Content-Type': 'application/json'});
            return res.end(chainData);
        }
`;

if (!code.includes('Access-Control-Allow-Origin')) {
    // تزریق کدها در ابتدای تابع createServer
    code = code.replace(/const server = http\.createServer\(\(req, res\) => \{/, 
    `const server = http.createServer((req, res) => {\n${corsCode}\n${dashboardRoutes}`);
    
    fs.writeFileSync(file, code);
    console.log("✅ server.js patched: CORS & Dashboard APIs added!");
} else {
    console.log("⚠️ Patches already applied.");
}
