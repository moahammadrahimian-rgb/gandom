'use strict';

const { CellLifeEngine2558 } =
  require('./CELL-LIFE-ENGINE-2558');

const CAPACITY = 400000;
const engine = new CellLifeEngine2558(CAPACITY);

console.log('LAW=2558');
console.log('NO_FAKE_PASS=1');
console.log('CAPACITY=' + CAPACITY);

// Create a real population.
const root = engine.birth(-1);

for (let i = 1; i < CAPACITY; i++) {
  engine.birth(-1);
}

console.log('INITIAL_ALIVE=' + engine.activeCount);

// 1. BIRTH
if (engine.birthCount !== CAPACITY) {
  throw new Error('BIRTH_TEST_FAILED');
}
console.log('CELL_BIRTH=PASS_REAL');

// Free one real slot so division can produce a real child.
const victim = CAPACITY - 1;
engine.death(victim, 'division_slot');
console.log('CELL_DEATH_PRECONDITION=PASS_REAL');

// 2. DIVISION
const child = engine.divide(root);

if (!engine.alive[child]) {
  throw new Error('DIVISION_CHILD_NOT_ALIVE');
}
console.log('CELL_DIVISION=PASS_REAL');

// 3. DEATH
if (!engine.death(child, 'lifecycle_test')) {
  throw new Error('DEATH_TEST_FAILED');
}
console.log('CELL_DEATH=PASS_REAL');

// 4. HEREDITY
const child2 = engine.divide(root);

if (!engine.verifyInheritance(root, child2)) {
  throw new Error('HEREDITY_TEST_FAILED');
}
console.log('CELL_HEREDITY=PASS_REAL');

// 5. MUTATION
const mutation = engine.mutate(child2);

if (!mutation.changed) {
  throw new Error('MUTATION_TEST_FAILED');
}
console.log('CELL_MUTATION=PASS_REAL');

// 6. METABOLISM
const energyBefore = engine.energy[child2];
engine.metabolize(child2);

if (!(engine.energy[child2] < energyBefore)) {
  throw new Error('METABOLISM_TEST_FAILED');
}
console.log('CELL_METABOLISM=PASS_REAL');

// 7. COMMUNICATION + BEHAVIOR
const message = engine.communicate(root, child2, {
  type: 'CELL_SIGNAL',
  value: engine.epoch
});

if (message.from !== root || message.to !== child2) {
  throw new Error('COMMUNICATION_TEST_FAILED');
}

if (!engine.adapt(child2, 1)) {
  throw new Error('ADAPTATION_TEST_FAILED');
}

console.log('CELL_BEHAVIOR_COMMUNICATION=PASS_REAL');

// 8. GENERATION / SELECTION
engine.fitness[child2] += 10;

const best = engine.selectBest(1);

if (!best.length || best[0].id !== child2) {
  throw new Error('SELECTION_TEST_FAILED');
}

console.log('CELL_GENERATION_SELECTION=PASS_REAL');

const snapshot = engine.snapshot();

console.log('===== REAL CELL LIFE SNAPSHOT =====');
console.log(JSON.stringify(snapshot, null, 2));

console.log('PARENT_ID=' + root);
console.log('CHILD_ID=' + child2);
console.log('CHILD_GENERATION=' + engine.generation[child2]);
console.log('PARENT_GENOME=' + engine.genome[root]);
console.log('CHILD_GENOME_AFTER_MUTATION=' + engine.genome[child2]);

console.log('CELL_LIFE_8_ENGINES_EXECUTION=PASS_REAL');
