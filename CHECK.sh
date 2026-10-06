#!/data/data/com.termux/files/usr/bin/bash

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'

echo "════════════════════════════════════════════"
echo -e "${B}   GANDOM 8080 — CHECK SYSTEM${N}"
echo "════════════════════════════════════════════"

BASE=$(ls -d evidence/baseline-* 2>/dev/null | tail -1)
echo -e "${Y}Baseline:${N} $BASE"
echo ""

# ═══ 1. SERVER ═══
echo "─── 1. SERVER ───"
if node --check gandom-ui-server.js 2>&1; then
  echo -e "${G}✅ SERVER_SYNTAX=PASS${N}"
else
  echo -e "${R}❌ SERVER FAIL${N}"
fi

HEALTH=$(curl -sS http://127.0.0.1:8080/health 2>&1)
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo -e "${G}✅ SERVER_RUNNING${N}"
else
  echo -e "${R}❌ SERVER NOT RUNNING${N}"
fi

# ═══ 2. ENDPOINTS ═══
echo ""
echo "─── 2. ENDPOINTS ───"
grep -oE "'/api/[a-z/-]+'" gandom-ui-server.js | sort -u > /tmp/ep-now.txt
NOW_COUNT=$(wc -l < /tmp/ep-now.txt)
echo "تعداد فعلی: $NOW_COUNT"

if [ -f "$BASE/endpoints.txt" ]; then
  OLD_COUNT=$(wc -l < $BASE/endpoints.txt)
  LOST=$(comm -23 <(sort $BASE/endpoints.txt) <(sort /tmp/ep-now.txt) | wc -l)
  
  echo "Baseline: $OLD_COUNT"
  echo "الان: $NOW_COUNT"
  
  if [ "$LOST" = "0" ]; then
    echo -e "${G}✅ هیچ endpoint پاک نشده${N}"
  else
    echo -e "${R}❌ $LOST endpoint پاک شده:${N}"
    comm -23 <(sort $BASE/endpoints.txt) <(sort /tmp/ep-now.txt)
  fi
  
  ADDED=$(comm -13 <(sort $BASE/endpoints.txt) <(sort /tmp/ep-now.txt) | wc -l)
  echo -e "${G}✅ اضافه شده: $ADDED${N}"
fi

# ═══ 3. HTML IDs ═══
echo ""
echo "─── 3. HTML IDs ───"
if [ -f www/index.html ]; then
  NOW_IDS=$(grep -oE 'id="[a-zA-Z_-]+"' www/index.html | sort -u | wc -l)
  echo "تعداد: $NOW_IDS"
  
  if [ -f "$BASE/html-ids.txt" ]; then
    OLD_IDS=$(wc -l < $BASE/html-ids.txt)
    grep -oE 'id="[a-zA-Z_-]+"' www/index.html | sort -u > /tmp/ids-now.txt
    LOST_IDS=$(comm -23 <(sort $BASE/html-ids.txt) <(sort /tmp/ids-now.txt) | wc -l)
    
    if [ "$LOST_IDS" = "0" ]; then
      echo -e "${G}✅ هیچ ID پاک نشده (قبلی: $OLD_IDS، الان: $NOW_IDS)${N}"
    else
      echo -e "${R}❌ $LOST_IDS ID پاک شده:${N}"
      comm -23 <(sort $BASE/html-ids.txt) <(sort /tmp/ids-now.txt)
    fi
  fi
fi

# ═══ 4. JS FUNCTIONS ═══
echo ""
echo "─── 4. JS FUNCTIONS ───"
if [ -f www/assets/js/gandom-complete.js ]; then
  NOW_FN=$(grep -cE "^function |^async function |^const [a-z]+ = \(" www/assets/js/gandom-complete.js)
  echo "تعداد: $NOW_FN"
  
  if node --check www/assets/js/gandom-complete.js 2>&1; then
    echo -e "${G}✅ JS_SYNTAX=PASS${N}"
  else
    echo -e "${R}❌ JS FAIL${N}"
  fi
  
  # چک توابع کلیدی
  for f in openApiKey saveApiKeys openOwnerControl iranTime loadState; do
    if grep -q "function $f" www/assets/js/gandom-complete.js; then
      echo -e "${G}✅ $f${N}"
    else
      echo -e "${Y}⚠️ $f نیست${N}"
    fi
  done
fi

# ═══ 5. SECTION COUNT ═══
echo ""
echo "─── 5. HTML SECTIONS ───"
if [ -f www/index.html ]; then
  SEC=$(grep -c 'class="sec"' www/index.html)
  CARD=$(grep -c 'class="card"' www/index.html)
  TILE=$(grep -c 'class="tile' www/index.html)
  echo "sec: $SEC | card: $CARD | tile: $TILE"
fi

# ═══ 6. FEATURES CHECKS ═══
echo ""
echo "─── 6. FEATURES ───"
if [ -f www/index.html ]; then
  [ $(grep -c 'openApiKey' www/index.html) -gt 0 ] && echo -e "${G}✅ API Key button${N}" || echo -e "${Y}⚠️ API Key button نیست${N}"
  [ $(grep -c 'owner-block\|owner' www/index.html) -gt 0 ] && echo -e "${G}✅ Owner 5%${N}" || echo -e "${Y}⚠️ Owner 5% نیست${N}"
  [ $(grep -c 'openOwnerControl' www/index.html) -gt 0 ] && echo -e "${G}✅ Owner click${N}" || echo -e "${Y}⚠️ Owner click نیست${N}"
  [ $(grep -c 'iranClock\|clock' www/index.html) -gt 0 ] && echo -e "${G}✅ Iran Clock${N}" || echo -e "${Y}⚠️ Iran Clock نیست${N}"
  [ $(grep -c 'goPage\|goHome' www/index.html) -gt 0 ] && echo -e "${G}✅ Navigation (goPage)${N}" || echo -e "${Y}⚠️ Navigation نیست${N}"
  [ $(grep -c 'pg-gold\|pg-re\|pg-auto' www/index.html) -gt 0 ] && echo -e "${G}✅ Industry Pages${N}" || echo -e "${Y}⚠️ Industry Pages نیست${N}"
fi

echo ""
echo "════════════════════════════════════════════"
echo -e "${B}   CHECK COMPLETE${N}"
echo "════════════════════════════════════════════"
