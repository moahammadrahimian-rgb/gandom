// ═══════════════════════════════════════════════════════
// 🔄 GANDOM P2P SYNC v2 - با Genesis ثابت
// ═══════════════════════════════════════════════════════

const crypto = require('crypto');

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

// ─────────── Genesis ثابت (Timestamp = 0) ───────────
const GENESIS_DATA = {
  index: 0,
  prevHash: '0'.repeat(64),
  timestamp: 0,  // ← ثابت!
  transactions: [{ type: 'GENESIS', msg: 'Gandom 2558' }]
};

function createGenesis() {
  const b = new Block(
    GENESIS_DATA.index,
    GENESIS_DATA.prevHash,
    GENESIS_DATA.timestamp,
    GENESIS_DATA.transactions
  );
  return b;
}

// ─────────── Blockchain ───────────
class Blockchain {
  constructor() {
    this.chain = [createGenesis()];
    this.difficulty = 3;
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
  
  isValidBlock(block, prevBlock) {
    if (block.prevHash !== prevBlock.hash) return false;
    if (block.hash !== block.calculateHash()) return false;
    if (block.hash.substring(0, this.difficulty) !== '0'.repeat(this.difficulty)) return false;
    return true;
  }
}

// ─────────── P2P Node ───────────
class P2PNode {
  constructor(id, isOnline = true) {
    this.id = id;
    this.isOnline = isOnline;
    this.blockchain = new Blockchain();
    this.peers = new Map();
    this.stats = { received: 0, sent: 0, syncs: 0 };
  }
  
  connect(peer) {
    this.peers.set(peer.id, peer);
    peer.peers.set(this.id, this);
  }
  
  async onGetChainLength() {
    await new Promise(r => setTimeout(r, 50));
    if (!this.isOnline) return { error: 'offline' };
    return {
      node_id: this.id,
      length: this.blockchain.chain.length,
      latestHash: this.blockchain.getLatest().hash
    };
  }
  
  async onGetBlocks(fromIndex) {
    await new Promise(r => setTimeout(r, 50));
    if (!this.isOnline) return { error: 'offline', blocks: [] };
    
    const blocks = this.blockchain.chain
      .filter(b => b.index >= fromIndex)
      .map(b => b.toJSON());
    
    this.stats.sent += blocks.length;
    console.log(`   📤 ${this.id}: ${blocks.length} بلوک فرستاد (از ایندکس ${fromIndex})`);
    return { node_id: this.id, blocks };
  }
  
  onNewBlock(blockData, fromPeer) {
    if (!this.isOnline) return { accepted: false, reason: 'offline' };
    
    const block = Block.fromJSON(blockData);
    const latest = this.blockchain.getLatest();
    
    if (block.index <= latest.index) {
      return { accepted: false, reason: 'already_have' };
    }
    
    if (block.index !== latest.index + 1) {
      return { accepted: false, reason: 'gap_detected' };
    }
    
    if (!this.blockchain.isValidBlock(block, latest)) {
      return { accepted: false, reason: 'invalid_block' };
    }
    
    this.blockchain.chain.push(block);
    this.stats.received++;
    return { accepted: true, newHeight: this.blockchain.chain.length };
  }
  
  async syncWith(peer) {
    if (!peer.isOnline) {
      console.log(`   ⏸️  ${peer.id} آفلاینه`);
      return { synced: false, reason: 'peer_offline' };
    }
    
    console.log(`\n🔄 همگام‌سازی ${this.id} ← ${peer.id}`);
    
    const peerInfo = await peer.onGetChainLength();
    if (peerInfo.error) return { synced: false, reason: peerInfo.error };
    
    const myLen = this.blockchain.chain.length;
    const peerLen = peerInfo.length;
    
    console.log(`   📊 من: ${myLen} بلوک | ${peer.id}: ${peerLen} بلوک`);
    
    if (peerLen <= myLen) {
      console.log(`   ✅ زنجیره من جدیدتر یا مساویه`);
      return { synced: false, reason: 'already_latest' };
    }
    
    // دریافت بلوک‌های جدید
    console.log(`   📥 درخواست بلوک‌ها از ایندکس ${myLen}`);
    const result = await peer.onGetBlocks(myLen);
    
    if (!result.blocks || result.blocks.length === 0) {
      return { synced: false, reason: 'no_blocks' };
    }
    
    let added = 0;
    for (const blockData of result.blocks) {
      const block = Block.fromJSON(blockData);
      const latest = this.blockchain.getLatest();
      
      // بررسی اعتبار
      const valid = this.blockchain.isValidBlock(block, latest);
      
      if (valid) {
        this.blockchain.chain.push(block);
        added++;
        console.log(`   ✅ بلوک #${block.index} پذیرفته شد`);
      } else {
        console.log(`   ❌ بلوک #${block.index} نامعتبر`);
        console.log(`      - prevHash match: ${block.prevHash === latest.hash}`);
        console.log(`      - hash match: ${block.hash === block.calculateHash()}`);
        console.log(`      - difficulty: ${block.hash.substring(0, 3)}`);
        break;
      }
    }
    
    this.stats.received += added;
    this.stats.syncs++;
    
    console.log(`   ✅ ${added} بلوک اضافه شد (ارتفاع: ${this.blockchain.chain.length})`);
    return { synced: true, added, newHeight: this.blockchain.chain.length };
  }
  
  broadcastBlock(block) {
    console.log(`\n📡 پخش بلوک #${block.index} به ${this.peers.size} نود...`);
    for (const [id, peer] of this.peers) {
      const r = peer.onNewBlock(block.toJSON(), this);
      console.log(`   ${r.accepted ? '✅' : '❌'} ${id}: ${r.accepted ? 'پذیرفت' : r.reason}`);
    }
  }
}

// ═══════════════════════════════════════════════════════
// 🚀 تست
// ═══════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 GANDOM P2P SYNC v2 - با Genesis ثابت');
  console.log('═══════════════════════════════════════════════════════');
  
  // بررسی Genesis
  const g1 = createGenesis();
  const g2 = createGenesis();
  console.log(`\n🔍 بررسی Genesis ثابت:`);
  console.log(`   Genesis 1: ${g1.hash.substring(0, 32)}...`);
  console.log(`   Genesis 2: ${g2.hash.substring(0, 32)}...`);
  console.log(`   یکسان؟ ${g1.hash === g2.hash ? '✅ بله' : '❌ خیر'}`);
  
  // ─────────── سناریو ۱ ───────────
  console.log('\n📌 سناریو ۱: ۳ نود سالم');
  console.log('─────────────────────────────────────');
  
  const A = new P2PNode('NODE-A');
  const B = new P2PNode('NODE-B');
  const C = new P2PNode('NODE-C');
  
  A.connect(B);
  A.connect(C);
  B.connect(C);
  
  // A بلوک می‌سازه
  console.log('\n⛏️  NODE-A استخراج...');
  for (let i = 0; i < 3; i++) {
    const b = new Block(
      A.blockchain.chain.length,
      A.blockchain.getLatest().hash,
      Date.now(),
      [{ tx: `A-tx-${i}` }]
    );
    A.blockchain.addBlock(b);
  }
  console.log(`✅ NODE-A: ${A.blockchain.chain.length} بلوک`);
  
  // B و C همگام می‌شن
  await B.syncWith(A);
  await C.syncWith(A);
  
  console.log('\n📊 وضعیت نهایی:');
  console.log(`   NODE-A: ${A.blockchain.chain.length} بلوک`);
  console.log(`   NODE-B: ${B.blockchain.chain.length} بلوک`);
  console.log(`   NODE-C: ${C.blockchain.chain.length} بلوک`);
  
  // ─────────── سناریو ۲: پخش ───────────
  console.log('\n📌 سناریو ۲: پخش بلوک جدید از A');
  console.log('─────────────────────────────────────');
  
  const newBlock = new Block(
    A.blockchain.chain.length,
    A.blockchain.getLatest().hash,
    Date.now(),
    [{ tx: 'broadcast-test' }]
  );
  A.blockchain.addBlock(newBlock);
  A.broadcastBlock(newBlock);
  
  console.log('\n📊 وضعیت نهایی:');
  console.log(`   NODE-A: ${A.blockchain.chain.length} بلوک`);
  console.log(`   NODE-B: ${B.blockchain.chain.length} بلوک`);
  console.log(`   NODE-C: ${C.blockchain.chain.length} بلوک`);
  
  // ─────────── سناریو ۳: نود جدید ───────────
  console.log('\n📌 سناریو ۳: نود جدید D');
  console.log('─────────────────────────────────────');
  
  const D = new P2PNode('NODE-D');
  D.connect(A);
  await D.syncWith(A);
  
  console.log(`   NODE-D: ${D.blockchain.chain.length} بلوک`);
  
  // ─────────── گزارش ───────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 گزارش نهایی');
  console.log('═══════════════════════════════════════════════════════');
  
  for (const n of [A, B, C, D]) {
    console.log(`   ${n.id}: ${n.blockchain.chain.length} بلوک | ` +
      `دریافتی: ${n.stats.received} | ارسالی: ${n.stats.sent}`);
  }
  
  console.log('\n🔍 بررسی یکپارچگی:');
  for (const n of [A, B, C, D]) {
    console.log(`   ${n.id}: ${n.blockchain.isValid() ? '✅ معتبر' : '❌ نامعتبر'}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ تست کامل شد!');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error);
