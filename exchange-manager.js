// ═══════════════════════════════════════════════════════
// 💱 GANDOM EXCHANGE - صرافی گندم
// ═══════════════════════════════════════════════════════

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "exchange-data");
const ORDERS_FILE = path.join(DIR, "orders.json");
const TRADES_FILE = path.join(DIR, "trades.json");
const BOOK_FILE = path.join(DIR, "orderbook.json");

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

let orders = {};
let trades = [];

try {
  if (fs.existsSync(ORDERS_FILE)) orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  if (fs.existsSync(TRADES_FILE)) trades = JSON.parse(fs.readFileSync(TRADES_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  fs.writeFileSync(TRADES_FILE, JSON.stringify(trades.slice(-1000), null, 2));
}

class Exchange {

  // ─── ثبت سفارش خرید/فروش ───
  static placeOrder({ userId, side, price, amount, pair }) {
    pair = pair || "GDM/IRT";

    if (!userId || !side || !price || !amount) {
      return { ok: false, error: "MISSING_FIELDS" };
    }

    if (side !== "BUY" && side !== "SELL") {
      return { ok: false, error: "INVALID_SIDE" };
    }

    if (price <= 0 || amount <= 0) {
      return { ok: false, error: "INVALID_AMOUNT" };
    }

    const orderId = "ORD-" + crypto.randomBytes(6).toString("hex");
    const order = {
      orderId,
      userId,
      side,
      pair,
      price: parseFloat(price),
      amount: parseFloat(amount),
      filled: 0,
      remaining: parseFloat(amount),
      status: "OPEN",
      createdAt: new Date().toISOString()
    };

    orders[orderId] = order;
    save();

    // تلاش برای match کردن
    const matched = this.matchOrders(pair);

    return {
      ok: true,
      order,
      matched,
      message: matched > 0 ? "ORDER_MATCHED" : "ORDER_PLACED"
    };
  }

  // ─── Match کردن سفارش‌ها ───
  static matchOrders(pair) {
    const openOrders = Object.values(orders)
      .filter(o => o.pair === pair && o.status === "OPEN" && o.remaining > 0);

    const buys = openOrders.filter(o => o.side === "BUY")
      .sort((a, b) => b.price - a.price);
    const sells = openOrders.filter(o => o.side === "SELL")
      .sort((a, b) => a.price - b.price);

    let matchCount = 0;

    for (const buy of buys) {
      if (buy.remaining <= 0) continue;

      for (const sell of sells) {
        if (sell.remaining <= 0) continue;
        if (buy.userId === sell.userId) continue;
        if (buy.price < sell.price) continue;

        const matchAmount = Math.min(buy.remaining, sell.remaining);
        const matchPrice = sell.price;

        // ثبت معامله
        const trade = {
          tradeId: "TRD-" + crypto.randomBytes(6).toString("hex"),
          pair,
          price: matchPrice,
          amount: matchAmount,
          buyOrderId: buy.orderId,
          sellOrderId: sell.orderId,
          buyerId: buy.userId,
          sellerId: sell.userId,
          timestamp: new Date().toISOString()
        };

        trades.push(trade);

        buy.filled += matchAmount;
        buy.remaining -= matchAmount;
        sell.filled += matchAmount;
        sell.remaining -= matchAmount;

        if (buy.remaining === 0) buy.status = "FILLED";
        if (sell.remaining === 0) sell.status = "FILLED";

        matchCount++;

        if (buy.remaining === 0) break;
      }
    }

    if (matchCount > 0) save();
    return matchCount;
  }

  // ─── Order Book ───
  static getOrderBook(pair) {
    pair = pair || "GDM/IRT";

    const open = Object.values(orders)
      .filter(o => o.pair === pair && o.status === "OPEN" && o.remaining > 0);

    const bids = open.filter(o => o.side === "BUY")
      .sort((a, b) => b.price - a.price)
      .slice(0, 20)
      .map(o => ({ price: o.price, amount: o.remaining, total: o.price * o.remaining }));

    const asks = open.filter(o => o.side === "SELL")
      .sort((a, b) => a.price - b.price)
      .slice(0, 20)
      .map(o => ({ price: o.price, amount: o.remaining, total: o.price * o.remaining }));

    const lastTrade = trades.filter(t => t.pair === pair).slice(-1)[0];

    return {
      pair,
      bids,
      asks,
      lastPrice: lastTrade ? lastTrade.price : 0,
      lastTrade
    };
  }

  // ─── لغو سفارش ───
  static cancelOrder(orderId, userId) {
    const order = orders[orderId];
    if (!order) return { ok: false, error: "ORDER_NOT_FOUND" };
    if (order.userId !== userId) return { ok: false, error: "NOT_YOUR_ORDER" };
    if (order.status !== "OPEN") return { ok: false, error: "ORDER_NOT_OPEN" };

    order.status = "CANCELLED";
    save();
    return { ok: true, order };
  }

  // ─── معاملات کاربر ───
  static userOrders(userId) {
    return Object.values(orders)
      .filter(o => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // ─── تاریخچه معاملات ───
  static recentTrades(pair, limit) {
    pair = pair || "GDM/IRT";
    limit = limit || 50;
    return trades.filter(t => t.pair === pair).slice(-limit).reverse();
  }

  // ─── آمار ۲۴ ساعته ───
  static stats24h(pair) {
    pair = pair || "GDM/IRT";
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const recent = trades.filter(t => t.pair === pair && new Date(t.timestamp).getTime() > since);

    if (recent.length === 0) {
      return { pair, trades: 0, volume: 0, high: 0, low: 0, open: 0, close: 0, change: 0 };
    }

    const prices = recent.map(t => t.price);
    const volume = recent.reduce((s, t) => s + t.amount, 0);

    return {
      pair,
      trades: recent.length,
      volume,
      high: Math.max(...prices),
      low: Math.min(...prices),
      open: prices[0],
      close: prices[prices.length - 1],
      change: ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2)
    };
  }

  // ─── آمار کل ───
  static globalStats() {
    return {
      total_orders: Object.keys(orders).length,
      open_orders: Object.values(orders).filter(o => o.status === "OPEN").length,
      total_trades: trades.length,
      total_volume: trades.reduce((s, t) => s + t.amount, 0)
    };
  }
}

module.exports = { Exchange };
