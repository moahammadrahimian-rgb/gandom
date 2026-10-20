'use strict';

// GANDOM | LAW 2558
// Mathematical quantum-state primitives.
// Complex numbers are represented as { re, im }.
// No external dependencies. Existing files remain untouched.

const EPS = 1e-10;

function finiteComplex(z) {
  return z && Number.isFinite(z.re) && Number.isFinite(z.im);
}

function add(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

function mul(a, b) {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

function conj(a) {
  return { re: a.re, im: -a.im };
}

function abs2(a) {
  return a.re * a.re + a.im * a.im;
}

function assertVector(v) {
  if (!Array.isArray(v) || v.length === 0 || !v.every(finiteComplex)) {
    throw new TypeError('STATE_INVALID: expected non-empty finite complex vector');
  }
}

function normSquared(v) {
  assertVector(v);
  return v.reduce((s, z) => s + abs2(z), 0);
}

function normalizeState(v) {
  const n2 = normSquared(v);
  if (!(n2 > EPS)) throw new RangeError('STATE_ZERO_NORM');
  const scale = Math.sqrt(n2);
  return v.map(z => ({ re: z.re / scale, im: z.im / scale }));
}

function bornProbabilities(v) {
  const state = normalizeState(v);
  const probabilities = state.map(abs2);
  return {
    probabilities,
    sum: probabilities.reduce((a, b) => a + b, 0),
    normalized: true
  };
}

// Matrix is a square array of rows containing complex numbers.
function assertSquareMatrix(m) {
  if (!Array.isArray(m) || m.length === 0 ||
      !m.every(row => Array.isArray(row) && row.length === m.length &&
        row.every(finiteComplex))) {
    throw new TypeError('MATRIX_INVALID: expected finite square complex matrix');
  }
}

function isHermitian(m, tolerance = EPS) {
  assertSquareMatrix(m);
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < m.length; j++) {
      const d = add(m[i][j], {
        re: -m[j][i].re,
        im: m[j][i].im
      });
      if (Math.hypot(d.re, d.im) > tolerance) return false;
    }
  }
  return true;
}

// Computes <psi|H|psi>. For Hermitian H, the result should be real.
function expectationValue(state, hamiltonian) {
  assertVector(state);
  assertSquareMatrix(hamiltonian);
  if (hamiltonian.length !== state.length) {
    throw new RangeError('DIMENSION_MISMATCH');
  }

  const psi = normalizeState(state);
  const hPsi = hamiltonian.map(row =>
    row.reduce((s, h, j) => add(s, mul(h, psi[j])), { re: 0, im: 0 })
  );

  return psi.reduce(
    (s, z, i) => add(s, mul(conj(z), hPsi[i])),
    { re: 0, im: 0 }
  );
}

function verifyStateInvariants(state) {
  const n2 = normSquared(state);
  const probabilities = bornProbabilities(state);
  return {
    law: 2558,
    normSquared: n2,
    normalizedState: Math.abs(n2 - 1) <= EPS,
    bornProbabilitySum: probabilities.sum,
    probabilitiesValid: probabilities.probabilities.every(
      p => Number.isFinite(p) && p >= 0 && p <= 1 + EPS
    ) && Math.abs(probabilities.sum - 1) <= EPS
  };
}

module.exports = Object.freeze({
  law: 2558,
  EPS,
  add,
  mul,
  conj,
  abs2,
  normSquared,
  normalizeState,
  bornProbabilities,
  isHermitian,
  expectationValue,
  verifyStateInvariants
});
