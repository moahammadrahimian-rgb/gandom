#!/data/data/com.termux/files/usr/bin/bash

echo "=================================================="
echo "🚀 GANDOM FINAL UNIFIED BOOT (LAW 2558)"
echo "=================================================="

# 1. پاکسازی کامل
echo "[*] در حال بستن پردازش‌های قبلی..."
pkill -9 -f node
sleep 2

# 2. روشن کردن مغز هوش مصنوعی (AI Brain)
echo "[*] روشن کردن مغز (AI Brain)..."
nohup node start-ai.js > logs/ai-core.log 2>&1 &
sleep 1

# 3. روشن کردن پل ارتباطی (API Gateway)
echo "[*] روشن کردن پل ارتباطی (API Gateway V2)..."
nohup node gandom-api-gateway.js > logs/api-gateway.log 2>&1 &
sleep 1

# 4. روشن کردن نود A
echo "[*] روشن کردن نود A (8787)..."
nohup node server.js > logs/node-a.log 2>&1 &
sleep 1

# 5. روشن کردن نود B
echo "[*] روشن کردن نود B (8788)..."
nohup node node-b-health-wrapper.js > logs/node-b.log 2>&1 &
sleep 1

echo "⏳ در حال بررسی سلامت سیستم..."
sleep 3

# 6. تایید نهایی
echo "=================================================="
echo "📊 وضعیت پردازش‌های گندم:"
ps -ef | grep node | grep -v grep

echo "=================================================="
echo "✅ سیستم یکپارچه گندم روشن شد!"
echo "⚠️  هشدار: این ترمینال را نبندید. (برای خروج Ctrl+C بزنید)"
echo "=================================================="

# نگه داشتن ترمینال باز برای زنده ماندن سرویس‌ها
while true; do sleep 3600; done
