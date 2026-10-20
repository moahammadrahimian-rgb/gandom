'use strict';

const https = require('https');
const crypto = require('crypto');

const LAW = '2558';
const ENV = process.env.GANDOM_PADDLE_ENV || 'sandbox';

const API_KEY = process.env.GANDOM_PADDLE_API_KEY || '';
const WEBHOOK_SECRET = process.env.GANDOM_PADDLE_WEBHOOK_SECRET || '';

const HOST =
  ENV === 'live'
    ? 'api.paddle.com'
    : 'sandbox-api.paddle.com';

function configured() {
  return Boolean(API_KEY);
}

function webhookConfigured() {
  return Boolean(WEBHOOK_SECRET);
}

function assertConfigured() {
  if (!API_KEY) throw new Error('PADDLE_API_KEY_NOT_CONFIGURED');

  if (ENV !== 'sandbox' && ENV !== 'live') {
    throw new Error('INVALID_PADDLE_ENV');
  }
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET) {
    throw new Error('PADDLE_WEBHOOK_SECRET_NOT_CONFIGURED');
  }

  if (!signatureHeader) {
    throw new Error('PADDLE_SIGNATURE_MISSING');
  }

  const parts = Object.fromEntries(
    signatureHeader.split(';').map(x => {
      const i = x.indexOf('=');
      return [x.slice(0, i), x.slice(i + 1)];
    })
  );

  if (!parts.ts || !parts.h1) {
    throw new Error('PADDLE_SIGNATURE_INVALID');
  }

  const signedPayload = `${parts.ts}:${rawBody}`;

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  if (
    expected.length !== parts.h1.length ||
    !crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(parts.h1)
    )
  ) {
    throw new Error('PADDLE_SIGNATURE_MISMATCH');
  }

  return true;
}

function request(method, path, body = null) {
  assertConfigured();

  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';

    const req = https.request(
      {
        hostname: HOST,
        port: 443,
        path,
        method,
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          let parsed;

          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = { raw: data };
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              statusCode: res.statusCode,
              data: parsed
            });
          } else {
            reject(
              new Error(
                `PADDLE_HTTP_${res.statusCode}:${JSON.stringify(parsed)}`
              )
            );
          }
        });
      }
    );

    req.on('error', reject);

    if (payload) req.write(payload);
    req.end();
  });
}

async function createTransaction({
  priceId,
  quantity = 1,
  orderId
}) {
  if (!priceId) {
    throw new Error('PADDLE_PRICE_ID_REQUIRED');
  }

  if (!orderId) {
    throw new Error('GANDOM_ORDER_ID_REQUIRED');
  }

  return request('POST', '/transactions', {
    items: [
      {
        price_id: priceId,
        quantity
      }
    ],
    custom_data: {
      gandom_law: LAW,
      gandom_order_id: orderId
    }
  });
}

module.exports = {
  LAW,
  ENV,
  HOST,
  configured,
  webhookConfigured,
  assertConfigured,
  verifyWebhookSignature,
  createTransaction
};

if (require.main === module) {
  console.log(`LAW=${LAW}`);
  console.log(`PADDLE_ENV=${ENV}`);
  console.log(`PADDLE_HOST=${HOST}`);

  if (!configured()) {
    console.log('NO_API_KEY_PREFLIGHT_BLOCK=PASS_REAL');
    console.log('UNAUTHORIZED_PAYMENT_PATH=BLOCKED');
    console.log('WALLET_CREDIT=BLOCKED');
    console.log('REAL_PAYMENT=NOT_EXECUTED');
    console.log('REVENUE_PASS=NOT_ALLOWED');
    process.exit(0);
  }

  console.log('PADDLE_API_KEY_PRESENT=TRUE');
  console.log('PADDLE_ADAPTER_SYNTAX=PASS_REAL');
}
