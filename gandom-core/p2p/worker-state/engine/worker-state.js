'use strict';

const crypto = require('crypto');
const reportBus = require('../../engine/p2p-report-bus');

const STATES = new Set([
  'REGISTERED',
  'READY',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'STOPPED'
]);

function setWorkerState(workerId, state, extra = {}) {
  if (!workerId || typeof workerId !== 'string') {
    throw new Error('workerId is required');
  }

  if (!STATES.has(state)) {
    throw new Error('invalid worker state: ' + state);
  }

  const event = reportBus.emit('WORKER_STATE', {
    workerId,
    state,
    source: 'GANDOM_WORKER_STATE',
    ...extra
  });

  return {
    workerId,
    state,
    timestamp: event.timestamp,
    correlationId: event.correlationId,
    eventId: event.eventId,
    source: 'GANDOM_WORKER_STATE',
    fakeWorker: false
  };
}

module.exports = {
  STATES: [...STATES],
  setWorkerState
};

if (require.main === module) {
  const workerId =
    'WORKER-' + crypto.randomUUID();

  const result = setWorkerState(workerId, 'READY');

  console.log('REAL_WORKER_STATE=' + JSON.stringify(result));
}
