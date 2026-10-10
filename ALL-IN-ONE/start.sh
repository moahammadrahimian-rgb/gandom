#!/bin/bash
cd $HOME/gandom/ALL-IN-ONE
pkill -9 node 2>/dev/null ; sleep 2
nohup node backend.js > backend.log 2>&1 &
nohup node p2p-server.js > p2p.log 2>&1 &
nohup node ui-server.js > ui.log 2>&1 &
nohup node audit-server.js > audit.log 2>&1 &
sleep 3
echo "✅ ALL SERVERS STARTED"
echo "Backend: http://127.0.0.1:9000/health"
echo "P2P:     http://127.0.0.1:8787/health"
echo "UI:      http://127.0.0.1:8080/"
echo "Audit:   http://127.0.0.1:8888/health"
