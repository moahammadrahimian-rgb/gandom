'use strict';

// GANDOM — Law 2558
// Wrapper HTTP مستقل برای خواندن وضعیت واقعی کیف پول.
// Standalone HTTP wrapper for the actual wallet state.

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const HOST = process.env.WALLET_HOST || '127.0.0.1';
const PORT = Number(process.env.WALLET_PORT || 9000);

const STATE_FILE = path.join(
  __dirname,
  'wallet',
  'wallet-state.json'
);

app.disable('x-powered-by');

app.get('/health', (req, res) => {
  // فقط سلامت HTTP wrapper را اعلام می‌کنیم، نه صحت عملیات مالی.
  // This confirms the wrapper is responsive, not financial correctness.
  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    ok: true,
    service: 'GANDOM-WALLET-WRAPPER',
    law: 2558,
    state_file: path.relative(__dirname, STATE_FILE),
    state_file_exists: fs.existsSync(STATE_FILE),
    timestamp: new Date().toISOString()
  });
});

app.get('/state', (req, res) => {
  // فقط دادهٔ واقعی فایل خوانده می‌شود؛ دادهٔ ساختگی ممنوع.
  // Read actual persisted JSON; never synthesize wallet balances.
  let raw;

  try {
    raw = fs.readFileSync(STATE_FILE, 'utf8');
  } catch (err) {
    console.error('[WALLET_STATE_READ_ERROR]', err.message);

    return res.status(err.code === 'ENOENT' ? 404 : 500).json({
      ok: false,
      error: 'WALLET_STATE_UNAVAILABLE',
      code: err.code || 'READ_ERROR'
    });
  }

  let state;

  try {
    state = JSON.parse(raw);
  } catch (err) {
    console.error('[WALLET_STATE_JSON_ERROR]', err.message);

    return res.status(500).json({
      ok: false,
      error: 'WALLET_STATE_INVALID_JSON'
    });
  }

  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    ok: true,
    law: 2558,
    source: 'wallet/wallet-state.json',
    state
  });
});

// مسیر ناشناخته نباید به‌عنوان موفقیت گزارش شود.
// Unknown routes must not return a fake success.
app.use((req, res) => {
  return res.status(404).json({
    ok: false,
    error: 'NOT_FOUND',
    path: req.path
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log('[WALLET_WRAPPER_LISTENING]', JSON.stringify({
    host: HOST,
    port: PORT,
    state_file: STATE_FILE,
    state_file_exists: fs.existsSync(STATE_FILE),
    timestamp: new Date().toISOString()
  }));
});

server.on('error', err => {
  console.error('[WALLET_WRAPPER_SERVER_ERROR]', err.stack || err.message);
  process.exitCode = 1;
});
