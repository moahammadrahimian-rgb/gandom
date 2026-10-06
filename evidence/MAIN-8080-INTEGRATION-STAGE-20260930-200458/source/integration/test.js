const { GandomCore } = require('./index');

console.log('=== GANDOM 1-6 REAL INTEGRATION TEST ===');

const g = new GandomCore({
  difficulty: 3,
  tor: {
    minHops: 3,
    maxHops: 5
  }
});

console.log('\n[STATUS]');
console.log(JSON.stringify(g.status(), null, 2));

console.log('\n[PROCESS]');

const r = g.process(
  'GANDOM 1-6 INTEGRATION TEST',
  'GANDOM-TEST'
);

console.log('Success:', r.success);
console.log('SHA256:', r.hash.substring(0, 24) + '...');
console.log('CID:', r.cid.substring(0, 24) + '...');
console.log('Transaction:', r.transactionId.substring(0, 24) + '...');
console.log('Route:', r.routeId.substring(0, 24) + '...');
console.log('Hops:', r.hopCount);

console.log('\n[VERIFY]');
console.log('IPFS exists:', g.ipfs.has(r.cid));
console.log('Blockchain valid:', g.blockchain.isChainValid());
console.log('Chain length:', g.blockchain.getChain().length);

if (
  r.success === true &&
  g.ipfs.has(r.cid) === true &&
  g.blockchain.isChainValid() === true &&
  g.blockchain.getChain().length === 1 &&
  r.hopCount >= 3 &&
  r.hopCount <= 5
) {
  console.log('\nGANDOM_1_TO_6_INTEGRATION=PASS');
} else {
  console.log('\nGANDOM_1_TO_6_INTEGRATION=FAIL');
  process.exitCode = 1;
}
