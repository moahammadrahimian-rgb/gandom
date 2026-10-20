// ═══════════════════════════════════════════════════════
// 💱 GANDOM EXCHANGE API
// ═══════════════════════════════════════════════════════

const { Exchange } = require("./exchange-manager.js");

function json(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

function readBody(req, cb) {
  let body = "";
  req.on("data", c => body += c);
  req.on("end", () => {
    try { cb(JSON.parse(body || "{}")); }
    catch(e) { cb({}); }
  });
}

function handleExchangeAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;
  const pair = u.searchParams.get("pair") || "GDM/IRT";

  if (path === "/api/exchange/orderbook" && method === "GET") {
    json(res, 200, { ok: true, ...Exchange.getOrderBook(pair) }); return true;
  }

  if (path === "/api/exchange/order" && method === "POST") {
    readBody(req, (body) => {
      const result = Exchange.placeOrder(body);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/exchange/cancel" && method === "POST") {
    readBody(req, (body) => {
      const result = Exchange.cancelOrder(body.orderId, body.userId);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/exchange/orders" && method === "GET") {
    const userId = u.searchParams.get("user");
    if (!userId) json(res, 400, { ok: false, error: "MISSING_USER" }); return true;
    json(res, 200, { ok: true, orders: Exchange.userOrders(userId) }); return true;
  }

  if (path === "/api/exchange/trades" && method === "GET") {
    const limit = parseInt(u.searchParams.get("limit") || "50");
    json(res, 200, { ok: true, trades: Exchange.recentTrades(pair, limit) }); return true;
  }

  if (path === "/api/exchange/stats24h" && method === "GET") {
    json(res, 200, { ok: true, ...Exchange.stats24h(pair) }); return true;
  }

  if (path === "/api/exchange/stats" && method === "GET") {
    json(res, 200, { ok: true, ...Exchange.globalStats() }); return true;
  }

  return false;
}

module.exports = { handleExchangeAPI };
