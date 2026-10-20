'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAW = '2558';
const NO_FAKE_PASS = 1;

const ROOT = path.resolve(__dirname, '../..');
const LAW_FILE = path.join(
  ROOT,
  'constitution',
  'GOLDEN-MOTHER-LAW-2558.json'
);

const LAYERS = [
  '01_GOVERNANCE',
  '02_MATH_PHYSICS',
  '03_CELL_LIFE',
  '04_BRAIN_NEURON',
  '05_NEURAL_P2P',
  '06_DISCOVERY_NETWORK',
  '07_SECURITY_SAFETY',
  '08_JOB_MARKET_ECONOMY',
  '09_PAYMENT_LEDGER_WALLET',
  '10_ANDROID_REAL_NODE',
  '11_GLOBAL_PHYSICAL_NETWORK',
  '12_UI_API_PRODUCT',
  '13_EVIDENCE_AUDIT_ROLLBACK'
];

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function verifyLaw() {
  if (!fs.existsSync(LAW_FILE)) {
    throw new Error('LAW_2558_FILE_MISSING');
  }

  const raw = fs.readFileSync(LAW_FILE);
  const json = JSON.parse(raw.toString());

  return {
    json,
    sha256: sha256(raw)
  };
}

function preflight() {
  const law = verifyLaw();

  return {
    law: LAW,
    noFakePass: NO_FAKE_PASS,
    lawFile: LAW_FILE,
    lawSha256: law.sha256,

    executionChain: [
      'CONTRACT',
      'REAL_CODE',
      'REAL_INFRASTRUCTURE',
      'REAL_EXECUTION',
      'REAL_OUTPUT',
      'EVIDENCE',
      'INDEPENDENT_VERIFICATION',
      'PASS'
    ],

    antiFake: {
      simulationIsNotReality: true,
      demoIsNotReality: true,
      processIsNotPhysicalNode: true,
      targetIsNotReality: true,
      screenshotAloneIsNotEvidence: true,
      fakePassForbidden: true
    },

    layers: LAYERS.map(layer => ({
      layer,
      status: 'BLOCKED_REAL',
      reason: 'LAYER_GATE_NOT_EXECUTED'
    }))
  };
}

if (require.main === module) {
  console.log('===== GANDOM 2558 MASTER EXECUTOR =====');
  console.log('LAW=2558');
  console.log('NO_FAKE_PASS=1');

  try {
    const result = preflight();

    console.log(`LAW_FILE=${result.lawFile}`);
    console.log(`LAW_SHA256=${result.lawSha256}`);

    console.log(
      'EXECUTION_CHAIN=CONTRACT>REAL_CODE>REAL_INFRASTRUCTURE>REAL_EXECUTION>REAL_OUTPUT>EVIDENCE>INDEPENDENT_VERIFICATION>PASS'
    );

    console.log('ANTI_FAKE=ACTIVE');

    for (const item of result.layers) {
      console.log(`${item.layer}=${item.status}`);
    }

    const filename =
      `LAW2558-MASTER-PREFLIGHT-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    const evidence = path.join(ROOT, 'runtime-logs', filename);

    fs.writeFileSync(
      evidence,
      JSON.stringify(result, null, 2)
    );

    console.log(`EVIDENCE=${path.relative(ROOT, evidence)}`);
    console.log('LAW_2558_MASTER_PREFLIGHT=PASS_REAL');
    console.log('FINAL_PROJECT_PASS=NOT_CLAIMED');
    console.log('NEXT=EXECUTE_REAL_LAYER_GATES');
  } catch (err) {
    console.error('LAW_2558_MASTER_PREFLIGHT=FAIL_REAL');
    console.error(`ERROR=${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  LAW,
  NO_FAKE_PASS,
  LAYERS,
  preflight,
  verifyLaw
};
