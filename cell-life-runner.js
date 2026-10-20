const { CellLifeEngine } = require("./cell-life-engine.js");
const { bus, CHANNELS } = require("./neural-bus.js");

console.log("═══════════════════════════════════════════════════════");
console.log("🧬 GANDOM CELL LIFE ENGINE");
console.log("═══════════════════════════════════════════════════════");
console.log("");

const engine = new CellLifeEngine({
  target: 400000,
  maxIndividuals: 500,
  tickMs: 5000
});

engine.initialize();

// اتصال به Neural Bus
let lastBirths = 0;

setInterval(() => {
  const result = engine.tick();

  // انتشار رویدادها هر ۵ تیک
  if (result.tick % 5 === 0) {
    try {
      bus.publish(CHANNELS.AI, {
        type: "CELL_TICK",
        data: {
          tick: result.tick,
          alive: result.alive,
          births: result.births,
          deaths: result.deaths,
          generation_max: result.generation_max
        }
      }, "cell-life-engine");
    } catch(e) {}
  }

  // گزارش هر ۱۰ تیک
  if (result.tick % 10 === 0) {
    const s = engine.getStats();
    console.log("");
    console.log(`🧬 TICK #${result.tick} | Alive: ${result.alive.toLocaleString()} | Gen: ${result.generation_max}`);
    console.log(`   📊 Total: births=${s.total_births.toLocaleString()} deaths=${s.total_deaths.toLocaleString()} mutations=${s.total_mutations}`);
    console.log(`   ⏱️  Uptime: ${s.uptime_sec}s | DNA pool: ${s.dna_pool}`);
  }

  // Snapshot در فایل
}, 5000);

// Signal handler
process.on("SIGINT", () => {
  console.log("\n🛑 Cell Life Engine stopped");
  console.log(JSON.stringify(engine.getStats(), null, 2));
  process.exit(0);
});

console.log("⏱️  Ticking every 5 seconds");
console.log("📊 Snapshot every 100 ticks");
console.log("");
