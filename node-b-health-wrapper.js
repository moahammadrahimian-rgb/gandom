'use strict';

const http = require('http');
const path = require('path');

let p2pLoaded = false;
let p2pError = null;

try {
  require(path.join(__dirname, 'node-b-persistent.js'));
  p2pLoaded = true;
  console.log('[NODE-B] P2P module loaded');
} catch (err) {
  p2pError = err && err.message ? err.message : String(err);
  console.error('[NODE-B] P2P module load failed:', p2pError);
}

process.on('uncaughtException', (err) => {
  console.error('[NODE-B] uncaughtException:', err.stack || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[NODE-B] unhandledRejection:', reason);
});

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET' && req.url.split('?')[0] === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: 'ok',
      node: 'B',
      service: 'GANDOM-NODE-B',
      p2p_module_loaded: p2pLoaded,
      p2p_load_error: p2pError,
      timestamp: new Date().toISOString()
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ status: 'not_found' }));
});

server.on('error', (err) => {
  console.error('[NODE-B] HTTP server error:', err.stack || err);
  process.exitCode = 1;
});

server.listen(8788, '127.0.0.1', () => {
  console.log('[NODE-B] HTTP_READY 127.0.0.1:8788');
});
