'use strict';

const C = 299792458;
const HBAR = 1.054571817e-34;

function finite(x, name) {
  if (typeof x !== 'number' || !Number.isFinite(x))
    throw new TypeError(`${name} must be finite`);
  return x;
}

function complex(re, im = 0) {
  return { re: finite(re, 're'), im: finite(im, 'im') };
}

function add(a, b) {
  return complex(a.re + b.re, a.im + b.im);
}

function multiply(a, b) {
  return complex(
    a.re * b.re - a.im * b.im,
    a.re * b.im + a.im * b.re
  );
}

function probability(amplitude) {
  return amplitude.re ** 2 + amplitude.im ** 2;
}

function normalizeState(amplitudes) {
  if (!Array.isArray(amplitudes) || amplitudes.length === 0)
    throw new TypeError('State must be a non-empty array');

  const norm = amplitudes.reduce(
    (sum, a) => sum + probability(a), 0
  );

  if (!(norm > 0) || !Number.isFinite(norm))
    throw new RangeError('State norm must be positive and finite');

  const scale = 1 / Math.sqrt(norm);
  return amplitudes.map(a => complex(a.re * scale, a.im * scale));
}

function matrixVector(matrix, vector) {
  if (!Array.isArray(matrix) || matrix.length === 0 ||
      matrix.some(row => !Array.isArray(row) ||
        row.length !== vector.length))
    throw new TypeError('Matrix/vector dimensions do not match');

  return matrix.map(row =>
    row.reduce((sum, value, i) =>
      add(sum, multiply(value, vector[i])), complex(0, 0))
  );
}

function decay(initialCount, elapsed, halfLife) {
  finite(initialCount, 'initialCount');
  finite(elapsed, 'elapsed');
  finite(halfLife, 'halfLife');

  if (initialCount < 0 || elapsed < 0 || halfLife <= 0)
    throw new RangeError('Invalid decay parameters');

  return initialCount * Math.pow(2, -elapsed / halfLife);
}

function massEnergy(massKg) {
  finite(massKg, 'massKg');
  if (massKg < 0) throw new RangeError('Mass cannot be negative');
  return massKg * C * C;
}

function angularEnergy(angularFrequency) {
  finite(angularFrequency, 'angularFrequency');
  if (angularFrequency < 0)
    throw new RangeError('Frequency cannot be negative');
  return HBAR * angularFrequency;
}

module.exports = {
  constants: Object.freeze({ C, HBAR }),
  complex, add, multiply, probability,
  normalizeState, matrixVector, decay, massEnergy, angularEnergy
};
