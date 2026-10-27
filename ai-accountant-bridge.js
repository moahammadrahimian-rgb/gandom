const http = require('http');

console.log("🧾 [ACCOUNTANT] Unified Financial Bridge Active.");

const server = http.createServer((req, res) => {
    if (req.url === '/api/accountant/profit' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { amount, source } = JSON.parse(body);
                console.log(`💰 [ACCOUNTANT] Received ${amount} GDM from ${source}.`);

                // محاسبه ۵ درصد سهم مالک (اگر نیاز به کسر باشد) - فعلاً کل مبلغ واریز می‌شود
                const ownerShare = amount * 0.05;
                const systemShare = amount - ownerShare;

                console.log(`📊 [ACCOUNTANT] Owner Share (5%): ${ownerShare} GDM | System: ${systemShare} GDM`);

                // ارسال به کیف پول امن
                const walletData = JSON.stringify({ amount: amount });
                const walletReq = http.request({
                    hostname: '127.0.0.1',
                    port: 3000,
                    path: '/api/wallet/deposit',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, (walletRes) => {
                    if (walletRes.statusCode === 200) {
                        console.log(`✅ [ACCOUNTANT] ${amount} GDM deposited securely to Wallet.`);
                    }
                });
                walletReq.write(walletData);
                walletReq.end();

                res.writeHead(200); res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400); res.end(e.message);
            }
        });
    } else {
        res.writeHead(404); res.end();
    }
});

server.listen(4000, '127.0.0.1', () => {
    console.log(`🧾 [ACCOUNTANT] Listening on port 4000 for profit events.`);
});
