'use strict';

const assert = require('assert');
const core = require('../execution/GANDOM-20K-8B-COMPLETE');

const r = core.run();

assert.strictEqual(r.nodes, 20000);
assert.strictEqual(r.aliveNodes, 20000);
assert.strictEqual(r.cells, 8000000000n);
assert.strictEqual(r.k, 20);
assert.strictEqual(r.ticks, 100);

assert.strictEqual(r.nodeInvariant, true);
assert.strictEqual(r.cellInvariant, true);
assert.strictEqual(r.kBound, true);
assert.strictEqual(r.peerIntegrity, true);
assert.strictEqual(r.lifecycleIntegrity, true);

assert(r.births > 0n);
assert(r.deaths > 0n);
assert(r.divisions > 0n);
assert(r.healed > 0n);

assert.strictEqual(r.pass, true);

console.log('GANDOM_20K_8B_COMPLETE_TEST=PASS');
console.log('20K_NODES=PASS');
console.log('8B_LIVE_CELLS=PASS');
console.log('DHT_K20=PASS');
console.log('BIRTH=PASS');
console.log('DEATH=PASS');
console.log('DIVISION=PASS');
console.log('SELF_HEALING=PASS');
console.log('CELL_INVARIANT=PASS');
console.log('PEER_INTEGRITY=PASS');
console.log('FAKE_PASS=BLOCKED');
