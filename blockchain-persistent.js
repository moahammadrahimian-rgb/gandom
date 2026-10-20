// ═══════════════════════════════════════════════════════
// 💾 GANDOM BLOCKCHAIN PERSISTENT - بلاک‌چین دائمی
// ═══════════════════════════════════════════════════════

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'blockchain-data');
const CHAIN_FILE = path.join(DATA_DIR, 'chain.json');
const TX_FILE = path.join(DATA_DIR, 'pending-tx.json');
const META_FILE = path.join(DATA_DIR, 'meta.json');

// ساخت پوشه داده‌ها
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`📁 پوشه داده ساخته شد: ${DATA_DIR}`);
}

// ─────────── Block ───────────
class Block {
  constructor(index, prevHash, timestamp, transactions) {
    this.index = index;
    this.prevHash = prevHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }
  
  calculateHash() {
    return crypto.createHash('sha256')
      .update(this.index + this.prevHash + this.timestamp + 
              JSON.stringify(this.transactions) + this.nonce)
      .digest('hex');
  }
  
  mine(difficulty) {
    const target = '0'.repeat(difficulty);
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }
  
  toJSON() {
    return {
      index: this.index,
      prevHash: this.prevHash,
      timestamp: this.timestamp,
      transactions: this.transactions,
      nonce: this.nonce,
      hash: this.hash
    };
  }
  
  static fromJSON(obj) {
    const b = new Block(obj.index, obj.prevHash, obj.timestamp, obj.transactions);
    b.nonce = obj.nonce;
    b.hash = obj.hash;
    return b;
  }
}

// ─────────── Genesis ثابت ───────────
function createGenesis() {
  return new Block(0, '0'.repeat(64), 0, [
    { type: 'GENESIS', msg: 'Gandom 2558', law: '2558' }
  ]);
}

// ─────────── Blockchain با Persistence ───────────
class PersistentBlockchain {
  constructor() {
    this.difficulty = 3;
    this.pendingTx = [];
    this.chain = [];
    this.load();
  }
  
  // ─────────── ذخیره روی دیسک ───────────
  save() {
    try {
      // ذخیره زنجیره
      const chainData = {
        version: '1.0',
        saved_at: new Date().toISOString(),
        difficulty: this.difficulty,
        length: this.chain.length,
        chain: this.chain.map(b => b.toJSON())
      };
      fs.writeFileSync(CHAIN_FILE, JSON.stringify(chainData, null, 2));
      
      // ذخیره تراکنش‌های در انتظار
      fs.writeFileSync(TX_FILE, JSON.stringify(this.pendingTx, null, 2));
      
      // ذخیره متادیتا
      const meta = {
        last_save: new Date().toISOString(),
        chain_length: this.chain.length,
        latest_hash: this.chain.length > 0 ? this.chain[this.chain.length-1].hash : null,
        latest_index: this.chain.length > 0 ? this.chain[this.chain.length-1].index : null,
        pending_tx_count: this.pendingTx.length
      };
      fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
      
      return true;
    } catch (e) {
      console.error(`❌ خطا در ذخیره: ${e.message}`);
      return false;
    }
  }
  
  // ─────────── بارگذاری از دیسک ───────────
  load() {
    try {
      if (!fs.existsSync(CHAIN_FILE)) {
        throw new Error('CHAIN_FILE_MISSING; refusing automatic genesis reset');
      }

      const raw = fs.readFileSync(CHAIN_FILE, 'utf8');
      const data = JSON.parse(raw);

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('CHAIN_DATA_INVALID; refusing automatic genesis reset');
      }

      const previousChain = this.chain;
      this.chain = data;

      if (!this.isValid()) {
        this.chain = previousChain;
        throw new Error('CHAIN_VALIDATION_FAILED; original file preserved');
      }

      if (fs.existsSync(TX_FILE)) {
        this.pendingTx = JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
        if (!Array.isArray(this.pendingTx)) {
          throw new Error('PENDING_TX_INVALID; original files preserved');
        }
      }

      console.log('LOAD_OK: validated chain length=' + this.chain.length);
    } catch (e) {
      console.error('LOAD_STOPPED_WITHOUT_RESET:', e.message);
      throw e;
    }
  }

  getLatest() {
    return this.chain[this.chain.length - 1];
  }
  
  addBlock(block) {
    block.prevHash = this.getLatest().hash;
    block.mine(this.difficulty);
    this.chain.push(block);
    this.save(); // ← ذخیره خودکار
    return block;
  }
  
  mineBlock(transactions) {
    const block = new Block(
      this.chain.length,
      this.getLatest().hash,
      Date.now(),
      transactions
    );
    this.addBlock(block);
    this.pendingTx = [];
    this.save();
    return block;
  }
  
  isValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const curr = this.chain[i];
      const prev = this.chain[i-1];
      if (curr.hash !== curr.calculateHash()) return false;
      if (curr.prevHash !== prev.hash) return false;
    }
    return true;
  }
  
  getStats() {
    return {
      length: this.chain.length,
      latest_hash: this.getLatest().hash.substring(0, 16) + '...',
      difficulty: this.difficulty,
      is_valid: this.isValid(),
      pending_tx: this.pendingTx.length,
      total_size: JSON.stringify(this.chain).length
    };
  }
  
  // پاک کردن همه چیز
  reset() {
    this.chain = [createGenesis()];
    this.pendingTx = [];
    this.save();
    console.log('🗑️  بلاک‌چین ریست شد');
  }
  
  // بکاپ
  backup() {
    const backupFile = path.join(DATA_DIR, 
      `backup-${Date.now()}.json`);
    const data = {
      version: '1.0',
      backup_at: new Date().toISOString(),
      chain: this.chain.map(b => b.toJSON())
    };
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    console.log(`💾 بکاپ ذخیره شد: ${backupFile}`);
    return backupFile;
  }
}

// ═══════════════════════════════════════════════════════
// 🚀 تست Persistence
// ═══════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════');
console.log('💾 GANDOM BLOCKCHAIN - تست Persistence');
console.log('═══════════════════════════════════════════════════════');

// ─────────── مرحله ۱: بارگذاری یا ساخت ───────────
console.log('\n📌 مرحله ۱: بارگذاری بلاک‌چین');
console.log('─────────────────────────────────────');
const chain = new PersistentBlockchain();
console.log(JSON.stringify(chain.getStats(), null, 2));

// ─────────── مرحله ۲: استخراج بلوک جدید ───────────
console.log('\n📌 مرحله ۲: استخراج بلوک جدید');
console.log('─────────────────────────────────────');

const txCount = 2 + Math.floor(Math.random() * 3);
const txs = [];
for (let i = 0; i < txCount; i++) {
  txs.push({
    from: 'GDM' + crypto.randomBytes(4).toString('hex'),
    to: 'GDM' + crypto.randomBytes(4).toString('hex'),
    amount: Math.floor(Math.random() * 1000),
    fee: 0.001,
    timestamp: Date.now()
  });
}

console.log(`⛏️  استخراج بلوک #${chain.chain.length} با ${txs.length} تراکنش...`);
const newBlock = chain.mineBlock(txs);
console.log(`✅ بلوک #${newBlock.index} استخراج شد`);
console.log(`   Hash: ${newBlock.hash.substring(0, 32)}...`);
console.log(`   Nonce: ${newBlock.nonce}`);

// ─────────── مرحله ۳: بررسی ذخیره ───────────
console.log('\n📌 مرحله ۳: بررسی فایل‌های ذخیره‌شده');
console.log('─────────────────────────────────────');

console.log(`📁 فایل‌های پوشه blockchain-data:`);
const files = fs.readdirSync(DATA_DIR);
for (const f of files) {
  const fp = path.join(DATA_DIR, f);
  const size = fs.statSync(fp).size;
  console.log(`   📄 ${f}: ${size} بایت`);
}

console.log(`\n📄 محتوای meta.json:`);
const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
console.log(JSON.stringify(meta, null, 2));

// ─────────── مرحله ۴: تست بارگذاری مجدد ───────────
console.log('\n📌 مرحله ۴: تست بارگذاری از دیسک (شبیه‌سازی restart)');
console.log('─────────────────────────────────────');

const chain2 = new PersistentBlockchain();
console.log(`\n📊 مقایسه دو نمونه:`);
console.log(`   chain1: ${chain.chain.length} بلوک`);
console.log(`   chain2: ${chain2.chain.length} بلوک`);
console.log(`   یکسان؟ ${chain.chain.length === chain2.chain.length ? '✅ بله' : '❌ خیر'}`);

if (chain.chain.length === chain2.chain.length) {
  console.log(`   آخرین هش یکسان؟ ${chain.getLatest().hash === chain2.getLatest().hash ? '✅ بله' : '❌ خیر'}`);
}

// ─────────── مرحله ۵: بکاپ ───────────
console.log('\n📌 مرحله ۵: بکاپ‌گیری');
console.log('─────────────────────────────────────');
const backupFile = chain.backup();
console.log(`   📁 حجم بکاپ: ${fs.statSync(backupFile).size} بایت`);

// ─────────── گزارش نهایی ───────────
console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 گزارش نهایی');
console.log('═══════════════════════════════════════════════════════');
console.log(JSON.stringify(chain.getStats(), null, 2));
console.log('\n💾 مسیر داده‌ها: ' + DATA_DIR);
console.log('💾 مسیر زنجیره: ' + CHAIN_FILE);
console.log('💾 مسیر متادیتا: ' + META_FILE);
console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ تست Persistence کامل شد!');
console.log('═══════════════════════════════════════════════════════');
