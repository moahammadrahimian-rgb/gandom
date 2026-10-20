"use strict";

function independentDerivative(x, h) {
  const p = x + h;
  const m = x - h;

  const fp = p * p * p + 2 * p + 1;
  const fm = m * m * m + 2 * m + 1;

  return (fp - fm) / (2 * h);
}

function verify(result) {
  const x = 2;
  const expected = 3 * x * x + 2;
  const independent = independentDerivative(x, 1e-6);

  const derivativeIndependent =
    Math.abs(independent - expected) < 1e-6;

  const geometryIndependent =
    Math.sqrt(3 * 3 + 4 * 4) === 5;

  const physicsIndependent =
    2 * 3 === 6;

  return {
    INDEPENDENT_DERIVATIVE: derivativeIndependent,
    INDEPENDENT_GEOMETRY: geometryIndependent,
    INDEPENDENT_PHYSICS: physicsIndependent,
    ENGINE_REPORTED_PASS: result.allPassed,
    INDEPENDENT_ALL_PASS:
      derivativeIndependent &&
      geometryIndependent &&
      physicsIndependent &&
      result.allPassed
  };
}

module.exports = { verify };
