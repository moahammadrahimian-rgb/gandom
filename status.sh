#!/bin/bash
echo "═══════════════════════════════════════════════════════"
echo "🌾 GANDOM STATUS"
echo "📅 $(date)"
echo "═══════════════════════════════════════════════════════"
echo ""

# سرور A
if curl -s --max-time 2 http://127.0.0.1:8787/health > /dev/null 2>&1; then
    echo "✅ سرور A: فعال"
    HEALTH=$(curl -s http://127.0.0.1:8787/health)
    echo "   $HEALTH"
else
    echo "❌ سرور A: خاموش"
fi
echo ""

# نود B
if ps aux | grep -q "[n]ode-b-chain"; then
    echo "✅ نود B: فعال"
else
    echo "❌ نود B: خاموش"
fi
echo ""

# Frontend
if curl -s --max-time 2 http://127.0.0.1:8080/ > /dev/null 2>&1; then
    echo "✅ Frontend: فعال"
else
    echo "❌ Frontend: خاموش"
fi
echo ""

# بلاک‌چین
if curl -s --max-time 2 http://127.0.0.1:8787/api/chain/stats > /dev/null 2>&1; then
    echo "⛓️ بلاک‌چین:"
    curl -s http://127.0.0.1:8787/api/chain/stats
    echo ""
fi
echo ""

# کاربران
if curl -s --max-time 2 http://127.0.0.1:8787/api/users/stats > /dev/null 2>&1; then
    echo "👥 کاربران:"
    curl -s http://127.0.0.1:8787/api/users/stats
    echo ""
fi
echo ""

echo "═══════════════════════════════════════════════════════"
