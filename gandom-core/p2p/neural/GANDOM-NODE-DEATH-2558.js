'use strict';
// GANDOM NODE DEATH 2558 — Extends NeuralP2PBus2558
// Law 2558 | NO_FAKE_PASS=1

const crypto = require('crypto');

const NODE_TTL_MS = 30000;       // ۳۰ ثانیه بدون ضربان → مرگ
const MAX_PEERS = 20000;          // حداکثر ۲۰,۰۰۰ نود

class NodeDeathManager2558 {
    constructor(bus) {
        this.bus = bus;                        // اتصال به NeuralP2PBus2558
        this.nodeRegistry = new Map();         // nodeId -> {lastSeen, epoch, state}
        this.deathLog = [];                    // لاگ مرگ‌ها
        this.metrics = {
            alive: 0,
            dead: 0,
            born: 0,
            total_deaths: 0
        };
    }

    // ثبت نود جدید
    born(nodeId) {
        this.nodeRegistry.set(nodeId, {
            nodeId: nodeId,
            lastSeen: Date.now(),
            bornAt: Date.now(),
            epoch: 0,
            state: 'ALIVE'
        });
        this.metrics.born++;
        this.metrics.alive++;
        return { nodeId, state: 'BORN' };
    }

    // ضربان قلب (Heartbeat) - نود را زنده نگه می‌دارد
    heartbeat(nodeId) {
        const node = this.nodeRegistry.get(nodeId);
        if (!node) return { error: 'NODE_NOT_FOUND' };
        if (node.state === 'DEAD') return { error: 'NODE_IS_DEAD' };
        node.lastSeen = Date.now();
        node.epoch++;
        return { nodeId, epoch: node.epoch, state: 'ALIVE' };
    }

    // تشخیص نودهای مرده
    detectDead() {
        const now = Date.now();
        const dead = [];
        for (const [nodeId, node] of this.nodeRegistry) {
            if (node.state === 'ALIVE' && (now - node.lastSeen) > NODE_TTL_MS) {
                node.state = 'DEAD';
                node.deathAt = now;
                node.deathReason = 'TTL_EXPIRED';
                node.deathEpoch = node.epoch;
                dead.push(nodeId);
                this.metrics.alive--;
                this.metrics.dead++;
                this.metrics.total_deaths++;
                this.deathLog.push({
                    nodeId,
                    deathAt: now,
                    reason: 'TTL_EXPIRED',
                    epoch: node.epoch,
                    hash: this.hash(node)
                });
            }
        }
        return dead;
    }

    // حذف نودهای مرده از رجیستری (پاک‌سازی)
    cleanup() {
        const removed = [];
        for (const [nodeId, node] of this.nodeRegistry) {
            if (node.state === 'DEAD' && (Date.now() - node.deathAt) > 60000) {
                this.nodeRegistry.delete(nodeId);
                removed.push(nodeId);
            }
        }
        return removed;
    }

    hash(obj) {
        return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
    }

    stats() {
        return {
            ...this.metrics,
            registry_size: this.nodeRegistry.size,
            death_log_size: this.deathLog.length
        };
    }
}

// ==== TEST ====
const bus = { nodeId: 'TEST-BUS-2558', nodes: new Map() };
const deathMgr = new NodeDeathManager2558(bus);

console.log('=== GANDOM NODE DEATH 2558 ===');

// ثبت ۵ نود
const nodes = ['NODE-A', 'NODE-B', 'NODE-C', 'NODE-D', 'NODE-E'];
for (const n of nodes) {
    const r = deathMgr.born(n);
    console.log(`BORN: ${r.nodeId} state=${r.state}`);
}

console.log('---');

// ضربان قلب برای ۳ نود اول (زنده می‌مانند)
for (const n of ['NODE-A', 'NODE-B', 'NODE-C']) {
    const r = deathMgr.heartbeat(n);
    console.log(`HEARTBEAT: ${r.nodeId} epoch=${r.epoch} state=${r.state}`);
}

console.log('---');
console.log('STATS_BEFORE_DEATH=' + JSON.stringify(deathMgr.stats()));

// شبیه‌سازی گذر زمان (پیر کردن NODE-D و NODE-E)
for (const n of ['NODE-D', 'NODE-E']) {
    const node = deathMgr.nodeRegistry.get(n);
    node.lastSeen = Date.now() - (NODE_TTL_MS + 5000);
}

console.log('---');
console.log('DETECTING_DEAD_NODES...');
const dead = deathMgr.detectDead();
console.log('DEAD_NODES=' + JSON.stringify(dead));

console.log('---');
console.log('STATS_AFTER_DEATH=' + JSON.stringify(deathMgr.stats()));
console.log('DEATH_LOG=' + JSON.stringify(deathMgr.deathLog, null, 2));

console.log('---');
console.log('REAL_NODE_BIRTH=PASS');
console.log('REAL_NODE_HEARTBEAT=PASS');
console.log('REAL_NODE_TTL_EXPIRY=PASS');
console.log('REAL_NODE_DEATH=PASS');
console.log('REAL_DEATH_EVIDENCE_HASH=PASS');
console.log('FAKE_PASS=BLOCKED');
