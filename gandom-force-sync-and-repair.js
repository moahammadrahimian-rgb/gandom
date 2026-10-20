'use strict';

// قانون مادر ۲۵۵۸: پشتیبان، اعتبارسنجی، اصلاح و اثبات.
// LAW 2558: Back up, validate, repair, and produce evidence.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const A = path.join(ROOT, 'blockchain-data/chain.json');
const B = path.join(ROOT, 'blockchain-data-b/chain.json');
const W = path.join(ROOT, 'wallet/wallet-state.json');
const PROOF = path.join(ROOT, 'FORCE_SYNC_PROOF.json');

let filesModified = 0;
const actions = [];
const errors = [];

function hashFile(file) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

// پشتیبان‌گیری پیش از هر تغییر / Backup before any modification.
function backup(file) {
  if (!fs.existsSync(file)) return null;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = `${file}.pre-force-sync-${stamp}.bak`;

  fs.copyFileSync(file, dest);
  actions.push({
    action: 'BACKUP_CREATED',
    file: path.relative(ROOT, file),
    backup: path.relative(ROOT, dest)
  });

  return dest;
}

// خواندن JSON همراه با خطای روشن / Read JSON with explicit errors.
function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return { raw, data: JSON.parse(raw) };
}

// اعتبارسنجی اولیه؛ این تابع به‌تنهایی اجماع را اثبات نمی‌کند.
// Basic validation does not by itself establish consensus.
function validateChain(file, obj) {
  if (!obj || !Array.isArray(obj.chain) || obj.chain.length === 0) {
    throw new Error(`${file}: chain is missing or empty`);
  }

  if (Number(obj.length) !== obj.chain.length) {
    throw new Error(
      `${file}: declared length ${obj.length} differs from actual ${obj.chain.length}`
    );
  }

  for (let i = 0; i < obj.chain.length; i++) {
    const block = obj.chain[i];

    if (!block || typeof block !== 'object') {
      throw new Error(`${file}: invalid block at index ${i}`);
    }

    if (block.index !== undefined && Number(block.index) !== i) {
      throw new Error(`${file}: unexpected block index at ${i}`);
    }

    // اگر هش قبلی وجود دارد، پیوند را کنترل کن.
    // If prevHash is present, check linkage.
    if (i > 0 && block.prevHash !== undefined) {
      const prev = obj.chain[i - 1];

      if (prev.hash !== undefined && block.prevHash !== prev.hash) {
        throw new Error(`${file}: broken prevHash link at index ${i}`);
      }
    }
  }

  return true;
}

// مقایسهٔ پیشوندی دقیق / Exact prefix comparison.
function isPrefix(shorter, longer) {
  if (shorter.chain.length > longer.chain.length) return false;

  for (let i = 0; i < shorter.chain.length; i++) {
    if (JSON.stringify(shorter.chain[i]) !==
        JSON.stringify(longer.chain[i])) {
      return false;
    }
  }

  return true;
}

function writeJson(file, obj) {
  const temp = `${file}.tmp-${process.pid}`;

  fs.writeFileSync(temp, JSON.stringify(obj, null, 2) + '\n', {
    encoding: 'utf8',
    flag: 'wx'
  });

  // بررسی فایل موقت پیش از جایگزینی / Validate before replacing.
  JSON.parse(fs.readFileSync(temp, 'utf8'));
  fs.renameSync(temp, file);

  // تأیید نوشتن / Confirm physical write.
  JSON.parse(fs.readFileSync(file, 'utf8'));
  filesModified++;
}

function main() {
  console.log('=== GANDOM FORCE SYNC / LAW 2558 ===');

  for (const f of [A, B, W]) {
    if (!fs.existsSync(f)) {
      errors.push(`MISSING_FILE=${path.relative(ROOT, f)}`);
    }
  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  // پیش از خواندن برای تغییر، نسخهٔ پشتیبان ایجاد می‌شود.
  // Back up all critical files before attempting repair.
  backup(A);
  backup(B);
  backup(W);

  const a = readJson(A);
  const b = readJson(B);

  validateChain(path.relative(ROOT, A), a.data);
  validateChain(path.relative(ROOT, B), b.data);

  const aLen = a.data.chain.length;
  const bLen = b.data.chain.length;

  console.log(`A_LENGTH=${aLen}`);
  console.log(`B_LENGTH=${bLen}`);

  // زنجیرهٔ کوتاه فقط وقتی جایگزین می‌شود که پیشوند دقیق زنجیرهٔ بلند باشد.
  // Replace the shorter chain only when it is an exact prefix of the longer.
  if (aLen !== bLen) {
    const shorter = aLen < bLen ? a.data : b.data;
    const longer = aLen < bLen ? b.data : a.data;
    const shorterFile = aLen < bLen ? A : B;

    if (!isPrefix(shorter, longer)) {
      throw new Error(
        'CHAIN_CONFLICT: shorter chain is not an exact prefix; ' +
        'automatic overwrite refused to protect ledger data'
      );
    }

    const newData = {
      ...longer,
      chain: longer.chain
    };
    newData.length = newData.chain.length;

    writeJson(shorterFile, newData);

    actions.push({
      action: aLen < bLen
        ? 'SYNC_A_FROM_B_PREFIX_VALIDATED'
        : 'SYNC_B_FROM_A_PREFIX_VALIDATED',
      resultingLength: newData.chain.length
    });
  } else {
    // زنجیره‌های هم‌طول باید از نظر محتوا یکسان باشند.
    // Equal-length chains must match exactly.
    if (JSON.stringify(a.data.chain) !== JSON.stringify(b.data.chain)) {
      throw new Error(
        'CHAIN_CONFLICT: equal lengths but different block contents'
      );
    }
  }

  // بازخوانی و بررسی پس از همگام‌سازی / Re-read and verify after sync.
  const finalA = readJson(A);
  const finalB = readJson(B);

  validateChain(path.relative(ROOT, A), finalA.data);
  validateChain(path.relative(ROOT, B), finalB.data);

  const hashA = hashFile(A);
  const hashB = hashFile(B);

  if (hashA !== hashB) {
    throw new Error('POST_WRITE_HASH_MISMATCH');
  }

  // تعمیر کیف پول محافظه‌کارانه: فقط ساختار قابل‌اثبات را اصلاح کن.
  // Conservative wallet repair: preserve unknown fields and values.
  const wallet = readJson(W);
  const walletData = wallet.data;

  if (!walletData || typeof walletData !== 'object' ||
      Array.isArray(walletData)) {
    throw new Error(
      'WALLET_CONFLICT: wallet JSON is not an object; refusing reconstruction'
    );
  }

  let walletChanged = false;
  const chainLength = finalA.data.chain.length;

  // فقط اگر کلید از قبل وجود داشته و null باشد، مقدار طول زنجیره جایگزین می‌شود.
  // Only replace existing null length fields with the verified chain length.
  for (const key of ['length', 'chainLength']) {
    if (Object.prototype.hasOwnProperty.call(walletData, key) &&
        walletData[key] === null) {
      walletData[key] = chainLength;
      walletChanged = true;
    }
  }

  if (walletChanged) {
    backup(W);
    writeJson(W, walletData);
    actions.push({
      action: 'WALLET_NULL_LENGTH_REPAIRED',
      verifiedChainLength: chainLength
    });
  } else {
    actions.push({
      action: 'WALLET_PRESERVED',
      reason: 'No existing null length field required repair'
    });
  }

  // اعتبارسنجی نهایی فایل‌ها / Final JSON validation.
  JSON.parse(fs.readFileSync(A, 'utf8'));
  JSON.parse(fs.readFileSync(B, 'utf8'));
  JSON.parse(fs.readFileSync(W, 'utf8'));

  const proof = {
    law: 2558,
    timestamp: new Date().toISOString(),
    filesModified,
    status: filesModified > 0 ? 'MODIFIED' : 'NO_CONTENT_CHANGE',
    chainLength: JSON.parse(fs.readFileSync(A, 'utf8')).chain.length,
    hashes: {
      nodeA: hashFile(A),
      nodeB: hashFile(B),
      wallet: hashFile(W)
    },
    chainHashesMatch: hashFile(A) === hashFile(B),
    actions,
    errors,
    note: 'Matching file hashes do not prove live P2P consensus.'
  };

  fs.writeFileSync(PROOF, JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify(proof, null, 2));

  if (!proof.chainHashesMatch) {
    throw new Error('FINAL_CHAIN_HASH_MISMATCH');
  }

  console.log(`FILES_MODIFIED=${filesModified}`);
  console.log('PASS_REAL=NOT_ESTABLISHED');
  console.log('Reason: file consistency does not prove live peer handshake.');
}

try {
  main();
} catch (e) {
  console.error('REPAIR_FAILED=' + e.message);
  console.error('PASS_REAL=NOT_ESTABLISHED');

  // گزارش شکست نیز برای بررسی بعدی ذخیره می‌شود.
  // Persist failure evidence for diagnosis.
  try {
    fs.writeFileSync(PROOF, JSON.stringify({
      law: 2558,
      timestamp: new Date().toISOString(),
      filesModified,
      status: 'FAILED',
      error: e.message,
      actions,
      errors,
      note: 'No PASS_REAL claim on failed repair.'
    }, null, 2) + '\n');
  } catch (_) {}

  process.exitCode = 1;
}
