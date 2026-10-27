'use strict';

const http = require('http');

const PORT = 8090;

const state = {
  system: 'GANDOM-CORE',
  mode: 'LIVE',
  status: 'BOOTING',
  currentSection: 0,
  nextAction: 'WAITING_FOR_REAL_EVENT',
  events: []
};

function event(type, data = {}) {
  const e = {
    type,
    timestamp: new Date().toISOString(),
    ...data
  };

  state.events.push(e);
  if (state.events.length > 1000) state.events.shift();

  console.log('[LIVE-EVENT]', JSON.stringify(e));

  return e;
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET' && req.url === '/live/health') {
    return res.end(JSON.stringify({
      ok: true,
      system: state.system,
      mode: state.mode,
      status: state.status,
      currentSection: state.currentSection,
      nextAction: state.nextAction
    }));
  }

  if (req.method === 'GET' && req.url === '/live/state') {
    return res.end(JSON.stringify({
      ok: true,
      state
    }));
  }

  if (req.method === 'POST' && req.url === '/live/event') {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};

        if (!data.type) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            ok: false,
            error: 'EVENT_TYPE_REQUIRED'
          }));
        }

        const e = event(data.type, data);

        res.end(JSON.stringify({
          ok: true,
          event: e,
          nextAction: state.nextAction
        }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({
          ok: false,
          error: 'INVALID_JSON'
        }));
      }
    });

    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({
    ok: false,
    error: 'NOT_FOUND'
  }));
});

server.listen(PORT, '127.0.0.1', () => {
  state.status = 'READY';

  console.log('========================================');
  console.log('GANDOM LIVE COMMANDER');
  console.log('========================================');
  console.log('COMMANDER=http://127.0.0.1:8090');
  console.log('HEALTH=http://127.0.0.1:8090/live/health');
  console.log('STATE=http://127.0.0.1:8090/live/state');
  console.log('MODE=LIVE');
  console.log('EVENT_BUS=READY');
  console.log('STATUS=READY');
  console.log('NEXT_ACTION=WAITING_FOR_REAL_EVENT');
  console.log('========================================');
});
