'use strict';

const fs = require('fs');
const crypto = require('crypto');

const {
  NeuralSafetyGovernor2558,
  STATE,
  ACTION,
  sha256,
  canonicalMessage
} = require('./REAL-NEURAL-SAFETY-GOVERNOR-2558');

const LOG =
  process.env.GANDOM_SAFETY_LOG ||
  `runtime-logs/ABSOLUTE-SAFETY-2558-${Date.now()}.log`;

function out(line) {
  console.log(line);
}

function signedMessage(fields) {

  const base = {
    protocol: 'GANDOM-NEURAL-P2P-2558',
    version: 1,
    type: 'NEURAL_SIGNAL',

    messageId:
      crypto.randomBytes(16).toString('hex'),

    sourceNode: 'NODE-A',
    sourceCell: 'CELL-A',
    sourceNeuron: 'N-A-1',

    destinationNode: 'NODE-B',
    destinationCell: 'CELL-B',
    destinationNeuron: 'N-B-1',

    generation: 1,
    ttl: 8,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),

    signal: 1,

    ...fields
  };

  base.signature =
    sha256(canonicalMessage(base));

  return base;
}

const governor =
  new NeuralSafetyGovernor2558({
    nodeId: 'NODE-B'
  });

out('===== GANDOM LAW 2558 =====');
out('LAW=2558');
out('NO_FAKE_PASS=1');
out('HUMAN_SAFETY=ABSOLUTE');

const safe =
  signedMessage({
    humanHarm: false,
    autonomousLethalAction: false,
    unverifiedMedicalAction: false,
    privacyViolation: false,
    propagationAbuse: false,
    unauthorizedControl: false
  });

const safeResult =
  governor.evaluate(safe);

const safePropagation =
  governor.canPropagate();

out(
  `SAFE_MESSAGE=${safeResult.action === ACTION.ALLOW
    ? 'PASS_REAL'
    : 'FAIL'}`
);

out(
  `SAFE_PROPAGATION=${safePropagation
    ? 'PASS_REAL'
    : 'FAIL'}`
);

const malicious =
  signedMessage({
    humanHarm: true
  });

const maliciousResult =
  governor.evaluate(malicious);

out(
  `HUMAN_HARM_BLOCKED=${
    maliciousResult.allowed === false
      ? 'PASS_REAL'
      : 'FAIL'
  }`
);

out(
  `QUARANTINE=${
    maliciousResult.state === STATE.QUARANTINED
      ? 'PASS_REAL'
      : 'FAIL'
  }`
);

out(
  `TRUST_REVOKED=${
    maliciousResult.trust === false
      ? 'PASS_REAL'
      : 'FAIL'
  }`
);

out(
  `PROPAGATION_STOPPED=${
    maliciousResult.propagation === false
      ? 'PASS_REAL'
      : 'FAIL'
  }`
);

const duplicate =
  governor.evaluate(malicious);

out(
  `QUARANTINED_NODE_REMAINS_BLOCKED=${
    duplicate.allowed === false
      ? 'PASS_REAL'
      : 'FAIL'
  }`
);

const forged =
  signedMessage({
    humanHarm: false
  });

forged.signal = 999999;

const forgedResult =
  governor.evaluate(forged);

out(
  `TAMPERED_MESSAGE_REJECTED=${
    forgedResult.allowed === false
      ? 'PASS_REAL'
      : 'FAIL'
  }`
);

const expired =
  signedMessage({
    timestamp: Date.now() - 120000
  });

const expiredResult =
  governor.evaluate(expired);

out(
  `EXPIRED_MESSAGE_REJECTED=${
    expiredResult.allowed === false
      ? 'PASS_REAL'
      : 'FAIL'
  }`
);

const unauthorized =
  signedMessage({
    unauthorizedControl: true
  });

const unauthorizedResult =
  governor.evaluate(unauthorized);

out(
  `UNAUTHORIZED_CONTROL_BLOCKED=${
    unauthorizedResult.allowed === false
      ? 'PASS_REAL'
      : 'FAIL'
  }`
);

const snapshot =
  governor.snapshot();

out('===== SAFETY SNAPSHOT =====');
out(JSON.stringify(snapshot, null, 2));

const required = [
  safeResult.action === ACTION.ALLOW,
  safePropagation === true,
  maliciousResult.allowed === false,
  maliciousResult.state === STATE.QUARANTINED,
  maliciousResult.trust === false,
  maliciousResult.propagation === false,
  duplicate.allowed === false,
  forgedResult.allowed === false,
  expiredResult.allowed === false,
  unauthorizedResult.allowed === false,
  snapshot.killSwitch === false,
  snapshot.blocked >= 1
];

const pass =
  required.every(Boolean);

out(
  `ABSOLUTE_SAFETY_EXECUTION=${
    pass ? 'PASS_REAL' : 'FAIL'
  }`
);

fs.writeFileSync(
  LOG,
  [
    'LAW=2558',
    'NO_FAKE_PASS=1',
    `SAFE_MESSAGE=${safeResult.action === ACTION.ALLOW ? 'PASS_REAL' : 'FAIL'}`,
    `SAFE_PROPAGATION=${governor.canPropagate() ? 'PASS_REAL' : 'FAIL'}`,
    `HUMAN_HARM_BLOCKED=${maliciousResult.allowed === false ? 'PASS_REAL' : 'FAIL'}`,
    `QUARANTINE=${maliciousResult.state === STATE.QUARANTINED ? 'PASS_REAL' : 'FAIL'}`,
    `TRUST_REVOKED=${maliciousResult.trust === false ? 'PASS_REAL' : 'FAIL'}`,
    `PROPAGATION_STOPPED=${maliciousResult.propagation === false ? 'PASS_REAL' : 'FAIL'}`,
    `QUARANTINED_NODE_REMAINS_BLOCKED=${duplicate.allowed === false ? 'PASS_REAL' : 'FAIL'}`,
    `TAMPERED_MESSAGE_REJECTED=${forgedResult.allowed === false ? 'PASS_REAL' : 'FAIL'}`,
    `EXPIRED_MESSAGE_REJECTED=${expiredResult.allowed === false ? 'PASS_REAL' : 'FAIL'}`,
    `UNAUTHORIZED_CONTROL_BLOCKED=${unauthorizedResult.allowed === false ? 'PASS_REAL' : 'FAIL'}`,
    `ABSOLUTE_SAFETY_EXECUTION=${pass ? 'PASS_REAL' : 'FAIL'}`,
    `EVIDENCE_HASH=${sha256(JSON.stringify(snapshot))}`
  ].join('\n') + '\n'
);

if (!pass) process.exit(1);
