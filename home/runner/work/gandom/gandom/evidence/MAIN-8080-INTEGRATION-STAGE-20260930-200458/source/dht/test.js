const DHT = require('./index');

console.log('=== TEST 1: Generate Node ID ===');
const dht1 = new DHT();
console.log('Node 1 ID:', dht1.getNodeId());

const dht2 = new DHT();
console.log('Node 2 ID:', dht2.getNodeId());

console.log('\n=== TEST 2: Add Peers ===');
dht1.addPeer(dht2.getNodeId(), '127.0.0.1:8081');
dht1.addPeer('abc123def456abc123def456abc123def456abcd', '127.0.0.1:8082');
dht1.addPeer('fff000fff000fff000fff000fff000fff000ffff', '127.0.0.1:8083');

console.log('\n=== TEST 3: Find Closest Nodes ===');
const targetId = dht2.getNodeId();
const closest = dht1.findNode(targetId);
console.log('Target ID:', targetId);
console.log('Closest nodes found:', closest.length);
closest.forEach((node, i) => {
    console.log(`  ${i+1}. ${node.id} at ${node.address}`);
});

console.log('\n✅ ALL TESTS COMPLETED');
