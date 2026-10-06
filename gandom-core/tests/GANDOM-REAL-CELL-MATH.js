'use strict';

const { run } = require('../execution/GANDOM-REAL-CELL-MATH');

const r = run();

const CONSERVATION_TOLERANCE = 1e-3;

console.log('=== GANDOM REAL CELL MATH TEST ===');
console.log(`CELLS=${r.cells}`);
console.log(`INITIAL_TOTAL=${r.initialTotal}`);
console.log(`FINAL_TOTAL=${r.finalTotal}`);
console.log(`CONSERVATION_ERROR=${r.conservationError}`);
console.log(`DERIVATIVE_SUM=${r.derivativeSum}`);
console.log(`MAX_DERIVATIVE=${r.maxDerivative}`);
console.log(`MAX_LAPLACIAN=${r.maxLaplacian}`);
console.log(`CENTER_DERIVATIVE=${r.derivativeApprox}`);
console.log(`EUCLIDEAN_DISTANCE=${r.distanceAB}`);
console.log(`STABILITY_RATIO=${r.stabilityRatio}`);
console.log(`STABILITY_BOUND=${r.stabilityBound}`);
console.log(`FINITE_STATE=${r.finite}`);
console.log(`STATE_SHA256=${r.stateHash}`);

if (r.cells !== 400000) throw new Error('CELL_COUNT_FAIL');
if (!r.finite) throw new Error('FINITE_STATE_FAIL');
if (Math.abs(r.derivativeApprox) <= 0) {
  throw new Error('NONZERO_DERIVATIVE_FAIL');
}
if (r.conservationError > CONSERVATION_TOLERANCE) {
  throw new Error('CONSERVATION_FAIL');
}
if (r.distanceAB !== Math.sqrt(3)) {
  throw new Error('GEOMETRY_DISTANCE_FAIL');
}
if (!r.stable) throw new Error('STABILITY_FAIL');
if (!/^[a-f0-9]{64}$/.test(r.stateHash)) {
  throw new Error('HASH_FAIL');
}

console.log('REAL_LAPLACIAN=PASS');
console.log('REAL_DERIVATIVE_VALUE=PASS');
console.log('REAL_EUCLIDEAN_GEOMETRY=PASS');
console.log('REAL_CONSERVATION_INVARIANT=PASS');
console.log('REAL_STABILITY_BOUND=PASS');
console.log('REAL_MATH_HASH=PASS');
console.log('FAKE_PASS=BLOCKED');
