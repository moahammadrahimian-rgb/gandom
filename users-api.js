// ═══════════════════════════════════════════════════════
// 🌐 GANDOM USERS API (sync version)
// ═══════════════════════════════════════════════════════

const { UserManager } = require('./users-manager.js');

function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.substring(7);
  return null;
}

function readBody(req, callback) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try { callback(JSON.parse(body || '{}')); }
    catch(e) { callback({}); }
  });
}

function handleUsersAPI(req, res, url, method) {
  const path = url.split('?')[0];

  // ─── POST /api/users/register ───
  if (path === '/api/users/register' && method === 'POST') {
    readBody(req, (body) => {
      const result = UserManager.register(body.username, body.email, body.password);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  // ─── POST /api/users/login ───
  if (path === '/api/users/login' && method === 'POST') {
    readBody(req, (body) => {
      const result = UserManager.login(body.username, body.password);
      json(res, result.ok ? 200 : 401, result);
    });
    return true;
  }

  // ─── POST /api/users/logout ───
  if (path === '/api/users/logout' && method === 'POST') {
    const token = getToken(req);
    if (!token) { json(res, 400, { ok: false, error: 'NO_TOKEN' }); return true; }
    json(res, 200, UserManager.logout(token));
    return true;
  }

  // ─── GET /api/users/me ───
  if (path === '/api/users/me' && method === 'GET') {
    const token = getToken(req);
    if (!token) { json(res, 401, { ok: false, error: 'NO_TOKEN' }); return true; }
    const result = UserManager.verify(token);
    json(res, result.ok ? 200 : 401, result);
    return true;
  }

  // ─── GET /api/users/list ───
  if (path === '/api/users/list' && method === 'GET') {
    json(res, 200, { ok: true, users: UserManager.list() });
    return true;
  }

  // ─── GET /api/users/stats ───
  if (path === '/api/users/stats' && method === 'GET') {
    json(res, 200, { ok: true, ...UserManager.stats() });
    return true;
  }

  // ─── GET /api/users/info/:id ───
  if (path.startsWith('/api/users/info/') && method === 'GET') {
    const userId = path.split('/').pop();
    const info = UserManager.getInfo(userId);
    if (!info) { json(res, 404, { ok: false, error: 'USER_NOT_FOUND' }); return true; }
    json(res, 200, { ok: true, user: info });
    return true;
  }

  return false;
}

module.exports = { handleUsersAPI };
