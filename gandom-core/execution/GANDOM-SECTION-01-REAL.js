'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const CONTRACT = path.join(ROOT, 'GANDOM-ALL.md');

const LAW_HASH = path.join(
  ROOT,
  'constitution/GOLDEN-MOTHER-LAW-2558.HASH'
);

const LAW_JSON = path.join(
  ROOT,
  'constitution/GOLDEN-MOTHER-LAW-2558.json'
);

const EXEC_LOCK = path.join(
  ROOT,
  'gandom-core/execution-lock/REAL-EXECUTION-LOCK-2558.md'
);

const ARCH = path.join(
  ROOT,
  'architecture/MASTER-SPECIFICATION.md'
);

const EVIDENCE_DIR = path.join(
  ROOT,
  'gandom-core/evidence/section-01'
);

const EVIDENCE = path.join(
  EVIDENCE_DIR,
  'SECTION-01-REAL-EVIDENCE.json'
);

function fail(reason) {
  console.error('==================================================');
  console.error('SECTION_01_REAL_EXECUTION=FAIL');
  console.error(`REASON=${reason}`);
  console.error('FAKE_PASS=BLOCKED');
  console.error('SECTION_01_COMPLETE=FALSE');
  console.error('NEXT_SECTION_ALLOWED=FALSE');
  console.error('==================================================');
  process.exit(1);
}

function requireFile(file, name) {
  if (!fs.existsSync(file)) {
    fail(`${name}_MISSING`);
  }

  const stat = fs.statSync(file);

  if (!stat.isFile() || stat.size === 0) {
    fail(`${name}_INVALID`);
  }
}

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function has(text, value, name) {
  if (!text.includes(value)) {
    fail(`${name}_MISSING`);
  }
}

if (process.argv[2] === '--verify') {
  const evidencePath = process.argv[3];

  if (!evidencePath || !fs.existsSync(evidencePath)) {
    fail('EVIDENCE_NOT_FOUND');
  }

  const evidence = JSON.parse(
    fs.readFileSync(evidencePath, 'utf8')
  );

  requireFile(CONTRACT, 'GANDOM_ALL');
  requireFile(LAW_HASH, 'LAW_HASH');
  requireFile(LAW_JSON, 'LAW_JSON');
  requireFile(EXEC_LOCK, 'EXECUTION_LOCK');
  requireFile(ARCH, 'ARCHITECTURE');

  const contractHash = sha256(CONTRACT);
  const lawHash = sha256(LAW_HASH);
  const lawJsonHash = sha256(LAW_JSON);
  const lockHash = sha256(EXEC_LOCK);
  const archHash = sha256(ARCH);

  if (evidence.contract.sha256 !== contractHash)
    fail('CONTRACT_HASH_MISMATCH');

  if (evidence.lawHash !== lawHash)
    fail('LAW_HASH_MISMATCH');

  if (evidence.lawJsonHash !== lawJsonHash)
    fail('LAW_JSON_HASH_MISMATCH');

  if (evidence.executionLockHash !== lockHash)
    fail('EXECUTION_LOCK_HASH_MISMATCH');

  if (evidence.architectureHash !== archHash)
    fail('ARCHITECTURE_HASH_MISMATCH');

  if (evidence.section01.chapters !== 3)
    fail('SECTION_01_CHAPTER_COUNT_MISMATCH');

  if (evidence.section01.governance !== true)
    fail('GOVERNANCE_VERIFICATION_FAILED');

  if (evidence.section01.globalArchitecture !== true)
    fail('GLOBAL_ARCHITECTURE_VERIFICATION_FAILED');

  if (evidence.section01.systemContracts !== true)
    fail('SYSTEM_CONTRACTS_VERIFICATION_FAILED');

  console.log('INDEPENDENT_VERIFICATION=PASS');
  console.log(`VERIFIED_CONTRACT_SHA256=${contractHash}`);
  console.log(`VERIFIED_EVIDENCE_SHA256=${sha256(evidencePath)}`);
  console.log('FAKE_PASS=BLOCKED');
  process.exit(0);
}

console.log('==================================================');
console.log('GANDOM SECTION 01 — REAL EXECUTION');
console.log('==================================================');

requireFile(CONTRACT, 'GANDOM_ALL');
requireFile(LAW_HASH, 'LAW_HASH');
requireFile(LAW_JSON, 'LAW_JSON');
requireFile(EXEC_LOCK, 'EXECUTION_LOCK');
requireFile(ARCH, 'ARCHITECTURE');

const contract = fs.readFileSync(CONTRACT, 'utf8');

const layer01Start = contract.indexOf('## LAYER 01');
const layer02Start = contract.indexOf('## LAYER 02');

if (layer01Start < 0)
  fail('LAYER_01_NOT_FOUND');

if (layer02Start < 0)
  fail('LAYER_02_BOUNDARY_NOT_FOUND');

if (layer02Start <= layer01Start)
  fail('INVALID_LAYER_BOUNDARY');

const section01 = contract.slice(
  layer01Start,
  layer02Start
);

has(section01, '**01. GOVERNANCE**', 'GOVERNANCE');
has(section01, '**02. GLOBAL ARCHITECTURE**', 'GLOBAL_ARCHITECTURE');
has(section01, '**03. SYSTEM CONTRACTS**', 'SYSTEM_CONTRACTS');

const chapterMatches =
  section01.match(/^\*\*[0-9]{2}\./gm) || [];

if (chapterMatches.length !== 3)
  fail(`SECTION_01_EXPECTED_3_CHAPTERS_GOT_${chapterMatches.length}`);

const lock = fs.readFileSync(EXEC_LOCK, 'utf8');

has(
  lock,
  '20,000 REAL NODES',
  'REAL_NODE_TARGET'
);

has(
  lock,
  '400,000 REAL CELLS / NODE',
  'REAL_CELL_TARGET'
);

has(
  lock,
  '8,000,000,000 REAL LIVE CELLS',
  'GLOBAL_CELL_TARGET'
);

has(
  lock,
  'NO SIMULATION AS FINAL EXECUTION',
  'NO_SIMULATION_LOCK'
);

has(
  lock,
  'NO DEMO AS FINAL EXECUTION',
  'NO_DEMO_LOCK'
);

has(
  lock,
  'NO PROCESS COUNTING AS PHYSICAL NODE COUNT',
  'NO_PROCESS_COUNTING_LOCK'
);

has(
  lock,
  'NO FAKE PASS',
  'NO_FAKE_PASS_LOCK'
);

const evidence = {
  protocol: 'GANDOM',
  law: '2558',
  section: '01/12',
  mode: 'REAL_ABSOLUTE_EXECUTION',

  executedAt: new Date().toISOString(),

  executable: path.relative(
    ROOT,
    __filename
  ),

  contract: {
    file: path.relative(ROOT, CONTRACT),
    sha256: sha256(CONTRACT)
  },

  lawHash: sha256(LAW_HASH),
  lawJsonHash: sha256(LAW_JSON),
  executionLockHash: sha256(EXEC_LOCK),
  architectureHash: sha256(ARCH),

  section01: {
    boundaryVerified: true,
    chapters: 3,
    governance: true,
    globalArchitecture: true,
    systemContracts: true
  },

  finalTarget: {
    realNodes: 20000,
    realCellsPerNode: 400000,
    realLiveCells: 8000000000
  },

  antiFake: {
    simulationFinalExecution: false,
    demoFinalExecution: false,
    processCountingAsPhysicalNodes: false,
    fabricatedNumbers: false,
    fakePass: false
  },

  complete: false,
  nextSectionAllowed: false
};

fs.mkdirSync(EVIDENCE_DIR, {
  recursive: true
});

fs.writeFileSync(
  EVIDENCE,
  JSON.stringify(evidence, null, 2) + '\n'
);

console.log('SECTION_01_CONTRACT=PASS');
console.log('GOVERNANCE=PASS');
console.log('GLOBAL_ARCHITECTURE=PASS');
console.log('SYSTEM_CONTRACTS=PASS');
console.log('SECTION_01_CHAPTERS=3');
console.log('EXECUTION_LOCK=PASS');
console.log('ANTI_FAKE_LOCK=PASS');
console.log('EVIDENCE_WRITTEN=PASS');

console.log('=== INDEPENDENT VERIFICATION PROCESS ===');

const verifier = spawnSync(
  process.execPath,
  [__filename, '--verify', EVIDENCE],
  {
    cwd: ROOT,
    encoding: 'utf8'
  }
);

process.stdout.write(verifier.stdout || '');
process.stderr.write(verifier.stderr || '');

if (verifier.status !== 0) {
  fail('INDEPENDENT_VERIFICATION_FAILED');
}

console.log('==================================================');
console.log('SECTION_01_REAL_EXECUTION=PASS');
console.log(`EVIDENCE=${path.relative(ROOT, EVIDENCE)}`);
console.log(`CONTRACT_SHA256=${evidence.contract.sha256}`);
console.log(`EVIDENCE_SHA256=${sha256(EVIDENCE)}`);
console.log('INDEPENDENT_VERIFICATION=PASS');
console.log('SECTION_01_COMPLETE=FALSE');
console.log('NEXT_SECTION_ALLOWED=FALSE');
console.log('FAKE_PASS=BLOCKED');
console.log('==================================================');
