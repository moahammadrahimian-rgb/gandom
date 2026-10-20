const { startAllWorkers } = require("./ai-worker.js");
const { bus, EVENTS, CHANNELS } = require("./neural-bus.js");

const workers = startAllWorkers();

// تابع تست: انتشار رویدادهایی که AIها باید واکنش بدن
function simulateEvents() {
  console.log("");
  console.log("🎬 شبیه‌سازی رویدادها:");
  console.log("");

  setTimeout(() => {
    console.log("💰 انتشار: PAYMENT_VERIFIED");
    bus.publish(CHANNELS.PAYMENTS, {
      type: EVENTS.PAYMENT_VERIFIED,
      data: {
        paymentId: "PAY-test-001",
        userId: "USR-alice",
        gdm_amount: 100,
        amount_irt: 10000000,
        refId: "MOCK-TEST-001"
      }
    }, "test");
  }, 1000);

  setTimeout(() => {
    console.log("🏪 انتشار: LISTING_CREATED");
    bus.publish(CHANNELS.MARKETS, {
      type: EVENTS.LISTING_CREATED,
      data: {
        listingId: "LST-test-001",
        title: "آپارتمان ۱۰۰ متری",
        price: 5000000000,
        city: "تهران"
      }
    }, "test");
  }, 2000);

  setTimeout(() => {
    console.log("👤 انتشار: USER_REGISTERED");
    bus.publish(CHANNELS.USERS, {
      type: EVENTS.USER_REGISTERED,
      data: {
        userId: "USR-new",
        username: "charlie"
      }
    }, "test");
  }, 3000);

  setTimeout(() => {
    console.log("");
    console.log("═══════════════════════════════════════════════════════");
    console.log("📊 آمار AI Workers:");
    console.log("═══════════════════════════════════════════════════════");
    for (const [name, w] of Object.entries(workers)) {
      console.log(`🤖 ${name}:`);
      console.log(JSON.stringify(w.getStats(), null, 2));
      console.log("");
    }
    console.log("═══════════════════════════════════════════════════════");
    console.log("✅ AI Workers test complete");
    process.exit(0);
  }, 5000);
}

simulateEvents();

// نگه‌داشتن پروسه زنده
setTimeout(() => {}, 60000);
