const { NodeBreeding } = require("./node-breeding.js");

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

function handleNodeBreedingAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;

  if (path === "/api/nodes/breeding/create" && method === "POST") {
    readBody(req, (b) => json(res, 200, NodeBreeding.createNode(b)));
    return true;
  }

  if (path === "/api/nodes/breeding/breed" && method === "POST") {
    readBody(req, (b) => json(res, 200, NodeBreeding.breed(b.parentA, b.parentB)));
    return true;
  }

  if (path === "/api/nodes/breeding/tick" && method === "POST") {
    json(res, 200, { ok: true, ...NodeBreeding.tick() });
    return true;
  }

  if (path === "/api/nodes/breeding/stats" && method === "GET") {
    json(res, 200, { ok: true, ...NodeBreeding.getStats() });
    return true;
  }

  if (path === "/api/nodes/breeding/ancestors" && method === "GET") {
    json(res, 200, { ok: true, ancestors: NodeBreeding.getTopAncestors() });
    return true;
  }

  if (path.startsWith("/api/nodes/breeding/tree/") && method === "GET") {
    const nodeId = path.split("/").pop();
    const tree = NodeBreeding.getFamilyTree(nodeId);
    json(res, tree ? 200 : 404, { ok: !!tree, tree });
    return true;
  }

  return false;
}

module.exports = { handleNodeBreedingAPI };
