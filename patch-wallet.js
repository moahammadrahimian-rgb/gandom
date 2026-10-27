const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
const route = `
        if (req.url === '/api/wallet' && req.method === 'GET') {
            const walletPath = require('path').join(__dirname, 'wallet-data', 'wallet.json');
            if (fs.existsSync(walletPath)) {
                res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                return res.end(fs.readFileSync(walletPath, 'utf8'));
            }
        }
`;
if (!code.includes('/api/wallet')) {
    code = code.replace(/(const server = http\.createServer\(\(req, res\) => \{)/, `$1\n${route}`);
    fs.writeFileSync('server.js', code);
}
