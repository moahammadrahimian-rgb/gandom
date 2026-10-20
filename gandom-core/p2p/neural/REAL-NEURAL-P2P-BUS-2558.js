'use strict';

const crypto = require('crypto');

const PROTOCOL = 'GANDOM-NEURAL-P2P-2558';
const VERSION = 1;
const MAX_TTL = 8;

function sha256(value) {
  return crypto
    .createHash('sha256')
    .update(String(value))
    .digest('hex');
}

function canonicalMessage(message) {
  return JSON.stringify({
    protocol: message.protocol,
    version: message.version,
    type: message.type,
    messageId: message.messageId,
    sourceNode: message.sourceNode,
    sourceCell: message.sourceCell,
    sourceNeuron: message.sourceNeuron,
    destinationNode: message.destinationNode,
    destinationCell: message.destinationCell,
    destinationNeuron: message.destinationNeuron,
    generation: message.generation,
    ttl: message.ttl,
    timestamp: message.timestamp,
    nonce: message.nonce,
    signal: message.signal
  });
}

class NeuralP2PBus2558 {

  constructor(options = {}) {
    this.nodeId = options.nodeId || 'UNKNOWN-NODE';

    this.seen = new Set();
    this.neurons = new Map();
    this.connections = new Set();

    this.metrics = {
      sent: 0,
      received: 0,
      delivered: 0,
      duplicateBlocked: 0,
      invalidBlocked: 0,
      expiredBlocked: 0,
      acknowledgements: 0
    };
  }

  registerNeuron(cellId, neuronId, initial = 0) {

    const key = `${cellId}:${neuronId}`;

    this.neurons.set(key, {
      cellId,
      neuronId,
      state: Number(initial) || 0,
      updates: 0,
      lastMessageId: null,
      generation: 0
    });

    return key;
  }

  createSignal({
    sourceCell,
    sourceNeuron,
    destinationNode,
    destinationCell,
    destinationNeuron,
    generation = 0,
    signal
  }) {

    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');

    const message = {
      protocol: PROTOCOL,
      version: VERSION,
      type: 'NEURAL_SIGNAL',

      messageId: sha256(
        `${this.nodeId}:${timestamp}:${nonce}`
      ),

      sourceNode: this.nodeId,
      sourceCell: String(sourceCell),
      sourceNeuron: String(sourceNeuron),

      destinationNode:
        destinationNode ? String(destinationNode) : null,

      destinationCell: String(destinationCell),
      destinationNeuron: String(destinationNeuron),

      generation: Number(generation),
      ttl: MAX_TTL,
      timestamp,
      nonce,

      signal: Number(signal)
    };

    message.signature = sha256(canonicalMessage(message));

    return message;
  }

  validate(message) {

    if (!message ||
        message.protocol !== PROTOCOL ||
        message.version !== VERSION) {
      return {
        ok: false,
        reason: 'INVALID_PROTOCOL'
      };
    }

    if (!message.messageId ||
        !message.sourceNode ||
        !message.destinationCell ||
        !message.destinationNeuron) {
      return {
        ok: false,
        reason: 'INVALID_IDENTITY'
      };
    }

    if (!Number.isFinite(message.signal)) {
      return {
        ok: false,
        reason: 'INVALID_SIGNAL'
      };
    }

    if (!Number.isInteger(message.ttl) ||
        message.ttl < 0 ||
        message.ttl > MAX_TTL) {
      return {
        ok: false,
        reason: 'INVALID_TTL'
      };
    }

    if (this.seen.has(message.messageId)) {
      return {
        ok: false,
        reason: 'DUPLICATE'
      };
    }

    const expected = sha256(
      canonicalMessage(message)
    );

    if (expected !== message.signature) {
      return {
        ok: false,
        reason: 'BAD_SIGNATURE'
      };
    }

    if (Date.now() - message.timestamp > 60000) {
      return {
        ok: false,
        reason: 'EXPIRED'
      };
    }

    return {
      ok: true
    };
  }

  receive(message) {

    const check = this.validate(message);

    if (!check.ok) {

      if (check.reason === 'DUPLICATE') {
        this.metrics.duplicateBlocked++;
      } else if (check.reason === 'EXPIRED') {
        this.metrics.expiredBlocked++;
      } else {
        this.metrics.invalidBlocked++;
      }

      return {
        accepted: false,
        reason: check.reason
      };
    }

    this.seen.add(message.messageId);
    this.metrics.received++;

    const key =
      `${message.destinationCell}:${message.destinationNeuron}`;

    const neuron = this.neurons.get(key);

    if (!neuron) {
      return {
        accepted: false,
        reason: 'DESTINATION_NEURON_NOT_FOUND'
      };
    }

    /*
     * Real state transition:
     *
     * old_state -> signal -> new_state
     */
    const oldState = neuron.state;

    neuron.state =
      Math.tanh(
        oldState * 0.9 +
        message.signal * 0.1
      );

    neuron.updates++;
    neuron.lastMessageId = message.messageId;
    neuron.generation = message.generation;

    this.metrics.delivered++;

    return {
      accepted: true,
      messageId: message.messageId,
      oldState,
      newState: neuron.state,
      generation: neuron.generation
    };
  }

  acknowledge(messageId) {

    this.metrics.acknowledgements++;

    return {
      protocol: PROTOCOL,
      type: 'NEURAL_ACK',
      nodeId: this.nodeId,
      messageId,
      timestamp: Date.now()
    };
  }

  snapshot() {

    return {
      nodeId: this.nodeId,
      neurons: Array.from(this.neurons.values()),
      metrics: { ...this.metrics },
      seenMessages: this.seen.size
    };
  }
}

module.exports = {
  NeuralP2PBus2558,
  PROTOCOL,
  VERSION,
  sha256
};
