const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server.js');
let code = fs.readFileSync(file, 'utf8');

// ۱. اضافه کردن API برای خواندن زنجیره (کاوشگر)
const chainRoute = `
        if (req.url === '/api/chain' && req.method === 'GET') {
            try {
                const chainData = fs.readFileSync('./blockchain-data/chain.json', 'utf8');
                res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                res.end(chainData);
            } catch(e) {
                res.writeHead(500); res.end(JSON.stringify({error: e.message}));
            }
            return;
        }
`;

// ۲. اضافه کردن API برای وضعیت AI
const aiRoute = `
        if (req.url === '/api/ai/status' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify({ status: 'ONLINE', neurons: 4096, generation: 1 }));
            return;
        }
`;

// ۳. اضافه کردن API برای کیف پول
const walletRoute = `
        if (req.url === '/api/wallet' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify({ balance: 1250.50, currency: 'GDM', status: 'ONLINE' }));
            return;
        }
`;

// پیدا کردن محل قرارگیری روترها و تزریق کدها
const insertPoint = code.indexOf("const server = http.createServer");
if (insertPoint !== -1) {
    const firstBrace = code.indexOf("{", insertPoint);
    if (firstBrace !== -1) {
        code = code.slice(0, firstBrace + 1) + chainRoute + aiRoute + walletRoute + code.slice(firstBrace + 1);
        fs.writeFileSync(file, code);
        console.log("✅ server.js patched with missing API routes!");
    }
} else {
    console.log("⚠️ Could not find insertion point in server.js");
}
