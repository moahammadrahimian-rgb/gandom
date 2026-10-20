const { PaymentManager } = require("./payment-manager.js");

function json(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

function readBody(req, cb) {
  let body = "";
  req.on("data", function(c) { body += c; });
  req.on("end", function() {
    try { cb(JSON.parse(body || "{}")); } catch(e) { cb({}); }
  });
}

function handlePaymentAPI(req, res, url, method) {
  const u = new URL(url, "http://x");
  const path = u.pathname;

  if (path === "/api/payment/price" && method === "GET") {
    const gdm = parseInt(u.searchParams.get("gdm") || "10");
    json(res, 200, Object.assign({ ok: true }, PaymentManager.price(gdm)));
    return true;
  }

  if (path === "/api/payment/request" && method === "POST") {
    readBody(req, function(body) {
      const gdm_amount = parseInt(body.gdm_amount || 0);
      if (!gdm_amount || gdm_amount < 1) {
        json(res, 400, { ok: false, error: "INVALID_AMOUNT" });
        return;
      }
      const priceInfo = PaymentManager.price(gdm_amount);
      const result = PaymentManager.request({
        userId: body.userId || "GUEST",
        gdm_amount: gdm_amount,
        amount_irt: priceInfo.amount_irt
      });
      json(res, result.ok ? 200 : 400, result);
    });
    return true;
  }

  if (path === "/api/payment/gateway" && method === "GET") {
    const paymentId = u.searchParams.get("payment_id");
    const p = PaymentManager.get(paymentId);

    if (!p) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>NOT FOUND</h1>");
      return true;
    }

    const html = "<!DOCTYPE html><html lang=fa dir=rtl><head><meta charset=UTF-8><meta name=viewport content=width=device-width,initial-scale=1><title>درگاه گندم</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Tahoma;background:linear-gradient(135deg,#0a0e17,#1a1f2e);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#1a2332;border:2px solid #ffd700;border-radius:20px;padding:40px;max-width:450px;text-align:center}.logo{font-size:60px;margin-bottom:15px}h1{color:#ffd700;font-size:26px;margin-bottom:10px}.sub{color:#8ba3c7;font-size:14px;margin-bottom:25px}.amount{background:#0a0e17;padding:20px;border-radius:12px;margin:20px 0}.amount-label{color:#8ba3c7;font-size:13px;margin-bottom:8px}.amount-value{color:#4ade80;font-size:32px;font-weight:bold}.info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;font-size:13px}.info-item{background:#0a0e17;padding:10px;border-radius:8px}.info-label{color:#8ba3c7;font-size:11px;margin-bottom:4px}.info-value{color:#ffd700}.buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:25px}.btn{padding:14px;border:none;border-radius:10px;font-weight:bold;font-size:14px;cursor:pointer;font-family:inherit;transition:.3s}.btn-success{background:#4ade80;color:#000}.btn-success:hover{background:#22c55e}.btn-cancel{background:#2a3f5f;color:#f87171;border:1px solid #f87171}.warning{background:#4d3a1a;color:#fbbf24;padding:10px;border-radius:8px;font-size:12px;margin-bottom:15px}</style></head><body><div class=card><div class=logo>🌾</div><h1>GANDOM 2558</h1><p class=sub>درگاه پرداخت امن</p><div class=warning>⚠️ حالت شبیه‌سازی - هیچ پرداخت واقعی انجام نمی‌شود</div><div class=amount><div class=amount-label>مبلغ قابل پرداخت</div><div class=amount-value>" + p.amount_irt.toLocaleString() + " ریال</div></div><div class=info><div class=info-item><div class=info-label>شناسه</div><div class=info-value>" + p.paymentId + "</div></div><div class=info-item><div class=info-label>کاربر</div><div class=info-value>" + p.userId + "</div></div><div class=info-item><div class=info-label>GDM</div><div class=info-value>" + p.gdm_amount + "</div></div><div class=info-item><div class=info-label>وضعیت</div><div class=info-value>" + p.status + "</div></div></div><div class=buttons><button class=\"btn btn-success\" onclick=\"location.href=\x27/api/payment/verify?payment_id=" + paymentId + "\x26action=ok\x27\">✅ پرداخت موفق</button><button class=\"btn btn-cancel\" onclick=\"location.href=\x27/api/payment/verify?payment_id=" + paymentId + "\x26action=cancel\x27\">❌ لغو</button></div></div></body></html>";

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return true;
  }

  if (path === "/api/payment/verify" && method === "GET") {
    const paymentId = u.searchParams.get("payment_id");
    const action = u.searchParams.get("action") || "ok";
    const result = PaymentManager.verify({ paymentId: paymentId, action: action });

    let html;
    if (result.ok) {
      html = "<!DOCTYPE html><html lang=fa dir=rtl><head><meta charset=UTF-8><title>موفق</title><style>body{font-family:Tahoma;background:linear-gradient(135deg,#0a0e17,#1a1f2e);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#1a2332;border:2px solid #4ade80;border-radius:20px;padding:40px;max-width:450px;text-align:center}.icon{font-size:80px;margin-bottom:15px}h1{color:#4ade80;font-size:28px;margin-bottom:15px}.row{display:flex;justify-content:space-between;padding:10px;background:#0a0e17;border-radius:8px;margin-bottom:8px;font-size:14px}.label{color:#8ba3c7}.value{color:#ffd700;font-weight:bold}.btn{display:inline-block;margin-top:25px;padding:14px 30px;background:#ffd700;color:#000;border-radius:10px;text-decoration:none;font-weight:bold}</style></head><body><div class=card><div class=icon>✅</div><h1>پرداخت موفق</h1><div class=row><span class=label>پیگیری</span><span class=value>" + result.refId + "</span></div><div class=row><span class=label>GDM</span><span class=value>" + result.gdm_amount + "</span></div><div class=row><span class=label>مبلغ</span><span class=value>" + result.amount_irt.toLocaleString() + " ریال</span></div><a href=http://127.0.0.1:8787/ class=btn>بازگشت</a></div></body></html>";
    } else {
      html = "<!DOCTYPE html><html lang=fa dir=rtl><head><meta charset=UTF-8><title>لغو</title><style>body{font-family:Tahoma;background:linear-gradient(135deg,#0a0e17,#1a1f2e);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#1a2332;border:2px solid #f87171;border-radius:20px;padding:40px;max-width:450px;text-align:center}.icon{font-size:80px;margin-bottom:15px}h1{color:#f87171;font-size:28px;margin-bottom:15px}.btn{display:inline-block;padding:14px 30px;background:#ffd700;color:#000;border-radius:10px;text-decoration:none;font-weight:bold}</style></head><body><div class=card><div class=icon>❌</div><h1>پرداخت لغو شد</h1><a href=http://127.0.0.1:8787/ class=btn>بازگشت</a></div></body></html>";
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return true;
  }

  if (path === "/api/payment/list" && method === "GET") {
    const userId = u.searchParams.get("user");
    json(res, 200, { ok: true, payments: PaymentManager.list(userId) });
    return true;
  }

  if (path === "/api/payment/stats" && method === "GET") {
    json(res, 200, Object.assign({ ok: true }, PaymentManager.stats()));
    return true;
  }

  return false;
}

module.exports = { handlePaymentAPI };
