'use strict';

const assert = require('node:assert/strict');

const K = 8.9875517923e9;
const EPSILON_0 = 8.8541878128e-12;

function coulombForce(q1, q2, r) {
  return K * Math.abs(q1 * q2) / (r * r);
}

function electricField(q, r) {
  return K * q / (r * r);
}

function electricPotential(q, r) {
  return K * q / r;
}

const q1 = 1e-6;
const q2 = 2e-6;
const r = 0.1;

const force = coulombForce(q1, q2, r);
const field = electricField(q1, r);
const potential = electricPotential(q1, r);

const forceFromField = q2 * field;
const kFromEpsilon = 1 / (4 * Math.PI * EPSILON_0);

assert(Number.isFinite(force) && force > 0);
assert(Number.isFinite(field) && field > 0);
assert(Number.isFinite(potential) && potential > 0);

assert(Math.abs(force - forceFromField) < 1e-12);
assert(Math.abs(K - kFromEpsilon) / K < 1e-3);

const evidence = {
  law: 2558,
  chapter: 9,
  test: 'ELECTROMAGNETISM',
  results: {
    q1,
    q2,
    distance: r,
    coulombForce: force,
    electricField: field,
    electricPotential: potential,
    forceFromField,
    K,
    K_from_epsilon0: kFromEpsilon
  },
  verification: {
    forceFieldConsistency: Math.abs(force - forceFromField) < 1e-12,
    coulombConstantConsistency: Math.abs(K - kFromEpsilon) / K < 1e-3
  },
  status: 'PASS'
};

console.log(JSON.stringify(evidence, null, 2));
