// ═══════════════════════════════════════════════════════
// 🧬 CELL LIFE ENGINE - موتور حیات ۴۰۰,۰۰۰ سلول
// ═══════════════════════════════════════════════════════
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "cell-life-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const SNAPSHOT_FILE = path.join(DIR, "snapshot.json");
const EVENTS_FILE = path.join(DIR, "events.log");

class CellLifeEngine {
  constructor(opts = {}) {
    this.TARGET = opts.target || 400000;
    this.MAX_INDIVIDUALS = opts.maxIndividuals || 500;
    this.TICK_MS = opts.tickMs || 5000;
    this.SNAPSHOT_EVERY = 100;

    this.population = [];
    this.individuals = {};
    this.dnaPool = [];
    this.MAX_DNA = 200;

    this.tickCount = 0;
    this.stats = {
      current_alive: 0,
      peak_alive: 0,
      total_births: 0,
      total_deaths: 0,
      total_mutations: 0,
      generation_max: 0,
      tick_count: 0,
      uptime_sec: 0
    };

    this.startTime = Date.now();
    this.logStream = fs.createWriteStream(EVENTS_FILE, { flags: "a" });
  }

  randDNA() {
    return crypto.randomBytes(32).toString("hex");
  }

  initialize() {
    console.log(`🧬 Initializing ${this.TARGET.toLocaleString()} cells...`);

    // DNA Pool
    for (let i = 0; i < 50; i++) this.dnaPool.push(this.randDNA());

    // Population
    for (let i = 0; i < this.TARGET; i++) {
      this.population.push({
        i: i,
        g: 0,
        d: Math.floor(Math.random() * this.dnaPool.length),
        e: 100,
        b: 0
      });
    }

    // Elite individuals (full objects)
    for (let k = 0; k < this.MAX_INDIVIDUALS; k++) {
      const idx = Math.floor(Math.random() * this.population.length);
      const c = this.population[idx];
      this.individuals[c.i] = {
        id: c.i,
        name: "Cell-" + c.i,
        generation: c.g,
        dna: this.dnaPool[c.d],
        energy: c.e,
        birthTick: c.b,
        parentA: null,
        parentB: null,
        alive: true
      };
    }

    this.stats.current_alive = this.population.length;
    this.stats.peak_alive = this.population.length;

    console.log(`✅ ${this.population.length.toLocaleString()} cells alive`);
    return this.stats;
  }

  logEvent(type, data) {
    try {
      this.logStream.write(JSON.stringify({
        type, ts: Date.now(), tick: this.tickCount, ...data
      }) + "\n");
    } catch(e) {}
  }

  // ─── تیک اصلی ───
  tick() {
    this.tickCount++;

    let births = 0, deaths = 0, mutations = 0;
    const newPop = [];
    const birthList = [];

    for (let k = 0; k < this.population.length; k++) {
      const cell = this.population[k];
      cell.e -= 1; // age

      // مرگ
      const ageTicks = this.tickCount - cell.b;
      if (cell.e <= 0 || ageTicks > 150) {
        deaths++;
        continue;
      }

      // تولد
      if (cell.e > 65 && ageTicks > 8 && Math.random() < 0.02) {
        const newIdx = this.population.length + births;
        const child = {
          i: newIdx,
          g: cell.g + 1,
          d: cell.d,
          e: 100,
          b: this.tickCount
        };

        // جهش
        if (Math.random() < 0.03) {
          if (this.dnaPool.length < this.MAX_DNA) {
            this.dnaPool.push(this.randDNA());
          }
          child.d = Math.floor(Math.random() * this.dnaPool.length);
          mutations++;
        }

        birthList.push(child);
        births++;
        cell.e -= 25;
      }

      newPop.push(cell);
    }

    // اضافه کردن تولدها
    for (const c of birthList) newPop.push(c);

    // اگه از هدف رد شد، تصادفی حذف کن
    while (newPop.length > this.TARGET) {
      const idx = Math.floor(Math.random() * newPop.length);
      newPop.splice(idx, 1);
      deaths++;
    }

    this.population = newPop;
    this.stats.current_alive = newPop.length;
    if (newPop.length > this.stats.peak_alive) this.stats.peak_alive = newPop.length;
    this.stats.total_births += births;
    this.stats.total_deaths += deaths;
    this.stats.total_mutations += mutations;
    this.stats.tick_count = this.tickCount;
    this.stats.uptime_sec = Math.floor((Date.now() - this.startTime) / 1000);

    // Max generation
    for (const c of newPop) {
      if (c.g > this.stats.generation_max) this.stats.generation_max = c.g;
    }

    const result = {
      tick: this.tickCount,
      births, deaths, mutations,
      alive: newPop.length,
      generation_max: this.stats.generation_max
    };

    this.logEvent("CELL_TICK", result);

    // Snapshot هر N تیک
    if (this.tickCount % this.SNAPSHOT_EVERY === 0) {
      this.saveSnapshot();
    }

    return result;
  }

  saveSnapshot() {
    try {
      const snap = {
        tick: this.tickCount,
        ts: Date.now(),
        population_size: this.population.length,
        stats: this.stats,
        dna_pool_size: this.dnaPool.length,
        sample: this.population.slice(0, 20)
      };
      fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snap, null, 2));
    } catch(e) {}
  }

  getStats() {
    return {
      ...this.stats,
      target: this.TARGET,
      dna_pool: this.dnaPool.length,
      tick_ms: this.TICK_MS
    };
  }

  getSample(n) {
    n = n || 10;
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = this.population[Math.floor(Math.random() * this.population.length)];
      if (c) out.push({ id: c.i, gen: c.g, dna: this.dnaPool[c.d].substring(0, 16) + "...", energy: c.e });
    }
    return out;
  }
}

module.exports = { CellLifeEngine };
