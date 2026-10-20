// ═══════════════════════════════════════════════════════
// 🤖 AI RUNNER - مدیر دائمی AI Workers
// ═══════════════════════════════════════════════════════
const { startAllWorkers } = require("./ai-worker.js");
const { bus, EVENTS, CHANNELS } = require("./neural-bus.js");
const http = require("http");

console.log("");
console.log("═══════════════════════════════════════════════════════");
console.log("🤖 GANDOM AI RUNNER");
console.log("═══════════════════════════════════════════════════════");
console.log("📅 " + new Date().toISOString());
console.log("");

const workers = startAllWorkers();

// ─── اتصال به رویدادهای سرور اصلی ───
// هر ۱۰ ثانیه از سرور اصلی آمار می‌گیریم و اگه رویداد جدید بود، منتشر می‌کنیم
let lastPaymentsCount = 0;
let lastListingsCount = 0;
let lastUsersCount = 0;

setInterval(async () => {
  try {
    // چک payments
    const pRes = await fetch("http://127.0.0.1:8787/api/payment/list");
    const pData = await pRes.json();
    if (pData.ok && pData.payments) {
      const newPayments = pData.payments.filter(p => p.status === "VERIFIED");
      if (newPayments.length > lastPaymentsCount) {
        const newOnes = newPayments.slice(lastPaymentsCount);
        for (const p of newOnes) {
          bus.publish(CHANNELS.PAYMENTS, {
            type: EVENTS.PAYMENT_VERIFIED,
            data: p
          }, "ai-runner");
        }
        lastPaymentsCount = newPayments.length;
      }
    }
  } catch(e) {}

  try {
    // چک listings
    const lRes = await fetch("http://127.0.0.1:8787/api/market/listings");
    const lData = await lRes.json();
    if (lData.ok && lData.listings) {
      const active = lData.listings.filter(l => l.status === "ACTIVE");
      if (active.length > lastListingsCount) {
        const newOnes = active.slice(lastListingsCount);
        for (const l of newOnes) {
          bus.publish(CHANNELS.MARKETS, {
            type: EVENTS.LISTING_CREATED,
            data: l
          }, "ai-runner");
        }
        lastListingsCount = active.length;
      }
    }
  } catch(e) {}

  try {
    // چک users
    const uRes = await fetch("http://127.0.0.1:8787/api/users/list");
    const uData = await uRes.json();
    if (uData.ok && uData.users) {
      if (uData.users.length > lastUsersCount) {
        const newOnes = uData.users.slice(lastUsersCount);
        for (const u of newOnes) {
          bus.publish(CHANNELS.USERS, {
            type: EVENTS.USER_REGISTERED,
            data: u
          }, "ai-runner");
        }
        lastUsersCount = uData.users.length;
      }
    }
  } catch(e) {}
}, 10000);

// ─── گزارش دوره‌ای ───
setInterval(() => {
  console.log("");
  console.log("📊 AI RUNNER Status - " + new Date().toLocaleTimeString());
  for (const [name, w] of Object.entries(workers)) {
    const s = w.getStats();
    console.log(`  🤖 ${s.name}: received=${s.received} processed=${s.processed} errors=${s.errors}`);
  }
}, 60000);

console.log("✅ AI Runner started - monitoring server events");
console.log("");

// نگه‌داشتن پروسه
process.on("SIGINT", () => {
  console.log("\n🛑 AI Runner stopped");
  process.exit(0);
});
