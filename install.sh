#!/bin/bash
# ═══════════════════════════════════════════════════════
# 🌾 GANDOM 2558 - Universal Installer v2
# ═══════════════════════════════════════════════════════

GREEN=$'\033[0;32m'
RED=$'\033[0;31m'
YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'
GOLD=$'\033[1;33m'
NC=$'\033[0m'

echo ""
echo "${GOLD}═══════════════════════════════════════════════════════${NC}"
echo "${GOLD}🌾  GANDOM 2558 - INSTALLER${NC}"
echo "${GOLD}   Living Decentralized AI Ecosystem${NC}"
echo "${GOLD}═══════════════════════════════════════════════════════${NC}"
echo ""

# ─── ۱. بررسی پیش‌نیازها ───
echo "${CYAN}📋 گام ۱: بررسی پیش‌نیازها${NC}"

if ! command -v node &> /dev/null; then
    echo "${RED}❌ Node.js نصب نیست${NC}"
    exit 1
fi
echo "${GREEN}✅${NC} Node.js: $(node -v)"

if [ ! -d "node_modules/ws" ]; then
    echo "${YELLOW}⚠️${NC} نصب ws..."
    npm install ws 2>&1 | tail -3
fi
echo "${GREEN}✅${NC} ws نصب است"

# ─── ۲. ساخت پوشه‌ها ───
echo ""
echo "${CYAN}📁 گام ۲: ساخت پوشه‌ها${NC}"
for dir in "blockchain-data" "blockchain-data-b" "users-data" "logs"; do
    mkdir -p "$dir"
    echo "${GREEN}✅${NC} $dir"
done

# ─── ۳. بررسی فایل‌ها ───
echo ""
echo "${CYAN}📄 گام ۳: بررسی فایل‌ها${NC}"

FILES=(
    "server.js"
    "blockchain-100.js"
    "blockchain-api.js"
    "blockchain-p2p-handler.js"
    "users-manager.js"
    "users-api.js"
    "node-b-chain.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "${GREEN}✅${NC} $file"
    else
        echo "${RED}❌${NC} $file گم شده"
        exit 1
    fi
done

# ─── ۴. تست syntax ───
echo ""
echo "${CYAN}🔍 گام ۴: تست syntax${NC}"
for file in "${FILES[@]}"; do
    if node -c "$file" 2>/dev/null; then
        echo "${GREEN}✅${NC} $file"
    else
        echo "${RED}❌${NC} $file - خطای syntax"
        node -c "$file"
        exit 1
    fi
done

# ─── ۵. توقف سرورهای قبلی ───
echo ""
echo "${CYAN}🛑 گام ۵: توقف سرورهای قبلی${NC}"
pkill -f "node server.js" 2>/dev/null
pkill -f "node-b-chain" 2>/dev/null
pkill -f "http.server" 2>/dev/null
sleep 3
echo "${GREEN}✅${NC} همه متوقف شدند"

# ─── ۶. راه‌اندازی سرور A ───
echo ""
echo "${CYAN}🚀 گام ۶: راه‌اندازی سرور A${NC}"

# استفاده از setsid برای detach کامل
setsid node server.js > logs/server.log 2>&1 < /dev/null &
SERVER_PID=$!
disown 2>/dev/null || true
echo "${GREEN}✅${NC} سرور A (PID: $SERVER_PID)"
sleep 6

if curl -s --max-time 3 http://127.0.0.1:8787/health > /dev/null 2>&1; then
    echo "${GREEN}✅${NC} سرور A پاسخ می‌ده"
else
    echo "${RED}❌${NC} سرور A پاسخ نمی‌ده!"
    tail -20 logs/server.log
    exit 1
fi

# ─── ۷. راه‌اندازی نود B ───
echo ""
echo "${CYAN}🦶 گام ۷: راه‌اندازی نود B${NC}"
setsid node node-b-chain.js > logs/node-b.log 2>&1 < /dev/null &
NODE_B_PID=$!
disown 2>/dev/null || true
echo "${GREEN}✅${NC} نود B (PID: $NODE_B_PID)"
sleep 6

PEERS=$(curl -s http://127.0.0.1:8787/health 2>/dev/null | grep -o '"peers":[0-9]*' | cut -d: -f2)
if [ "${PEERS:-0}" -gt 0 ]; then
    echo "${GREEN}✅${NC} نود B متصل ($PEERS همتا)"
else
    echo "${YELLOW}⚠️${NC} نود B هنوز وصل نشده"
fi

# ─── ۸. راه‌اندازی Frontend ───
echo ""
echo "${CYAN}🌐 گام ۸: راه‌اندازی Frontend${NC}"
if command -v python3 &> /dev/null; then
    cd public
    setsid python3 -m http.server 8080 --bind 127.0.0.1 > ../logs/frontend.log 2>&1 < /dev/null &
    FRONTEND_PID=$!
    disown 2>/dev/null || true
    cd ..
    echo "${GREEN}✅${NC} Frontend (PID: $FRONTEND_PID)"
    sleep 3
    
    if curl -s --max-time 3 http://127.0.0.1:8080/ > /dev/null 2>&1; then
        echo "${GREEN}✅${NC} Frontend پاسخ می‌ده"
    else
        echo "${YELLOW}⚠️${NC} Frontend پاسخ نمی‌ده"
    fi
else
    echo "${YELLOW}⚠️${NC} Python3 نصب نیست"
fi

# ─── ۹. تست نهایی ───
echo ""
echo "${CYAN}🧪 گام ۹: تست نهایی${NC}"

echo -n "🔗 بلاک‌چین: "
CHAIN_LENGTH=$(curl -s http://127.0.0.1:8787/api/chain/stats 2>/dev/null | grep -o '"length":[0-9]*' | cut -d: -f2)
echo "${GREEN}${CHAIN_LENGTH:-0} بلوک${NC}"

echo -n "🌐 همتاها: "
PEERS=$(curl -s http://127.0.0.1:8787/health 2>/dev/null | grep -o '"peers":[0-9]*' | cut -d: -f2)
echo "${GREEN}${PEERS:-0} نود${NC}"

echo -n "👥 کاربران: "
USERS=$(curl -s http://127.0.0.1:8787/api/users/stats 2>/dev/null | grep -o '"total_users":[0-9]*' | cut -d: -f2)
echo "${GREEN}${USERS:-0} کاربر${NC}"

echo -n "📱 Frontend: "
if curl -s --max-time 3 http://127.0.0.1:8080/ > /dev/null 2>&1; then
    echo "${GREEN}فعال${NC}"
else
    echo "${YELLOW}غیرفعال${NC}"
fi

# ─── ۱۰. نمایش آدرس‌ها ───
echo ""
echo "${GOLD}═══════════════════════════════════════════════════════${NC}"
echo "${GOLD}🎉 GANDOM IS ALIVE!${NC}"
echo "${GOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "${GREEN}🌐 آدرس‌های دسترسی:${NC}"
echo "  🏠 داشبورد:          http://127.0.0.1:8080/"
echo "  ⛓️  کاوشگر:          http://127.0.0.1:8787/assets/chain.html"
echo "  🗺️  نقشه:            http://127.0.0.1:8787/assets/gandom-map.html"
echo "  ❤️  Health:          http://127.0.0.1:8787/health"
echo ""
echo "${GREEN}📁 لاگ‌ها:${NC}"
echo "  logs/server.log      logs/node-b.log      logs/frontend.log"
echo ""
echo "${YELLOW}💡 توقف:${NC}    bash ~/gandom/stop.sh"
echo "${YELLOW}💡 وضعیت:${NC}   bash ~/gandom/status.sh"
echo ""
echo "${GOLD}═══════════════════════════════════════════════════════${NC}"
echo ""

# ذخیره PIDها
echo "$SERVER_PID" > logs/server.pid
echo "$NODE_B_PID" > logs/node-b.pid
echo "$FRONTEND_PID" > logs/frontend.pid

