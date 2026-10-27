const http = require('http');
const axios = require('axios');
const url = require('url');

const PORT = 5000;
const MERCHANT_ID = "YOUR_REAL_MERCHANT_ID_HERE"; 
const CALLBACK_URL = "https://liver-bite-technological-sheriff.trycloudflare.com/api/verify"; 

const ZARINPAL_REQUEST_URL = "https://api.zarinpal.com/pg/v4/payment/request.json";
const ZARINPAL_VERIFY_URL = "https://api.zarinpal.com/pg/v4/payment/verify.json";

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204); res.end(); return;
    }

    if (req.url === '/api/pay' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { amount, description } = JSON.parse(body);
                const amountInRial = amount * 10;

                const response = await axios.post(ZARINPAL_REQUEST_URL, {
                    merchant_id: MERCHANT_ID,
                    amount: amountInRial,
                    description: description || "پرداخت در اکوسیستم گندم",
                    callback_url: CALLBACK_URL
                });

                if (response.data.data && response.data.data.code === 100) {
                    const authority = response.data.data.authority;
                    const paymentUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ success: true, url: paymentUrl, authority }));
                } else {
                    res.writeHead(400); res.end(JSON.stringify({ error: "Zarinpal Error", details: response.data }));
                }
            } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.url.startsWith('/api/verify') && req.method === 'GET') {
        const queryObject = url.parse(req.url, true).query;
        const authority = queryObject.Authority;
        const status = queryObject.Status;

        if (status === 'OK') {
            try {
                const amountInRial = 100000; 
                const verifyRes = await axios.post(ZARINPAL_VERIFY_URL, {
                    merchant_id: MERCHANT_ID,
                    amount: amountInRial,
                    authority: authority
                });

                if (verifyRes.data.data && verifyRes.data.data.code === 100) {
                    await axios.post('http://127.0.0.1:4000/api/accountant/profit', {
                        amount: 10000, source: 'Zarinpal-Gateway'
                    });
                    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                    res.end("<h2>✅ پرداخت با موفقیت انجام شد.</h2>");
                } else {
                    res.end("❌ Verification Failed.");
                }
            } catch (e) {
                res.end("❌ Error in verification.");
            }
        } else {
            res.end("❌ Payment Cancelled.");
        }
        return;
    }
    res.writeHead(404); res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`🏦 [ZARINPAL] Live on port ${PORT}`);
});
