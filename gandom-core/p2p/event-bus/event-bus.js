'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPORT_BUS = path.resolve(
  __dirname,
  '..',
  'engine',
  'p2p-report-bus.js'
);

const EVIDENCE_DIR = path.resolve(__dirname, 'evidence');
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, 'event-bus-proof.jsonl');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const reportBus = require(REPORT_BUS);

if (!reportBus || typeof reportBus.emit !== 'function') {
  throw new Error('P2P_REPORT_BUS_EMIT_NOT_AVAILABLE');
}

function emitEvent(type, payload = {}, correlationId = null) {
  const event = {
    eventId: crypto.randomUUID(),
    correlationId: correlationId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    source: 'GANDOM_EVENT_BUS',
    type,
    payload
  };

  reportBus.emit(type, {
    ...payload,
    eventBusEventId: event.eventId,
    eventBusCorrelationId: event.correlationId,
    eventBusTimestamp: event.timestamp,
    eventBusSource: event.source
  });

  fs.appendFileSync(
    EVIDENCE_FILE,
    JSON.stringify(event) + '\n',
    'utf8'
  );

  return event;
}

module.exports = {
  emitEvent
};

if (require.main === module) {
  const event = emitEvent('EVENT_BUS_BOOTSTRAP', {
    status: 'REAL_RUNTIME_EVENT'
  });

  console.log('REAL_EVENT=' + JSON.stringify(event));
  console.log('EVENT_BUS_EMIT=PASS');
  console.log('EVIDENCE_WRITE=PASS');
}
