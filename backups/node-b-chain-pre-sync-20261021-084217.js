const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const NODE_A_URL = 'ws://127.0.0.1:8787';
const DATA_DIR = path.join(__dirname, 'blockchain-data-b');

// ساخت پوشه در صورت عدم وجود
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ساخت فایل‌های اولیه در صورت عدم وجود
if (!fs.existsSync(path.join(DATA_DIR, 'chain.json'))) {
    fs.writeFileSync(path.join(DATA_DIR, 'chain.json'), JSON.stringify([]));
}

let ws;
let reconnectTimer;

function connect() {
    console.log(`[NODE-B] در حال اتصال به ${NODE_A_URL} ...`);
    ws = new WebSocket(NODE_A_URL);

    ws.on('open', () => {
        console.log('[NODE-B] اتصال WebSocket برقرار شد.');
        // ارسال پیام خوش‌آمدگویی یا هندشیک
        ws.send(JSON.stringify({ type: 'HELLO', node_id: 'GANDOM-NODE-B' }));
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`[NODE-B] پیام دریافتی: ${msg.type}`);
            
            if (msg.type === 'WELCOME') {
                console.log('✅ پەیوەندی سەرکەوتوو بوو 🚀 WELCOME بۆ جیهانی A');
                console.log(`شناسه نود ما: ${msg.peer_id}`);
            }
        } catch (e) {
            console.error('[NODE-B] خطا در خواندن پیام:', e.message);
        }
    });

    ws.on('close', () => {
        console.log('[NODE-B] اتصال قطع شد. تلاش مجدد در 3 ثانیه...');
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 3000);
    });

    ws.on('error', (err) => {
        console.error('[NODE-B] خطای شبکه:', err.message);
    });
}

// مدیریت خروج تمیز
process.on('SIGINT', () => {
    console.log('\n[NODE-B] در حال خاموش شدن...');
    if (ws) ws.close();
    process.exit(0);
});

// شروع
connect();
