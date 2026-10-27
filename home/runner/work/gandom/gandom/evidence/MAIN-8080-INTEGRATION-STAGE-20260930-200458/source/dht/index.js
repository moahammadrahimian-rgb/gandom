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
