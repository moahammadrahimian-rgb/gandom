'use strict';
const WebSocket = require('ws');
console.log("👨‍⚕️ [DOCTOR-AI] Alive and connected to Blockchain.");
const ws = new WebSocket('ws://127.0.0.1:8787');
ws.on('open', () => {
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'HEARTBEAT', tx: "DOCTOR_AI_VITAL" }));
        }
    }, 3000);
});
ws.on('error', () => process.exit(1));
