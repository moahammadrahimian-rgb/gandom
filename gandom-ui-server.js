const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname);
const WWW = path.join(ROOT, 'www');
const PORT = Number(process.env.PORT || 8080);

const state = {
  economy: { symbol: 'GDM', totalSupply: 24000000000, ownerAllocation: 1200000000, ownerPercent: 5 },
  users: { target: 8000000000, actual: 0 },
  wallet: { balance: 0, pending: 0, currency: 'GDM' },
  exchange: { price: 1, change24h: 12.36, volume24h: 1250000, high24h: 1.05, low24h: 0.95, feePercent: 1 },
  ads: { priceToman: 10000, dailyTarget: 1000, todaySold: 0, revenueToman: 0 },
  runtime: { p2p: 'READY', dht: 'READY', ipfs: 'READY', blockchain: 'READY', security: 'READY', tor: 'SIMULATOR', ai: 'READY' },
  ledger: [],
  industries: { gold: { listings: 247, leads: 89, sales: 12, revenueToman: 0 }, realEstate: { listings: 512, leads: 156, sales: 8, revenueToman: 0 }, auto: { listings: 341, leads: 203, sales: 15, revenueToman: 0 } },
  socialBots: { instagram: { active: 342, total: 500, posts: 1240 }, telegram: { active: 487, total: 600, posts: 2156 }, twitter: { active: 231, total: 400, posts: 892 }, youtube: { active: 156, total: 300, posts: 421 }, whatsapp: { active: 312, total: 450, posts: 1567 } },
  aiEngine: { status: 'ACTIVE', mode: 'AUTONOMOUS', totalSales: 0, uptime: 0, version: '2558' },
  p2p: { status: 'READY', nodeId: 'gandom-node-2558', peers: 0, uptime: 0 },
  dht: { status: 'READY', buckets: 160, k: 20, routingTable: 0 },
  ipfs: { status: 'READY', cids: 0, blocks: 0, sizeMB: 0 },
  blockchain: { status: 'READY', height: 0, lastBlockHash: '0'.repeat(64), mempool: 0, utxo: 0 },
  security: { status: 'READY', sha256: true, aes256: true, rsa2048: true, ownerGate: true },
  tor: { status: 'SIMULATOR', circuits: 0 },
  orderbook: { bids: [], asks: [] },
  kyc: { verified: false, level: 'NONE', fullName: '', nationalId: '' }
};

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1048576) { reject(new Error('BODY_TOO_LARGE')); req.destroy(); } });
    req.on('end', () => { if (!body) return resolve({}); try { resolve(JSON.parse(body)); } catch { reject(new Error('INVALID_JSON')); } });
    req.on('error', reject);
  });
}

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const requested = clean === '/' ? '/index.html' : clean;
  const file = path.resolve(WWW, '.' + requested);
  if (!file.startsWith(WWW + path.sep)) return null;
  return file;
}

function sendFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    const ext = path.extname(file);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function snapshot() {
  return { economy: state.economy, users: state.users, wallet: state.wallet, exchange: state.exchange, ads: state.ads, runtime: state.runtime, ledger: state.ledger.slice(-20) };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || '127.0.0.1'));
  try {
    if (req.method === 'GET' && url.pathname === '/health')
      return json(res, 200, { ok: true, service: 'GANDOM', port: PORT, timestamp: new Date().toISOString() });
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, snapshot());
    if (req.method === 'GET' && url.pathname === '/api/economy') return json(res, 200, state.economy);
    if (req.method === 'GET' && url.pathname === '/api/exchange') return json(res, 200, state.exchange);
    if (req.method === 'GET' && url.pathname === '/api/wallet') return json(res, 200, state.wallet);
    if (req.method === 'GET' && url.pathname === '/api/ads') return json(res, 200, state.ads);

    if (req.method === 'POST' && url.pathname === '/api/wallet/income') {
      const body = await parseBody(req);
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return json(res, 400, { ok: false, error: 'INVALID_AMOUNT' });
      state.wallet.balance += amount;
      const event = { id: crypto.randomUUID(), type: 'EXCHANGE_INCOME', amount, currency: 'GDM', timestamp: new Date().toISOString() };
      state.ledger.push(event);
      return json(res, 200, { ok: true, event, wallet: state.wallet });
    }

    if (req.method === 'POST' && url.pathname === '/api/wallet/owner-transfer') {
      const body = await parseBody(req);
      if (body.ownerAuth !== 'GANDOM_OWNER_AUTH') return json(res, 403, { ok: false, error: 'OWNER_AUTH_REQUIRED' });
      const amount = Number(body.amount);
      const destination = String(body.destination || '').trim();
      if (!Number.isFinite(amount) || amount <= 0) return json(res, 400, { ok: false, error: 'INVALID_AMOUNT' });
      if (!destination) return json(res, 400, { ok: false, error: 'DESTINATION_REQUIRED' });
      if (amount > state.wallet.balance) return json(res, 400, { ok: false, error: 'INSUFFICIENT_BALANCE' });
      state.wallet.balance -= amount;
      const event = { id: crypto.randomUUID(), type: 'OWNER_AUTHORIZED_TRANSFER', amount, currency: 'GDM', destination, timestamp: new Date().toISOString() };
      state.ledger.push(event);
      return json(res, 200, { ok: true, event, wallet: state.wallet });
    }

    if (req.method === 'POST' && url.pathname === '/api/ads/sale') {
      state.ads.todaySold += 1;
      state.ads.revenueToman += state.ads.priceToman;
      return json(res, 200, { ok: true, sale: { priceToman: state.ads.priceToman, timestamp: new Date().toISOString() }, ads: state.ads });
    }

    if (req.method === 'POST' && url.pathname === '/api/ai') {
      const body = await parseBody(req);
      return json(res, 200, { ok: true, mode: 'SAFE_RUNTIME', message: 'GANDOM AI: ' + String(body.message || '').slice(0, 500), financialAuthority: false });
    }
  if (req.method === 'GET' && url.pathname === '/api/users') return json(res, 200, state.users);
  if (req.method === 'GET' && url.pathname === '/api/bots') return json(res, 200, state.socialBots);
  if (req.method === 'GET' && url.pathname === '/api/ai-engine') return json(res, 200, state.aiEngine);
  if (req.method === 'GET' && url.pathname === '/api/ledger') return json(res, 200, state.ledger);
  if (req.method === 'GET' && url.pathname === '/api/p2p') return json(res, 200, state.p2p);
  if (req.method === 'GET' && url.pathname === '/api/dht') return json(res, 200, state.dht);
  if (req.method === 'GET' && url.pathname === '/api/ipfs') return json(res, 200, state.ipfs);
  if (req.method === 'GET' && url.pathname === '/api/security') return json(res, 200, state.security);
  if (req.method === 'GET' && url.pathname === '/api/blockchain') return json(res, 200, state.blockchain);
  if (req.method === 'GET' && url.pathname === '/api/tor') return json(res, 200, state.tor);
  if (req.method === 'GET' && url.pathname === '/api/orderbook') return json(res, 200, state.orderbook);
  if (req.method === 'POST' && url.pathname === '/api/exchange/buy') {
    const body = await parseBody(req);
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json(res, 400, { ok: false, error: 'INVALID_AMOUNT' });
    const cost = amount * state.exchange.price;
    const fee = cost * (state.exchange.feePercent / 100);
    state.wallet.balance += amount;
    const event = { id: crypto.randomUUID(), type: 'EXCHANGE_BUY', amount, price: state.exchange.price, cost, fee, timestamp: new Date().toISOString() };
    state.ledger.push(event);
    return json(res, 200, { ok: true, event, wallet: state.wallet, cost, fee });
  }
  if (req.method === 'POST' && url.pathname === '/api/exchange/sell') {
    const body = await parseBody(req);
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json(res, 400, { ok: false, error: 'INVALID_AMOUNT' });
    if (state.wallet.balance < amount) return json(res, 400, { ok: false, error: 'INSUFFICIENT_BALANCE' });
    const revenue = amount * state.exchange.price;
    const fee = revenue * (state.exchange.feePercent / 100);
    state.wallet.balance -= amount;
    const event = { id: crypto.randomUUID(), type: 'EXCHANGE_SELL', amount, price: state.exchange.price, revenue, fee, timestamp: new Date().toISOString() };
    state.ledger.push(event);
    return json(res, 200, { ok: true, event, wallet: state.wallet, revenue, fee });
  }
  if (req.method === 'POST' && url.pathname === '/api/kyc/verify') {
    const body = await parseBody(req);
    const fullName = String(body.fullName || '').trim();
    const nationalId = String(body.nationalId || '').trim();
    if (!fullName || !nationalId) return json(res, 400, { ok: false, error: 'KYC_DATA_REQUIRED' });
    if (!/^\d{10}$/.test(nationalId)) return json(res, 400, { ok: false, error: 'INVALID_NATIONAL_ID' });
    state.kyc = { verified: true, level: 'GOLD', fullName, nationalId, verifiedAt: new Date().toISOString() };
    state.users.verified += 1;
    return json(res, 200, { ok: true, kyc: state.kyc, message: 'KYC_VERIFIED' });
  }


    if (req.method === 'GET') {
      const file = safePath(url.pathname);
      if (!file) { res.writeHead(403); return res.end('403'); }
      return sendFile(res, file);
    }

    json(res, 404, { ok: false, error: 'NOT_FOUND' });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('GANDOM_SERVER=http://127.0.0.1:' + PORT);
  console.log('GANDOM_HEALTH=http://127.0.0.1:' + PORT + '/health');
});
