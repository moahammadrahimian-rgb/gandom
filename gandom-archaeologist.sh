#!/data/data/com.termux/files/usr/bin/bash

echo "=================================================="
echo "🔍 GANDOM ARCHAEOLOGIST - FINDING ALL COMPONENTS"
echo "=================================================="
echo "[*] در حال اسکن کل پروژه برای یافتن مغز، نورون‌ها، سلول‌ها و کارگرها..."

# جستجوی فایل‌های مرتبط با هوش مصنوعی و کارگرها
FOUND_FILES=$(find . -maxdepth 3 -type f -name "*.js" | grep -v "node_modules" | grep -v ".git" | grep -v "archive" | grep -v "test" | grep -Ei 'brain|neuron|cell|worker|ai|agent|core|organ|start' | sort)

if [ -z "$FOUND_FILES" ]; then
    echo "❌ هیچ فایلی مرتبط با مغز یا کارگرها پیدا نشد!"
    exit 1
fi

echo "✅ تکه‌های پازل پیدا شدند:"
echo "--------------------------------------------------"
echo "$FOUND_FILES"
echo "--------------------------------------------------"

echo "[*] در حال ساخت اسکریپت راه‌انداز خودکار برای این اجزا..."
cat << 'BOOT' > start-gandom-brain.sh
#!/data/data/com.termux/files/usr/bin/bash
echo "🧠 در حال روشن کردن مغز، سلول‌ها و ربات‌های کارگر..."
mkdir -p logs

# پاکسازی پردازش‌های قبلی این بخش‌ها
pkill -f "worker" || true
pkill -f "brain" || true
pkill -f "ai" || true
sleep 1

BOOT

# اضافه کردن دستورات اجرا به اسکریپت بوت
while read -r file; do
    # استخراج نام فایل برای لاگ
    filename=$(basename "$file" .js)
    echo "echo '[*] روشن کردن: $file'"
    echo "nohup node $file > logs/${filename}.log 2>&1 &"
    echo "sleep 1"
done <<< "$FOUND_FILES" >> start-gandom-brain.sh

# پایان بخشیدن به اسکریپت بوت
cat << 'BOOT_END' >> start-gandom-brain.sh

sleep 3
echo "✅ تمام اجزای مغز و کارگرها در پس‌زمینه اجرا شدند."
echo "📊 برای مشاهده لاگ‌ها: tail -f logs/*.log"
BOOT_END

chmod +x start-gandom-brain.sh

echo "=================================================="
echo "🚀 اسکریپت راه‌انداز ساخته شد: ./start-gandom-brain.sh"
echo "=================================================="
echo "برای روشن کردن همه اجزا، دستور زیر را اجرا کنید:"
echo "./start-gandom-brain.sh"
