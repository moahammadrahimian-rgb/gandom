const { MusicIncome } = require("./music-income.js");
const { ExperienceRecorder } = require("./experience-recorder.js");
const { BreedingManager } = require("./breeding-manager.js");
const { AutoAuditor } = require("./auto-auditor.js");

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

function handleEcosystemAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;

  // ═══ MUSIC ═══
  if (path === "/api/music/add-track" && method === "POST") {
    readBody(req, (b) => json(res, 200, MusicIncome.addTrack(b)));
    return true;
  }
  if (path === "/api/music/start" && method === "POST") {
    readBody(req, (b) => json(res, 200, MusicIncome.startListen(b.userId, b.trackId)));
    return true;
  }
  if (path === "/api/music/complete" && method === "POST") {
    readBody(req, (b) => json(res, 200, MusicIncome.completeListen(b.listenId, b.seconds)));
    return true;
  }
  if (path === "/api/music/stats" && method === "GET") {
    json(res, 200, { ok: true, ...MusicIncome.getStats() });
    return true;
  }

  // ═══ EXPERIENCE ═══
  if (path === "/api/experience/record" && method === "POST") {
    readBody(req, (b) => json(res, 200, ExperienceRecorder.record(b)));
    return true;
  }
  if (path === "/api/experience/verify" && method === "POST") {
    readBody(req, (b) => json(res, 200, ExperienceRecorder.verify(b.expId, b.verifierId)));
    return true;
  }
  if (path === "/api/experience/stats" && method === "GET") {
    json(res, 200, { ok: true, ...ExperienceRecorder.getStats() });
    return true;
  }

  // ═══ BREEDING ═══
  if (path === "/api/breeding/create" && method === "POST") {
    readBody(req, (b) => json(res, 200, BreedingManager.createCell(b)));
    return true;
  }
  if (path === "/api/breeding/breed" && method === "POST") {
    readBody(req, (b) => json(res, 200, BreedingManager.breed(b.parentA, b.parentB)));
    return true;
  }
  if (path === "/api/breeding/tick" && method === "POST") {
    json(res, 200, { ok: true, ...BreedingManager.ageTick() });
    return true;
  }
  if (path === "/api/breeding/stats" && method === "GET") {
    json(res, 200, { ok: true, ...BreedingManager.getStats() });
    return true;
  }

  // ═══ AUDIT ═══
  if (path === "/api/audit/run" && method === "POST") {
    AutoAuditor.audit().then(r => json(res, 200, r)).catch(e => json(res, 500, { error: e.message }));
    return true;
  }
  if (path === "/api/audit/last" && method === "GET") {
    json(res, 200, { ok: true, report: AutoAuditor.getLast() });
    return true;
  }
  if (path === "/api/audit/stats" && method === "GET") {
    json(res, 200, { ok: true, ...AutoAuditor.getStats() });
    return true;
  }

  return false;
}

module.exports = { handleEcosystemAPI };
