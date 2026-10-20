'use strict';

const assert = require('node:assert/strict');

function linear(x, a, b) {
  return a * x + b;
}

function compose(f, g, x) {
  return f(g(x));
}

function mean(values) {
  assert(Array.isArray(values) && values.length > 0);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function nearlyEqual(a, b, tolerance = 1e-12) {
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

const x = 5;
const a = 2;
const b = 1;

const linearValue = linear(x, a, b);

const composedValue = compose(
  value => 2 * value + 1,
  value => value + 3,
  4
);

const values = [2, 4, 6, 8];
const average = mean(values);

assert.equal(linearValue, 11);
assert.equal(composedValue, 15);
assert.equal(average, 5);

assert(nearlyEqual(linearValue, a * x + b));

const evidence = {
  law: 2558,
  chapter: 3,
  domain: 'FUNCTIONS_MODELING',
  execution: 'REAL_NODE_EXECUTION',
  inputs: { x, a, b, values },
  results: {
    linearValue,
    composedValue,
    average
  },
  verification: {
    linearFunction: linearValue === 11,
    functionComposition: composedValue === 15,
    meanCalculation: average === 5,
    modelConsistency: nearlyEqual(linearValue, a * x + b)
  },
  status: 'PASS'
};

console.log(JSON.stringify(evidence, null, 2));
