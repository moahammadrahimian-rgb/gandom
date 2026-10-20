"use strict";

function finite(x) {
  return Number.isFinite(x);
}

function f(x) {
  return x * x * x + 2 * x + 1;
}

function analyticDerivative(x) {
  return 3 * x * x + 2;
}

function numericalDerivative(x, h = 1e-6) {
  return (f(x + h) - f(x - h)) / (2 * h);
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function force(massKg, accelerationMs2) {
  return massKg * accelerationMs2;
}

function run() {
  const x = 2;
  const analytic = analyticDerivative(x);
  const numerical = numericalDerivative(x);
  const derivativeError = Math.abs(analytic - numerical);

  const distance = distance2D({x: 0, y: 0}, {x: 3, y: 4});
  const forceN = force(2, 3);

  const checks = {
    FUNCTION_FINITE: finite(f(x)),
    DERIVATIVE_FINITE: finite(analytic) && finite(numerical),
    DERIVATIVE_MATCH: derivativeError < 1e-6,
    GEOMETRY_3_4_5: Math.abs(distance - 5) < 1e-12,
    PHYSICS_F_MA: Math.abs(forceN - 6) < 1e-12,
    NUMERIC_FINITE: [f(x), analytic, numerical, distance, forceN]
      .every(Number.isFinite)
  };

  return {
    functionValue: f(x),
    analyticDerivative: analytic,
    numericalDerivative: numerical,
    derivativeError,
    distance2D: distance,
    forceN,
    checks,
    allPassed: Object.values(checks).every(Boolean)
  };
}

module.exports = { run };
