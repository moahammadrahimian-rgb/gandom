// ═══════════════════════════════════════════════════════
// 🌾 GANDOM BLOCKCHAIN - بلاک‌چین گندم ۲۵۵۸
// ═══════════════════════════════════════════════════════

const crypto = require('crypto');

// ─────────── ۱. Block (بلوک) ───────────
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
    console.log(`⛏️  استخراج بلوک #${this.index}...`);
    const target = '0'.repeat(difficulty);
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`✅ بلوک #${this.index} استخراج شد (nonce: ${this.nonce})`);
  }
}

// ─────────── ۲. Blockchain (زنجیره) ───────────
class Blockchain {
  constructor() {
    this.chain = [this.createGenesis()];
    this.difficulty = 3;
    this.pendingTx = [];
  }
  
  createGenesis() {
    return new Block(0, "0", Date.now(), [{type: 'GENESIS', msg: 'Gandom 2558'}]);
  }
  
  getLatest() {
    return this.chain[this.chain.length - 1];
  }
  
  addBlock(block) {
    block.prevHash = this.getLatest().hash;
    block.mine(this.difficulty);
    this.chain.push(block);
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
}

// ─────────── ۳. Transaction (تراکنش) ───────────
class Transaction {
  constructor(from, to, amount, fee) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.fee = fee || 0.001;
    this.timestamp = Date.now();
    this.txid = crypto.createHash('sha256')
      .update(from + to + amount + this.timestamp)
      .digest('hex').substring(0, 16);
  }
}

// ─────────── ۴. Wallet (کیف پول) ───────────
class Wallet {
  constructor() {
    this.publicKey = crypto.randomBytes(32).toString('hex');
    this.address = 'GDM' + crypto.createHash('sha256')
      .update(this.publicKey).digest('hex').substring(0, 32);
    this.balance = 0;
  }
  
  send(to, amount, blockchain) {
    const tx = new Transaction(this.address, to, amount, 0.001);
    blockchain.pendingTx.push(tx);
    console.log(`📤 تراکنش: ${amount} GDM از ${this.address.substring(0, 16)}... به ${to.substring(0, 16)}...`);
    return tx;
  }
}

// ─────────── ۵. Miner (استخراج‌کننده) ───────────
class Miner {
  constructor(wallet, blockchain) {
    this.wallet = wallet;
    this.blockchain = blockchain;
    this.reward = 50;
  }
  
  mine() {
    const txs = this.blockchain.pendingTx.slice(0, 100);
    
    const rewardTx = new Transaction('COINBASE', this.wallet.address, this.reward, 0);
    txs.push(rewardTx);
    
    const block = new Block(
      this.blockchain.chain.length,
      this.blockchain.getLatest().hash,
      Date.now(),
      txs
    );
    
    this.blockchain.addBlock(block);
    this.blockchain.pendingTx = [];
    
    console.log(`🎉 پاداش: ${this.reward} GDM به ${this.wallet.address.substring(0, 16)}...`);
    return block;
  }
}

// ═══════════════════════════════════════════════════════
// 🚀 اجرای تست
// ═══════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════');
console.log('🌾 GANDOM BLOCKCHAIN 2558');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// ساخت بلاک‌چین
const gandomChain = new Blockchain();
console.log(`✅ بلاک Genesis ساخته شد: ${gandomChain.chain[0].hash.substring(0, 32)}...`);
console.log('');

// ساخت کیف پول‌ها
const alice = new Wallet();
const bob = new Wallet();
const miner = new Wallet();

console.log(`👤 آلیس: ${alice.address}`);
console.log(`👤 باب: ${bob.address}`);
console.log(`⛏️  ماینر: ${miner.address}`);
console.log('');

// تراکنش‌ها
alice.send(bob.address, 100, gandomChain);
bob.send(alice.address, 25, gandomChain);
console.log('');

// استخراج
const minerTool = new Miner(miner, gandomChain);
minerTool.mine();
console.log('');

// تراکنش جدید
alice.send(bob.address, 10, gandomChain);
minerTool.mine();
console.log('');

// بررسی اعتبار
console.log('═══════════════════════════════════════════════════════');
console.log('📊 خلاصه بلاک‌چین');
console.log('═══════════════════════════════════════════════════════');
console.log(`📦 تعداد بلوک‌ها: ${gandomChain.chain.length}`);
console.log(`✅ اعتبار زنجیره: ${gandomChain.isValid() ? 'معتبر' : 'نامعتبر'}`);
console.log('');

// نمایش بلوک‌ها
for (const block of gandomChain.chain) {
  console.log(`━━━ بلوک #${block.index} ━━━`);
  console.log(`   Hash: ${block.hash.substring(0, 32)}...`);
  console.log(`   Prev: ${block.prevHash.substring(0, 32)}...`);
  console.log(`   Nonce: ${block.nonce}`);
  console.log(`   Tx: ${block.transactions.length} تراکنش`);
  console.log('');
}

console.log('═══════════════════════════════════════════════════════');
console.log('✅ بلاک‌چین گندم ۲۵۵۸ کار می‌کنه!');
console.log('═══════════════════════════════════════════════════════');
