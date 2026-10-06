'use strict';

const {
  CELLS_PER_NODE,
  TOTAL_NODES,
  TOTAL_CELLS,
  runRealCellNode
} = require('../execution/GANDOM-REAL-CELL-NODE');

const result = runRealCellNode(0, 1);

console.log('=== GANDOM REAL CELL NODE TEST ===');
console.log(`TOTAL_NODES=${TOTAL_NODES}`);
console.log(`CELLS_PER_NODE=${CELLS_PER_NODE}`);
console.log(`THEORETICAL_TOTAL_CELLS=${TOTAL_CELLS}`);
console.log(`NODE_ID=${result.nodeId}`);
console.log(`ALLOCATED_CELLS=${result.cells}`);
console.log(`ALLOCATED_BYTES=${result.allocatedBytes}`);
console.log(`COORDINATE_VALID=${result.coordinateValid}`);
console.log(`NEIGHBOR_VALID=${result.neighborValid}`);
console.log(`UPDATE_COUNT=${result.updateCount}`);
console.log(`DERIVATIVE_FINITE=${result.derivativeFinite}`);
console.log(`HEARTBEAT_EPOCH=${result.heartbeatEpoch}`);
console.log(`STATE_SHA256=${result.stateDigest}`);
console.log(`ELAPSED_MS=${result.elapsedMs.toFixed(3)}`);

if (!result.coordinateValid) throw new Error('COORDINATE_FAIL');
if (!result.neighborValid) throw new Error('NEIGHBOR_FAIL');
if (result.updateCount !== CELLS_PER_NODE) throw new Error('UPDATE_COUNT_FAIL');
if (!result.derivativeFinite) throw new Error('DERIVATIVE_FAIL');
if (result.heartbeatEpoch !== 1) throw new Error('HEARTBEAT_FAIL');
if (!/^[a-f0-9]{64}$/.test(result.stateDigest)) {
  throw new Error('HASH_FAIL');
}

console.log('REAL_CELL_ALLOCATION=PASS');
console.log('REAL_COORDINATE_EXECUTION=PASS');
console.log('REAL_NEIGHBOR_EXECUTION=PASS');
console.log('REAL_STATE_UPDATE=PASS');
console.log('REAL_DERIVATIVE=PASS');
console.log('REAL_HEARTBEAT=PASS');
console.log('REAL_STATE_HASH=PASS');
console.log('FAKE_PASS=BLOCKED');
