const { PriceOracle } = require("./price-oracle.js");
const { UserManager } = require("./users-manager.js");

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

function handlePriceAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;

  // قیمت لحظه‌ای GDM
  if (path === "/api/price" && method === "GET") {
    json(res, 200, { ok: true, ...PriceOracle.getPrice() });
    return true;
  }

  // ارزش یک مقدار GDM
  if (path === "/api/price/value" && method === "GET") {
    const gdm = parseFloat(u.searchParams.get("gdm") || "1");
    json(res, 200, { ok: true, ...PriceOracle.getAssetValue(gdm) });
    return true;
  }

  // تبدیل
  if (path === "/api/price/convert" && method === "GET") {
    const amount = parseFloat(u.searchParams.get("amount") || "1");
    const from = u.searchParams.get("from") || "GDM";
    const to = u.searchParams.get("to") || "USD";
    json(res, 200, PriceOracle.convert(amount, from, to));
    return true;
  }

  // موجودی کاربر با ارزش دلاری
  if (path.startsWith("/api/price/wallet/") && method === "GET") {
    const userId = path.split("/").pop();
    const user = UserManager.getInfo(userId);
    if (!user) { json(res, 404, { ok: false, error: "USER_NOT_FOUND" }); return true; }

    const balance = user.balance || 0;
    const value = PriceOracle.getAssetValue(balance);
    json(res, 200, {
      ok: true,
      userId,
      username: user.username,
      wallet: user.gdmAddress,
      balance_gdm: balance,
      value_toman: value.toman,
      value_usd: value.usd,
      value_usd_display: value.usd_display,
      value_toman_display: value.toman_display,
      price: PriceOracle.getPrice()
    });
    return true;
  }

  // به‌روزرسانی نرخ دلار (فقط ادمین)
  if (path === "/api/price/usd" && method === "POST") {
    readBody(req, (body) => {
      if (body.adminKey !== "GANDOM-2558-ADMIN") {
        json(res, 403, { ok: false, error: "FORBIDDEN" });
        return;
      }
      const result = PriceOracle.updateUsdRate(body.usd_toman, body.source);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  // به‌روزرسانی قیمت GDM
  if (path === "/api/price/gdm" && method === "POST") {
    readBody(req, (body) => {
      if (body.adminKey !== "GANDOM-2558-ADMIN") {
        json(res, 403, { ok: false, error: "FORBIDDEN" });
        return;
      }
      const result = PriceOracle.updateGdmPrice(body.gdm_toman);
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  // تاریخچه نرخ
  if (path === "/api/price/history" && method === "GET") {
    const limit = parseInt(u.searchParams.get("limit") || "20");
    json(res, 200, { ok: true, history: PriceOracle.getHistory(limit) });
    return true;
  }

  return false;
}

module.exports = { handlePriceAPI };
