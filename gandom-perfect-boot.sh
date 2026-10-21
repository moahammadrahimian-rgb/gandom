#!/data/data/com.termux/files/usr/bin/bash

echo "=================================================="
echo "🚀 GANDOM PERFECT BOOT (Port Resolution & AI Loop)"
echo "=================================================="

# 1. پاکسازی کامل
echo "[*] در حال بستن تمام پردازش‌های Node.js..."
pkill -9 -f node
sleep 2

# 2. روشن کردن مغز هوش مصنوعی در حالت حلقه (هر 15 ثانیه یکبار)
echo "[*] روشن کردن حلقه هوش مصنوعی (AI Workers)..."
nohup bash -c "while true; do node start-ai.js >> logs/ai-core.log 2>&1; echo '--- AI Loop Restarting ---' >> logs/ai-core.log; sleep 15; done" > /dev/null 2>&1 &

# 3. روشن کردن پل ارتباطی (API Gateway) روی پورت 8080
echo "[*] روشن کردن پل ارتباطی (API Gateway V2) روی پورت 8080..."
nohup node gandom-api-gateway.js > logs/api-gateway.log 2>&1 &
sleep 2

# 4. روشن کردن نود A روی پورت 8787
echo "[*] روشن کردن نود A (8787)..."
nohup node server.js > logs/node-a.log 2>&1 &
sleep 1

# 5. روشن کردن نود B روی پورت 8788
echo "[*] روشن کردن نود B (8788)..."
nohup node node-b-health-wrapper.js > logs/node-b.log 2>&1 &
sleep 2

echo "=================================================="
echo "📊 وضعیت پورت‌ها و پردازش‌ها:"
# استفاده از ss به جای netstat برای نمایش دقیق‌تر در اندروید
if command -v ss >/dev/null 2>&1; then
    ss -tulpn | grep -E ':(8080|8787|8788|9000|8888)' || echo "هنوز پورتی باز نشده..."
else
    ps -ef | grep node | grep -v grep
fi

echo "=================================================="
echo "✅ سیستم یکپارچه گندم روشن شد!"
echo "⚠️  این ترمینال را نبندید. (برای خروج Ctrl+C بزنید)"
echo "=================================================="

# نگه داشتن ترمینال باز
while true; do sleep 3600; done
