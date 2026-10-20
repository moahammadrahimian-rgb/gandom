#!/bin/bash
# 🌾 GANDOM DEEP SHOVEL v2 - شخم عمیق مغز و نودها

ROOT="$HOME/gandom"
OUT="$HOME/gandom/DEEP-REPORT-$(date +%Y%m%d-%H%M%S).txt"

{
echo "═══════════════════════════════════════════════════════"
echo "🌾 GANDOM DEEP SHOVEL v2"
echo "📅 $(date)"
echo "═══════════════════════════════════════════════════════"

echo ""
echo "▓▓▓ ۱: نود B (client.js) - محتوای کامل ▓▓▓"
echo "📁 $ROOT/client.js"
echo "─────────────────────────────────"
cat "$ROOT/client.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۲: مغز اصلی (engine.js) - ۱۰۰ خط اول ▓▓▓"
head -100 "$ROOT/engine.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۳: server.js - ۸۰ خط اول ▓▓▓"
head -80 "$ROOT/server.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۴: GANDOM-FULL-AUTOMATION-2558.js ▓▓▓"
head -80 "$ROOT/GANDOM-FULL-AUTOMATION-2558.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۵: GANDOM-FINAL-AUTONOMOUS-AGENT-2558.js ▓▓▓"
head -80 "$ROOT/GANDOM-FINAL-AUTONOMOUS-AGENT-2558.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۶: GANDOM-AUTONOMOUS-AGENT-2558.js.disabled - چرا غیرفعاله؟ ▓▓▓"
head -50 "$ROOT/GANDOM-AUTONOMOUS-AGENT-2558.js.disabled" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۷: پوشه employees (کارمندان AI) ▓▓▓"
ls -la "$ROOT/employees/" 2>/dev/null
echo ""
echo "── محتوای فایل‌های داخل employees ──"
find "$ROOT/employees/" -type f 2>/dev/null | head -20 | while read f; do
    echo ""
    echo "🔹 $f"
    head -30 "$f" 2>/dev/null
done

echo ""
echo "▓▓▓ ۸: پوشه wallet (کیف پول) ▓▓▓"
ls -la "$ROOT/wallet/" 2>/dev/null
echo ""
find "$ROOT/wallet/" -type f -name "*.js" 2>/dev/null | head -10 | while read f; do
    echo ""
    echo "🔹 $f"
    head -40 "$f" 2>/dev/null
done

echo ""
echo "▓▓▓ ۹: پوشه runtime ▓▓▓"
ls -la "$ROOT/runtime/" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۱۰: پوشه governance (حاکمیت) ▓▓▓"
ls -la "$ROOT/governance/" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۱۱: gandom.db (ساختار دیتابیس) ▓▓▓"
if command -v sqlite3 >/dev/null 2>&1; then
    echo "جداول موجود در دیتابیس:"
    sqlite3 "$ROOT/gandom.db" ".tables" 2>/dev/null
else
    echo "⚠️ sqlite3 نصب نیست - ساختار دیتابیس:"
    file "$ROOT/gandom.db" 2>/dev/null
fi

echo ""
echo "▓▓▓ ۱۲: GANDOM-REGISTRY-2558.js ▓▓▓"
head -60 "$ROOT/GANDOM-REGISTRY-2558.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۱۳: p2p-real-test.js - ۸۰ خط اول ▓▓▓"
head -80 "$ROOT/p2p-real-test.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۱۴: GANDOM-TREASURE-LITE.js ▓▓▓"
head -60 "$ROOT/GANDOM-TREASURE-LITE.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۱۵: GANDOM-DEEP-TREASURE-SCAN.js ▓▓▓"
head -60 "$ROOT/GANDOM-DEEP-TREASURE-SCAN.js" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۱۶: آخرین ۳۰ خط لاگ backend ▓▓▓"
tail -30 "$ROOT/backend.log" 2>/dev/null
echo ""

echo ""
echo "▓▓▓ ۱۷: قوانین و مانیفست ▓▓▓"
echo "── MASTER-PLAN.md ──"
head -40 "$ROOT/MASTER-PLAN.md" 2>/dev/null
echo ""
echo "── README.md ──"
head -40 "$ROOT/README.md" 2>/dev/null

echo ""
echo "▓▓▓ ۱۸: grep جستجوی نقش‌های کلیدی ▓▓▓"
echo "── کلیدواژه‌های Brain/Autonomous/AI ──"
grep -rn "brain\|autonomous\|neuron\|agent\|treasure" "$ROOT" --include="*.js" 2>/dev/null | grep -v node_modules | head -30

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ شخم عمیق تمام شد"
echo "📄 گزارش کامل در: $OUT"
echo "═══════════════════════════════════════════════════════"
} 2>/dev/null | tee "$OUT"
