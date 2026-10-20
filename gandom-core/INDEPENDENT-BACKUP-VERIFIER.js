'use strict';

const fs = require('fs');
const crypto = require('crypto');
const assert = require('node:assert/strict');

const manifestPath = process.argv[2];

if (!manifestPath) {
  console.error('BACKUP_VERIFICATION=FAIL');
  console.error('ERROR=MANIFEST_REQUIRED');
  process.exit(1);
}

assert.ok(fs.existsSync(manifestPath), 'MANIFEST_NOT_FOUND');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.law, '2558', 'LAW_MISMATCH');
assert.ok(manifest.backup);
assert.ok(manifest.evidence);

const backupPath = manifest.backup.path;
const evidencePath = manifest.evidence.path;

assert.ok(fs.existsSync(backupPath), 'BACKUP_NOT_FOUND');
assert.ok(fs.existsSync(evidencePath), 'EVIDENCE_NOT_FOUND');

function sha256File(path) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path))
    .digest('hex');
}

const backupHash = sha256File(backupPath);
const evidenceHash = sha256File(evidencePath);

assert.equal(
  backupHash,
  manifest.backup.sha256,
  'BACKUP_SHA256_MISMATCH'
);

assert.equal(
  evidenceHash,
  manifest.evidence.sha256,
  'EVIDENCE_SHA256_MISMATCH'
);

const backupSize = fs.statSync(backupPath).size;
const evidenceSize = fs.statSync(evidencePath).size;

assert.equal(
  backupSize,
  manifest.backup.size_bytes,
  'BACKUP_SIZE_MISMATCH'
);

assert.equal(
  evidenceSize,
  manifest.evidence.size_bytes,
  'EVIDENCE_SIZE_MISMATCH'
);

console.log('=======================================');
console.log('GANDOM LAW2558 BACKUP VERIFIER');
console.log('=======================================');
console.log(`MANIFEST=${manifestPath}`);
console.log('LAW2558=PASS');
console.log('BACKUP_EXISTS=PASS');
console.log('EVIDENCE_EXISTS=PASS');
console.log('BACKUP_SHA256=PASS');
console.log('EVIDENCE_SHA256=PASS');
console.log('BACKUP_SIZE=PASS');
console.log('EVIDENCE_SIZE=PASS');
console.log('INDEPENDENT_BACKUP_VERIFICATION=PASS');
console.log('=======================================');
