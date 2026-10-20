// ═══════════════════════════════════════════════════════
// 🏪 GANDOM MARKETS - بازارهای واقعی
// ═══════════════════════════════════════════════════════

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "market-data");
const LISTINGS_FILE = path.join(DIR, "listings.json");
const DEALS_FILE = path.join(DIR, "deals.json");

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const CATEGORIES = [
  { id: "realestate", name: "املاک", icon: "🏠" },
  { id: "gold", name: "طلا و جواهرات", icon: "🥇" },
  { id: "car", name: "خودرو", icon: "🚗" },
  { id: "copper", name: "مس و فلزات", icon: "⚙️" },
  { id: "crypto", name: "ارز دیجیتال", icon: "₿" },
  { id: "service", name: "خدمات", icon: "🛠️" }
];

let listings = {};
let deals = [];

try {
  if (fs.existsSync(LISTINGS_FILE)) listings = JSON.parse(fs.readFileSync(LISTINGS_FILE, "utf8"));
  if (fs.existsSync(DEALS_FILE)) deals = JSON.parse(fs.readFileSync(DEALS_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2));
  fs.writeFileSync(DEALS_FILE, JSON.stringify(deals.slice(-1000), null, 2));
}

class Markets {

  static getCategories() { return CATEGORIES; }

  // ─── ثبت آگهی جدید ───
  static createListing({ userId, category, title, description, price, currency, city, images, metadata }) {
    if (!userId || !category || !title || !price) {
      return { ok: false, error: "MISSING_FIELDS" };
    }

    if (!CATEGORIES.find(c => c.id === category)) {
      return { ok: false, error: "INVALID_CATEGORY" };
    }

    const listingId = "LST-" + crypto.randomBytes(6).toString("hex");
    const listing = {
      listingId,
      userId,
      category,
      title,
      description: description || "",
      price: parseFloat(price),
      currency: currency || "IRT",
      city: city || "تهران",
      images: images || [],
      metadata: metadata || {},
      status: "ACTIVE",
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    listings[listingId] = listing;
    save();

    return { ok: true, listing };
  }

  // ─── لیست آگهی‌ها ───
  static getListings({ category, city, minPrice, maxPrice, search, limit, offset }) {
    let results = Object.values(listings).filter(l => l.status === "ACTIVE");

    if (category) results = results.filter(l => l.category === category);
    if (city) results = results.filter(l => l.city === city);
    if (minPrice) results = results.filter(l => l.price >= minPrice);
    if (maxPrice) results = results.filter(l => l.price <= maxPrice);
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(l => 
        l.title.toLowerCase().includes(s) || 
        l.description.toLowerCase().includes(s)
      );
    }

    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = results.length;
    offset = offset || 0;
    limit = limit || 20;

    return {
      total,
      offset,
      limit,
      listings: results.slice(offset, offset + limit)
    };
  }

  // ─── جزئیات آگهی ───
  static getListing(listingId) {
    const listing = listings[listingId];
    if (!listing) return null;
    listing.views++;
    save();
    return listing;
  }

  // ─── حذف آگهی ───
  static deleteListing(listingId, userId) {
    const listing = listings[listingId];
    if (!listing) return { ok: false, error: "NOT_FOUND" };
    if (listing.userId !== userId) return { ok: false, error: "NOT_OWNER" };

    listing.status = "DELETED";
    save();
    return { ok: true };
  }

  // ─── بستن معامله ───
  static createDeal({ listingId, buyerId, sellerId, price, notes }) {
    const listing = listings[listingId];
    if (!listing) return { ok: false, error: "LISTING_NOT_FOUND" };

    const dealId = "DEAL-" + crypto.randomBytes(6).toString("hex");
    const deal = {
      dealId,
      listingId,
      buyerId,
      sellerId,
      price: parseFloat(price),
      notes: notes || "",
      status: "PENDING",
      createdAt: new Date().toISOString()
    };

    deals.push(deal);
    listing.status = "SOLD";
    save();

    return { ok: true, deal };
  }

  // ─── آگهی‌های کاربر ───
  static getUserListings(userId) {
    return Object.values(listings)
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // ─── آمار بازار ───
  static getStats() {
    const active = Object.values(listings).filter(l => l.status === "ACTIVE");
    const byCategory = {};

    CATEGORIES.forEach(c => {
      const catListings = active.filter(l => l.category === c.id);
      byCategory[c.id] = {
        name: c.name,
        icon: c.icon,
        count: catListings.length,
        total_value: catListings.reduce((s, l) => s + l.price, 0),
        avg_price: catListings.length > 0 ? Math.floor(catListings.reduce((s, l) => s + l.price, 0) / catListings.length) : 0
      };
    });

    return {
      total_listings: Object.keys(listings).length,
      active_listings: active.length,
      total_deals: deals.length,
      categories: byCategory
    };
  }
}

module.exports = { Markets, CATEGORIES };
