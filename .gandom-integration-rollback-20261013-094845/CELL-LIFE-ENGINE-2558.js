'use strict';

const crypto = require('crypto');

class CellLifeEngine2558 {
  constructor(capacity = 400000) {
    if (!Number.isInteger(capacity) || capacity < 2) {
      throw new Error('INVALID_CELL_CAPACITY');
    }

    this.capacity = capacity;
    this.activeCount = 0;
    this.epoch = 0;
    this.birthCount = 0;
    this.deathCount = 0;
    this.divisionCount = 0;
    this.mutationCount = 0;
    this.messages = [];
    this.lineage = new Map();

    // Compact typed-array state: suitable for large populations.
    this.alive = new Uint8Array(capacity);
    this.parent = new Int32Array(capacity);
    this.generation = new Uint32Array(capacity);
    this.energy = new Float32Array(capacity);
    this.health = new Float32Array(capacity);
    this.age = new Uint32Array(capacity);
    this.fitness = new Float32Array(capacity);
    this.genome = new Uint32Array(capacity);
    this.memory = new Float32Array(capacity);

    this.parent.fill(-1);
  }

  // 1 — BIRTH
  birth(parentId = -1) {
    let id = -1;

    for (let i = 0; i < this.capacity; i++) {
      if (this.alive[i] === 0) {
        id = i;
        break;
      }
    }

    if (id < 0) throw new Error('CELL_CAPACITY_EXHAUSTED');

    const parentGeneration =
      parentId >= 0 ? this.generation[parentId] : 0;

    this.alive[id] = 1;
    this.parent[id] = parentId;
    this.generation[id] = parentId >= 0
      ? parentGeneration + 1
      : 0;
    this.energy[id] = 100;
    this.health[id] = 100;
    this.age[id] = 0;
    this.fitness[id] = 0;
    this.genome[id] =
      parentId >= 0 ? this.genome[parentId] : crypto.randomBytes(4).readUInt32BE(0);
    this.memory[id] = 0;

    this.activeCount++;
    this.birthCount++;

    this.lineage.set(id, {
      cellId: id,
      parentId,
      generation: this.generation[id]
    });

    return id;
  }

  // 2 — DIVISION + PARENT -> CHILD
  divide(parentId) {
    if (!this.alive[parentId]) {
      throw new Error('DIVISION_PARENT_NOT_ALIVE');
    }

    if (this.energy[parentId] < 20) {
      throw new Error('DIVISION_INSUFFICIENT_ENERGY');
    }

    const childId = this.birth(parentId);

    // Heredity
    this.genome[childId] = this.genome[parentId];

    // Division consumes parent energy
    this.energy[parentId] -= 20;
    this.energy[childId] = 80;

    this.divisionCount++;

    return childId;
  }

  // 3 — DEATH / SURVIVAL
  death(cellId, reason = 'natural') {
    if (!this.alive[cellId]) return false;

    this.alive[cellId] = 0;
    this.deathCount++;
    this.activeCount--;

    this.lineage.set(cellId, {
      ...(this.lineage.get(cellId) || {}),
      deathEpoch: this.epoch,
      deathReason: reason
    });

    return true;
  }

  // 4 — GENOME / HEREDITY
  verifyInheritance(parentId, childId) {
    return (
      this.parent[childId] === parentId &&
      this.generation[childId] === this.generation[parentId] + 1
    );
  }

  // 5 — MUTATION / VARIATION
  mutate(cellId) {
    if (!this.alive[cellId]) {
      throw new Error('MUTATION_CELL_NOT_ALIVE');
    }

    const before = this.genome[cellId];

    // Deterministic bit mutation for reproducible execution.
    this.genome[cellId] =
      (before ^ 0x00010001 ^ ((this.epoch + cellId) & 0xff)) >>> 0;

    this.mutationCount++;

    return {
      before,
      after: this.genome[cellId],
      changed: before !== this.genome[cellId]
    };
  }

  // 6 — ENERGY / METABOLISM
  metabolize(cellId) {
    if (!this.alive[cellId]) return false;

    this.energy[cellId] -= 1;
    this.age[cellId] += 1;

    if (this.energy[cellId] <= 0 || this.health[cellId] <= 0) {
      this.death(cellId, 'energy_or_health');
      return false;
    }

    return true;
  }

  // 7 — MEMORY / BEHAVIOR / COMMUNICATION
  communicate(from, to, payload) {
    if (!this.alive[from] || !this.alive[to]) {
      throw new Error('COMMUNICATION_CELL_NOT_ALIVE');
    }

    const message = {
      epoch: this.epoch,
      from,
      to,
      payload
    };

    this.messages.push(message);
    this.memory[to] += 1;
    this.fitness[from] += 1;

    return message;
  }

  adapt(cellId, feedback = 1) {
    if (!this.alive[cellId]) return false;

    this.memory[cellId] += feedback;
    this.health[cellId] =
      Math.min(100, this.health[cellId] + feedback);

    this.fitness[cellId] += feedback;

    return true;
  }

  // 8 — GENERATION / SELECTION / EVOLUTION
  selectBest(limit = 10) {
    const result = [];

    for (let i = 0; i < this.capacity; i++) {
      if (this.alive[i]) {
        result.push({
          id: i,
          generation: this.generation[i],
          fitness: this.fitness[i]
        });
      }
    }

    result.sort((a, b) => b.fitness - a.fitness);

    return result.slice(0, limit);
  }

  tick() {
    this.epoch++;

    for (let i = 0; i < this.capacity; i++) {
      if (this.alive[i]) {
        this.metabolize(i);
      }
    }

    return this.epoch;
  }

  snapshot() {
    let alive = 0;

    for (let i = 0; i < this.capacity; i++) {
      if (this.alive[i]) alive++;
    }

    return {
      capacity: this.capacity,
      alive,
      births: this.birthCount,
      deaths: this.deathCount,
      divisions: this.divisionCount,
      mutations: this.mutationCount,
      messages: this.messages.length,
      epoch: this.epoch
    };
  }
}

module.exports = { CellLifeEngine2558 };
