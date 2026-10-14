# 📦 راهنمای نصب گندم ۲۵۵۸

## پیش‌نیازها

- Node.js >= 18
- npm
- Python 3 (برای Frontend)
- Git

## نصب سریع

```bash
git clone https://github.com/moahammadrahimian-rgb/gandom.git
cd gandom
bash install.sh
```

## نصب دستی

### ۱. نصب وابستگی‌ها
```bash
npm install
```

### ۲. ساخت پوشه‌ها
```bash
mkdir -p blockchain-data blockchain-data-b users-data logs
```

### ۳. راه‌اندازی سرور A
```bash
node server.js &
```

### ۴. راه‌اندازی نود B
```bash
node node-b-chain.js &
```

### ۵. راه‌اندازی Frontend
```bash
cd public && python3 -m http.server 8080 &
```

## تست نصب

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/api/chain/stats
curl http://127.0.0.1:8787/api/users/stats
```

## دستورات مدیریتی

```bash
bash install.sh   # نصب
bash stop.sh      # توقف
bash status.sh    # وضعیت
```

## عیب‌یابی

### سرور راه نمی‌افته
```bash
netstat -tln | grep 8787
tail -20 logs/server.log
```

---
GANDOM 2558 - Install v1.0
