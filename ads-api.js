const { AdsManager, PACKAGES } = require("./ads-manager.js");

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

function handleAdsAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;

  if (path === "/api/ads/packages" && method === "GET") {
    json(res, 200, { ok: true, packages: AdsManager.getPackages() });
    return true;
  }

  if (path === "/api/ads/quote" && method === "GET") {
    const pkg = u.searchParams.get("package") || "daily";
    json(res, 200, AdsManager.quote(pkg));
    return true;
  }

  if (path === "/api/ads/create" && method === "POST") {
    readBody(req, (body) => {
      const result = AdsManager.createAdRequest(body);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/ads/activate" && method === "POST") {
    readBody(req, (body) => {
      const result = AdsManager.activateAd(body.adId, body.paymentId, body.refId);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/ads/execute" && method === "POST") {
    readBody(req, (body) => {
      const result = AdsManager.executeImmediately(body.adId);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/ads/active" && method === "GET") {
    const limit = parseInt(u.searchParams.get("limit") || "10");
    json(res, 200, { ok: true, ads: AdsManager.getActiveAds(limit) });
    return true;
  }

  if (path === "/api/ads/my" && method === "GET") {
    const userId = u.searchParams.get("user");
    if (!userId) { json(res, 400, { ok: false, error: "MISSING_USER" }); return true; }
    json(res, 200, { ok: true, ads: AdsManager.getUserAds(userId) });
    return true;
  }

  if (path === "/api/ads/stats" && method === "GET") {
    json(res, 200, { ok: true, ...AdsManager.getStats() });
    return true;
  }

  if (path.startsWith("/api/ads/impression/") && method === "POST") {
    const adId = path.split("/").pop();
    json(res, 200, AdsManager.recordImpression(adId, "api"));
    return true;
  }

  if (path.startsWith("/api/ads/click/") && method === "POST") {
    const adId = path.split("/").pop();
    json(res, 200, AdsManager.recordClick(adId));
    return true;
  }

  return false;
}

module.exports = { handleAdsAPI };
