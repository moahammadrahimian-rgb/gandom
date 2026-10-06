'use strict';

const crypto = require('crypto');

const NODE_GRID_X = 20;
const NODE_GRID_Y = 20;
const NODE_GRID_Z = 50;

const LOCAL_X = 100;
const LOCAL_Y = 100;
const LOCAL_Z = 40;

const CELLS_PER_NODE = LOCAL_X * LOCAL_Y * LOCAL_Z;
const TOTAL_NODES = NODE_GRID_X * NODE_GRID_Y * NODE_GRID_Z;
const TOTAL_CELLS = TOTAL_NODES * CELLS_PER_NODE;

function nodeCoordinates(nodeId) {
  if (!Number.isInteger(nodeId) || nodeId < 0 || nodeId >= TOTAL_NODES) {
    throw new RangeError('invalid nodeId');
  }

  const a = nodeId % NODE_GRID_X;
  const b = Math.floor(nodeId / NODE_GRID_X) % NODE_GRID_Y;
  const c = Math.floor(nodeId / (NODE_GRID_X * NODE_GRID_Y));

  return { a, b, c };
}

function globalCoordinate(nodeId, localId) {
  const { a, b, c } = nodeCoordinates(nodeId);

  const i = localId % LOCAL_X;
  const j = Math.floor(localId / LOCAL_X) % LOCAL_Y;
  const k = Math.floor(localId / (LOCAL_X * LOCAL_Y));

  return {
    X: a * LOCAL_X + i,
    Y: b * LOCAL_Y + j,
    Z: c * LOCAL_Z + k
  };
}

function cellId(X, Y, Z) {
  return ((X * 2000) + Y) * 2000 + Z;
}

function localId(i, j, k) {
  return (k * LOCAL_Y + j) * LOCAL_X + i;
}

function neighborMask(i, j, k) {
  let mask = 0;

  if (i > 0) mask |= 1;
  if (i < LOCAL_X - 1) mask |= 2;
  if (j > 0) mask |= 4;
  if (j < LOCAL_Y - 1) mask |= 8;
  if (k > 0) mask |= 16;
  if (k < LOCAL_Z - 1) mask |= 32;

  return mask;
}

function runRealCellNode(nodeId = 0, epoch = 1) {
  const start = process.hrtime.bigint();

  /*
   * Actual memory-backed cell state.
   * Coordinates are deterministic and therefore do not need
   * to be duplicated in memory.
   */
  const phi = new Float32Array(CELLS_PER_NODE);
  const nextPhi = new Float32Array(CELLS_PER_NODE);
  const energy = new Float32Array(CELLS_PER_NODE);
  const health = new Float32Array(CELLS_PER_NODE);
  const epochs = new Uint32Array(CELLS_PER_NODE);
  const masks = new Uint8Array(CELLS_PER_NODE);

  const node = nodeCoordinates(nodeId);

  let coordinateValid = true;
  let neighborValid = true;
  let updateCount = 0;
  let derivativeSum = 0;

  for (let k = 0; k < LOCAL_Z; k++) {
    for (let j = 0; j < LOCAL_Y; j++) {
      for (let i = 0; i < LOCAL_X; i++) {
        const id = localId(i, j, k);

        const X = node.a * LOCAL_X + i;
        const Y = node.b * LOCAL_Y + j;
        const Z = node.c * LOCAL_Z + k;

        const G = cellId(X, Y, Z);

        coordinateValid =
          coordinateValid &&
          Number.isSafeInteger(G) &&
          X >= 0 && X < 2000 &&
          Y >= 0 && Y < 2000 &&
          Z >= 0 && Z < 2000;

        phi[id] = 1.0;
        energy[id] = 1.0;
        health[id] = 1.0;
        epochs[id] = epoch;

        const mask = neighborMask(i, j, k);
        masks[id] = mask;

        neighborValid =
          neighborValid &&
          mask >= 0 &&
          mask <= 63;

        /*
         * Discrete local evolution.
         * dPhi/dt is represented by the state difference.
         */
        const left  = i > 0 ? phi[id - 1] : phi[id];
        const right = i < LOCAL_X - 1 ? phi[id + 1] : phi[id];
        const down  = j > 0 ? phi[id - LOCAL_X] : phi[id];
        const up    = j < LOCAL_Y - 1 ? phi[id + LOCAL_X] : phi[id];
        const back  = k > 0 ? phi[id - LOCAL_X * LOCAL_Y] : phi[id];
        const front = k < LOCAL_Z - 1 ? phi[id + LOCAL_X * LOCAL_Y] : phi[id];

        const laplacian =
          left + right + down + up + back + front - 6 * phi[id];

        const dt = 0.1;
        const alpha = 0.1;

        nextPhi[id] = phi[id] + dt * alpha * laplacian;

        const derivative = (nextPhi[id] - phi[id]) / dt;

        derivativeSum += derivative;
        updateCount++;
      }
    }
  }

  /*
   * Commit the state transition.
   */
  phi.set(nextPhi);

  const stateBuffer = Buffer.from(
    phi.buffer,
    phi.byteOffset,
    phi.byteLength
  );

  const digest = crypto
    .createHash('sha256')
    .update(String(nodeId))
    .update(String(epoch))
    .update(String(updateCount))
    .update(String(derivativeSum))
    .update(stateBuffer)
    .digest('hex');

  const elapsedMs =
    Number(process.hrtime.bigint() - start) / 1e6;

  const result = {
    nodeId,
    node,
    cells: CELLS_PER_NODE,
    totalNetworkNodes: TOTAL_NODES,
    theoreticalNetworkCells: TOTAL_CELLS,
    allocatedBytes:
      phi.byteLength +
      nextPhi.byteLength +
      energy.byteLength +
      health.byteLength +
      epochs.byteLength +
      masks.byteLength,
    coordinateValid,
    neighborValid,
    updateCount,
    derivativeFinite: Number.isFinite(derivativeSum),
    heartbeatEpoch: epoch,
    stateDigest: digest,
    elapsedMs
  };

  return result;
}

module.exports = {
  NODE_GRID_X,
  NODE_GRID_Y,
  NODE_GRID_Z,
  LOCAL_X,
  LOCAL_Y,
  LOCAL_Z,
  CELLS_PER_NODE,
  TOTAL_NODES,
  TOTAL_CELLS,
  nodeCoordinates,
  globalCoordinate,
  cellId,
  neighborMask,
  runRealCellNode
};
