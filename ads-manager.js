// ═══════════════════════════════════════════════════════
// 📢 GANDOM ADS - سیستم تبلیغات ویروسی
// ═══════════════════════════════════════════════════════
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "ads-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const ADS_FILE = path.join(DIR, "ads.json");
const CAMPAIGNS_FILE = path.join(DIR, "campaigns.json");
const REVENUE_FILE = path.join(DIR, "revenue.json");

// ═══════════════════════════════════════════════════════
// 📦 پکیج‌های تبلیغاتی
// ═══════════════════════════════════════════════════════
const PACKAGES = {
  daily: {
    id: "daily",
    name: "روزانه",
    days: 1,
    price_irt: 500000,
    impressions: 1000,
    platforms: ["internal", "telegram"],
    viral_boost: 1
  },
  weekly: {
    id: "weekly",
    name: "هفتگی",
    days: 7,
    price_irt: 3000000,
    impressions: 10000,
    platforms: ["internal", "telegram", "twitter"],
    viral_boost: 2,
    discount: 15
  },
  monthly: {
    id: "monthly",
    name: "ماهانه",
    days: 30,
    price_irt: 10000000,
    impressions: 50000,
    platforms: ["internal", "telegram", "twitter", "instagram"],
    viral_boost: 5,
    discount: 33
  },
  yearly: {
    id: "yearly",
    name: "سالانه",
    days: 365,
    price_irt: 80000000,
    impressions: 1000000,
    platforms: ["internal", "telegram", "twitter", "instagram", "google"],
    viral_boost: 20,
    discount: 55
  }
};

let ads = {};
let campaigns = {};
let revenue = { total_irt: 0, by_package: {}, by_user: {} };

try {
  if (fs.existsSync(ADS_FILE)) ads = JSON.parse(fs.readFileSync(ADS_FILE, "utf8"));
  if (fs.existsSync(CAMPAIGNS_FILE)) campaigns = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, "utf8"));
  if (fs.existsSync(REVENUE_FILE)) revenue = JSON.parse(fs.readFileSync(REVENUE_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(ADS_FILE, JSON.stringify(ads, null, 2));
  fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
  fs.writeFileSync(REVENUE_FILE, JSON.stringify(revenue, null, 2));
}

class AdsManager {

  // ─── لیست پکیج‌ها ───
  static getPackages() {
    return Object.values(PACKAGES).map(p => ({
      ...p,
      price_toman: Math.floor(p.price_irt / 10)
    }));
  }

  // ─── محاسبه قیمت ───
  static quote(packageId) {
    const pkg = PACKAGES[packageId];
    if (!pkg) return { ok: false, error: "INVALID_PACKAGE" };
    return {
      ok: true,
      package: pkg.id,
      name: pkg.name,
      days: pkg.days,
      price_irt: pkg.price_irt,
      price_toman: Math.floor(pkg.price_irt / 10),
      impressions: pkg.impressions,
      platforms: pkg.platforms,
      viral_boost: pkg.viral_boost,
      discount: pkg.discount || 0
    };
  }

  // ─── ثبت درخواست تبلیغ (بدون پرداخت) ───
  static createAdRequest(data) {
    const { userId, packageId, title, description, targetUrl, image, category } = data;

    if (!userId || !packageId || !title) {
      return { ok: false, error: "MISSING_FIELDS" };
    }

    const pkg = PACKAGES[packageId];
    if (!pkg) return { ok: false, error: "INVALID_PACKAGE" };

    const adId = "AD-" + crypto.randomBytes(6).toString("hex");

    ads[adId] = {
      adId,
      userId,
      package: packageId,
      packageName: pkg.name,
      title,
      description: description || "",
      targetUrl: targetUrl || "",
      image: image || null,
      category: category || "general",
      status: "PENDING_PAYMENT",
      price_irt: pkg.price_irt,
      days: pkg.days,
      impressions_quota: pkg.impressions,
      impressions_used: 0,
      platforms: pkg.platforms,
      viral_boost: pkg.viral_boost,
      createdAt: new Date().toISOString(),
      startsAt: null,
      expiresAt: null
    };

    save();

    return {
      ok: true,
      adId,
      ad: ads[adId],
      paymentRequired: {
        amount_irt: pkg.price_irt,
        amount_toman: Math.floor(pkg.price_irt / 10),
        packageName: pkg.name
      }
    };
  }

  // ─── فعال‌سازی تبلیغ بعد از پرداخت ───
  static activateAd(adId, paymentId, refId) {
    const ad = ads[adId];
    if (!ad) return { ok: false, error: "AD_NOT_FOUND" };
    if (ad.status !== "PENDING_PAYMENT") return { ok: false, error: "ALREADY_PROCESSED" };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ad.days * 24 * 60 * 60 * 1000);

    ad.status = "ACTIVE";
    ad.paymentId = paymentId;
    ad.refId = refId;
    ad.startsAt = now.toISOString();
    ad.expiresAt = expiresAt.toISOString();

    // ─── ساخت کمپین ───
    const campaignId = "CMP-" + crypto.randomBytes(6).toString("hex");
    campaigns[campaignId] = {
      campaignId,
      adId,
      userId: ad.userId,
      package: ad.package,
      status: "RUNNING",
      impressions_delivered: 0,
      clicks: 0,
      conversions: 0,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      platforms: ad.platforms
    };

    // ─── ثبت درآمد ───
    revenue.total_irt += ad.price_irt;
    revenue.by_package[ad.package] = (revenue.by_package[ad.package] || 0) + ad.price_irt;
    revenue.by_user[ad.userId] = (revenue.by_user[ad.userId] || 0) + ad.price_irt;

    save();

    // ─── انتشار خودکار در Neural Bus ───
    try {
      const { bus, EVENTS, CHANNELS } = require("./neural-bus.js");
      bus.publish(CHANNELS.ADS, {
        type: EVENTS.AD_CREATED,
        data: {
          adId,
          campaignId,
          title: ad.title,
          description: ad.description,
          targetUrl: ad.targetUrl,
          budget: ad.price_irt,
          platforms: ad.platforms,
          viral_boost: ad.viral_boost,
          userId: ad.userId
        }
      }, "ads-manager");

      // ─── درآمد به حسابدار ───
      bus.publish(CHANNELS.PAYMENTS, {
        type: EVENTS.REVENUE_RECEIVED,
        data: {
          source: "advertisement",
          amount_irt: ad.price_irt,
          adId,
          campaignId,
          description: "درآمد تبلیغات - " + ad.packageName
        }
      }, "ads-manager");

    } catch(e) {
      console.error("Bus error:", e.message);
    }

    console.log(`📢 [ADS] Ad ${adId} ACTIVATED (${ad.packageName})`);
    console.log(`   💰 Revenue: ${ad.price_irt} IRT`);
    console.log(`   📅 Expires: ${expiresAt.toISOString()}`);

    return {
      ok: true,
      ad,
      campaign: campaigns[campaignId]
    };
  }

  // ─── ثبت نمایش ───
  static recordImpression(adId, platform) {
    const ad = ads[adId];
    if (!ad || ad.status !== "ACTIVE") return { ok: false };
    ad.impressions_used++;
    if (ad.impressions_used >= ad.impressions_quota) ad.status = "COMPLETED";
    save();
    return { ok: true, used: ad.impressions_used, quota: ad.impressions_quota };
  }

  // ─── ثبت کلیک ───
  static recordClick(adId) {
    const ad = ads[adId];
    if (!ad) return { ok: false };
    ad.clicks = (ad.clicks || 0) + 1;
    save();
    return { ok: true, clicks: ad.clicks };
  }

  // ─── لیست تبلیغات کاربر ───
  static getUserAds(userId) {
    return Object.values(ads)
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // ─── تبلیغات فعال برای نمایش ───
  static getActiveAds(limit) {
    const now = Date.now();
    const active = Object.values(ads)
      .filter(a => a.status === "ACTIVE")
      .filter(a => new Date(a.expiresAt).getTime() > now)
      .filter(a => a.impressions_used < a.impressions_quota);

    // مرتب‌سازی بر اساس viral_boost (تبلیغات با boost بیشتر، بالاتر نمایش داده می‌شن)
    active.sort((a, b) => (b.viral_boost || 1) - (a.viral_boost || 1));

    return active.slice(0, limit || 10);
  }

  // ─── آمار کل ───
  static getStats() {
    const all = Object.values(ads);
    return {
      total_ads: all.length,
      active_ads: all.filter(a => a.status === "ACTIVE").length,
      pending_ads: all.filter(a => a.status === "PENDING_PAYMENT").length,
      completed_ads: all.filter(a => a.status === "COMPLETED").length,
      total_impressions: all.reduce((s, a) => s + (a.impressions_used || 0), 0),
      total_clicks: all.reduce((s, a) => s + (a.clicks || 0), 0),
      total_revenue_irt: revenue.total_irt,
      total_revenue_toman: Math.floor(revenue.total_irt / 10),
      by_package: revenue.by_package,
      packages: Object.keys(PACKAGES).length
    };
  }

  // ─── آمار کمپین ───
  static getCampaignStats(campaignId) {
    return campaigns[campaignId] || null;
  }

  // ─── اجرای فوری (بدون انتظار) ───
  static executeImmediately(adId) {
    const ad = ads[adId];
    if (!ad) return { ok: false, error: "NOT_FOUND" };

    // ثبت ۱۰ نمایش اولیه برای اجرای فوری
    ad.impressions_used = Math.min(10, ad.impressions_quota);

    // ارسال به Neural Bus برای اجرای فوری
    try {
      const { bus, EVENTS, CHANNELS } = require("./neural-bus.js");
      bus.publish(CHANNELS.SOCIAL, {
        type: EVENTS.SOCIAL_POST,
        data: {
          content: `📢 ${ad.title}\n\n${ad.description}\n\n🔗 ${ad.targetUrl || "gandom.io"}`,
          listing_id: adId,
          viral: true,
          platforms: ad.platforms,
          viral_boost: ad.viral_boost
        }
      }, "ads-manager");
    } catch(e) {}

    save();
    return { ok: true, ad, message: "IMMEDIATE_EXECUTION_STARTED" };
  }
}

module.exports = { AdsManager, PACKAGES };
