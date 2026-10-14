#!/bin/bash
echo "🛑 توقف گندم..."
pkill -f "node server.js" 2>/dev/null && echo "✅ سرور A متوقف شد"
pkill -f "node-b-chain" 2>/dev/null && echo "✅ نود B متوقف شد"
pkill -f "http.server" 2>/dev/null && echo "✅ Frontend متوقف شد"
echo ""
echo "✅ همه سرویس‌ها متوقف شدند"
