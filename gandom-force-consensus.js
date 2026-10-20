'use strict';

// GANDOM LAW 2558 — guarded consensus repair
// قانون مادر ۲۵۵۸ — اصلاح محافظت‌شده و قابل‌ردیابی
// This script preserves originals before any modification.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const FILE_A = path.join(ROOT, 'blockchain-data', 'chain.json');
const FILE_B = path.join(ROOT, 'blockchain-data-b', 'chain.json');
const WALLET = path.join(ROOT, 'wallet', 'wallet-state.json');
const PROOF = path.join(ROOT, 'FORCE_WRITE_PROOF.json');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(file) {
  const raw = fs.readFileSync(file);
  return { raw, json: JSON.parse(raw.toString('utf8')) };
}

function chainInfo(file) {
  const { raw, json } = readJson(file);

  if (!Array.isArray(json.chain) || json.chain.length < 1) {
    throw new Error(`INVALID_CHAIN_ARRAY: ${file}`);
  }

  // Do not treat a declared length as proof; count actual entries.
  const actualLength = json.chain.length;

  return {
    file,
    raw,
    json,
    actualLength,
    hash: sha256(raw)
  };
}

function backup(file) {
  if (!fs.existsSync(file)) throw new Error(`MISSING_FILE: ${file}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${file}.pre-force-${stamp}.bak`;

  fs.copyFileSync(file, backupPath, fs.constants.COPYFILE_EXCL);

  // Verify backup bytes match the original.
  if (sha256(fs.readFileSync(file)) !== sha256(fs.readFileSync(backupPath))) {
    throw new Error(`BACKUP_VERIFICATION_FAILED: ${file}`);
  }

  return backupPath;
}

function atomicWrite(file, content) {
  const temp = `${file}.tmp-${process.pid}`;

  fs.writeFileSync(temp, content, { flag: 'wx', mode: 0o600 });

  // Verify the temporary file before replacing the destination.
  if (sha256(fs.readFileSync(temp)) !== sha256(content)) {
    throw new Error(`TEMP_VERIFICATION_FAILED: ${file}`);
  }

  fs.renameSync(temp, file);
}

function main() {
  const report = {
    law: 2558,
    started_at: new Date().toISOString(),
    status: 'FAILED',
    files_modified: 0,
    action: 'NONE',
    chain_a: null,
    chain_b: null,
    synced_chain_length: null,
    chain_hash_a: null,
    chain_hash_b: null,
    wallet_hash: null,
    backups: [],
    notes: []
  };

  try {
    if (!fs.existsSync(FILE_A) || !fs.existsSync(FILE_B)) {
      throw new Error('CHAIN_FILE_MISSING: refusing to create or invent chain data');
    }

    // Read and validate both chains before touching either one.
    let a = chainInfo(FILE_A);
    let b = chainInfo(FILE_B);

    report.chain_a = a.actualLength;
    report.chain_b = b.actualLength;
    report.chain_hash_a = a.hash;
    report.chain_hash_b = b.hash;

    // Refuse ambiguous conflicts: a longer file is not automatically a valid chain.
    // At minimum, each entry must be a non-null object.
    for (const [label, info] of [['A', a], ['B', b]]) {
      if (!info.json.chain.every(block =>
        block && typeof block === 'object' && !Array.isArray(block)
      )) {
        throw new Error(`INVALID_BLOCK_STRUCTURE_NODE_${label}`);
      }
    }

    // Back up all files before any write.
    report.backups.push(backup(FILE_A));
    report.backups.push(backup(FILE_B));

    if (fs.existsSync(WALLET)) {
      report.backups.push(backup(WALLET));
    }

    // Select the longer chain only when the shorter chain is an exact prefix.
    // This avoids blindly replacing a divergent history.
    if (a.actualLength !== b.actualLength) {
      const winner = a.actualLength > b.actualLength ? a : b;
      const loser = a.actualLength > b.actualLength ? b : a;

      const isPrefix = loser.json.chain.every((block, index) =>
        JSON.stringify(block) === JSON.stringify(winner.json.chain[index])
      );

      if (!isPrefix) {
        throw new Error('CHAIN_CONFLICT: shorter chain is not an exact prefix; manual reconciliation required');
      }

      atomicWrite(loser.file, winner.raw);
      report.files_modified += 1;
      report.action = a.actualLength > b.actualLength
        ? 'OVERWRITE_NODE_B_WITH_NODE_A'
        : 'OVERWRITE_NODE_A_WITH_NODE_B';
    } else if (a.hash !== b.hash) {
      // Same number of blocks but different bytes/history: do not guess.
      throw new Error('CHAIN_CONFLICT_EQUAL_LENGTH: refusing to choose a winner');
    }

    // Re-read both files from disk and prove byte-for-byte identity.
    a = chainInfo(FILE_A);
    b = chainInfo(FILE_B);

    if (a.hash !== b.hash || !a.raw.equals(b.raw)) {
      throw new Error('CHAIN_SYNC_VERIFICATION_FAILED');
    }

    report.synced_chain_length = a.actualLength;
    report.chain_hash_a = a.hash;
    report.chain_hash_b = b.hash;

    // Repair only explicitly-null metadata. Do not invent balances or transactions.
    if (fs.existsSync(WALLET)) {
      const walletRead = readJson(WALLET);
      const wallet = walletRead.json;
      let walletChanged = false;

      for (const key of ['length', 'chainLength']) {
        if (Object.prototype.hasOwnProperty.call(wallet, key) &&
            wallet[key] === null) {
          wallet[key] = a.actualLength;
          walletChanged = true;
        }
      }

      if (walletChanged) {
        atomicWrite(WALLET, JSON.stringify(wallet, null, 2) + '\n');
        report.files_modified += 1;
        report.notes.push('Wallet null metadata repaired; balances and transactions preserved.');
      }

      report.wallet_hash = sha256(fs.readFileSync(WALLET));
    } else {
      report.notes.push('Wallet file absent; not fabricated.');
    }

    report.status = 'MODIFIED_AND_VERIFIED';
    report.finished_at = new Date().toISOString();

    // Write evidence only after verification; proof does not claim P2P or service health.
    const proofText = JSON.stringify(report, null, 2) + '\n';
    fs.writeFileSync(PROOF, proofText, { flag: 'w', mode: 0o600 });

    console.log('LAW=2558');
    console.log(`ACTION=${report.action}`);
    console.log(`FILES_MODIFIED=${report.files_modified}`);
    console.log(`SYNCED_CHAIN_LENGTH=${report.synced_chain_length}`);
    console.log(`CHAIN_SHA256_A=${report.chain_hash_a}`);
    console.log(`CHAIN_SHA256_B=${report.chain_hash_b}`);
    console.log(`PROOF=${PROOF}`);
    console.log(`STATUS=${report.status}`);

    // Do not claim PASS_REAL merely because files match.
    console.log('PASS_REAL=NOT_ESTABLISHED');
    console.log('REASON=FILE_SYNC_DOES_NOT_PROVE_LIVE_P2P_CONSENSUS');
  } catch (err) {
    report.error = String(err && err.message ? err.message : err);
    report.finished_at = new Date().toISOString();

    try {
      fs.writeFileSync(PROOF, JSON.stringify(report, null, 2) + '\n', {
        flag: 'w',
        mode: 0o600
      });
    } catch (_) {
      // Preserve the original error if proof writing also fails.
    }

    console.error(`FATAL=${report.error}`);
    console.error('NO_PASS_REAL=1');
    process.exitCode = 1;
  }
}

main();
