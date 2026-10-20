// ═══════════════════════════════════════════════════════
// 🤖 AI WORKER FRAMEWORK - کارمند هوشمند گندم
// ═══════════════════════════════════════════════════════
const { bus, EVENTS, CHANNELS } = require("./neural-bus.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "ai-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

class AIWorker {
  constructor(config) {
    this.id = config.id || "AI-" + crypto.randomBytes(4).toString("hex");
    this.name = config.name || "Worker";
    this.role = config.role || "generic";
    this.subscribedChannels = config.channels || [CHANNELS.ALL];
    this.taskQueue = [];
    this.processedTasks = 0;
    this.stats = { received: 0, processed: 0, errors: 0 };
    this.startTime = Date.now();

    console.log(`🤖 [${this.id}] ${this.name} (${this.role}) started`);

    // اتصال به Neural Bus
    for (const ch of this.subscribedChannels) {
      bus.subscribe(ch, (envelope) => this.onEvent(envelope), this.id);
    }
  }

  onEvent(envelope) {
    this.stats.received++;

    // فیلتر: فقط رویدادهای مربوط به خودم
    const evt = envelope.event;
    if (evt && evt.target && evt.target !== this.id && evt.target !== this.role) {
      return;
    }

    // اضافه به صف
    this.taskQueue.push(envelope);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.taskQueue.length > 0) {
      const envelope = this.taskQueue.shift();
      try {
        await this.process(envelope);
        this.stats.processed++;
      } catch(e) {
        this.stats.errors++;
        console.error(`[${this.id}] error:`, e.message);
      }
    }

    this.processing = false;
  }

  // ─── متد اصلی که هر کارمند override می‌کنه ───
  async process(envelope) {
    console.log(`[${this.id}] processing: ${envelope.event.type}`);
  }

  // ─── انتشار نتیجه ───
  publishResult(eventType, data, channel) {
    return bus.publish(
      channel || CHANNELS.AI,
      {
        type: eventType,
        data: data,
        worker_id: this.id,
        worker_role: this.role
      },
      this.id
    );
  }

  getStats() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      ...this.stats,
      uptime_sec: Math.floor((Date.now() - this.startTime) / 1000),
      queue_size: this.taskQueue.length
    };
  }
}

// ═══════════════════════════════════════════════════════
// 📊 AI-ACCOUNTANT - حسابدار خودکار
// ═══════════════════════════════════════════════════════
class AIAccountant extends AIWorker {
  constructor() {
    super({
      name: "AI-ACCOUNTANT",
      role: "accountant",
      channels: [CHANNELS.PAYMENTS, CHANNELS.EXCHANGE, CHANNELS.MARKETS, CHANNELS.TREASURY]
    });

    this.ledger = { entries: [], total_in: 0, total_out: 0, balance: 0 };
    this.loadLedger();
  }

  loadLedger() {
    const file = path.join(DIR, "accountant-ledger.json");
    try {
      if (fs.existsSync(file)) this.ledger = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch(e) {}
  }

  saveLedger() {
    const file = path.join(DIR, "accountant-ledger.json");
    fs.writeFileSync(file, JSON.stringify(this.ledger, null, 2));
  }

  async process(envelope) {
    const evt = envelope.event;
    const type = evt.type;

    if (type === EVENTS.PAYMENT_VERIFIED) {
      this.recordIncome({
        source: "payment",
        amount_irt: evt.data.amount_irt,
        gdm: evt.data.gdm_amount,
        userId: evt.data.userId,
        paymentId: evt.data.paymentId,
        refId: evt.data.refId
      });
    } else if (type === EVENTS.ORDER_MATCHED) {
      this.recordIncome({
        source: "exchange",
        amount_irt: evt.data.price * evt.data.amount,
        gdm: evt.data.amount,
        tradeId: evt.data.tradeId
      });
    } else if (type === EVENTS.LISTING_CREATED) {
      this.recordExpense({
        source: "market_listing",
        amount_irt: 0,
        listingId: evt.data.listingId
      });
    } else if (type === EVENTS.REVENUE_RECEIVED) {
      this.recordIncome({
        source: evt.data.source || "external",
        amount_irt: evt.data.amount_irt,
        description: evt.data.description
      });
    }
  }

  recordIncome(data) {
    const entry = {
      id: "LED-" + crypto.randomBytes(4).toString("hex"),
      ts: Date.now(),
      iso: new Date().toISOString(),
      direction: "IN",
      ...data
    };
    this.ledger.entries.push(entry);
    this.ledger.total_in += (data.amount_irt || 0);
    this.ledger.balance += (data.amount_irt || 0);
    if (this.ledger.entries.length > 5000) this.ledger.entries = this.ledger.entries.slice(-5000);
    this.saveLedger();
    console.log(`💰 [AI-ACCOUNTANT] +${data.amount_irt} IRT (${data.source})`);

    this.publishResult(EVENTS.AI_RESULT, {
      action: "LEDGER_UPDATED",
      total_in: this.ledger.total_in,
      balance: this.ledger.balance
    });
  }

  recordExpense(data) {
    const entry = {
      id: "LED-" + crypto.randomBytes(4).toString("hex"),
      ts: Date.now(),
      iso: new Date().toISOString(),
      direction: "OUT",
      ...data
    };
    this.ledger.entries.push(entry);
    this.ledger.total_out += (data.amount_irt || 0);
    this.ledger.balance -= (data.amount_irt || 0);
    this.saveLedger();
  }

  getStats() {
    return {
      ...super.getStats(),
      ledger_size: this.ledger.entries.length,
      total_in_irt: this.ledger.total_in,
      total_out_irt: this.ledger.total_out,
      balance_irt: this.ledger.balance
    };
  }
}

// ═══════════════════════════════════════════════════════
// 📣 AI-MARKETER - بازاریاب خودکار
// ═══════════════════════════════════════════════════════
class AIMarketer extends AIWorker {
  constructor() {
    super({
      name: "AI-MARKETER",
      role: "marketer",
      channels: [CHANNELS.MARKETS, CHANNELS.USERS, CHANNELS.SOCIAL, CHANNELS.ADS]
    });

    this.campaigns = [];
    this.contentGenerated = 0;
  }

  async process(envelope) {
    const evt = envelope.event;
    const type = evt.type;

    if (type === EVENTS.LISTING_CREATED) {
      this.promoteListing(evt.data);
    } else if (type === EVENTS.USER_REGISTERED) {
      this.welcomeUser(evt.data);
    } else if (type === EVENTS.AD_CREATED) {
      this.launchCampaign(evt.data);
    } else if (type === EVENTS.AI_TASK && evt.data.task === "generate_content") {
      this.generateContent(evt.data);
    }
  }

  promoteListing(listing) {
    const post = {
      id: "POST-" + crypto.randomBytes(4).toString("hex"),
      platform: "internal",
      content: `🏪 آگهی جدید: ${listing.title} - ${listing.price ? listing.price.toLocaleString() : ""} در ${listing.city}`,
      listing_id: listing.listingId,
      created_at: new Date().toISOString()
    };
    this.contentGenerated++;
    console.log(`📣 [AI-MARKETER] promoted: ${listing.listingId}`);

    this.publishResult(EVENTS.SOCIAL_POST, post, CHANNELS.SOCIAL);
  }

  welcomeUser(user) {
    console.log(`👋 [AI-MARKETER] welcoming ${user.username || user.userId}`);
    this.publishResult(EVENTS.AI_RESULT, {
      action: "USER_WELCOMED",
      userId: user.userId
    });
  }

  launchCampaign(ad) {
    const campaign = {
      id: "CMP-" + crypto.randomBytes(4).toString("hex"),
      ad_id: ad.adId,
      status: "ACTIVE",
      created_at: new Date().toISOString()
    };
    this.campaigns.push(campaign);
    console.log(`📢 [AI-MARKETER] campaign: ${campaign.id}`);
  }

  generateContent(data) {
    console.log(`📝 [AI-MARKETER] generating content for: ${data.topic}`);
    this.contentGenerated++;
  }

  getStats() {
    return {
      ...super.getStats(),
      campaigns: this.campaigns.length,
      content_generated: this.contentGenerated
    };
  }
}

// ═══════════════════════════════════════════════════════
// 🚀 راه‌اندازی
// ═══════════════════════════════════════════════════════
function startAllWorkers() {
  const workers = {
    accountant: new AIAccountant(),
    marketer: new AIMarketer()
  };

  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log("🤖 AI WORKERS STARTED");
  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ AI-ACCOUNTANT");
  console.log("✅ AI-MARKETER");
  console.log("");

  return workers;
}

module.exports = {
  AIWorker,
  AIAccountant,
  AIMarketer,
  startAllWorkers
};
