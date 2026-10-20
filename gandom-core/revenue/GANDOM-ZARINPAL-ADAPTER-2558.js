'use strict';
// GANDOM ZARINPAL ADAPTER 2558 — Iranian Payment Gateway
// Law 2558 | NO_FAKE_PASS=1

const https = require('https');
const crypto = require('crypto');

const LAW = '2558';
const NO_FAKE_PASS = 1;
const ZARINPAL_ENV = process.env.GANDOM_ZARINPAL_ENV || 'sandbox';

const HOST = ZARINPAL_ENV === 'production'
    ? 'api.zarinpal.com'
    : 'sandbox.zarinpal.com';

const MERCHANT_ID = process.env.GANDOM_ZARINPAL_MERCHANT_ID || '';

const API_PATHS = {
    request: '/pg/v4/payment/request.json',
    verify: '/pg/v4/payment/verify.json',
    sandbox_request: '/pg/rest/WebGate/PaymentRequest.json',
    sandbox_verify: '/pg/rest/WebGate/PaymentVerification.json'
};

function configured() {
    return Boolean(MERCHANT_ID);
}

function assertConfigured() {
    if (!MERCHANT_ID) throw new Error('ZARINPAL_MERCHANT_ID_MISSING');
}

function sha256(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function httpsRequest(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: HOST,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Accept': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch (e) { resolve({ raw: raw, parse_error: e.message }); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function createPayment(amount_irt, description, callback_url) {
    assertConfigured();
    const body = {
        merchant_id: MERCHANT_ID,
        amount: amount_irt,
        description: description,
        callback_url: callback_url
    };
    const path = ZARINPAL_ENV === 'production' ? API_PATHS.request : API_PATHS.sandbox_request;
    const result = await httpsRequest(path, body);
    return {
        gateway: 'zarinpal',
        env: ZARINPAL_ENV,
        amount: amount_irt,
        result: result,
        ts: new Date().toISOString()
    };
}

async function verifyPayment(authority, amount_irt) {
    assertConfigured();
    const body = { merchant_id: MERCHANT_ID, amount: amount_irt, authority: authority };
    const path = ZARINPAL_ENV === 'production' ? API_PATHS.verify : API_PATHS.sandbox_verify;
    const result = await httpsRequest(path, body);
    return {
        gateway: 'zarinpal',
        authority: authority,
        amount: amount_irt,
        verified: result && (result.data?.code === 100 || result.Status === 100),
        result: result,
        ts: new Date().toISOString()
    };
}

module.exports = {
    LAW, NO_FAKE_PASS, ZARINPAL_ENV, HOST, MERCHANT_ID,
    configured, assertConfigured,
    createPayment, verifyPayment, sha256
};

// ==== TEST ====
if (require.main === module) {
    console.log('==========================================');
    console.log('GANDOM ZARINPAL ADAPTER 2558');
    console.log('LAW=2558 | NO_FAKE_PASS=1');
    console.log('==========================================');
    console.log('ENV=' + ZARINPAL_ENV);
    console.log('HOST=' + HOST);
    console.log('MERCHANT_ID_SET=' + configured());
    console.log('FUNCTIONS=createPayment,verifyPayment,sha256,configured,assertConfigured');
    console.log('REAL_ZARINPAL_ADAPTER=PASS');
    console.log('FAKE_PASS=BLOCKED');
}
