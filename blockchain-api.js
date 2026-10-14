// ═══════════════════════════════════════════════════════
// 🔗 GANDOM BLOCKCHAIN API
// ═══════════════════════════════════════════════════════

function handleBlockchainAPI(req, res, url, method, chain) {
    const path = url.split('?')[0];
    
    // ─── GET /api/chain ───
    if (path === '/api/chain' && method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        });
        return res.end(JSON.stringify({
            ok: true,
            chain: chain.chain.map(b => ({
                index: b.index,
                hash: b.hash.substring(0, 16) + '...',
                prevHash: b.prevHash.substring(0, 16) + '...',
                timestamp: b.timestamp,
                tx_count: b.transactions.length,
                nonce: b.nonce
            }))
        }));
    }
    
    // ─── GET /api/chain/stats ───
    if (path === '/api/chain/stats' && method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        });
        return res.end(JSON.stringify({
            ok: true,
            ...chain.getStats()
        }));
    }
    
    // ─── GET /api/chain/block/:index ───
    if (path.startsWith('/api/chain/block/') && method === 'GET') {
        const index = parseInt(path.split('/').pop());
        const block = chain.chain.find(b => b.index === index);
        
        if (!block) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: 'BLOCK_NOT_FOUND' }));
        }
        
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        return res.end(JSON.stringify({ ok: true, block: block.toJSON() }));
    }
    
    // ─── POST /api/chain/mine ───
    if (path === '/api/chain/mine' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                const txs = data.transactions || [
                    {
                        from: 'COINBASE',
                        to: data.miner || 'GDM' + Math.random().toString(16).substr(2, 40),
                        amount: 50,
                        fee: 0,
                        timestamp: Date.now()
                    }
                ];
                
                const block = chain.mineBlock(txs);
                
                // پخش بلوک به همه نودها
                try {
                    const { broadcastNewBlock } = require('./blockchain-p2p-handler.js');
                    const peers = (global.__gandom_peers || new Map());
                    broadcastNewBlock(block, peers);
                } catch(e) { console.error('Broadcast error:', e.message); }
                
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8'
                });
                return res.end(JSON.stringify({
                    ok: true,
                    message: 'BLOCK_MINED',
                    block: {
                        index: block.index,
                        hash: block.hash,
                        nonce: block.nonce,
                        tx_count: block.transactions.length
                    }
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
        return;
    }
    
    // ─── POST /api/chain/tx ───
    if (path === '/api/chain/tx' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const tx = JSON.parse(body);
                
                if (!tx.from || !tx.to || !tx.amount) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                        ok: false, 
                        error: 'MISSING_FIELDS',
                        required: ['from', 'to', 'amount']
                    }));
                }
                
                const fullTx = {
                    from: tx.from,
                    to: tx.to,
                    amount: tx.amount,
                    fee: tx.fee || 0.001,
                    timestamp: Date.now(),
                    txid: require('crypto').createHash('sha256')
                        .update(tx.from + tx.to + tx.amount + Date.now())
                        .digest('hex').substring(0, 16)
                };
                
                chain.pendingTx.push(fullTx);
                chain.save();
                
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8'
                });
                return res.end(JSON.stringify({
                    ok: true,
                    message: 'TX_ADDED_TO_POOL',
                    tx: fullTx,
                    pending_count: chain.pendingTx.length
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
        return;
    }
    
    // ─── GET /api/chain/pending ───
    if (path === '/api/chain/pending' && method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        return res.end(JSON.stringify({
            ok: true,
            pending: chain.pendingTx,
            count: chain.pendingTx.length
        }));
    }
    
    // ─── GET /api/chain/validate ───
    if (path === '/api/chain/validate' && method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        return res.end(JSON.stringify({
            ok: true,
            is_valid: chain.isValid(),
            length: chain.chain.length
        }));
    }
    
    // اگه هیچ‌کدوم نبود → false برگردون
    return false;
}

module.exports = { handleBlockchainAPI };
