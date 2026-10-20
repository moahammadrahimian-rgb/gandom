'use strict';

const assert = require('node:assert/strict');

function cellGeometry(x, y) {
  return Math.sqrt(x * x + y * y);
}

function dynamicFunction(t, a = 1, b = 0) {
  return a * t + b;
}

function derivative(t, a = 1, h = 1e-4) {
  return (
    dynamicFunction(t + h, a) -
    dynamicFunction(t - h, a)
  ) / (2 * h);
}

const geometry = cellGeometry(3, 4);
const value = dynamicFunction(5, 2, 1);
const d = derivative(5, 2, 1e-4);

assert.equal(geometry, 5);
assert.equal(value, 11);
assert(Math.abs(d - 2) < 1e-5);

const evidence = {
  law: 2558,
  chapter: 1,
  test: 'MATH_GEOMETRY_FUNCTION_DERIVATIVE',
  geometry: {x: 3, y: 4, distance: geometry},
  function: {t: 5, value},
  derivative: {t: 5, numerical: d, expected: 2},
  status: 'PASS'
};

console.log(JSON.stringify(evidence, null, 2));
