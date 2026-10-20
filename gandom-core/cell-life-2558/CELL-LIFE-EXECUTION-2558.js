'use strict';
const { CellLifeEngine2558 } = require('./CELL-LIFE-ENGINE-2558.js');

function runCellExecution(options = {}) {
  const capacity = options.capacity === undefined ? 10 : options.capacity;

  if (!Number.isSafeInteger(capacity) || capacity < 2 || capacity > 1000) {
    throw new Error('CAPACITY_MUST_BE_INTEGER_2_TO_1000');
  }

  const engine = new CellLifeEngine2558(capacity);
  const root = engine.birth();

  if (!Number.isInteger(root) || root < 0) {
    throw new Error('ROOT_BIRTH_FAILED');
  }

  const before = engine.snapshot();
  const rootGeneration = engine.generation[root];
  const child = engine.divide(root);
  const after = engine.snapshot();

  if (!Number.isInteger(child) || child < 0 || child >= capacity) {
    throw new Error('DIVISION_DID_NOT_RETURN_VALID_CHILD_ID');
  }

  if (!engine.alive[child]) {
    throw new Error('CHILD_NOT_ALIVE');
  }

  if (!engine.verifyInheritance(root, child)) {
    throw new Error('INHERITANCE_VERIFICATION_FAILED');
  }

  if (after.alive !== before.alive + 1) {
    throw new Error('ALIVE_COUNT_DID_NOT_INCREASE_BY_ONE');
  }

  if (engine.generation[child] !== rootGeneration + 1) {
    throw new Error('GENERATION_INHERITANCE_FAILED');
  }

  const epochBeforeTick = engine.snapshot().epoch;
  const epochAfterTick = engine.tick();

  if (epochAfterTick !== epochBeforeTick + 1) {
    throw new Error('TICK_FAILED');
  }

  return {
    capacity,
    root,
    child,
    generation: engine.generation[child],
    before,
    afterDivision: engine.snapshot(),
    final: engine.snapshot()
  };
}

module.exports = { runCellExecution };
