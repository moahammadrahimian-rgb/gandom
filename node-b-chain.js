// ═══════════════════════════════════════════════════════
// 🦶 NODE B با بلاک‌چین اختصاصی
// ═══════════════════════════════════════════════════════

// هر نود B پوشه داده خودش رو داره
process.env.GANDOM_DATA_DIR = require('path').join(__dirname, 'blockchain-data-b');

const WebSocket = require('ws');
const { GandomBlockchain, Block } = require('./blockchain-100.js');
const { handleBlockchainMessage } = require('./blockchain-p2p-handler.js');

const NODE_ID = 'NODE-B-' + Date.now().toString().slice(-6);
const NODE_A_URL = 'ws://127.0.0.1:8787';
const RECONNECT_DELAY = 3000;

console.log(`🦶 [${NODE_ID}] شروع نود B با بلاک‌چین`);
console.log(`📁 داده‌ها: ${process.env.GANDOM_DATA_DIR}`);

// بلاک‌چین اختصاصی نود B
const chainB = new GandomBlockchain();
console.log(`📊 بلاک‌چین B: ${chainB.chain.length} بلوک`);

let ws = null;
let stats = {
  connects: 0,
  blocksReceived: 0,
  blocksSent: 0,
  lastSync: null
};

function send(ws, type, payload) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type, payload, from: NODE_ID, ts: Date.now() }));
  }
}

function connect() {
  console.log(`🔌 اتصال به نود A...`);
  ws = new WebSocket(NODE_A_URL);

  ws.on('open', () => {
    stats.connects++;
    console.log(`✅ وصل شد (اتصال #${stats.connects})`);
    
    // HELLO
    send(ws, 'HELLO', { node_id: NODE_ID, role: 'peer', has_chain: true });
    
    // درخواست طول زنجیره نود A
    setTimeout(() => {
      send(ws, 'GET_CHAIN_LENGTH', {});
    }, 500);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      // ─── پیام‌های معمول P2P ───
      if (msg.type === 'PONG') return;
      if (msg.type === 'WELCOME') {
        console.log(`🎉 WELCOME از نود A`);
        return;
      }
      if (msg.type === 'HELLO_ACK') return;

      // ─── پیام‌های بلاک‌چین ───
      if (msg.type === 'CHAIN_LENGTH') {
        const peerLength = msg.payload.length;
        const myLength = chainB.chain.length;
        console.log(`📊 طول زنجیره: من=${myLength} | نود A=${peerLength}`);
        
        if (peerLength > myLength) {
          console.log(`🔄 نیاز به sync - درخواست کل زنجیره`);
          send(ws, 'GET_CHAIN', {});
        } else {
          console.log(`✅ زنجیره من جدیدتره`);
        }
        return;
      }

      if (msg.type === 'CHAIN_DATA') {
        console.log(`📥 دریافت ${msg.payload.blocks.length} بلوک از نود A`);
        let added = 0;
        for (const blockData of msg.payload.blocks) {
          const block = Block.fromJSON(blockData);
          const latest = chainB.getLatest();
          
          if (block.index <= latest.index) continue;
          if (block.index !== latest.index + 1) break;
          
          const valid = chainB.isValidBlock ? chainB.isValidBlock(block, latest) : true;
          if (!valid) {
            console.log(`   ❌ بلوک ${block.index} نامعتبر`);
            break;
          }
          
          chainB.chain.push(block);
          added++;
        }
        
        if (added > 0) {
          chainB.save();
          stats.blocksReceived += added;
          stats.lastSync = new Date().toISOString();
          console.log(`   ✅ ${added} بلوک اضافه شد (ارتفاع B: ${chainB.chain.length})`);
        }
        return;
      }

      if (msg.type === 'NEW_BLOCK_FROM_PEER') {
        console.log(`📥 بلوک جدید از نود A`);
        try {
          const block = Block.fromJSON(msg.block);
          const latest = chainB.getLatest();
          
          if (block.index <= latest.index) return;
          if (block.index !== latest.index + 1) {
            // gap - نیاز به sync
            send(ws, 'GET_CHAIN', {});
            return;
          }
          
          chainB.chain.push(block);
          chainB.save();
          stats.blocksReceived++;
          console.log(`   ✅ بلوک ${block.index} (ارتفاع B: ${chainB.chain.length})`);
        } catch(e) {
          console.log(`   ❌ خطا: ${e.message}`);
        }
        return;
      }

      // ─── پردازشگر عمومی ───
      if (handleBlockchainMessage(msg, ws, NODE_ID, chainB, new Map(), send)) {
        return;
      }

    } catch(e) {
      console.error('Msg error:', e.message);
    }
  });

  ws.on('error', (err) => {
    console.log(`❌ خطا: ${err.message}`);
  });

  ws.on('close', () => {
    console.log(`🔌 قطع شد، اتصال مجدد در ۳ ثانیه...`);
    ws = null;
    setTimeout(connect, RECONNECT_DELAY);
  });
}

// گزارش هر ۳۰ ثانیه
setInterval(() => {
  console.log(`📊 B: بلوک‌ها=${chainB.chain.length} | دریافتی=${stats.blocksReceived} | اتصال=${stats.connects}`);
}, 30000);

connect();

process.on('SIGINT', () => {
  if (ws) ws.close();
  process.exit(0);
});
