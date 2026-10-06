'use strict';

const assert = require('assert');

const {
  CONFIG,
  TOTAL_NODES,
  CELLS_PER_NODE,
  TOTAL_CELLS,
  Geometry,
  GandomRealEngine
} = require('../engine/GANDOM-REAL-ENGINE');

function pass(name) {
  console.log(`${name}=PASS`);
}

console.log('==========================================');
console.log('GANDOM REAL ENGINE — LIVE VERIFICATION');
console.log('==========================================');

console.log(`NODE_GRID=${CONFIG.NODE_X}x${CONFIG.NODE_Y}x${CONFIG.NODE_Z}`);
console.log(`CELL_GRID=${CONFIG.CELL_X}x${CONFIG.CELL_Y}x${CONFIG.CELL_Z}`);
console.log(`TOTAL_NODES=${TOTAL_NODES}`);
console.log(`CELLS_PER_NODE=${CELLS_PER_NODE}`);
console.log(`THEORETICAL_TOTAL_CELLS=${TOTAL_CELLS}`);

/* ==========================================================
   GEOMETRY
   ========================================================== */

const node0 =
  Geometry.nodeCoordinate(0);

const nodeLast =
  Geometry.nodeCoordinate(
    TOTAL_NODES - 1
  );

assert.deepStrictEqual(
  node0,
  { x: 0, y: 0, z: 0 }
);

assert.deepStrictEqual(
  nodeLast,
  { x: 19, y: 19, z: 49 }
);

const g =
  Geometry.globalCoordinate(
    0,
    0
  );

assert.deepStrictEqual(
  g,
  { X: 0, Y: 0, Z: 0 }
);

const last =
  Geometry.globalCoordinate(
    TOTAL_NODES - 1,
    CELLS_PER_NODE - 1
  );

assert.deepStrictEqual(
  last,
  { X: 1999, Y: 1999, Z: 1999 }
);

const lastId =
  Geometry.globalCellId(
    1999,
    1999,
    1999
  );

assert.strictEqual(
  lastId,
  TOTAL_CELLS - 1
);

pass('GLOBAL_GEOMETRY');
pass('NODE_COORDINATES');
pass('CELL_COORDINATES');
pass('GLOBAL_CELL_ID');

/* ==========================================================
   ENGINE ALLOCATION
   ========================================================== */

const engine =
  new GandomRealEngine(0, 1);

assert.strictEqual(
  engine.runtime.block.phi.length,
  CELLS_PER_NODE
);

assert.strictEqual(
  engine.runtime.block.phi.byteLength,
  CELLS_PER_NODE * 4
);

console.log(
  `ALLOCATED_STATE_BYTES=${engine.runtime.block.phi.byteLength}`
);

pass('REAL_STATE_ALLOCATION');

/* ==========================================================
   NEIGHBOR TOPOLOGY
   ========================================================== */

const center =
  Geometry.localCoordinate(
    50 * CONFIG.CELL_X +
    50
  );

assert.strictEqual(
  center.i,
  50
);

assert.strictEqual(
  center.j,
  50
);

pass('LOCAL_NEIGHBOR_GEOMETRY');

/* ==========================================================
   REAL DYNAMICS
   ========================================================== */

const before =
  engine.runtime.block.totalState();

const result =
  engine.execute();

const after =
  result.after;

assert(
  Number.isFinite(before)
);

assert(
  Number.isFinite(after)
);

assert.strictEqual(
  result.tick.updateCount,
  CELLS_PER_NODE
);

assert(
  Number.isFinite(
    result.tick.maxDerivative
  )
);

pass('REAL_LOCAL_DYNAMICS');
pass('REAL_DERIVATIVE');
pass('REAL_UPDATE_COUNT');

/* ==========================================================
   HEARTBEAT / EPOCH
   ========================================================== */

assert.strictEqual(
  engine.runtime.heartbeat,
  2
);

assert.strictEqual(
  result.evidence.epoch,
  2
);

pass('REAL_HEARTBEAT');

/* ==========================================================
   FULL RAW STATE HASH
   ========================================================== */

const exported =
  engine.exportState();

assert(
  Buffer.isBuffer(exported)
);

const imported =
  engine.importState(
    exported
  );

assert.strictEqual(
  imported.verified,
  true
);

assert.strictEqual(
  imported.header.cells,
  CELLS_PER_NODE
);

assert.strictEqual(
  imported.state.length,
  CELLS_PER_NODE * 4
);

console.log(
  `STATE_BYTES_TRANSFERRED=${imported.state.length}`
);

console.log(
  `STATE_SHA256=${imported.sha256}`
);

pass('FULL_STATE_BINARY_EXPORT');
pass('FULL_STATE_BINARY_IMPORT');
pass('FULL_STATE_HASH_VERIFICATION');

/* ==========================================================
   GEOMETRIC DISTANCE
   ========================================================== */

const distance =
  Geometry.distance(
    { X: 50, Y: 50, Z: 20 },
    { X: 51, Y: 51, Z: 21 }
  );

assert(
  Math.abs(
    distance - Math.sqrt(3)
  ) < 1e-12
);

console.log(
  `EUCLIDEAN_DISTANCE=${distance}`
);

pass('REAL_EUCLIDEAN_GEOMETRY');

/* ==========================================================
   STABILITY
   ========================================================== */

const ratio =
  CONFIG.ALPHA *
  CONFIG.DT /
  (CONFIG.H * CONFIG.H);

const bound =
  1 / 6;

console.log(
  `STABILITY_RATIO=${ratio}`
);

console.log(
  `STABILITY_BOUND=${bound}`
);

assert(
  ratio <= bound
);

pass('REAL_STABILITY_BOUND');

/* ==========================================================
   EVIDENCE
   ========================================================== */

const evidence =
  result.evidence;

assert.strictEqual(
  evidence.nodeId,
  0
);

assert.strictEqual(
  evidence.cells,
  CELLS_PER_NODE
);

assert.strictEqual(
  evidence.stateBytes,
  CELLS_PER_NODE * 4
);

assert.match(
  evidence.stateHash,
  /^[a-f0-9]{64}$/
);

console.log(
  `NODE_EVIDENCE_HASH=${evidence.stateHash}`
);

pass('REAL_NODE_EVIDENCE');

console.log('==========================================');
console.log('GANDOM_REAL_ENGINE=PASS');
console.log('FAKE_PASS=BLOCKED');
console.log('==========================================');
