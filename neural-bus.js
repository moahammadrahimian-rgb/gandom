// ═══════════════════════════════════════════════════════
// 🧠 NEURAL BUS - باس عصبی گندم ۲۵۵۸
// ═══════════════════════════════════════════════════════
const EventEmitter = require("events");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "neural-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const LOG_FILE = path.join(DIR, "events.log");
const STATS_FILE = path.join(DIR, "stats.json");

class NeuralBus extends EventEmitter {
  constructor() {
    super();
    this.subscribers = new Map();
    this.eventCount = 0;
    this.eventTypes = {};
    this.startTime = Date.now();
    console.log("🧠 Neural Bus started");
  }

  subscribe(channel, handler, id) {
    id = id || crypto.randomBytes(4).toString("hex");
    if (!this.subscribers.has(channel)) this.subscribers.set(channel, new Map());
    this.subscribers.get(channel).set(id, handler);
    console.log(`📥 [${id}] subscribed to "${channel}"`);
    return id;
  }

  unsubscribe(channel, id) {
    if (this.subscribers.has(channel)) this.subscribers.get(channel).delete(id);
  }

  publish(channel, event, source) {
    const envelope = {
      eventId: "EVT-" + crypto.randomBytes(6).toString("hex"),
      channel: channel,
      event: event,
      source: source || "system",
      timestamp: Date.now(),
      iso: new Date().toISOString()
    };

    this.eventCount++;
    this.eventTypes[event.type] = (this.eventTypes[event.type] || 0) + 1;

    // ذخیره در لاگ
    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(envelope) + "\n");
    } catch(e) {}

    // اطلاع به مشترکین
    if (this.subscribers.has(channel)) {
      for (const [id, handler] of this.subscribers.get(channel)) {
        try {
          handler(envelope);
        } catch(e) {
          console.error(`Handler error [${id}]:`, e.message);
        }
      }
    }

    // اطلاع به مشترکین "*" (همه)
    if (this.subscribers.has("*")) {
      for (const [id, handler] of this.subscribers.get("*")) {
        try { handler(envelope); } catch(e) {}
      }
    }

    console.log(`📡 [${source || "system"}] ${event.type} → ${channel}`);
    return envelope;
  }

  getStats() {
    const subsCount = {};
    for (const [ch, map] of this.subscribers) {
      subsCount[ch] = map.size;
    }
    return {
      total_events: this.eventCount,
      event_types: this.eventTypes,
      subscribers: subsCount,
      uptime_sec: Math.floor((Date.now() - this.startTime) / 1000),
      channels: Array.from(this.subscribers.keys())
    };
  }

  getRecentEvents(limit) {
    try {
      if (!fs.existsSync(LOG_FILE)) return [];
      const lines = fs.readFileSync(LOG_FILE, "utf8").trim().split("\n");
      return lines.slice(-(limit || 50)).map(l => {
        try { return JSON.parse(l); } catch(e) { return null; }
      }).filter(Boolean);
    } catch(e) { return []; }
  }
}

// ─── Singleton ───
const bus = new NeuralBus();

// ─── رویدادهای استاندارد گندم ───
const EVENTS = {
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN: "USER_LOGIN",
  BLOCK_MINED: "BLOCK_MINED",
  TX_CREATED: "TX_CREATED",
  PAYMENT_REQUESTED: "PAYMENT_REQUESTED",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
  ORDER_PLACED: "ORDER_PLACED",
  ORDER_MATCHED: "ORDER_MATCHED",
  LISTING_CREATED: "LISTING_CREATED",
  AD_CREATED: "AD_CREATED",
  AI_TASK: "AI_TASK",
  AI_RESULT: "AI_RESULT",
  SOCIAL_POST: "SOCIAL_POST",
  REVENUE_RECEIVED: "REVENUE_RECEIVED",
  OWNER_SHARE: "OWNER_SHARE"
};

// ─── کانال‌های استاندارد ───
const CHANNELS = {
  USERS: "users",
  BLOCKCHAIN: "blockchain",
  PAYMENTS: "payments",
  EXCHANGE: "exchange",
  MARKETS: "markets",
  AI: "ai",
  SOCIAL: "social",
  ADS: "ads",
  TREASURY: "treasury",
  AUDIT: "audit",
  ALL: "*"
};

module.exports = { bus, EVENTS, CHANNELS };
