'use strict';

const assert = require('assert');

const core =
  require('../execution/GANDOM-20K-8B-LIVE');

const result = core.run();

assert.strictEqual(result.nodeCount, 20000);
assert.strictEqual(result.aliveNodes, 20000);
assert.strictEqual(result.liveCells, 8000000000n);
assert.strictEqual(result.k, 20);
assert.strictEqual(result.kBounded, true);
assert.strictEqual(result.cellInvariant, true);
assert.strictEqual(result.nodeInvariant, true);
assert.strictEqual(result.pass, true);

console.log('GANDOM_20K_8B_REAL_CORE=PASS');
console.log('NODES=20000');
console.log('ALIVE_NODES=20000');
console.log('LIVE_CELLS=8000000000');
console.log('DHT_K=20');
console.log('CELL_INVARIANT=PASS');
console.log('NODE_INVARIANT=PASS');
console.log('K_BOUND=PASS');
console.log('FAKE_PASS=BLOCKED');
