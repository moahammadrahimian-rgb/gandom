// ═══════════════════════════════════════════════════════
// 🔄 GANDOM P2P SYNC - همگام‌سازی زنجیره بین نودها
// ═══════════════════════════════════════════════════════

const crypto = require('crypto');
const EventEmitter = require('events');

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

// ─────────── Blockchain ───────────
class Blockchain {
  constructor() {
    this.chain = [this.createGenesis()];
    this.difficulty = 3;
    this.pendingTx = [];
  }
  
  createGenesis() {
    return new Block(0, '0'.repeat(64), Date.now(), [{ type: 'GENESIS' }]);
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
class P2PNode extends EventEmitter {
  constructor(id, isOnline = true) {
    super();
    this.id = id;
    this.isOnline = isOnline;
    this.blockchain = new Blockchain();
    this.peers = new Map();
    this.syncStats = {
      blocksReceived: 0,
      blocksSent: 0,
      syncCount: 0,
      lastSync: null
    };
  }
  
  // اتصال به نود دیگر
  connect(peer) {
    this.peers.set(peer.id, peer);
    peer.peers.set(this.id, this);
    console.log(`🔗 نود ${this.id} به ${peer.id} وصل شد`);
  }
  
  // دریافت طول زنجیره
  async onGetChainLength(fromPeer) {
    await new Promise(r => setTimeout(r, 100));
    if (!this.isOnline) return { error: 'offline' };
    return {
      node_id: this.id,
      length: this.blockchain.chain.length,
      latestHash: this.blockchain.getLatest().hash
    };
  }
  
  // دریافت بلوک‌های جدید
  async onGetBlocks(fromIndex, toPeer) {
    await new Promise(r => setTimeout(r, 100));
    if (!this.isOnline) return { error: 'offline', blocks: [] };
    
    const blocks = this.blockchain.chain
      .filter(b => b.index >= fromIndex)
      .map(b => b.toJSON());
    
    console.log(`   📤 نود ${this.id}: ${blocks.length} بلوک به ${toPeer.id} فرستاد`);
    this.syncStats.blocksSent += blocks.length;
    
    return { node_id: this.id, blocks };
  }
  
  // دریافت بلوک جدید (push)
  onNewBlock(blockData, fromPeer) {
    if (!this.isOnline) return { accepted: false, reason: 'offline' };
    
    const block = Block.fromJSON(blockData);
    const latest = this.blockchain.getLatest();
    
    // اگه قبلاً داریم
    if (block.index <= latest.index) {
      return { accepted: false, reason: 'already_have' };
    }
    
    // اگه بلوک بعدی نیست
    if (block.index !== latest.index + 1) {
      return { accepted: false, reason: 'gap_detected', needSync: true };
    }
    
    // بررسی اعتبار
    if (!this.blockchain.isValidBlock(block, latest)) {
      return { accepted: false, reason: 'invalid_block' };
    }
    
    this.blockchain.chain.push(block);
    this.syncStats.blocksReceived++;
    
    console.log(`   📥 نود ${this.id}: بلوک #${block.index} از ${fromPeer.id} پذیرفت`);
    return { accepted: true, newHeight: this.blockchain.chain.length };
  }
  
  // همگام‌سازی با یک نود
  async syncWith(peer) {
    if (!peer.isOnline) {
      console.log(`   ⏸️  ${peer.id} آفلاینه، رد می‌شه`);
      return { synced: false, reason: 'peer_offline' };
    }
    
    console.log(`\n🔄 همگام‌سازی ${this.id} با ${peer.id}...`);
    
    // ۱. دریافت طول زنجیره
    const peerInfo = await peer.onGetChainLength(this);
    if (peerInfo.error) {
      return { synced: false, reason: peerInfo.error };
    }
    
    const myLength = this.blockchain.chain.length;
    const peerLength = peerInfo.length;
    
    console.log(`   📊 زنجیره من: ${myLength} بلوک | زنجیره ${peer.id}: ${peerLength} بلوک`);
    
    // ۲. تصمیم‌گیری
    if (peerLength <= myLength) {
      console.log(`   ✅ زنجیره من جدیدتره، نیازی به همگام‌سازی نیست`);
      return { synced: false, reason: 'already_latest' };
    }
    
    // ۳. دریافت بلوک‌های جدید
    console.log(`   📥 درخواست بلوک‌های جدید از ${peer.id}...`);
    const result = await peer.onGetBlocks(myLength, this);
    
    if (!result.blocks || result.blocks.length === 0) {
      return { synced: false, reason: 'no_blocks' };
    }
    
    // ۴. اضافه کردن بلوک‌ها
    let added = 0;
    for (const blockData of result.blocks) {
      const block = Block.fromJSON(blockData);
      const latest = this.blockchain.getLatest();
      
      if (this.blockchain.isValidBlock(block, latest)) {
        this.blockchain.chain.push(block);
        added++;
      } else {
        console.log(`   ❌ بلوک #${block.index} نامعتبر - همگام‌سازی متوقف شد`);
        break;
      }
    }
    
    this.syncStats.blocksReceived += added;
    this.syncStats.syncCount++;
    this.syncStats.lastSync = new Date().toISOString();
    
    console.log(`   ✅ ${added} بلوک اضافه شد (ارتفاع جدید: ${this.blockchain.chain.length})`);
    
    return {
      synced: true,
      added,
      newHeight: this.blockchain.chain.length,
      from: peer.id
    };
  }
  
  // همگام‌سازی با همه نودها
  async syncWithAll() {
    console.log(`\n🌐 همگام‌سازی ${this.id} با همه نودها...`);
    const results = [];
    
    for (const [id, peer] of this.peers) {
      const r = await this.syncWith(peer);
      results.push({ peer: id, ...r });
    }
    
    return results;
  }
  
  // پخش بلوک جدید به همه نودها
  broadcastBlock(block) {
    console.log(`\n📡 پخش بلوک #${block.index} به ${this.peers.size} نود...`);
    const results = [];
    
    for (const [id, peer] of this.peers) {
      const r = peer.onNewBlock(block.toJSON(), this);
      results.push({ peer: id, ...r });
      console.log(`   ${r.accepted ? '✅' : '❌'} ${id}: ${r.accepted ? 'پذیرفت' : r.reason}`);
    }
    
    return results;
  }
}

// ═══════════════════════════════════════════════════════
// 🚀 تست P2P Sync
// ═══════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 GANDOM P2P SYNC TEST - همگام‌سازی گندم ۲۵۵۸');
  console.log('═══════════════════════════════════════════════════════');
  
  // ─────────── سناریو ۱: ۳ نود، همه سالم ───────────
  console.log('\n📌 سناریو ۱: ۳ نود سالم');
  console.log('─────────────────────────────────────');
  
  const A = new P2PNode('NODE-A');
  const B = new P2PNode('NODE-B');
  const C = new P2PNode('NODE-C');
  
  A.connect(B);
  A.connect(C);
  B.connect(C);
  
  // نود A چند بلوک می‌سازه
  console.log('\n⛏️  نود A در حال استخراج...');
  for (let i = 0; i < 3; i++) {
    const block = new Block(A.blockchain.chain.length, A.blockchain.getLatest().hash, 
      Date.now(), [{ tx: `A-tx-${i}` }]);
    A.blockchain.addBlock(block);
  }
  console.log(`✅ نود A حالا ${A.blockchain.chain.length} بلوک داره`);
  
  // B و C همگام می‌شن
  await B.syncWith(A);
  await C.syncWith(A);
  
  console.log('\n📊 وضعیت نهایی:');
  console.log(`   NODE-A: ${A.blockchain.chain.length} بلوک`);
  console.log(`   NODE-B: ${B.blockchain.chain.length} بلوک`);
  console.log(`   NODE-C: ${C.blockchain.chain.length} بلوک`);
  
  // ─────────── سناریو ۲: نود جدید وصل می‌شه ───────────
  console.log('\n📌 سناریو ۲: نود جدید (D) وصل می‌شه');
  console.log('─────────────────────────────────────');
  
  const D = new P2PNode('NODE-D');
  D.connect(A);
  
  await D.syncWith(A);
  
  console.log(`   NODE-D حالا: ${D.blockchain.chain.length} بلوک`);
  
  // ─────────── سناریو ۳: پخش بلوک جدید ───────────
  console.log('\n📌 سناریو ۳: پخش بلوک جدید از A');
  console.log('─────────────────────────────────────');
  
  const newBlock = new Block(A.blockchain.chain.length, A.blockchain.getLatest().hash,
    Date.now(), [{ tx: 'broadcast-test' }]);
  A.blockchain.addBlock(newBlock);
  
  console.log(`\n⛏️  A بلوک #${newBlock.index} رو استخراج کرد`);
  A.broadcastBlock(newBlock);
  
  console.log('\n📊 وضعیت نهایی همه نودها:');
  console.log(`   NODE-A: ${A.blockchain.chain.length} بلوک`);
  console.log(`   NODE-B: ${B.blockchain.chain.length} بلوک`);
  console.log(`   NODE-C: ${C.blockchain.chain.length} بلوک`);
  console.log(`   NODE-D: ${D.blockchain.chain.length} بلوک`);
  
  // ─────────── سناریو ۴: نود آفلاین ───────────
  console.log('\n📌 سناریو ۴: نود آفلاین');
  console.log('─────────────────────────────────────');
  
  const E = new P2PNode('NODE-E', false); // آفلاین
  E.connect(A);
  
  const syncResult = await E.syncWith(A);
  console.log(`   نتیجه: ${JSON.stringify(syncResult)}`);
  
  // ─────────── گزارش نهایی ───────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 گزارش نهایی P2P Sync');
  console.log('═══════════════════════════════════════════════════════');
  
  const nodes = [A, B, C, D, E];
  console.log('\n🖥️  وضعیت نودها:');
  for (const node of nodes) {
    console.log(`   ${node.id}: ${node.blockchain.chain.length} بلوک | ` +
      `دریافتی: ${node.syncStats.blocksReceived} | ` +
      `ارسالی: ${node.syncStats.blocksSent} | ` +
      `همگام‌سازی: ${node.syncStats.syncCount}`);
  }
  
  // بررسی یکپارچگی
  console.log('\n🔍 بررسی یکپارچگی زنجیره:');
  for (const node of nodes) {
    const valid = node.isOnline ? node.blockchain.isValid() : 'آفلاین';
    console.log(`   ${node.id}: ${valid === true ? '✅ معتبر' : valid === false ? '❌ نامعتبر' : '⏸️  ' + valid}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ تست P2P Sync کامل شد!');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error);
