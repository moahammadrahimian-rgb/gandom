const { WorkerCoordinator } = require("./worker-coordinator.js");

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
    try { cb(JSON.parse(body || "{}")); } catch(e) { cb({}); }
  });
}

function handleWorkerAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;

  if (path === "/api/workers/stats" && method === "GET") {
    json(res, 200, { ok: true, ...WorkerCoordinator.getStats() });
    return true;
  }

  if (path === "/api/workers/assign" && method === "POST") {
    readBody(req, (body) => {
      const result = WorkerCoordinator.assignTask(
        body.task_type || "HASH_COMPUTE",
        body.params || {}
      );
      json(res, result.ok ? 200 : 503, result);
    });
    return true;
  }

  if (path === "/api/workers/broadcast" && method === "POST") {
    readBody(req, (body) => {
      const result = WorkerCoordinator.broadcastTask(
        body.task_type || "PROCESS_CELLS",
        body.params || {}
      );
      json(res, result.ok ? 200 : 503, result);
    });
    return true;
  }

  return false;
}

module.exports = { handleWorkerAPI };
