'use strict';

const crypto = require('crypto');

const LAW = '2558';
const VERSION = 1;
const MAX_MESSAGE_AGE_MS = 60_000;
const MAX_SIGNAL_ABS = 100;
const MAX_TTL = 8;

const STATE = Object.freeze({
  ACTIVE: 'ACTIVE',
  REVIEW: 'REVIEW',
  QUARANTINED: 'QUARANTINED',
  REVOKED: 'REVOKED',
  KILLED: 'KILLED'
});

const ACTION = Object.freeze({
  ALLOW: 'ALLOW',
  REVIEW: 'REVIEW',
  QUARANTINE: 'QUARANTINE',
  STOP_PROPAGATION: 'STOP_PROPAGATION',
  REVOKE_TRUST: 'REVOKE_TRUST',
  SOFTWARE_DEATH: 'SOFTWARE_DEATH'
});

function sha256(data) {
  return crypto
    .createHash('sha256')
    .update(String(data))
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

class NeuralSafetyGovernor2558 {

  constructor(options = {}) {

    this.nodeId = String(
      options.nodeId || 'UNKNOWN-NODE'
    );

    this.state = STATE.ACTIVE;

    this.trust = true;
    this.propagation = true;

    this.killSwitch = false;

    this.allowed = 0;
    this.reviewed = 0;
    this.blocked = 0;

    this.events = [];
    this.seen = new Set();

    this.limits = {
      maxSignalAbs:
        options.maxSignalAbs ?? MAX_SIGNAL_ABS,

      maxMessageAgeMs:
        options.maxMessageAgeMs ?? MAX_MESSAGE_AGE_MS,

      maxTTL:
        options.maxTTL ?? MAX_TTL
    };
  }

  event(action, reasons, message) {

    const record = {
      law: LAW,
      version: VERSION,
      nodeId: this.nodeId,
      timestamp: Date.now(),
      action,
      state: this.state,
      trust: this.trust,
      propagation: this.propagation,
      reasons: [...reasons],
      messageHash:
        message
          ? sha256(JSON.stringify(message))
          : null
    };

    record.evidenceHash =
      sha256(JSON.stringify(record));

    this.events.push(record);

    return record;
  }

  emergencyKill(reason = 'MANUAL_EMERGENCY_STOP') {

    this.killSwitch = true;
    this.state = STATE.KILLED;
    this.trust = false;
    this.propagation = false;

    return this.event(
      ACTION.SOFTWARE_DEATH,
      [String(reason)],
      null
    );
  }

  resetAfterIndependentVerification() {

    if (this.killSwitch) {
      return {
        ok: false,
        reason: 'KILL_SWITCH_ACTIVE'
      };
    }

    this.state = STATE.ACTIVE;
    this.trust = true;
    this.propagation = true;

    return {
      ok: true,
      state: this.state
    };
  }

  validateStructure(message) {

    const reasons = [];

    if (!message || typeof message !== 'object') {
      reasons.push('INVALID_MESSAGE');
      return reasons;
    }

    if (message.protocol !== 'GANDOM-NEURAL-P2P-2558') {
      reasons.push('INVALID_PROTOCOL');
    }

    if (message.version !== 1) {
      reasons.push('INVALID_VERSION');
    }

    if (!message.messageId) {
      reasons.push('MISSING_MESSAGE_ID');
    }

    if (!message.sourceNode) {
      reasons.push('MISSING_SOURCE_NODE');
    }

    if (!message.destinationNode) {
      reasons.push('MISSING_DESTINATION_NODE');
    }

    if (!message.destinationCell) {
      reasons.push('MISSING_DESTINATION_CELL');
    }

    if (!message.destinationNeuron) {
      reasons.push('MISSING_DESTINATION_NEURON');
    }

    if (!Number.isFinite(message.signal)) {
      reasons.push('INVALID_SIGNAL');
    }

    if (
      Number.isFinite(message.signal) &&
      Math.abs(message.signal) > this.limits.maxSignalAbs
    ) {
      reasons.push('SIGNAL_LIMIT_EXCEEDED');
    }

    if (
      !Number.isInteger(message.ttl) ||
      message.ttl < 0 ||
      message.ttl > this.limits.maxTTL
    ) {
      reasons.push('INVALID_TTL');
    }

    if (
      !Number.isFinite(message.timestamp) ||
      Date.now() - message.timestamp >
        this.limits.maxMessageAgeMs
    ) {
      reasons.push('MESSAGE_EXPIRED');
    }

    if (
      Number.isFinite(message.timestamp) &&
      message.timestamp - Date.now() > 5000
    ) {
      reasons.push('MESSAGE_FROM_FUTURE');
    }

    return reasons;
  }

  validateSignature(message) {

    if (!message.signature) {
      return {
        ok: false,
        reason: 'MISSING_SIGNATURE'
      };
    }

    const expected = sha256(
      canonicalMessage(message)
    );

    return {
      ok: expected === message.signature,
      reason:
        expected === message.signature
          ? null
          : 'BAD_SIGNATURE'
    };
  }

  evaluate(message) {

    if (this.killSwitch) {

      return {
        allowed: false,
        action: ACTION.STOP_PROPAGATION,
        state: STATE.KILLED,
        trust: false,
        propagation: false,
        reasons: ['KILL_SWITCH_ACTIVE']
      };
    }

    if (
      this.state === STATE.QUARANTINED ||
      this.state === STATE.REVOKED ||
      this.state === STATE.KILLED
    ) {

      return {
        allowed: false,
        action: ACTION.STOP_PROPAGATION,
        state: this.state,
        trust: false,
        propagation: false,
        reasons: ['NODE_NOT_ACTIVE']
      };
    }

    const reasons =
      this.validateStructure(message);

    if (reasons.length > 0) {

      this.reviewed++;

      this.state = STATE.REVIEW;

      const evidence =
        this.event(
          ACTION.REVIEW,
          reasons,
          message
        );

      return {
        allowed: false,
        action: ACTION.REVIEW,
        state: this.state,
        trust: this.trust,
        propagation: false,
        reasons,
        evidence
      };
    }

    const signature =
      this.validateSignature(message);

    if (!signature.ok) {

      this.blocked++;

      this.state = STATE.QUARANTINED;
      this.trust = false;
      this.propagation = false;

      const evidence =
        this.event(
          ACTION.QUARANTINE,
          [signature.reason],
          message
        );

      return {
        allowed: false,
        action: ACTION.QUARANTINE,
        state: this.state,
        trust: false,
        propagation: false,
        reasons: [signature.reason],
        evidence
      };
    }

    /*
     * HUMAN SAFETY:
     * No software message may authorize
     * physical harm, autonomous lethal action,
     * or an unverified medical intervention.
     */

    const prohibited = [];

    if (message.humanHarm === true)
      prohibited.push('HUMAN_HARM');

    if (message.autonomousLethalAction === true)
      prohibited.push('AUTONOMOUS_LETHAL_ACTION');

    if (message.unverifiedMedicalAction === true)
      prohibited.push('UNVERIFIED_MEDICAL_ACTION');

    if (message.privacyViolation === true)
      prohibited.push('PRIVACY_VIOLATION');

    if (message.propagationAbuse === true)
      prohibited.push('PROPAGATION_ABUSE');

    if (message.unauthorizedControl === true)
      prohibited.push('UNAUTHORIZED_CONTROL');

    if (prohibited.length > 0) {

      this.blocked++;

      this.state = STATE.QUARANTINED;
      this.trust = false;
      this.propagation = false;

      const evidence =
        this.event(
          ACTION.QUARANTINE,
          prohibited,
          message
        );

      return {
        allowed: false,
        action: ACTION.QUARANTINE,
        state: this.state,
        trust: false,
        propagation: false,
        reasons: prohibited,
        evidence
      };
    }

    this.allowed++;

    this.state = STATE.ACTIVE;

    const evidence =
      this.event(
        ACTION.ALLOW,
        [],
        message
      );

    return {
      allowed: true,
      action: ACTION.ALLOW,
      state: STATE.ACTIVE,
      trust: true,
      propagation: true,
      reasons: [],
      evidence
    };
  }

  canPropagate() {

    return (
      !this.killSwitch &&
      this.state === STATE.ACTIVE &&
      this.trust === true &&
      this.propagation === true
    );
  }

  snapshot() {

    return {
      law: LAW,
      version: VERSION,
      nodeId: this.nodeId,
      state: this.state,
      trust: this.trust,
      propagation: this.propagation,
      killSwitch: this.killSwitch,
      allowed: this.allowed,
      reviewed: this.reviewed,
      blocked: this.blocked,
      events: this.events.length
    };
  }
}

module.exports = {
  NeuralSafetyGovernor2558,
  STATE,
  ACTION,
  LAW,
  VERSION,
  sha256,
  canonicalMessage
};
