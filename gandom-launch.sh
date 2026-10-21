#!/data/data/com.termux/files/usr/bin/bash

echo "=================================================="
echo "🚀 GANDOM MASTER LAUNCH (LAW 2558)"
echo "=================================================="

# 1. پاکسازی محیط
pkill -9 -f node > /dev/null 2>&1
sleep 2

# 2. روشن کردن مغز (حلقه بی‌نهایت)
nohup bash -c "while true; do node start-ai.js >> logs/ai-core.log 2>&1; sleep 20; done" > /dev/null 2>&1 &
echo "[+] مغز هوش مصنوعی روشن شد."

# 3. روشن کردن پل ارتباطی
nohup node gandom-api-gateway.js > logs/api-gateway.log 2>&1 &
echo "[+] پل ارتباطی (پورت 8080) روشن شد."

# 4. روشن کردن نودها
nohup node server.js > logs/node-a.log 2>&1 &
nohup node node-b-health-wrapper.js > logs/node-b.log 2>&1 &
echo "[+] نودهای شبکه (8787, 8788) روشن شدند."

echo "⏳ در حال بررسی سلامت سیستم با curl (بدون نیاز به root)..."
sleep 4

# 5. تست واقعی سلامت با curl
STATUS_API=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/health)
STATUS_NODE_A=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8787/health)

if [ "$STATUS_API" -eq 200 ]; then
    echo "✅ API Gateway (8080): فعال (HTTP 200)"
else
    echo "❌ API Gateway (8080): خطا (HTTP $STATUS_API)"
fi

if [ "$STATUS_NODE_A" -eq 200 ]; then
    echo "✅ Node A (8787): فعال (HTTP 200)"
else
    echo "❌ Node A (8787): خطا (HTTP $STATUS_NODE_A)"
fi

echo "=================================================="
echo "🌐 داشبورد: http://127.0.0.1:8080"
echo "✅ سیستم آماده است. (برای خروج Ctrl+C بزنید)"
echo "=================================================="

# نگه داشتن اسکریپت باز
while true; do sleep 3600; done
