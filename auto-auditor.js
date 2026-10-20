const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "audit-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const REPORTS_FILE = path.join(DIR, "reports.json");

let reports = [];

try {
  if (fs.existsSync(REPORTS_FILE)) reports = JSON.parse(fs.readFileSync(REPORTS_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports.slice(-500), null, 2));
}

class AutoAuditor {
  static async audit() {
    const results = {
      reportId: "AUD-" + crypto.randomBytes(6).toString("hex"),
      ts: new Date().toISOString(),
      checks: {},
      total_issues: 0,
      status: "PASS"
    };

    // ─── چک ۱: بلاک‌چین ───
    try {
      const chain = await this.fetchAPI("/api/chain/stats");
      results.checks.blockchain = {
        length: chain.length,
        is_valid: chain.is_valid,
        pass: chain.is_valid
      };
      if (!chain.is_valid) results.total_issues++;
    } catch(e) {
      results.checks.blockchain = { error: e.message, pass: false };
      results.total_issues++;
    }

    // ─── چک ۲: کاربران ───
    try {
      const users = await this.fetchAPI("/api/users/stats");
      results.checks.users = {
        total: users.total_users,
        pass: users.total_users >= 0
      };
    } catch(e) {
      results.checks.users = { error: e.message, pass: false };
      results.total_issues++;
    }

    // ─── چک ۳: صرافی ───
    try {
      const ex = await this.fetchAPI("/api/exchange/stats");
      results.checks.exchange = {
        total_orders: ex.total_orders,
        total_trades: ex.total_trades,
        pass: true
      };
    } catch(e) {
      results.checks.exchange = { error: e.message, pass: false };
      results.total_issues++;
    }

    // ─── چک ۴: بازار ───
    try {
      const mk = await this.fetchAPI("/api/market/stats");
      results.checks.market = {
        active_listings: mk.active_listings,
        pass: true
      };
    } catch(e) {
      results.checks.market = { error: e.message, pass: false };
      results.total_issues++;
    }

    // ─── چک ۵: پرداخت ───
    try {
      const pm = await this.fetchAPI("/api/payment/stats");
      results.checks.payments = {
        total: pm.total_payments,
        verified: pm.verified,
        pass: true
      };
    } catch(e) {
      results.checks.payments = { error: e.message, pass: false };
      results.total_issues++;
    }

    // ─── چک ۶: Neural Bus ───
    try {
      const nb = await this.fetchAPI("/api/neural/stats");
      results.checks.neural_bus = {
        total_events: nb.total_events,
        channels: nb.channels.length,
        pass: nb.channels.length > 0
      };
    } catch(e) {
      results.checks.neural_bus = { error: e.message, pass: false };
      results.total_issues++;
    }

    // ─── نتیجه ───
    results.status = results.total_issues === 0 ? "PASS" : "FAIL";
    results.reportHash = crypto.createHash("sha256")
      .update(JSON.stringify(results.checks))
      .digest("hex");

    reports.push(results);
    save();

    return results;
  }

  static fetchAPI(path) {
    return new Promise((resolve, reject) => {
      const http = require("http");
      const req = http.get("http://127.0.0.1:8787" + path, (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error("timeout")); });
    });
  }

  static getLast() {
    return reports[reports.length - 1] || null;
  }

  static getStats() {
    const passed = reports.filter(r => r.status === "PASS").length;
    return {
      total_audits: reports.length,
      passed,
      failed: reports.length - passed,
      pass_rate: reports.length > 0 ? (passed / reports.length * 100).toFixed(1) + "%" : "0%"
    };
  }
}

module.exports = { AutoAuditor };
