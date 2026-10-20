const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "breeding-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const CELLS_FILE = path.join(DIR, "cells.json");
const GENS_FILE = path.join(DIR, "generations.json");

let cells = {};
let generations = [];

try {
  if (fs.existsSync(CELLS_FILE)) cells = JSON.parse(fs.readFileSync(CELLS_FILE, "utf8"));
  if (fs.existsSync(GENS_FILE)) generations = JSON.parse(fs.readFileSync(GENS_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(CELLS_FILE, JSON.stringify(cells, null, 2));
  fs.writeFileSync(GENS_FILE, JSON.stringify(generations.slice(-100), null, 2));
}

class BreedingManager {

  static CONFIG = {
    min_energy: 50,
    breed_cost_gdm: 1,
    offspring_min: 1,
    offspring_max: 3,
    mutation_rate: 0.1,
    max_population: 20000
  };

  // ─── ساخت سلول اولیه ───
  static createCell(data) {
    const cellId = "CELL-" + crypto.randomBytes(6).toString("hex");
    cells[cellId] = {
      cellId,
      name: data.name || "Genesis Cell",
      parentA: null,
      parentB: null,
      generation: 0,
      dna: this.generateDNA(),
      energy: 100,
      age: 0,
      alive: true,
      offspring: 0,
      traits: data.traits || [],
      createdAt: new Date().toISOString()
    };
    save();
    return { ok: true, cell: cells[cellId] };
  }

  // ─── تولید DNA ───
  static generateDNA() {
    return crypto.randomBytes(32).toString("hex");
  }

  // ─── ترکیب DNA والدین ───
  static crossover(dnaA, dnaB) {
    const a = Buffer.from(dnaA, "hex");
    const b = Buffer.from(dnaB, "hex");
    const result = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      result[i] = Math.random() < 0.5 ? a[i] : b[i];
    }
    return result.toString("hex");
  }

  // ─── جهش ───
  static mutate(dna) {
    const buf = Buffer.from(dna, "hex");
    for (let i = 0; i < buf.length; i++) {
      if (Math.random() < this.CONFIG.mutation_rate) {
        buf[i] = crypto.randomBytes(1)[0];
      }
    }
    return buf.toString("hex");
  }

  // ─── دامدایی (تولید نسل) ───
  static breed(parentAId, parentBId) {
    const A = cells[parentAId];
    const B = cells[parentBId];

    if (!A || !B) return { ok: false, error: "PARENT_NOT_FOUND" };
    if (!A.alive || !B.alive) return { ok: false, error: "PARENT_DEAD" };
    if (A.energy < this.CONFIG.min_energy || B.energy < this.CONFIG.min_energy) {
      return { ok: false, error: "LOW_ENERGY" };
    }
    if (Object.keys(cells).length >= this.CONFIG.max_population) {
      return { ok: false, error: "MAX_POPULATION_REACHED", max: this.CONFIG.max_population };
    }

    const offspringCount = this.CONFIG.offspring_min +
      Math.floor(Math.random() * (this.CONFIG.offspring_max - this.CONFIG.offspring_min + 1));

    const children = [];
    const generation = Math.max(A.generation, B.generation) + 1;

    for (let i = 0; i < offspringCount; i++) {
      let dna = this.crossover(A.dna, B.dna);
      dna = this.mutate(dna);

      const childId = "CELL-" + crypto.randomBytes(6).toString("hex");
      cells[childId] = {
        cellId: childId,
        name: "Child G" + generation,
        parentA: parentAId,
        parentB: parentBId,
        generation,
        dna,
        energy: 100,
        age: 0,
        alive: true,
        offspring: 0,
        traits: [],
        createdAt: new Date().toISOString()
      };
      children.push(cells[childId]);
    }

    A.offspring += offspringCount;
    B.offspring += offspringCount;

    // کاهش انرژی والدین
    A.energy = Math.max(0, A.energy - 30);
    B.energy = Math.max(0, B.energy - 30);

    generations.push({
      genId: "GEN-" + crypto.randomBytes(4).toString("hex"),
      generation,
      parentA: parentAId,
      parentB: parentBId,
      offspring_count: offspringCount,
      offspring_ids: children.map(c => c.cellId),
      ts: Date.now()
    });

    save();

    // Neural Bus
    try {
      const { bus, CHANNELS } = require("./neural-bus.js");
      bus.publish(CHANNELS.AI, {
        type: "CELLS_BRED",
        data: {
          generation,
          offspring_count: offspringCount,
          total_population: Object.keys(cells).length
        }
      }, "breeding-manager");
    } catch(e) {}

    return {
      ok: true,
      generation,
      offspring_count: offspringCount,
      children,
      total_population: Object.keys(cells).length
    };
  }

  // ─── گذشت زمان (پیر شدن) ───
  static ageTick() {
    let deaths = 0;
    for (const id in cells) {
      const c = cells[id];
      if (!c.alive) continue;
      c.age++;
      c.energy = Math.max(0, c.energy - 1);
      if (c.energy === 0 && c.age > 100) {
        c.alive = false;
        deaths++;
      }
    }
    save();
    return { deaths, total_alive: Object.values(cells).filter(c => c.alive).length };
  }

  static getStats() {
    const all = Object.values(cells);
    const alive = all.filter(c => c.alive);
    const maxGen = Math.max(...all.map(c => c.generation), 0);
    return {
      total_cells: all.length,
      alive: alive.length,
      dead: all.length - alive.length,
      max_generation: maxGen,
      total_offspring: all.reduce((s, c) => s + (c.offspring || 0), 0),
      config: this.CONFIG
    };
  }
}

module.exports = { BreedingManager };
