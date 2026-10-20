'use strict';

const crypto = require('crypto');
const https = require('https');

const LAW = 2558;
const NO_FAKE_PASS = 1;

const FPAY_ENV = process.env.GANDOM_FPAY_ENV || 'test';

const HOST =
  FPAY_ENV === 'production'
    ? 'ecommerce.fpay.az'
    : 'ecommerce.fpay.az';

const API_KEY = process.env.GANDOM_FPAY_API_KEY || '';
const AUTH_KEY = process.env.GANDOM_FPAY_AUTH_KEY || '';
const MERCHANT_NAME = process.env.GANDOM_FPAY_MERCHANT_NAME || '';

const SUCCESS_STATUSES = new Set(['SUCCESS']);
const AUTHORIZED_STATUSES = new Set(['AUTHORIZED']);

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmacSha256(key, value) {
  return crypto
    .createHmac('sha256', key)
    .update(value, 'utf8')
    .digest('hex');
}

function assertConfigured() {
  if (!API_KEY) throw new Error('FPAY_API_KEY_MISSING');
  if (!AUTH_KEY) throw new Error('FPAY_AUTH_KEY_MISSING');
  if (!MERCHANT_NAME) throw new Error('FPAY_MERCHANT_NAME_MISSING');
}

function signRequest(method, path, body) {
  assertConfigured();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = sha256(body);

  const signing =
    `${timestamp}.${method.toUpperCase()}.${path}.${bodyHash}`;

  const signature = hmacSha256(AUTH_KEY, signing);

  return {
    'X-Api-Key': API_KEY,
    'X-Timestamp': timestamp,
    'X-Signature': signature
  };
}

function request(method, path, payload = {}) {
  const body = JSON.stringify(payload);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  };

  Object.assign(headers, signRequest(method, path, body));

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: HOST,
        port: 443,
        method,
        path,
        headers,
        timeout: 15000
      },
      res => {
        let data = '';

        res.setEncoding('utf8');

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          let parsed;

          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            return reject(
              new Error(`FPAY_INVALID_JSON_HTTP_${res.statusCode}`)
            );
          }

          resolve({
            httpStatus: res.statusCode,
            data: parsed
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('FPAY_REQUEST_TIMEOUT'));
    });

    req.on('error', reject);

    req.write(body);
    req.end();
  });
}

function validateOrderId(orderId) {
  if (
    typeof orderId !== 'string' ||
    !/^[A-Za-z0-9._-]{1,64}$/.test(orderId)
  ) {
    throw new Error('INVALID_MERCHANT_TRANSACTION_ID');
  }
}

function validateAmountMinor(amountMinor) {
  if (
    !Number.isInteger(amountMinor) ||
    amountMinor <= 0
  ) {
    throw new Error('INVALID_AMOUNT_MINOR');
  }
}

async function createPayment({
  orderId,
  amountMinor,
  callbackUrl,
  webhookUrl,
  description,
  customer,
  lang = 'en',
  transactionType = 'SMS',
  paymentMethod = 'CARD'
}) {
  validateOrderId(orderId);
  validateAmountMinor(amountMinor);

  if (!/^https:\/\//.test(callbackUrl)) {
    throw new Error('CALLBACK_URL_MUST_BE_HTTPS');
  }

  if (!/^https:\/\//.test(webhookUrl)) {
    throw new Error('WEBHOOK_URL_MUST_BE_HTTPS');
  }

  if (!customer || !customer.fullName || !customer.phone) {
    throw new Error('CUSTOMER_REQUIRED');
  }

  const payload = {
    merchantName: MERCHANT_NAME,
    merchantTransactionId: orderId,
    amount: amountMinor,
    transactionType,
    paymentMethod,
    lang,
    callbackUrl,
    webhookUrl,
    description,
    customer
  };

  const result = await request(
    'POST',
    '/get-payment-key',
    payload
  );

  const data = result.data?.data || {};

  return {
    httpStatus: result.httpStatus,
    status: result.data?.status,
    requestTrackId: result.data?.meta?.requestTrackId || null,
    paymentKey: data.paymentKey || null,
    redirectUrl: data.redirectUrl || null,
    raw: result.data
  };
}

async function getResult({ paymentKey, merchantTransactionId }) {
  if (!paymentKey && !merchantTransactionId) {
    throw new Error('PAYMENT_LOOKUP_KEY_REQUIRED');
  }

  const payload = {};

  if (paymentKey) {
    payload.paymentKey = paymentKey;
  } else {
    payload.merchantTransactionId = merchantTransactionId;
    payload.merchantName = MERCHANT_NAME;
  }

  const result = await request(
    'POST',
    '/result',
    payload
  );

  const data = result.data?.data || {};

  return {
    httpStatus: result.httpStatus,
    envelopeStatus: result.data?.status,
    requestTrackId: result.data?.meta?.requestTrackId || null,
    paymentKey: data.paymentKey || paymentKey || null,
    merchantTransactionId:
      data.merchantTransactionId ||
      merchantTransactionId ||
      null,
    status: data.status || null,
    amount: Number.isInteger(data.amount) ? data.amount : null,
    failureReason: data.failureReason || '',
    raw: result.data
  };
}

function isSettledPayment(result) {
  return (
    SUCCESS_STATUSES.has(result.status) ||
    AUTHORIZED_STATUSES.has(result.status)
  );
}

function isFinalFailure(result) {
  return new Set([
    'ERROR',
    'FAILED',
    'CANCELED',
    'TIMEOUT',
    'REVERSED',
    'REFUNDED',
    'PARTIAL_REFUNDED'
  ]).has(result.status);
}

function buildWebhookResult(paymentKey) {
  if (
    typeof paymentKey !== 'string' ||
    paymentKey.length < 10
  ) {
    throw new Error('INVALID_PAYMENT_KEY');
  }

  return {
    ok: true,
    law: LAW,
    noFakePass: NO_FAKE_PASS,
    paymentKey,
    action: 'SERVER_SIDE_RESULT_REQUIRED'
  };
}

module.exports = {
  LAW,
  NO_FAKE_PASS,
  FPAY_ENV,
  HOST,
  signRequest,
  request,
  createPayment,
  getResult,
  isSettledPayment,
  isFinalFailure,
  buildWebhookResult
};

if (require.main === module) {
  console.log('===== GANDOM 2558 — FPAY ADAPTER PREFLIGHT =====');
  console.log(`LAW=${LAW}`);
  console.log(`NO_FAKE_PASS=${NO_FAKE_PASS}`);

  if (!API_KEY || !AUTH_KEY || !MERCHANT_NAME) {
    console.log('FPAY_CREDENTIAL_PREFLIGHT=BLOCKED');
    console.log('REAL_PAYMENT=NOT_EXECUTED');
    console.log('WALLET_CREDIT=BLOCKED');
    console.log('REVENUE_PASS=NOT_ALLOWED');
    process.exit(0);
  }

  console.log('FPAY_CREDENTIAL_PREFLIGHT=READY');
  console.log('REAL_PAYMENT=NOT_EXECUTED');
  console.log('WALLET_CREDIT=BLOCKED');
  console.log('REVENUE_PASS=NOT_ALLOWED');
}
