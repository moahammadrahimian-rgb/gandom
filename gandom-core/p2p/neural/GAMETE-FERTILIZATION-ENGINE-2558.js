'use strict';

const { CellLifeEngine2558 } = require('../../cell-life-2558/CELL-LIFE-ENGINE-2558.js');

class GameteFertilizationEngine2558 {
  constructor(options = {}) {
    const capacity = Number(options.capacity || 10);
    if (!Number.isSafeInteger(capacity) || capacity < 2) {
      throw new Error('INVALID_CAPACITY');
    }
    this.engine = new CellLifeEngine2558(capacity);
  }

  fertilize(parentGenome, childGenome, generation = 1) {
    if (parentGenome == null || childGenome == null) {
      throw new Error('GENOME_REQUIRED');
    }
    if (!Number.isSafeInteger(generation) || generation < 1) {
      throw new Error('INVALID_GENERATION');
    }

    const before = this.engine.snapshot();
    const parentId = this.engine.birth(parentGenome);
    const parent = this.engine.snapshot();

    if (!parent || parent.alive < 1) {
      throw new Error('PARENT_BIRTH_NOT_VERIFIED');
    }

    const childId = this.engine.birth(childGenome);
    const after = this.engine.snapshot();

    if (!after || after.alive < 2 || after.births < 2) {
      throw new Error('CHILD_BIRTH_NOT_VERIFIED');
    }

    const inheritance = this.engine.verifyInheritance(parentId, childId);

    if (inheritance === false || (inheritance && inheritance.valid === false)) {
      throw new Error('INHERITANCE_VALIDATION_FAILED');
    }

    return {
      verified: true,
      parentId,
      childId,
      generation,
      before,
      after,
      inheritance
    };
  }
}

module.exports = { GameteFertilizationEngine2558 };
