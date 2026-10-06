class KBucket {
    constructor(min, max) {
        this.min = min;
        this.max = max;
        this.nodes = [];
        this.K = 20;
    }

    addNode(node) {
        if (this.nodes.length < this.K) {
            this.nodes.push(node);
            return true;
        }
        return false;
    }

    removeNode(nodeId) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
    }

    getNodes() {
        return this.nodes;
    }
}

module.exports = KBucket;
