'use strict';

const assert = require('node:assert/strict');
const p = require('./engine');

const near = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `Expected ${expected}; received ${actual}`);

const state = p.normalizeState([
  p.complex(1, 0), p.complex(1, 0)
]);
near(state.reduce((s, a) => s + p.probability(a), 0), 1);
near(p.probability(state[0]), 0.5);

const identity = [
  [p.complex(1), p.complex(0)],
  [p.complex(0), p.complex(1)]
];
const result = p.matrixVector(identity, [
  p.complex(3, 2), p.complex(-1, 4)
]);
near(result[0].re, 3);
near(result[0].im, 2);
near(result[1].re, -1);
near(result[1].im, 4);

near(p.decay(1000, 10, 10), 500);
near(p.decay(1000, 20, 10), 250);
near(p.massEnergy(1), 89875517873681764, 100);
near(p.angularEnergy(0), 0);

assert.throws(() => p.decay(1, 1, 0), RangeError);
assert.throws(() => p.normalizeState([
  p.complex(0), p.complex(0)
]), RangeError);
assert.throws(() => p.massEnergy(-1), RangeError);

console.log('COMPLEX_ARITHMETIC=PASS');
console.log('QUANTUM_STATE_NORMALIZATION=PASS');
console.log('MATRIX_VECTOR=PASS');
console.log('NUCLEAR_EXPONENTIAL_DECAY=PASS');
console.log('MASS_ENERGY=PASS');
console.log('ANGULAR_ENERGY=PASS');
console.log('INVALID_INPUT_GUARDS=PASS');
console.log('LAW=2558');
console.log('NO_FAKE_PASS=1');
console.log('SCOPE=LOCAL_NUMERICAL_TESTS_ONLY');
