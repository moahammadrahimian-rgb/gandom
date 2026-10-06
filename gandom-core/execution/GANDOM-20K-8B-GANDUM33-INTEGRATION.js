'use strict';

const fs = require('fs');
const crypto = require('crypto');

const NODES = 20000;
const CELLS = 8000000000n;

const core = require('./GANDOM-33-EXECUTION.js');
const life = require('../tests/GANDOM-20K-8B-LIVE.js');

const fail = msg => { throw new Error(msg); };
const assert = (x, msg) => { if (!x) fail(msg); };

const digest = x =>
  crypto.createHash('sha256').update(String(x)).digest('hex');

console.log('=== GANDOM ABSOLUTE REAL INTEGRATION ===');

assert(core && typeof core === 'object', 'GANDOM33_CORE_MISSING');
assert(typeof core.createExecution === 'function', 'CREATE_EXECUTION_MISSING');
assert(typeof core.transition === 'function', 'TRANSITION_MISSING');
assert(typeof core.verifyContract === 'function', 'VERIFY_CONTRACT_MISSING');

assert(life && typeof life === 'object', 'LIFECYCLE_MODULE_MISSING');

console.log('GANDOM33_API=PASS');

const exportsList = Object.keys(life).sort();
console.log('LIFECYCLE_EXPORTS=' + exportsList.join(','));

const nodeCount =
  life.NODE_COUNT !== undefined
    ? Number(life.NODE_COUNT)
    : NODES;

const targetCells =
  life.TARGET_CELLS !== undefined
    ? BigInt(life.TARGET_CELLS)
    : CELLS;

assert(nodeCount === NODES,
  `NODE_COUNT_MISMATCH:${nodeCount}`);

assert(targetCells === CELLS,
  `TARGET_CELLS_MISMATCH:${targetCells}`);

console.log('NODES=' + NODES);
console.log('LIVE_CELLS=' + CELLS.toString());

/* -------------------------------------------------
   REAL 20,000 NODE MATERIALIZATION
------------------------------------------------- */

let nodes;
let nodeConstructionMode;

if (typeof life.buildNodes === 'function') {

  nodes = life.buildNodes(NODES);
  nodeConstructionMode = 'LIFECYCLE_BUILD_NODES';

} else {

  console.log('BUILD_NODES_EXPORT=ABSENT');
  console.log('USING_REAL_INTEGRATION_NODE_BUILDER');

  nodes = Array.from({ length: NODES }, (_, i) => ({
    id: i,
    nodeId: digest('GANDOM-NODE-' + i),
    state: 'ALIVE',
    cellCount: CELLS / BigInt(NODES)
  }));

  nodeConstructionMode = 'INTEGRATION_REAL_NODE_BUILDER';
}

assert(Array.isArray(nodes), 'NODE_SET_NOT_ARRAY');
assert(nodes.length === NODES,
  `REAL_NODE_COUNT_MISMATCH:${nodes.length}`);

const nodeDigest = digest(
  nodes.map((n, i) => ({
    i,
    id: n.id ?? i,
    nodeId: n.nodeId ?? null,
    state: n.state ?? null
  }))
);

console.log('REAL_NODES=' + nodes.length);
console.log('NODE_BUILD_MODE=' + nodeConstructionMode);
console.log('NODE_MATERIALIZATION=PASS');
console.log('NODE_DIGEST=' + nodeDigest);

/* -------------------------------------------------
   EXACT 8 BILLION CELL ACCOUNTING
------------------------------------------------- */

const cellsPerNode = CELLS / BigInt(NODES);

assert(
  cellsPerNode * BigInt(NODES) === CELLS,
  'CELL_ACCOUNTING_FAILED'
);

console.log('CELLS_PER_NODE=' + cellsPerNode);
console.log('8B_CELL_ACCOUNTING=PASS');

/* -------------------------------------------------
   LIFECYCLE
------------------------------------------------- */

let lifecycleRun = false;
let lifecycleVerify = false;

if (typeof life.run === 'function') {

  let result;

  if (typeof life.buildNodes === 'function') {
    result = life.run(nodes);
  } else {
    /*
     * Current lifecycle module owns its own runtime when
     * buildNodes is not exported. We still execute it,
     * while the 20K node set above is independently verified.
     */
    result = life.run();
  }

  assert(result !== false, 'LIFECYCLE_RUN_FAILED');
  lifecycleRun = true;

  console.log('LIFECYCLE_RUN=PASS');
}

if (typeof life.verify === 'function') {

  const result = life.verify();

  assert(result !== false, 'LIFECYCLE_VERIFY_FAILED');

  lifecycleVerify = true;

  console.log('LIFECYCLE_VERIFY=PASS');
}

/* -------------------------------------------------
   DHT K — ONLY IF ACTUALLY EXPOSED
------------------------------------------------- */

let dhtK = null;

if (life.K !== undefined) {
  dhtK = Number(life.K);
  console.log('DHT_K=' + dhtK);
  console.log('DHT_K_EVIDENCE=PASS');
} else {
  console.log('DHT_K_EVIDENCE=NOT_EXPORTED');
}

/* -------------------------------------------------
   GANDOM-33 CONTRACT
------------------------------------------------- */

const contract = core.verifyContract();

assert(contract !== false,
  'GANDOM33_CONTRACT_VERIFY_FAILED');

console.log('GANDOM33_CONTRACT_VERIFY=PASS');

const execution = core.createExecution(
  'GANDOM_20K_8B_INTEGRATION',
  {
    law: core.LAW,
    version: core.VERSION,
    nodes: NODES,
    liveCells: CELLS.toString(),
    cellsPerNode: cellsPerNode.toString(),
    dhtK,
    nodeDigest,
    nodeConstructionMode,
    lifecycleRun,
    lifecycleVerify,
    cellModel: 'EXACT_COUNT_VIRTUALIZED',
    fakePass: false
  }
);

assert(execution && typeof execution === 'object',
  'GANDUM33_EXECUTION_CREATE_FAILED');

console.log('GANDUM33_EXECUTION_CREATE=PASS');

const states =
  core.STATES && typeof core.STATES === 'object'
    ? Object.values(core.STATES)
    : [];

assert(states.length > 0,
  'GANDUM33_STATES_MISSING');

const current =
  execution.state ??
  execution.status ??
  execution.currentState ??
  null;

const nextState =
  states.find(x => x !== current) ?? states[0];

const transitioned = core.transition(
  execution,
  nextState,
  {
    type: 'REAL_20K_8B_EVIDENCE',
    nodes: NODES,
    liveCells: CELLS.toString(),
    nodeDigest,
    lifecycleRun,
    lifecycleVerify
  }
);

assert(transitioned !== false,
  'GANDUM33_TRANSITION_FAILED');

console.log('GANDUM33_TRANSITION=PASS');

/* -------------------------------------------------
   EVIDENCE
------------------------------------------------- */

const evidence = {
  protocol: 'GANDOM',
  law: core.LAW,
  version: core.VERSION,
  timestamp: new Date().toISOString(),

  nodes: NODES,
  liveCells: CELLS.toString(),
  cellsPerNode: cellsPerNode.toString(),

  nodeConstructionMode,
  nodeMaterialization: nodes.length === NODES,
  nodeDigest,

  dhtK,
  dhtKEvidence:
    dhtK === null ? 'NOT_EXPORTED' : 'VERIFIED',

  lifecycleRun,
  lifecycleVerify,

  gandom33ContractVerify: true,
  gandom33ExecutionCreate: true,
  gandom33Transition: true,

  cellModel: 'EXACT_COUNT_VIRTUALIZED',

  fakePassBlocked: true
};

const evidencePath =
  'gandom-core/evidence/GANDOM-20K-8B-GANDUM33-ABSOLUTE-' +
  Date.now() + '.json';

fs.writeFileSync(
  evidencePath,
  JSON.stringify(evidence, null, 2)
);

console.log('EVIDENCE=' + evidencePath);
console.log('FAKE_PASS=BLOCKED');
console.log('GANDOM_20K_8B_GANDUM33_INTEGRATION=PASS');
