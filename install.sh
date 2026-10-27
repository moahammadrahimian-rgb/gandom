#!/bin/bash
echo "=========================================="
echo "🚀 GANDOM ALPHA 6 - INSTALLATION SCRIPT"
echo "=========================================="

# 1. بررسی نصب بودن Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js نصب نیست. لطفا با 'pkg install nodejs' نصب کنید."
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# 2. ساخت پوشه‌های ضروری
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p blockchain-data
mkdir -p blockchain-data-b
mkdir -p gandom-core/governance
mkdir -p evidence

# 3. نصب پکیج‌ها
echo "📦 Installing dependencies..."
if [ -f package.json ]; then
    npm install --silent
else
    npm init -y >/dev/null
    npm install ws crypto express http --silent
fi

# 4. دادن دسترسی اجرا به اسکریپت‌ها
chmod +x *.sh 2>/dev/null
chmod +x *.js 2>/dev/null

echo "✅ Installation Complete. Ready to run."
