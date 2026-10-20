'use strict';

const assert = require('node:assert/strict');

function distance2D(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function vector(a, b) {
  return { x: b.x - a.x, y: b.y - a.y };
}

function vectorLength(v) {
  return Math.hypot(v.x, v.y);
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function triangleArea(a, b, c) {
  return Math.abs(
    (a.x * (b.y - c.y) +
     b.x * (c.y - a.y) +
     c.x * (a.y - b.y)) / 2
  );
}

function nearlyEqual(a, b, tolerance = 1e-10) {
  return Math.abs(a - b) <= tolerance;
}

const A = { x: 0, y: 0 };
const B = { x: 3, y: 4 };
const C = { x: 0, y: 4 };

const distanceAB = distance2D(A, B);
const AB = vector(A, B);
const lengthAB = vectorLength(AB);
const AC = vector(A, C);
const dotAB_AC = dot(AB, AC);
const areaABC = triangleArea(A, B, C);

assert(nearlyEqual(distanceAB, 5));
assert.deepEqual(AB, { x: 3, y: 4 });
assert(nearlyEqual(lengthAB, 5));
assert.equal(dotAB_AC, 16);
assert(nearlyEqual(areaABC, 6));

const evidence = {
  law: 2558,
  chapter: 2,
  test: 'GEOMETRY_COORDINATES_VECTORS_DISTANCE_AREA',
  inputs: { A, B, C },
  results: {
    distanceAB,
    vectorAB: AB,
    lengthAB,
    dotAB_AC,
    triangleArea: areaABC
  },
  assertions: {
    distance: nearlyEqual(distanceAB, 5),
    vector: AB.x === 3 && AB.y === 4,
    length: nearlyEqual(lengthAB, 5),
    dot: dotAB_AC === 16,
    area: nearlyEqual(areaABC, 6)
  },
  status: 'PASS'
};

console.log(JSON.stringify(evidence, null, 2));
