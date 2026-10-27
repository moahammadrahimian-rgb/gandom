#!/bin/bash
cd ~/gandom

echo "🔍 Searching for UI files..."
# پیدا کردن فایل‌های HTML/JS داشبورد
find . -name "*.html" -o -name "*.js" | grep -v "node_modules" | xargs grep -l "api/wallet" 2>/dev/null | head -n 5

echo "🔧 Patching hardcoded API URLs..."
# این دستور هر جا localhost یا آدرس نسبی بوده رو به 127.0.0.1 تغییر میده
grep -rl "localhost:8787\|/api/wallet\|/api/ai" --include="*.html" --include="*.js" . | grep -v node_modules | while read file; do
    sed -i 's|localhost:8787|127.0.0.1:8787|g' "$file"
    sed -i 's|http://127.0.0.1:8080/api|http://127.0.0.1:8787/api|g' "$file"
done

echo "✅ UI files patched successfully."
echo "🚀 Please refresh your browser (Ctrl+R) at http://127.0.0.1:8080/"
