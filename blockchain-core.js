// ═══════════════════════════════════════════════════════
// 🧬 GANDOM BLOCKCHAIN CORE - هسته بلاک‌چین (بدون main)
// ═══════════════════════════════════════════════════════

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'blockchain-data');
const CHAIN_FILE = path.join(DATA_DIR, 'chain.json');
const TX_FILE = path.join(DATA_DIR, 'pending-tx.json');
const META_FILE = path.join(DATA_DIR, 'meta.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
      index: this.index, prevHash: this.prevHash,
      timestamp: this.timestamp, transactions: this.transactions,
      nonce: this.nonce, hash: this.hash
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

// ─────────── PersistentBlockchain ───────────
class PersistentBlockchain {
  constructor() {
    this.difficulty = 3;
    this.pendingTx = [];
    this.chain = [];
    this.load();
  }
  
  save() {
    try {
      fs.writeFileSync(CHAIN_FILE, JSON.stringify({
        version: '1.0',
        saved_at: new Date().toISOString(),
        difficulty: this.difficulty,
        length: this.chain.length,
        chain: this.chain.map(b => b.toJSON())
      }, null, 2));
      
      fs.writeFileSync(TX_FILE, JSON.stringify(this.pendingTx, null, 2));
      
      fs.writeFileSync(META_FILE, JSON.stringify({
        last_save: new Date().toISOString(),
        chain_length: this.chain.length,
        latest_hash: this.chain.length > 0 ? this.chain[this.chain.length-1].hash : null,
        latest_index: this.chain.length > 0 ? this.chain[this.chain.length-1].index : null,
        pending_tx_count: this.pendingTx.length
      }, null, 2));
      
      return true;
    } catch (e) {
      console.error(`❌ خطا در ذخیره: ${e.message}`);
      return false;
    }
  }
  
  load() {
    try {
      if (!fs.existsSync(CHAIN_FILE)) {
        this.chain = [createGenesis()];
        this.save();
        return;
      }
      
      const data = JSON.parse(fs.readFileSync(CHAIN_FILE, 'utf8'));
      this.difficulty = data.difficulty || 3;
      
      if (!data.chain || data.chain.length === 0) {
        this.chain = [createGenesis()];
        this.save();
        return;
      }
      
      this.chain = data.chain.map(b => Block.fromJSON(b));
      
      if (fs.existsSync(TX_FILE)) {
        this.pendingTx = JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
      }
      
      if (!this.isValid()) {
        console.error('❌ زنجیره نامعتبره!');
        this.chain = [createGenesis()];
        this.save();
      }
    } catch (e) {
      console.error(`❌ خطا: ${e.message}`);
      this.chain = [createGenesis()];
      this.save();
    }
  }
  
  getLatest() {
    return this.chain[this.chain.length - 1];
  }
  
  addBlock(block) {
    block.prevHash = this.getLatest().hash;
    block.mine(this.difficulty);
    this.chain.push(block);
    this.save();
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
}

// ═══════════════════════════════════════════════════════
// 📤 Exports
// ═══════════════════════════════════════════════════════

module.exports = {
  Block,
  PersistentBlockchain,
  createGenesis
};
