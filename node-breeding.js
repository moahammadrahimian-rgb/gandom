// ═══════════════════════════════════════════════════════
// 🧬 NODE BREEDING - زاد و ولد نودها
// ═══════════════════════════════════════════════════════
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "nodes-family");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const NODES_FILE = path.join(DIR, "nodes.json");
const GENS_FILE = path.join(DIR, "generations.json");
const FAMILY_FILE = path.join(DIR, "family-tree.json");

let nodes = {};
let generations = [];
let familyTree = {};

try {
  if (fs.existsSync(NODES_FILE)) nodes = JSON.parse(fs.readFileSync(NODES_FILE, "utf8"));
  if (fs.existsSync(GENS_FILE)) generations = JSON.parse(fs.readFileSync(GENS_FILE, "utf8"));
  if (fs.existsSync(FAMILY_FILE)) familyTree = JSON.parse(fs.readFileSync(FAMILY_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(NODES_FILE, JSON.stringify(nodes, null, 2));
  fs.writeFileSync(GENS_FILE, JSON.stringify(generations.slice(-500), null, 2));
  fs.writeFileSync(FAMILY_FILE, JSON.stringify(familyTree, null, 2));
}

class NodeBreeding {
  static CONFIG = {
    min_energy: 60,
    breed_cost: 20,
    offspring_min: 1,
    offspring_max: 3,
    mutation_rate: 0.08,
    max_nodes: 20000,
    mother_id: "GDM-MOTHER-2558"
  };

  // ─── ساخت نود اولیه ───
  static createNode(data) {
    const nodeId = "NODE-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const dna = crypto.randomBytes(32).toString("hex");

    nodes[nodeId] = {
      nodeId,
      name: data.name || "Node-" + nodeId,
      role: data.role || "worker",
      generation: data.generation || 0,
      dna,
      parentA: data.parentA || null,
      parentB: data.parentB || null,
      energy: data.energy || 100,
      age: 0,
      alive: true,
      offspring: 0,
      capabilities: data.capabilities || ["compute"],
      traits: data.traits || [],
      bornAt: new Date().toISOString(),
      mother_id: this.CONFIG.mother_id
    };

    // اضافه به شجره‌نامه
    if (!familyTree[nodeId]) {
      familyTree[nodeId] = {
        nodeId,
        parents: [data.parentA, data.parentB].filter(Boolean),
        children: [],
        generation: data.generation || 0
      };
    }

    save();
    return { ok: true, node: nodes[nodeId] };
  }

  // ─── ترکیب DNA ───
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

  // ─── زاد و ولد ───
  static breed(parentAId, parentBId) {
    const A = nodes[parentAId];
    const B = nodes[parentBId];

    if (!A || !B) return { ok: false, error: "PARENT_NOT_FOUND" };
    if (!A.alive || !B.alive) return { ok: false, error: "PARENT_DEAD" };
    if (A.energy < this.CONFIG.min_energy || B.energy < this.CONFIG.min_energy) {
      return { ok: false, error: "LOW_ENERGY", min: this.CONFIG.min_energy };
    }
    if (Object.keys(nodes).length >= this.CONFIG.max_nodes) {
      return { ok: false, error: "MAX_NODES_REACHED", max: this.CONFIG.max_nodes };
    }

    const offspringCount = this.CONFIG.offspring_min +
      Math.floor(Math.random() * (this.CONFIG.offspring_max - this.CONFIG.offspring_min + 1));

    const generation = Math.max(A.generation, B.generation) + 1;
    const children = [];

    // ─── ارث‌بری قابلیت‌ها ───
    const inheritedCaps = [...new Set([...A.capabilities, ...B.capabilities])];

    for (let i = 0; i < offspringCount; i++) {
      let dna = this.crossover(A.dna, B.dna);
      dna = this.mutate(dna);

      const nodeId = "NODE-G" + generation + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();

      nodes[nodeId] = {
        nodeId,
        name: "Child G" + generation + "-" + (i + 1),
        role: "worker",
        generation,
        dna,
        parentA: parentAId,
        parentB: parentBId,
        energy: 100,
        age: 0,
        alive: true,
        offspring: 0,
        capabilities: inheritedCaps,
        traits: [],
        bornAt: new Date().toISOString(),
        mother_id: this.CONFIG.mother_id
      };

      // اضافه به شجره‌نامه
      familyTree[nodeId] = {
        nodeId,
        parents: [parentAId, parentBId],
        children: [],
        generation
      };
      familyTree[parentAId].children.push(nodeId);
      familyTree[parentBId].children.push(nodeId);

      children.push(nodes[nodeId]);
    }

    // کاهش انرژی والدین
    A.energy -= this.CONFIG.breed_cost;
    B.energy -= this.CONFIG.breed_cost;
    A.offspring += offspringCount;
    B.offspring += offspringCount;

    generations.push({
      genId: "GEN-" + crypto.randomBytes(4).toString("hex"),
      generation,
      parentA: parentAId,
      parentB: parentBId,
      offspring_count: offspringCount,
      offspring_ids: children.map(c => c.nodeId),
      ts: Date.now()
    });

    save();

    // انتشار در Neural Bus
    try {
      const { bus, CHANNELS } = require("./neural-bus.js");
      bus.publish(CHANNELS.AI, {
        type: "NODES_BRED",
        data: {
          generation,
          offspring_count: offspringCount,
          total_nodes: Object.keys(nodes).length,
          parents: [parentAId, parentBId]
        }
      }, "node-breeding");
    } catch(e) {}

    return {
      ok: true,
      generation,
      offspring_count: offspringCount,
      children,
      total_nodes: Object.keys(nodes).length,
      inherited_capabilities: inheritedCaps
    };
  }

  // ─── پیری و مرگ ───
  static tick() {
    let deaths = 0, aged = 0;
    for (const id in nodes) {
      const n = nodes[id];
      if (!n.alive) continue;
      n.age++;
      aged++;
      if (n.age > 500 || (n.age > 100 && Math.random() < 0.001)) {
        n.alive = false;
        n.diedAt = new Date().toISOString();
        deaths++;
      }
    }
    save();
    return { deaths, aged, alive: Object.values(nodes).filter(n => n.alive).length };
  }

  // ─── آمار ───
  static getStats() {
    const all = Object.values(nodes);
    const alive = all.filter(n => n.alive);
    const maxGen = Math.max(...all.map(n => n.generation), 0);
    return {
      total_nodes: all.length,
      alive_nodes: alive.length,
      dead_nodes: all.length - alive.length,
      max_generation: maxGen,
      total_offspring: all.reduce((s, n) => s + (n.offspring || 0), 0),
      total_generations: generations.length,
      config: this.CONFIG
    };
  }

  // ─── شجره‌نامه ───
  static getFamilyTree(nodeId) {
    return familyTree[nodeId] || null;
  }

  static getTopAncestors() {
    return Object.values(nodes)
      .filter(n => !n.parentA && !n.parentB)
      .map(n => ({ nodeId: n.nodeId, name: n.name, offspring: n.offspring }));
  }
}

module.exports = { NodeBreeding };
