const KBucket = require('./kBucket');

class RoutingTable {
    constructor(myNodeId) {
        this.myNodeId = myNodeId;
        this.buckets = [];
        this.K = 20;

        for (let i = 0; i < 160; i++) {
            const min = BigInt(1) << BigInt(159 - i);
            const max = (BigInt(1) << BigInt(160 - i)) - BigInt(1);
            this.buckets.push(new KBucket(min, max));
        }
    }

    addNode(node) {
        const distance = this.getDistance(node.id);
        const bucketIndex = this.getBucketIndex(distance);

        if (bucketIndex >= 0 && bucketIndex < this.buckets.length) {
            return this.buckets[bucketIndex].addNode(node);
        }

        return false;
    }

    getBucketIndex(distance) {
        if (distance === BigInt(0)) return 0;
        return 159 - distance.toString(2).length + 1;
    }

    getDistance(nodeId) {
        return BigInt('0x' + this.myNodeId) ^ BigInt('0x' + nodeId);
    }

    findClosestNodes(targetId, count = 20) {
        const allNodes = this.buckets.flatMap(b => b.getNodes());

        return allNodes
            .map(node => ({
                node,
                distance: BigInt('0x' + node.id) ^ BigInt('0x' + targetId)
            }))
            .sort((a, b) => (a.distance < b.distance ? -1 : 1))
            .slice(0, count)
            .map(item => item.node);
    }
}

module.exports = RoutingTable;
