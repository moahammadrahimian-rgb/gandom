#!/bin/bash
# ═══════════════════════════════════════════════════════
# 🌾 GANDOM DEEP SHOVEL - شخم‌زن عمیق مغز و نودها
# ═══════════════════════════════════════════════════════

ROOT="$HOME/gandom"
OUT="$HOME/gandom/SHOVEL-REPORT-$(date +%Y%m%d-%H%M%S).txt"

{
echo "═══════════════════════════════════════════════════════"
echo "🌾 GANDOM DEEP SHOVEL REPORT"
echo "📅 $(date)"
echo "═══════════════════════════════════════════════════════"

echo ""
echo "▓▓▓ بخش ۱: نودها (Nodes) ▓▓▓"
find "$ROOT" -type f \( -iname "*node*.js" -o -iname "*node*.json" -o -iname "*node*.sh" \) 2>/dev/null | grep -v node_modules | while read f; do
    echo "🔹 $f"
    echo "   حجم: $(du -h "$f" | cut -f1)"
done

echo ""
echo "▓▓▓ بخش ۲: مغزها (Brain) ▓▓▓"
find "$ROOT" -type f \( -iname "*brain*" -o -iname "*maghz*" -o -iname "*core*.js" -o -iname "*engine*.js" \) 2>/dev/null | grep -v node_modules | while read f; do
    echo "🧠 $f"
    echo "   حجم: $(du -h "$f" | cut -f1)"
done

echo ""
echo "▓▓▓ بخش ۳: فایل‌های AI و Neuron ▓▓▓"
find "$ROOT" -type f \( -iname "*ai*.js" -o -iname "*neuron*" -o -iname "*cell*" -o -iname "*agent*" \) 2>/dev/null | grep -v node_modules | head -30

echo ""
echo "▓▓▓ بخش ۴: فایل‌های P2P و Network ▓▓▓"
find "$ROOT" -type f \( -iname "*p2p*" -o -iname "*peer*" -o -iname "*network*" -o -iname "*ws*.js" -o -iname "*websocket*" \) 2>/dev/null | grep -v node_modules | head -30

echo ""
echo "▓▓▓ بخش ۵: پردازش‌های فعال Node ▓▓▓"
ps aux | grep -i "node\|npm" | grep -v grep

echo ""
echo "▓▓▓ بخش ۶: پورت‌های فعال ▓▓▓"
netstat -tlnp 2>/dev/null | grep -E "LISTEN" || echo "netstat ندارد - از ss استفاده کن"

echo ""
echo "▓▓▓ بخش ۷: تمام فایل‌های JS در ریشه گندم ▓▓▓"
ls -lh "$ROOT"/*.js 2>/dev/null

echo ""
echo "▓▓▓ بخش ۸: تمام فایل‌های JS در زیرپوشه‌ها (بدون node_modules) ▓▓▓"
find "$ROOT" -name "*.js" -type f 2>/dev/null | grep -v node_modules | head -50

echo ""
echo "▓▓▓ بخش ۹: اسکریپت‌های Shell (.sh) ▓▓▓"
find "$ROOT" -name "*.sh" -type f 2>/dev/null | grep -v node_modules

echo ""
echo "▓▓▓ بخش ۱۰: فایل‌های JSON مهم ▓▓▓"
find "$ROOT" -maxdepth 3 -name "*.json" -type f 2>/dev/null | grep -v node_modules | grep -v package-lock | head -30

echo ""
echo "▓▓▓ بخش ۱۱: خطوط کلیدی در فایل‌های JS ▓▓▓"
echo "--- جستجوی listen / port / WebSocket / Brain ---"
grep -rn "listen\|createServer\|WebSocket\|Brain\|neuron" "$ROOT" --include="*.js" 2>/dev/null | grep -v node_modules | head -40

echo ""
echo "▓▓▓ بخش ۱۲: محتوای package.json ▓▓▓"
cat "$ROOT/package.json" 2>/dev/null

echo ""
echo "▓▓▓ بخش ۱۳: فایل‌های لاگ موجود ▓▓▓"
find "$ROOT" -name "*.log" -type f 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "▓▓▓ بخش ۱۴: پوشه‌های اصلی ▓▓▓"
ls -la "$ROOT"/

echo ""
echo "▓▓▓ بخش ۱۵: سایز کل پروژه ▓▓▓"
du -sh "$ROOT" 2>/dev/null

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ شخم‌زنی تمام شد"
echo "📄 گزارش ذخیره شد در: $OUT"
echo "═══════════════════════════════════════════════════════"
} | tee "$OUT"
