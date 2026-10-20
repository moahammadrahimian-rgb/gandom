'use strict';

const crypto = require('crypto');

const NX = 100;
const NY = 100;
const NZ = 40;
const N = NX * NY * NZ;

const DT = 0.1;
const ALPHA = 0.1;
const H = 1.0;

/* 3D explicit diffusion stability condition:
   r = alpha*dt/h^2 <= 1/6
*/
const R = ALPHA * DT / (H * H);
const STABILITY_BOUND = 1 / 6;

function id(i, j, k) {
  return (k * NY + j) * NX + i;
}

function distance(a, b) {
  return Math.sqrt(
    (a.X - b.X) ** 2 +
    (a.Y - b.Y) ** 2 +
    (a.Z - b.Z) ** 2
  );
}

function laplacian(phi, i, j, k) {
  const p = phi[id(i, j, k)];

  const xm = i > 0 ? phi[id(i - 1, j, k)] : p;
  const xp = i < NX - 1 ? phi[id(i + 1, j, k)] : p;

  const ym = j > 0 ? phi[id(i, j - 1, k)] : p;
  const yp = j < NY - 1 ? phi[id(i, j + 1, k)] : p;

  const zm = k > 0 ? phi[id(i, j, k - 1)] : p;
  const zp = k < NZ - 1 ? phi[id(i, j, k + 1)] : p;

  return (xm + xp + ym + yp + zm + zp - 6 * p) / (H * H);
}

function run() {
  const phi = new Float32Array(N);
  const next = new Float32Array(N);

  /* Non-uniform real initial field.
     A central perturbation makes the derivative measurable. */
  phi.fill(1.0);

  const center = id(50, 50, 20);
  phi[center] = 10.0;

  let initialTotal = 0;

  for (let n = 0; n < N; n++) {
    initialTotal += phi[n];
  }

  let derivativeSum = 0;
  let maxDerivative = 0;
  let maxLaplacian = 0;

  for (let k = 0; k < NZ; k++) {
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const n = id(i, j, k);
        const lap = laplacian(phi, i, j, k);

        const derivative = ALPHA * lap;
        next[n] = phi[n] + DT * derivative;

        derivativeSum += derivative;

        if (Math.abs(derivative) > maxDerivative) {
          maxDerivative = Math.abs(derivative);
        }

        if (Math.abs(lap) > maxLaplacian) {
          maxLaplacian = Math.abs(lap);
        }
      }
    }
  }

  let finalTotal = 0;
  let finite = true;

  for (let n = 0; n < N; n++) {
    finalTotal += next[n];
    finite = finite && Number.isFinite(next[n]);
  }

  const conservationError =
    Math.abs(finalTotal - initialTotal);

  const pointA = { X: 50, Y: 50, Z: 20 };
  const pointB = { X: 51, Y: 51, Z: 21 };

  const d = distance(pointA, pointB);

  const derivativeApprox =
    (next[center] - phi[center]) / DT;

  const digest = crypto
    .createHash('sha256')
    .update(Buffer.from(next.buffer))
    .digest('hex');

  return {
    cells: N,
    initialTotal,
    finalTotal,
    conservationError,
    derivativeSum,
    maxDerivative,
    maxLaplacian,
    derivativeApprox,
    distanceAB: d,
    stabilityRatio: R,
    stabilityBound: STABILITY_BOUND,
    stable: R <= STABILITY_BOUND,
    finite,
    stateHash: digest
  };
}

module.exports = { run };
