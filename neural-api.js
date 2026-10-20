const { bus } = require("./neural-bus.js");

function json(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

function handleNeuralAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;

  if (path === "/api/neural/stats" && method === "GET") {
    json(res, 200, { ok: true, ...bus.getStats() });
    return true;
  }

  if (path === "/api/neural/events" && method === "GET") {
    const limit = parseInt(u.searchParams.get("limit") || "50");
    json(res, 200, { ok: true, events: bus.getRecentEvents(limit) });
    return true;
  }

  if (path === "/api/neural/publish" && method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const env = bus.publish(
          data.channel || "*",
          data.event || { type: "MANUAL", data: {} },
          data.source || "api"
        );
        json(res, 200, { ok: true, event: env });
      } catch(e) {
        json(res, 400, { ok: false, error: e.message });
      }
    });
    return true;
  }

  return false;
}

module.exports = { handleNeuralAPI };
