'use strict';

const crypto = require('crypto');

const LAW = '2558';

const STATE = Object.freeze({
  HEALTHY: 'HEALTHY',
  SUSPECT: 'SUSPECT',
  SHOCK: 'SHOCK',
  RECOVERING: 'RECOVERING',
  QUARANTINED: 'QUARANTINED',
  RESTORED: 'RESTORED',
  FAILED: 'FAILED'
});

class GandomSelfHealingShock {
  constructor(options = {}) {
    this.nodeId = options.nodeId || 'UNKNOWN-NODE';
    this.component = options.component || 'UNKNOWN-COMPONENT';

    this.state = STATE.HEALTHY;

    this.checkpoint = null;
    this.lastFault = null;

    this.metrics = {
      faults: 0,
      shocks: 0,
      recoveries: 0,
      failedRecoveries: 0,
      reconnects: 0
    };

    this.events = [];
  }

  hash(value) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex');
  }

  record(type, data = {}) {
    const event = {
      law: LAW,
      timestamp: new Date().toISOString(),
      nodeId: this.nodeId,
      component: this.component,
      type,
      state: this.state,
      ...data
    };

    this.events.push(event);
    return event;
  }

  createCheckpoint(state) {
    if (state === undefined || state === null) {
      throw new Error('CHECKPOINT_STATE_REQUIRED');
    }

    this.checkpoint = {
      state: structuredClone(state),
      hash: this.hash(state),
      createdAt: new Date().toISOString()
    };

    this.record('CHECKPOINT_CREATED', {
      checkpointHash: this.checkpoint.hash
    });

    return this.checkpoint;
  }

  detectFault(reason) {
    this.metrics.faults++;
    this.lastFault = String(reason || 'UNKNOWN_FAULT');

    this.state = STATE.SUSPECT;

    this.record('FAULT_DETECTED', {
      reason: this.lastFault
    });

    return true;
  }

  shock() {
    if (this.state !== STATE.SUSPECT) {
      return {
        executed: false,
        reason: 'SHOCK_REQUIRES_SUSPECT_STATE'
      };
    }

    this.metrics.shocks++;
    this.state = STATE.SHOCK;

    this.record('CONTROLLED_SHOCK');

    this.state = STATE.QUARANTINED;

    this.record('FAULT_ISOLATED');

    return {
      executed: true,
      state: this.state
    };
  }

  recover(restoreFn) {
    if (this.state !== STATE.QUARANTINED) {
      return {
        recovered: false,
        reason: 'RECOVERY_REQUIRES_QUARANTINE'
      };
    }

    if (!this.checkpoint) {
      this.metrics.failedRecoveries++;
      this.state = STATE.FAILED;

      this.record('RECOVERY_FAILED', {
        reason: 'NO_TRUSTED_CHECKPOINT'
      });

      return {
        recovered: false,
        reason: 'NO_TRUSTED_CHECKPOINT'
      };
    }

    this.state = STATE.RECOVERING;

    this.record('RECOVERY_STARTED', {
      checkpointHash: this.checkpoint.hash
    });

    try {
      const restoredState = structuredClone(this.checkpoint.state);

      if (typeof restoreFn === 'function') {
        restoreFn(restoredState);
      }

      const verifiedHash = this.hash(restoredState);

      if (verifiedHash !== this.checkpoint.hash) {
        throw new Error('CHECKPOINT_HASH_MISMATCH');
      }

      this.metrics.recoveries++;
      this.state = STATE.RESTORED;

      this.record('STATE_RESTORED', {
        checkpointHash: verifiedHash
      });

      this.state = STATE.HEALTHY;

      this.record('SELF_HEAL_COMPLETE');

      return {
        recovered: true,
        state: this.state,
        checkpointHash: verifiedHash
      };

    } catch (error) {
      this.metrics.failedRecoveries++;
      this.state = STATE.FAILED;

      this.record('RECOVERY_FAILED', {
        reason: error.message
      });

      return {
        recovered: false,
        state: this.state,
        reason: error.message
      };
    }
  }

  reconnect(reconnectFn) {
    if (this.state !== STATE.HEALTHY) {
      return {
        connected: false,
        reason: 'NODE_NOT_HEALTHY'
      };
    }

    if (typeof reconnectFn !== 'function') {
      return {
        connected: false,
        reason: 'RECONNECT_HANDLER_REQUIRED'
      };
    }

    const result = reconnectFn();

    if (result === true) {
      this.metrics.reconnects++;

      this.record('P2P_RECONNECTED');

      return {
        connected: true
      };
    }

    this.record('P2P_RECONNECT_FAILED');

    return {
      connected: false
    };
  }

  snapshot() {
    return {
      law: LAW,
      nodeId: this.nodeId,
      component: this.component,
      state: this.state,
      metrics: { ...this.metrics },
      checkpointHash: this.checkpoint?.hash || null,
      lastFault: this.lastFault,
      events: this.events.length
    };
  }
}

module.exports = {
  LAW,
  STATE,
  GandomSelfHealingShock
};
