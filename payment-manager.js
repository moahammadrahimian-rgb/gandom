const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "payment-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const PAYMENTS_FILE = path.join(DIR, "payments.json");
const CONFIG_FILE = path.join(DIR, "config.json");

let config = {
  mode: "mock",
  gdm_price_irt: 100000,
  mock_auto_verify: true,
  merchant_id: null
};

let payments = {};

try {
  if (fs.existsSync(PAYMENTS_FILE)) payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));
  if (fs.existsSync(CONFIG_FILE)) config = Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")));
} catch(e) {}

function save() {
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

class PaymentManager {
  static price(gdm_amount) {
    return {
      gdm_amount: gdm_amount,
      amount_irt: gdm_amount * config.gdm_price_irt,
      price_per_gdm: config.gdm_price_irt
    };
  }

  static request(data) {
    const paymentId = "PAY-" + crypto.randomBytes(6).toString("hex");
    const authority = crypto.randomBytes(18).toString("hex");

    payments[paymentId] = {
      paymentId: paymentId,
      userId: data.userId,
      gdm_amount: data.gdm_amount,
      amount_irt: data.amount_irt,
      authority: authority,
      status: "PENDING",
      mode: "mock",
      createdAt: new Date().toISOString()
    };
    save();

    return {
      ok: true,
      paymentId: paymentId,
      authority: authority,
      gdm_amount: data.gdm_amount,
      amount_irt: data.amount_irt,
      mode: "mock",
      paymentUrl: "/api/payment/gateway?payment_id=" + paymentId
    };
  }

  static verify(data) {
    const p = payments[data.paymentId];
    if (!p) return { ok: false, error: "NOT_FOUND" };

    if (data.action === "cancel") {
      p.status = "CANCELLED";
      save();
      return { ok: false, error: "USER_CANCELLED", paymentId: data.paymentId };
    }

    p.status = "VERIFIED";
    p.refId = "MOCK-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    p.verifiedAt = new Date().toISOString();
    save();

    return {
      ok: true,
      paymentId: data.paymentId,
      refId: p.refId,
      gdm_amount: p.gdm_amount,
      amount_irt: p.amount_irt,
      userId: p.userId
    };
  }

  static get(paymentId) { return payments[paymentId] || null; }

  static list(userId) {
    return Object.values(payments)
      .filter(function(p) { return !userId || p.userId === userId; })
      .sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  static stats() {
    const all = Object.values(payments);
    const v = all.filter(function(p) { return p.status === "VERIFIED"; });
    return {
      total_payments: all.length,
      verified: v.length,
      pending: all.filter(function(p) { return p.status === "PENDING"; }).length,
      cancelled: all.filter(function(p) { return p.status === "CANCELLED"; }).length,
      total_irt: v.reduce(function(s, p) { return s + p.amount_irt; }, 0),
      total_gdm: v.reduce(function(s, p) { return s + p.gdm_amount; }, 0)
    };
  }
}

module.exports = { PaymentManager };
