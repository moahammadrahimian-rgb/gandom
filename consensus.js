// ═══════════════════════════════════════════════════════
// 🗳️  GANDOM CONSENSUS - اجماع گندم ۲۵۵۸
// ═══════════════════════════════════════════════════════

const crypto = require('crypto');
const EventEmitter = require('events');

// ─────────── ۱. Block ───────────
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
}

// ─────────── ۲. Node (نود رأی‌دهنده) ───────────
class Node extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.chainLength = 0;
    this.isOnline = true;
    this.voteBehavior = 'honest'; // honest | malicious | offline
  }
  
  // دریافت درخواست رأی
  async onVoteRequest(block, prevChainLength) {
    // شبیه‌سازی تأخیر شبکه
    await new Promise(r => setTimeout(r, Math.random() * 500));
    
    if (!this.isOnline) {
      return { vote: 'TIMEOUT', node: this.id };
    }
    
    if (this.voteBehavior === 'malicious') {
      return { vote: 'NO', node: this.id, reason: 'malicious' };
    }
    
    // بررسی اعتبار بلوک
    const isValid = 
      block.prevHash !== '0'.repeat(64) &&
      block.hash.substring(0, 3) === '000' &&
      block.hash === block.calculateHash();
    
    return { 
      vote: isValid ? 'YES' : 'NO', 
      node: this.id,
      reason: isValid ? 'valid' : 'invalid_block'
    };
  }
  
  // دریافت بلوک تأییدشده
  onBlockAccepted(block) {
    this.chainLength = block.index + 1;
    console.log(`   📥 نود ${this.id}: بلوک #${block.index} رو پذیرفت (زنجیره: ${this.chainLength})`);
  }
}

// ─────────── ۳. Consensus (اجماع) ───────────
class Consensus extends EventEmitter {
  constructor(nodes, threshold = 0.51) {
    super();
    this.nodes = nodes;
    this.threshold = threshold;
    this.voteHistory = [];
  }
  
  async requestVotes(block) {
    console.log(`\n🗳️  درخواست رأی برای بلوک #${block.index}...`);
    console.log(`   ─────────────────────────────────────`);
    
    const startTime = Date.now();
    const votes = [];
    
    // ارسال درخواست به همه نودها
    const promises = this.nodes.map(node => 
      node.onVoteRequest(block, this.chainLength || 0)
    );
    
    const results = await Promise.all(promises);
    const elapsed = Date.now() - startTime;
    
    // شمارش رأی‌ها
    let yes = 0, no = 0, timeout = 0;
    for (const r of results) {
      if (r.vote === 'YES') yes++;
      else if (r.vote === 'NO') no++;
      else timeout++;
      
      const emoji = r.vote === 'YES' ? '✅' : r.vote === 'NO' ? '❌' : '⏱️';
      console.log(`   ${emoji} نود ${r.node}: ${r.vote} (${r.reason})`);
    }
    
    const total = results.length;
    const yesPercent = (yes / total * 100).toFixed(1);
    const needed = Math.ceil(total * this.threshold);
    
    console.log(`   ─────────────────────────────────────`);
    console.log(`   📊 نتیجه: ${yes} موافق، ${no} مخالف، ${timeout} timeout`);
    console.log(`   📊 درصد موافقت: ${yesPercent}% (نیاز: ${(this.threshold*100)}%)`);
    console.log(`   ⏱️  زمان رأی‌گیری: ${elapsed}ms`);
    
    const accepted = yes >= needed;
    
    this.voteHistory.push({
      block: block.index,
      yes, no, timeout,
      percent: yesPercent,
      accepted,
      timestamp: Date.now()
    });
    
    return {
      accepted,
      yes, no, timeout,
      total,
      needed,
      percent: yesPercent
    };
  }
  
  async addBlockWithConsensus(block) {
    const result = await this.requestVotes(block);
    
    if (result.accepted) {
      console.log(`   🎉 بلوک #${block.index} با اجماع پذیرفته شد!\n`);
      
      // اطلاع به همه نودها
      for (const node of this.nodes) {
        if (node.isOnline) {
          node.onBlockAccepted(block);
        }
      }
      
      this.chainLength = block.index + 1;
      this.emit('blockAccepted', block);
      return { accepted: true, votes: result };
    } else {
      console.log(`   ⛔ بلوک #${block.index} رد شد (اجماع کافی نبود)\n`);
      this.emit('blockRejected', block);
      return { accepted: false, votes: result };
    }
  }
  
  getStats() {
    const total = this.voteHistory.length;
    const accepted = this.voteHistory.filter(v => v.accepted).length;
    const rejected = total - accepted;
    return {
      total_votes: total,
      accepted,
      rejected,
      acceptance_rate: total > 0 ? (accepted / total * 100).toFixed(1) + '%' : '0%'
    };
  }
}

// ═══════════════════════════════════════════════════════
// 🚀 تست اجماع
// ═══════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🗳️  GANDOM CONSENSUS TEST - اجماع گندم ۲۵۵۸');
  console.log('═══════════════════════════════════════════════════════');
  
  // ─────────── سناریو ۱: ۵ نود سالم ───────────
  console.log('\n📌 سناریو ۱: ۵ نود سالم (همه صادق)');
  console.log('─────────────────────────────────────');
  
  const nodes1 = [
    new Node('NODE-A'),
    new Node('NODE-B'),
    new Node('NODE-C'),
    new Node('NODE-D'),
    new Node('NODE-E')
  ];
  
  const consensus1 = new Consensus(nodes1, 0.51);
  
  const block1 = new Block(1, '0'.repeat(64), Date.now(), [
    { from: 'GDMxxx', to: 'GDMyyy', amount: 100 }
  ]);
  block1.mine(3);
  
  const result1 = await consensus1.addBlockWithConsensus(block1);
  console.log(`   نتیجه نهایی: ${result1.accepted ? '✅ پذیرفته' : '❌ رد'}`);
  
  // ─────────── سناریو ۲: ۲ نود خرابکار ───────────
  console.log('\n📌 سناریو ۲: ۵ نود (۲ خرابکار)');
  console.log('─────────────────────────────────────');
  
  const nodes2 = [
    new Node('NODE-A'),
    new Node('NODE-B'),
    new Node('NODE-C'),
    new Node('NODE-D'),
    new Node('NODE-E')
  ];
  nodes2[3].voteBehavior = 'malicious';
  nodes2[4].voteBehavior = 'malicious';
  
  const consensus2 = new Consensus(nodes2, 0.51);
  
  const block2 = new Block(2, block1.hash, Date.now(), [
    { from: 'GDMaaa', to: 'GDMbbb', amount: 50 }
  ]);
  block2.mine(3);
  
  const result2 = await consensus2.addBlockWithConsensus(block2);
  console.log(`   نتیجه نهایی: ${result2.accepted ? '✅ پذیرفته' : '❌ رد'}`);
  
  // ─────────── سناریو ۳: ۳ نود خرابکار (حمله) ───────────
  console.log('\n📌 سناریو ۳: ۵ نود (۳ خرابکار - حمله ۵۱٪)');
  console.log('─────────────────────────────────────');
  
  const nodes3 = [
    new Node('NODE-A'),
    new Node('NODE-B'),
    new Node('NODE-C'),
    new Node('NODE-D'),
    new Node('NODE-E')
  ];
  nodes3[2].voteBehavior = 'malicious';
  nodes3[3].voteBehavior = 'malicious';
  nodes3[4].voteBehavior = 'malicious';
  
  const consensus3 = new Consensus(nodes3, 0.51);
  
  const block3 = new Block(3, block2.hash, Date.now(), [
    { from: 'HACKER', to: 'HACKER', amount: 999999 }
  ]);
  block3.mine(3);
  
  const result3 = await consensus3.addBlockWithConsensus(block3);
  console.log(`   نتیجه نهایی: ${result3.accepted ? '✅ پذیرفته' : '❌ رد'}`);
  
  // ─────────── سناریو ۴: ۲ نود آفلاین ───────────
  console.log('\n📌 سناریو ۴: ۵ نود (۲ آفلاین)');
  console.log('─────────────────────────────────────');
  
  const nodes4 = [
    new Node('NODE-A'),
    new Node('NODE-B'),
    new Node('NODE-C'),
    new Node('NODE-D'),
    new Node('NODE-E')
  ];
  nodes4[3].isOnline = false;
  nodes4[4].isOnline = false;
  
  const consensus4 = new Consensus(nodes4, 0.51);
  
  const block4 = new Block(4, block3.hash, Date.now(), [
    { from: 'GDMppp', to: 'GDMqqq', amount: 200 }
  ]);
  block4.mine(3);
  
  const result4 = await consensus4.addBlockWithConsensus(block4);
  console.log(`   نتیجه نهایی: ${result4.accepted ? '✅ پذیرفته' : '❌ رد'}`);
  
  // ─────────── گزارش نهایی ───────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 گزارش نهایی اجماع');
  console.log('═══════════════════════════════════════════════════════');
  
  const stats1 = consensus1.getStats();
  const stats2 = consensus2.getStats();
  const stats3 = consensus3.getStats();
  const stats4 = consensus4.getStats();
  
  console.log(`\n🗳️  سناریو ۱ (سالم):    ${stats1.accepted}/${stats1.total_votes} پذیرفته (${stats1.acceptance_rate})`);
  console.log(`🗳️  سناریو ۲ (۲ خرابکار): ${stats2.accepted}/${stats2.total_votes} پذیرفته (${stats2.acceptance_rate})`);
  console.log(`🗳️  سناریو ۳ (۳ خرابکار): ${stats3.accepted}/${stats3.total_votes} پذیرفته (${stats3.acceptance_rate})`);
  console.log(`🗳️  سناریو ۴ (۲ آفلاین):  ${stats4.accepted}/${stats4.total_votes} پذیرفته (${stats4.acceptance_rate})`);
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ تست اجماع گندم کامل شد!');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error);
