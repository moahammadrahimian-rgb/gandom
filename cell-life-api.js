const { CellLifeEngine } = require("./cell-life-engine.js");
const fs = require("fs");
const path = require("path");

const SNAPSHOT_FILE = path.join(__dirname, "cell-life-data", "snapshot.json");
const EVENTS_FILE = path.join(__dirname, "cell-life-data", "events.log");

function json(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

function handleCellLifeAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const pathname = u.pathname;

  // آخرین snapshot
  if (pathname === "/api/cells/life" && method === "GET") {
    try {
      if (fs.existsSync(SNAPSHOT_FILE)) {
        const snap = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
        json(res, 200, { ok: true, ...snap });
      } else {
        json(res, 200, { ok: true, message: "no snapshot yet" });
      }
    } catch(e) {
      json(res, 500, { ok: false, error: e.message });
    }
    return true;
  }

  // آخرین ۵۰ رویداد
  if (pathname === "/api/cells/events" && method === "GET") {
    try {
      if (fs.existsSync(EVENTS_FILE)) {
        const lines = fs.readFileSync(EVENTS_FILE, "utf8").trim().split("\n");
        const events = lines.slice(-50).map(l => {
          try { return JSON.parse(l); } catch(e) { return null; }
        }).filter(Boolean);
        json(res, 200, { ok: true, count: events.length, events });
      } else {
        json(res, 200, { ok: true, events: [] });
      }
    } catch(e) {
      json(res, 500, { ok: false, error: e.message });
    }
    return true;
  }

  return false;
}

module.exports = { handleCellLifeAPI };
