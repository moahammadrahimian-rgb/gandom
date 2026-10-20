// ═══════════════════════════════════════════════════════
// 🏪 GANDOM MARKETS API
// ═══════════════════════════════════════════════════════

const { Markets, CATEGORIES } = require("./market-manager.js");

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

function handleMarketAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;

  if (path === "/api/market/categories" && method === "GET") {
    json(res, 200, { ok: true, categories: CATEGORIES });
    return true;
  }

  if (path === "/api/market/listings" && method === "GET") {
    const result = Markets.getListings({
      category: u.searchParams.get("category"),
      city: u.searchParams.get("city"),
      minPrice: parseInt(u.searchParams.get("min") || "0") || undefined,
      maxPrice: parseInt(u.searchParams.get("max") || "0") || undefined,
      search: u.searchParams.get("q"),
      limit: parseInt(u.searchParams.get("limit") || "20"),
      offset: parseInt(u.searchParams.get("offset") || "0")
    });
    json(res, 200, { ok: true, ...result });
    return true;
  }

  if (path.startsWith("/api/market/listing/") && method === "GET") {
    const listingId = path.split("/").pop();
    const listing = Markets.getListing(listingId);
    if (!listing) { json(res, 404, { ok: false, error: "NOT_FOUND" }); return true; }
    json(res, 200, { ok: true, listing });
    return true;
  }

  if (path === "/api/market/listing" && method === "POST") {
    readBody(req, (body) => {
      const result = Markets.createListing(body);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/market/delete" && method === "POST") {
    readBody(req, (body) => {
      const result = Markets.deleteListing(body.listingId, body.userId);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/market/deal" && method === "POST") {
    readBody(req, (body) => {
      const result = Markets.createDeal(body);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/market/my-listings" && method === "GET") {
    const userId = u.searchParams.get("user");
    if (!userId) { json(res, 400, { ok: false, error: "MISSING_USER" }); return true; }
    json(res, 200, { ok: true, listings: Markets.getUserListings(userId) });
    return true;
  }

  if (path === "/api/market/stats" && method === "GET") {
    json(res, 200, { ok: true, ...Markets.getStats() });
    return true;
  }

  return false;
}

module.exports = { handleMarketAPI };
