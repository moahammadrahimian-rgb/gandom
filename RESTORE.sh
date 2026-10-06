#!/data/data/com.termux/files/usr/bin/bash
# ======================================
# GANDOM — RESTORE SCRIPT
# برای برگشت به آخرین snapshot
# ======================================

cd ~/gandom

# پیدا کردن آخرین snapshot
SNAP=$(ls -dt backups/SNAPSHOT-* 2>/dev/null | head -1)

if [ -z "$SNAP" ]; then
  echo "❌ هیچ snapshot ای پیدا نشد!"
  exit 1
fi

echo "═══════════════════════════════════════════"
echo "🔄 برگشت به: $SNAP"
echo "═══════════════════════════════════════════"
echo ""
echo "شامل:"
ls "$SNAP/" | head -20
echo ""

read -p "ادامه؟ (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ لغو شد"
  exit 0
fi

# بکاپ وضعیت فعلی قبل از برگشت (برای اطمینان)
NOW="backups/RESTORE-BEFORE-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$NOW"
cp -a www "$NOW/" 2>/dev/null || true
cp gandom-ui-server.js "$NOW/" 2>/dev/null || true
echo "✅ وضعیت فعلی ذخیره شد در: $NOW"

# برگشت
echo ""
echo "در حال برگشت..."
rm -rf www
cp -a "$SNAP/www" ./
cp "$SNAP/gandom-ui-server.js" ./

echo "✅ فایل‌ها برگردونده شدن"

# ری استارت سرور
pkill -9 -f gandom-ui-server 2>/dev/null || true
sleep 2
nohup node gandom-ui-server.js > evidence/server-restore.log 2>&1 &
sleep 3

echo ""
echo "═══════════════════════════════════════════"
echo "✅ برگشت کامل شد"
echo "🌐 http://localhost:8080"
echo "═══════════════════════════════════════════"
