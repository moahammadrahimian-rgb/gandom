const crypto = require('crypto');

// GANDOM - Tor Layer

function randomId(size = 16) {
  return crypto.randomBytes(size).toString('hex');
}

class TorSimulator {
  constructor(options = {}) {
    this.minHops = Number.isInteger(options.minHops) ? options.minHops : 3;
    this.maxHops = Number.isInteger(options.maxHops) ? options.maxHops : 5;
    if (this.minHops < 1 || this.maxHops < this.minHops) {
      throw new Error('INVALID_HOP_RANGE');
    }
  }

  createRoute() {
    const range = this.maxHops - this.minHops + 1;
    const hopCount = this.minHops + crypto.randomInt(range);
    const hops = [];
    for (let i = 0; i < hopCount; i++) {
      hops.push({
        index: i + 1,
        id: randomId(16),
        role: i === 0 ? 'ENTRY' : i === hopCount - 1 ? 'EXIT' : 'RELAY'
      });
    }
    return { id: randomId(16), createdAt: Date.now(), hops };
  }

  send(data) {
    const route = this.createRoute();
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    return {
      success: true,
      routeId: route.id,
      hopCount: route.hops.length,
      hops: route.hops.map(hop => ({ index: hop.index, id: hop.id, role: hop.role })),
      payloadSize: payload.length
    };
  }

  status() {
    return {
      mode: 'SIMULATOR',
      protocol: 'TOR-LIKE',
      minHops: this.minHops,
      maxHops: this.maxHops
    };
  }
}

function realTorInfo() {
  return {
    mode: 'REAL_TOR_CONFIGURATION',
    protocol: 'SOCKS5',
    host: '127.0.0.1',
    port: 9050,
    note: 'Requires a running Tor SOCKS5 service'
  };
}

module.exports = {
  TorSimulator,
  realTorInfo,
  randomId
};
