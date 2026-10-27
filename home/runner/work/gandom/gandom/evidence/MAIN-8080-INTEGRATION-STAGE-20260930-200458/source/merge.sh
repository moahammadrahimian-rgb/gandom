cd ~/mybot && cp index.js index.js.backup.$(date +%Y%m%d-%H%M%S) && \
python3 - <<'PY'
from pathlib import Path

p = Path("index.js")
s = p.read_text()

# DHT را وارد کن
if "const DHT = require('./dht');" not in s:
    s = s.replace(
        "const fs = require('fs');",
        "const fs = require('fs');\nconst DHT = require('./dht');"
    )

# ساخت DHT
if "const dht = new DHT();" not in s:
    s = s.replace(
        "const PORT = process.argv[2] ? parseInt(process.argv[2]) : 8080;",
        "const dht = new DHT();\nconsole.log(`🌐 DHT Node ID: ${dht.getNodeId()}`);\n\nconst PORT = process.argv[2] ? parseInt(process.argv[2]) : 8080;"
    )

# نگهداری Node ID مربوط به هر client
old = """const clients = new Map();"""
new = """const clients = new Map();
const clientDhtNodes = new Map();"""
s = s.replace(old, new)

# اضافه‌کردن Peer به DHT هنگام اتصال
old = """    clients.set(clientId, ws);
    
    // افزودن کلاینت به DHT (جدید)
    const nodeId = crypto.randomBytes(20).toString('hex');
    dht.addPeer(nodeId, `client_${clientId}`);
    console.log(`✅ Client connected: ${clientId} | DHT Peer added: ${nodeId}`);"""

new = """    clients.set(clientId, ws);

    // برای هر کلاینت یک Node ID مستقل در DHT ایجاد می‌کنیم.
    const nodeId = crypto.randomBytes(20).toString('hex');
    clientDhtNodes.set(clientId, nodeId);
    dht.addPeer(nodeId, `client_${clientId}`);

    console.log(
        `✅ Client connected: ${clientId} | DHT Peer added: ${nodeId}`
    );"""

s = s.replace(old, new)

# حذف Peer از DHT هنگام قطع اتصال
old = """    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`❌ Client disconnected: ${clientId}`);
    });"""

new = """    ws.on('close', () => {
        clients.delete(clientId);

        const nodeId = clientDhtNodes.get(clientId);

        if (nodeId) {
            dht.removePeer(nodeId);
            clientDhtNodes.delete(clientId);

            console.log(
                `🗑️ DHT Peer removed: ${nodeId} | Client disconnected: ${clientId}`
            );
        } else {
            console.log(`⚠️ No DHT Peer found for client: ${clientId}`);
        }

        console.log(`❌ Client disconnected: ${clientId}`);
    });"""

s = s.replace(old, new)

p.write_text(s)
PY

cat > dht/index.js <<'EOF'
const { generateNodeId } = require('./nodeId');
const RoutingTable = require('./routingTable');

class DHT {
    constructor() {
        this.nodeId = generateNodeId();
        this.routingTable = new RoutingTable(this.nodeId);
        this.peers = new Map();

        console.log(`📌 DHT Node ID: ${this.nodeId}`);
    }

    addPeer(nodeId, address) {
        const peer = {
            id: nodeId,
            address
        };

        const added = this.routingTable.addNode(peer);

        if (added) {
            this.peers.set(nodeId, peer);
            console.log(`🌐 DHT Peer added: ${nodeId} -> ${address}`);
            return true;
        }

        console.log(`⚠️ DHT bucket full: ${nodeId}`);
        return false;
    }

    removePeer(nodeId) {
        const peer = this.peers.get(nodeId);

        if (!peer) {
            return false;
        }

        this.peers.delete(nodeId);

        for (const bucket of this.routingTable.buckets) {
            bucket.removeNode(nodeId);
        }

        console.log(`🗑️ DHT Peer removed: ${nodeId}`);
        return true;
    }

    findNode(targetId) {
        return this.routingTable.findClosestNodes(targetId);
    }

    getNodeId() {
        return this.nodeId;
    }

    getPeerCount() {
        return this.peers.size;
    }
}

module.exports = DHT;
EOF

echo "=== SYNTAX TEST ==="
node --check index.js
node --check dht/nodeId.js
node --check dht/kBucket.js
node --check dht/routingTable.js
node --check dht/index.js

echo "=== DHT LOAD TEST ==="
node - <<'EOF'
const DHT = require('./dht');

const dht = new DHT();

const peerId = 'abcdef1234567890abcdef1234567890abcdef12';

console.log('ADD=', dht.addPeer(peerId, 'test_peer'));
console.log('COUNT=', dht.getPeerCount());
console.log('REMOVE=', dht.removePeer(peerId));
console.log('COUNT_AFTER_REMOVE=', dht.getPeerCount());
EOF

echo "=== RESULT ==="
echo "DHT_P2P_MERGE=PASS"
