const http = require('http');
const PORT = 9090;
const HOST = '127.0.0.1';
const CHAIN_API = process.env.GANDOM_CHAIN_API || 'http://127.0.0.1:8787/api/chain';

console.log(`[BRIDGE] Starting Integration Bridge...`);
console.log(`[BRIDGE] Listening on http://${HOST}:${PORT}`);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ALIVE', bridge: 'ACTIVE' }));
});

server.listen(PORT, HOST, () => {
    console.log(`[BRIDGE] Bridge is ready.`);
});
