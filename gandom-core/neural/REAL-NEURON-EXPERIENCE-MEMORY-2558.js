'use strict';

const crypto = require('crypto');

class NeuronExperienceMemory2558 {
  constructor(nodeId, options = {}) {
    if (!nodeId || typeof nodeId !== 'string') {
      throw new TypeError('nodeId is required');
    }

    this.nodeId = nodeId;
    this.maxEvents = Math.max(100, options.maxEvents || 10000);
    this.events = [];
    this.seen = new Set();
    this.metrics = {
      accepted: 0,
      duplicates: 0,
      rejected: 0
    };
  }

  record(type, data = {}) {
    if (typeof type !== 'string' ||
        !/^[A-Z0-9_.:-]{1,80}$/i.test(type)) {
      throw new TypeError('Invalid experience type');
    }

    const safeData = JSON.parse(JSON.stringify(data));
    const body = {
      source: this.nodeId,
      type,
      timestamp: Date.now(),
      data: safeData
    };

    const canonical = JSON.stringify(body);
    const id = crypto.createHash('sha256')
      .update(canonical)
      .digest('hex');

    const event = Object.freeze({ id, ...body });
    this._accept(event);
    return event;
  }

  receive(event) {
    try {
      if (!event || typeof event !== 'object' ||
          typeof event.id !== 'string' ||
          typeof event.source !== 'string' ||
          typeof event.type !== 'string' ||
          !Number.isFinite(event.timestamp) ||
          !event.data || typeof event.data !== 'object') {
        this.metrics.rejected++;
        return { accepted: false, reason: 'INVALID_EVENT' };
      }

      const body = {
        source: event.source,
        type: event.type,
        timestamp: event.timestamp,
        data: event.data
      };

      const expected = crypto.createHash('sha256')
        .update(JSON.stringify(body))
        .digest('hex');

      if (expected !== event.id) {
        this.metrics.rejected++;
        return { accepted: false, reason: 'HASH_MISMATCH' };
      }

      return this._accept(Object.freeze(bodyWithId(event.id, body)));
    } catch (_) {
      this.metrics.rejected++;
      return { accepted: false, reason: 'INVALID_EVENT' };
    }
  }

  _accept(event) {
    if (this.seen.has(event.id)) {
      this.metrics.duplicates++;
      return { accepted: false, reason: 'DUPLICATE' };
    }

    this.seen.add(event.id);
    this.events.push(event);
    this.metrics.accepted++;

    while (this.events.length > this.maxEvents) {
      const removed = this.events.shift();
      this.seen.delete(removed.id);
    }

    return { accepted: true, id: event.id };
  }

  snapshot() {
    return {
      nodeId: this.nodeId,
      storedExperiences: this.events.length,
      metrics: { ...this.metrics },
      latest: this.events.length
        ? this.events[this.events.length - 1]
        : null
    };
  }
}

function bodyWithId(id, body) {
  return { id, ...body };
}

module.exports = { NeuronExperienceMemory2558 };
