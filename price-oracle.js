// ═══════════════════════════════════════════════════════
// 💵 PRICE ORACLE - نرخ ارز گندم (تومان + دلار)
// ═══════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "oracle-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const RATES_FILE = path.join(DIR, "rates.json");

let rates = {
  GDM_TOMAN: 10000,
  USD_TOMAN: 100000,
  USD: 0.1,
  lastUpdate: new Date().toISOString(),
  mode: "manual",
  history: []
};

try {
  if (fs.existsSync(RATES_FILE)) {
    const saved = JSON.parse(fs.readFileSync(RATES_FILE, "utf8"));
    rates = { ...rates, ...saved };
  }
} catch(e) {}

function save() {
  fs.writeFileSync(RATES_FILE, JSON.stringify(rates, null, 2));
}

class PriceOracle {

  // ─── تبدیل GDM → تومان ───
  static gdmToToman(gdm) {
    return gdm * rates.GDM_TOMAN;
  }

  // ─── تبدیل GDM → دلار ───
  static gdmToUsd(gdm) {
    const toman = this.gdmToToman(gdm);
    return toman / rates.USD_TOMAN;
  }

  // ─── تبدیل تومان → دلار ───
  static tomanToUsd(toman) {
    return toman / rates.USD_TOMAN;
  }

  // ─── تبدیل دلار → تومان ───
  static usdToToman(usd) {
    return usd * rates.USD_TOMAN;
  }

  // ─── قیمت کامل GDM ───
  static getPrice() {
    return {
      gdm_toman: rates.GDM_TOMAN,
      gdm_usd: rates.GDM_TOMAN / rates.USD_TOMAN,
      usd_toman: rates.USD_TOMAN,
      lastUpdate: rates.lastUpdate,
      mode: rates.mode
    };
  }

  // ─── ارزش دارایی کاربر ───
  static getAssetValue(gdm_amount) {
    const toman = this.gdmToToman(gdm_amount);
    const usd = this.gdmToUsd(gdm_amount);
    return {
      gdm: gdm_amount,
      toman: Math.floor(toman),
      usd: parseFloat(usd.toFixed(4)),
      usd_display: "$" + usd.toFixed(4),
      toman_display: toman.toLocaleString() + " تومان"
    };
  }

  // ─── به‌روزرسانی نرخ دلار ───
  static updateUsdRate(usd_toman, source) {
    if (!usd_toman || usd_toman < 10000) {
      return { ok: false, error: "INVALID_RATE" };
    }

    rates.history.push({
      old: rates.USD_TOMAN,
      new: usd_toman,
      source: source || "manual",
      ts: Date.now()
    });
    if (rates.history.length > 100) rates.history = rates.history.slice(-100);

    rates.USD_TOMAN = usd_toman;
    rates.lastUpdate = new Date().toISOString();
    rates.mode = source || "manual";
    save();

    return { ok: true, usd_toman, lastUpdate: rates.lastUpdate };
  }

  // ─── به‌روزرسانی قیمت GDM ───
  static updateGdmPrice(gdm_toman) {
    if (!gdm_toman || gdm_toman <= 0) {
      return { ok: false, error: "INVALID_PRICE" };
    }
    rates.GDM_TOMAN = gdm_toman;
    rates.lastUpdate = new Date().toISOString();
    save();
    return { ok: true, gdm_toman };
  }

  // ─── تبدیل کامل ───
  static convert(amount, from, to) {
    const F = from.toUpperCase();
    const T = to.toUpperCase();

    // تبدیل به تومان
    let toman;
    if (F === "GDM") toman = this.gdmToToman(amount);
    else if (F === "TOMAN") toman = amount;
    else if (F === "USD") toman = this.usdToToman(amount);
    else return { ok: false, error: "INVALID_FROM" };

    // تبدیل از تومان
    let result;
    if (T === "GDM") result = toman / rates.GDM_TOMAN;
    else if (T === "TOMAN") result = toman;
    else if (T === "USD") result = toman / rates.USD_TOMAN;
    else return { ok: false, error: "INVALID_TO" };

    return {
      ok: true,
      amount,
      from: F,
      to: T,
      result: parseFloat(result.toFixed(4)),
      rate: this.getPrice()
    };
  }

  static getHistory(limit) {
    return rates.history.slice(-(limit || 20));
  }
}

module.exports = { PriceOracle };
