// ═══════════════════════════════════════════════════════
// 🦶 NODE B PERSISTENT - نود B دائمی
// ═══════════════════════════════════════════════════════
const WebSocket = require('ws');

const NODE_ID = 'NODE-B-' + Date.now().toString().slice(-6);
const NODE_A_URL = 'ws://127.0.0.1:8787';
const RECONNECT_DELAY = 3000;

let ws = null;
let reconnectTimer = null;
let stats = {
  connects: 0,
  messagesReceived: 0,
  pongsReceived: 0,
  lastConnect: null,
  startTime: Date.now()
};

console.log(`🦶 [${NODE_ID}] شروع نود B دائمی`);
console.log(`🔗 سرور هدف: ${NODE_A_URL}`);

function connect() {
  console.log(`[${NODE_ID}] 🔌 تلاش اتصال...`);
  ws = new WebSocket(NODE_A_URL);

  ws.on('open', () => {
    stats.connects++;
    stats.lastConnect = new Date().toISOString();
    console.log(`[${NODE_ID}] ✅ وصل شد به نود A (اتصال #${stats.connects})`);
    
    // ارسال HELLO
    ws.send(JSON.stringify({
      type: 'HELLO',
      payload: {
        node_id: NODE_ID,
        role: 'peer',
        timestamp: Date.now()
      }
    }));
    console.log(`[${NODE_ID}] 📤 HELLO فرستاده شد`);

    // Heartbeat هر ۵ ثانیه
    const heartbeat = setInterval(() => {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'PING',
          payload: { node_id: NODE_ID, ts: Date.now() }
        }));
      }
    }, 5000);

    ws.on('close', () => clearInterval(heartbeat));
  });

  ws.on('message', (data) => {
    stats.messagesReceived++;
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'PONG') {
        stats.pongsReceived++;
        if (stats.pongsReceived % 10 === 0) {
          console.log(`[${NODE_ID}] 💓 ${stats.pongsReceived} PONG دریافت شد`);
        }
      } else if (msg.type === 'WELCOME') {
        console.log(`[${NODE_ID}] 🎉 WELCOME از نود A`);
      } else if (msg.type === 'HELLO_ACK') {
        console.log(`[${NODE_ID}] ✅ HELLO_ACK دریافت شد`);
      }
    } catch(e) {}
  });

  ws.on('error', (err) => {
    console.log(`[${NODE_ID}] ❌ خطا: ${err.message}`);
  });

  ws.on('close', () => {
    console.log(`[${NODE_ID}] 🔌 قطع شد، اتصال مجدد در ${RECONNECT_DELAY/1000}s...`);
    ws = null;
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
  });
}

// گزارش دوره‌ای هر ۳۰ ثانیه
setInterval(() => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  console.log(`[${NODE_ID}] 📊 آمار: اتصال‌ها=${stats.connects} | پیام‌ها=${stats.messagesReceived} | PONG=${stats.pongsReceived} | زمان=${uptime}s`);
}, 30000);

// شروع
connect();

// خروج امن
process.on('SIGINT', () => {
  console.log(`\n[${NODE_ID}] 🛑 خروج...`);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) ws.close();
  process.exit(0);
});
