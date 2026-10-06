'use strict';

const crypto = require('crypto');

const CONFIG = Object.freeze({
  NODE_X: 20,
  NODE_Y: 20,
  NODE_Z: 50,

  CELL_X: 100,
  CELL_Y: 100,
  CELL_Z: 40,

  DHT_K: 20,

  DT: 0.01,
  ALPHA: 1,
  H: 1
});

const TOTAL_NODES =
  CONFIG.NODE_X *
  CONFIG.NODE_Y *
  CONFIG.NODE_Z;

const CELLS_PER_NODE =
  CONFIG.CELL_X *
  CONFIG.CELL_Y *
  CONFIG.CELL_Z;

const GLOBAL_X = CONFIG.NODE_X * CONFIG.CELL_X;
const GLOBAL_Y = CONFIG.NODE_Y * CONFIG.CELL_Y;
const GLOBAL_Z = CONFIG.NODE_Z * CONFIG.CELL_Z;

const TOTAL_CELLS =
  GLOBAL_X *
  GLOBAL_Y *
  GLOBAL_Z;

if (TOTAL_NODES !== 20000) {
  throw new Error('NODE_GEOMETRY_INVALID');
}

if (CELLS_PER_NODE !== 400000) {
  throw new Error('CELL_BLOCK_INVALID');
}

if (TOTAL_CELLS !== 8000000000) {
  throw new Error('GLOBAL_CELL_GEOMETRY_INVALID');
}

/* ==========================================================
   GEOMETRY
   ========================================================== */

class Geometry {

  static nodeCoordinate(nodeId) {
    if (!Number.isInteger(nodeId) ||
        nodeId < 0 ||
        nodeId >= TOTAL_NODES) {
      throw new Error('NODE_ID_OUT_OF_RANGE');
    }

    const xy = CONFIG.NODE_X * CONFIG.NODE_Y;

    const z = Math.floor(nodeId / xy);
    const rem = nodeId % xy;

    const y = Math.floor(rem / CONFIG.NODE_X);
    const x = rem % CONFIG.NODE_X;

    return { x, y, z };
  }

  static localCoordinate(cellIndex) {
    if (!Number.isInteger(cellIndex) ||
        cellIndex < 0 ||
        cellIndex >= CELLS_PER_NODE) {
      throw new Error('CELL_INDEX_OUT_OF_RANGE');
    }

    const xy = CONFIG.CELL_X * CONFIG.CELL_Y;

    const k = Math.floor(cellIndex / xy);
    const rem = cellIndex % xy;

    const j = Math.floor(rem / CONFIG.CELL_X);
    const i = rem % CONFIG.CELL_X;

    return { i, j, k };
  }

  static globalCoordinate(nodeId, cellIndex) {
    const n = Geometry.nodeCoordinate(nodeId);
    const c = Geometry.localCoordinate(cellIndex);

    return {
      X: n.x * CONFIG.CELL_X + c.i,
      Y: n.y * CONFIG.CELL_Y + c.j,
      Z: n.z * CONFIG.CELL_Z + c.k
    };
  }

  static globalCellId(X, Y, Z) {
    if (
      !Number.isInteger(X) ||
      !Number.isInteger(Y) ||
      !Number.isInteger(Z) ||
      X < 0 || X >= GLOBAL_X ||
      Y < 0 || Y >= GLOBAL_Y ||
      Z < 0 || Z >= GLOBAL_Z
    ) {
      throw new Error('GLOBAL_COORDINATE_INVALID');
    }

    return ((X * GLOBAL_Y) + Y) * GLOBAL_Z + Z;
  }

  static distance(a, b) {
    const dx = a.X - b.X;
    const dy = a.Y - b.Y;
    const dz = a.Z - b.Z;

    return Math.sqrt(
      dx * dx +
      dy * dy +
      dz * dz
    );
  }
}

/* ==========================================================
   CELL BLOCK
   ========================================================== */

class CellBlock {

  constructor(nodeId, epoch = 1) {

    this.nodeId = nodeId;
    this.epoch = epoch;

    this.phi = new Float32Array(CELLS_PER_NODE);
    this.nextPhi = new Float32Array(CELLS_PER_NODE);

    this.energy = new Float32Array(CELLS_PER_NODE);
    this.health = new Float32Array(CELLS_PER_NODE);

    this.epochs = new Uint32Array(CELLS_PER_NODE);

    this.neighborMask = new Uint8Array(CELLS_PER_NODE);

    this.initialize();
  }

  initialize() {

    for (let i = 0; i < CELLS_PER_NODE; i++) {

      /*
       * Deterministic but non-uniform state.
       * This is real allocated state, not a counter.
       */
      this.phi[i] =
        1 +
        ((i % 97) / 97) * 0.001;

      this.nextPhi[i] = this.phi[i];

      this.energy[i] = 1;
      this.health[i] = 1;
      this.epochs[i] = this.epoch;

      this.neighborMask[i] =
        CellBlock.computeNeighborMask(i);
    }
  }

  static computeNeighborMask(index) {

    const c = Geometry.localCoordinate(index);

    let mask = 0;

    if (c.i > 0) mask |= 1;
    if (c.i < CONFIG.CELL_X - 1) mask |= 2;

    if (c.j > 0) mask |= 4;
    if (c.j < CONFIG.CELL_Y - 1) mask |= 8;

    if (c.k > 0) mask |= 16;
    if (c.k < CONFIG.CELL_Z - 1) mask |= 32;

    return mask;
  }

  neighborIndex(index, direction) {

    const c = Geometry.localCoordinate(index);

    switch (direction) {

      case 0:
        return c.i > 0 ? index - 1 : -1;

      case 1:
        return c.i < CONFIG.CELL_X - 1 ? index + 1 : -1;

      case 2:
        return c.j > 0 ? index - CONFIG.CELL_X : -1;

      case 3:
        return c.j < CONFIG.CELL_Y - 1
          ? index + CONFIG.CELL_X
          : -1;

      case 4:
        return c.k > 0
          ? index - CONFIG.CELL_X * CONFIG.CELL_Y
          : -1;

      case 5:
        return c.k < CONFIG.CELL_Z - 1
          ? index + CONFIG.CELL_X * CONFIG.CELL_Y
          : -1;

      default:
        throw new Error('DIRECTION_INVALID');
    }
  }

  laplacian(index) {

    const p = this.phi[index];

    let sum = 0;

    for (let d = 0; d < 6; d++) {

      const n = this.neighborIndex(index, d);

      /*
       * Reflective boundary:
       * missing neighbor uses current cell.
       */
      sum += n >= 0 ? this.phi[n] : p;
    }

    return (
      sum - 6 * p
    ) / (CONFIG.H * CONFIG.H);
  }

  derivative(index) {
    return CONFIG.ALPHA * this.laplacian(index);
  }

  evolve() {

    let maxDerivative = 0;
    let updateCount = 0;

    for (let i = 0; i < CELLS_PER_NODE; i++) {

      const d = this.derivative(i);

      this.nextPhi[i] =
        this.phi[i] +
        CONFIG.DT * d;

      if (!Number.isFinite(this.nextPhi[i])) {
        throw new Error('NON_FINITE_STATE');
      }

      const abs = Math.abs(d);

      if (abs > maxDerivative) {
        maxDerivative = abs;
      }

      updateCount++;
    }

    const tmp = this.phi;
    this.phi = this.nextPhi;
    this.nextPhi = tmp;

    this.epoch++;

    this.epochs.fill(this.epoch);

    return {
      updateCount,
      maxDerivative,
      epoch: this.epoch
    };
  }

  stateBytes() {
    return Buffer.from(
      this.phi.buffer,
      this.phi.byteOffset,
      this.phi.byteLength
    );
  }

  stateHash() {
    return crypto
      .createHash('sha256')
      .update(this.stateBytes())
      .digest('hex');
  }

  totalState() {

    let total = 0;

    for (let i = 0; i < this.phi.length; i++) {
      total += this.phi[i];
    }

    return total;
  }
}

/* ==========================================================
   NODE RUNTIME
   ========================================================== */

class NodeRuntime {

  constructor(nodeId, epoch = 1) {

    this.nodeId = nodeId;
    this.coordinate =
      Geometry.nodeCoordinate(nodeId);

    this.block =
      new CellBlock(nodeId, epoch);

    this.heartbeat = epoch;
  }

  tick() {

    const result =
      this.block.evolve();

    this.heartbeat =
      this.block.epoch;

    return result;
  }

  evidence() {

    return {
      nodeId: this.nodeId,
      coordinate: this.coordinate,
      cells: CELLS_PER_NODE,
      epoch: this.heartbeat,
      stateBytes: this.block.stateBytes().length,
      stateHash: this.block.stateHash()
    };
  }
}

/* ==========================================================
   BINARY STATE TRANSPORT
   ========================================================== */

function encodeState(block) {

  const state = block.stateBytes();

  const header = Buffer.from(
    JSON.stringify({
      nodeId: block.nodeId,
      epoch: block.epoch,
      cells: CELLS_PER_NODE,
      byteLength: state.length,
      sha256: crypto
        .createHash('sha256')
        .update(state)
        .digest('hex')
    }),
    'utf8'
  );

  const frame = Buffer.allocUnsafe(
    4 + header.length + state.length
  );

  frame.writeUInt32BE(
    header.length,
    0
  );

  header.copy(frame, 4);

  state.copy(
    frame,
    4 + header.length
  );

  return frame;
}

function decodeState(frame) {

  if (!Buffer.isBuffer(frame)) {
    throw new Error('FRAME_NOT_BUFFER');
  }

  if (frame.length < 4) {
    throw new Error('FRAME_TOO_SHORT');
  }

  const headerLength =
    frame.readUInt32BE(0);

  if (
    headerLength <= 0 ||
    4 + headerLength > frame.length
  ) {
    throw new Error('HEADER_INVALID');
  }

  const header =
    JSON.parse(
      frame
        .subarray(4, 4 + headerLength)
        .toString('utf8')
    );

  const state =
    frame.subarray(
      4 + headerLength
    );

  if (state.length !== header.byteLength) {
    throw new Error('STATE_LENGTH_MISMATCH');
  }

  const actualHash =
    crypto
      .createHash('sha256')
      .update(state)
      .digest('hex');

  if (actualHash !== header.sha256) {
    throw new Error('STATE_HASH_MISMATCH');
  }

  return {
    header,
    state,
    verified: true,
    sha256: actualHash
  };
}

/* ==========================================================
   ENGINE
   ========================================================== */

class GandomRealEngine {

  constructor(nodeId = 0, epoch = 1) {

    this.runtime =
      new NodeRuntime(nodeId, epoch);
  }

  execute() {

    const before =
      this.runtime.block.totalState();

    const tick =
      this.runtime.tick();

    const after =
      this.runtime.block.totalState();

    const evidence =
      this.runtime.evidence();

    return {
      before,
      after,
      tick,
      evidence
    };
  }

  exportState() {

    return encodeState(
      this.runtime.block
    );
  }

  importState(frame) {

    return decodeState(frame);
  }

  static constants() {

    return {
      ...CONFIG,
      TOTAL_NODES,
      CELLS_PER_NODE,
      GLOBAL_X,
      GLOBAL_Y,
      GLOBAL_Z,
      TOTAL_CELLS
    };
  }
}

module.exports = {
  CONFIG,
  TOTAL_NODES,
  CELLS_PER_NODE,
  TOTAL_CELLS,
  Geometry,
  CellBlock,
  NodeRuntime,
  GandomRealEngine,
  encodeState,
  decodeState
};
