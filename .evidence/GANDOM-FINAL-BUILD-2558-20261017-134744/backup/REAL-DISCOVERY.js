'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');

const NODE_ID = process.env.GANDOM_NODE_ID;
const DISCOVERY_URL = process.env.GANDOM_DISCOVERY_URL || '';

if (!NODE_ID) {
  throw new Error('GANDOM_NODE_ID_REQUIRED');
}

const identity = crypto
  .createHash('sha256')
  .update(`GANDOM-DISCOVERY:${NODE_ID}`)
  .digest('hex');

function discover() {
  if (!DISCOVERY_URL) {
    return {
      ok: false,
      reason: 'DISCOVERY_ENDPOINT_NOT_CONFIGURED',
      node_id: NODE_ID,
      identity
    };
  }

  return new Promise((resolve) => {
    const ws = new WebSocket(DISCOVERY_URL, {
      headers: {
        'x-gandom-node': NODE_ID
      }
    });

    const timer = setTimeout(() => {
      try { ws.close(); } catch (_) {}
      resolve({
        ok: false,
        reason: 'DISCOVERY_TIMEOUT',
        node_id: NODE_ID,
        identity
      });
    }, 10000);

    ws.once('open', () => {
      ws.send(JSON.stringify({
        type: 'DISCOVERY_REQUEST',
        node_id: NODE_ID,
        identity,
        protocol: 'GANDOM-P2P-DISCOVERY-1'
      }));
    });

    ws.once('message', (raw) => {
      clearTimeout(timer);

      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch (_) {
        resolve({
          ok: false,
          reason: 'INVALID_DISCOVERY_RESPONSE',
          node_id: NODE_ID,
          identity
        });
        try { ws.close(); } catch (_) {}
        return;
      }

      resolve({
        ok: true,
        node_id: NODE_ID,
        identity,
        response: message
      });

      try { ws.close(); } catch (_) {}
    });

    ws.once('error', (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        reason: 'DISCOVERY_CONNECTION_ERROR',
        error: err.message,
        node_id: NODE_ID,
        identity
      });
    });
  });
}

module.exports = {
  discover,
  NODE_ID,
  identity
};
