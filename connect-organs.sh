#!/bin/bash
clear

cd ~/gandom

echo "═══════════════════════════════════════════════════════"
echo "🧬 GANDOM ORGANISM TEST v2"
echo "📅 $(date)"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "▓▓▓ بخش ۱: سرورها ▓▓▓"
curl -s --max-time 2 http://127.0.0.1:8787/health >/dev/null 2>&1 && echo "  ✅ سرور گندم (8787)" || echo "  ❌ سرور خاموش"
echo ""

echo "▓▓▓ بخش ۲: نورون (WebSocket) ▓▓▓"
cat > ~/gandom/test-neuron.js << 'NODE'
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:8787');
let ticks = 0, pongs = 0;
ws.on('open', () => {
    console.log('  ✅ نورون‌ها وصل شدن');
    ws.send(JSON.stringify({type: 'HELLO', from: 'tester'}));
    const interval = setInterval(() => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({type: 'PING', from: 'tester'}));
        }
    }, 1000);
    setTimeout(() => clearInterval(interval), 6000);
});
ws.on('message', (d) => {
    try {
        const m = JSON.parse(d);
        if (m.type === 'LIVE_CELL_TICK') ticks++;
        if (m.type === 'PONG') pongs++;
    } catch(e) {}
});
ws.on('error', (e) => console.log('  ❌ ' + e.message));
setTimeout(() => {
    console.log(`  📊 TICK: ${ticks}، PONG: ${pongs}`);
    console.log('  ✅ تست نورون کامل شد');
    ws.close();
}, 7000);
NODE
node ~/gandom/test-neuron.js
echo ""

echo "▓▓▓ بخش ۳: نود B (پا - P2P) ▓▓▓"
cat > ~/gandom/test-node-b.js << 'NODE'
const WebSocket = require('ws');
const ID = 'NODE-B-' + Date.now().toString().slice(-6);
console.log(`  🦶 شروع نود B: ${ID}`);
const ws = new WebSocket('ws://127.0.0.1:8787');
let count = 0, pongs = 0;
ws.on('open', () => {
    console.log('  ✅ نود B به نود A وصل شد');
    ws.send(JSON.stringify({type: 'HELLO', node_id: ID, role: 'peer'}));
    const iv = setInterval(() => {
        if (ws.readyState === 1) ws.send(JSON.stringify({type: 'PING', from: ID}));
    }, 1500);
    setTimeout(() => clearInterval(iv), 8000);
});
ws.on('message', (d) => {
    try {
        const m = JSON.parse(d);
        count++;
        if (m.type === 'PONG') pongs++;
    } catch(e) {}
});
ws.on('error', (e) => console.log(`  ❌ ${e.message}`));
setTimeout(() => {
    console.log(`  📊 پیام‌ها: ${count}، PONG: ${pongs}`);
    ws.close();
}, 10000);
NODE
node ~/gandom/test-node-b.js
echo ""

echo "▓▓▓ بخش ۴: وضعیت P2P ▓▓▓"
PEERS=$(curl -s --max-time 2 http://127.0.0.1:8787/health 2>/dev/null | grep -o '"peers":[0-9]*' | cut -d: -f2)
echo "  📊 همتاها: ${PEERS:-0}"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✅ تست کامل شد"
echo "═══════════════════════════════════════════════════════"
