# 🌐 مستندات API گندم ۲۵۵۸

Base URL: `http://127.0.0.1:8787`

## ⛓️ Blockchain

### GET /api/chain
لیست تمام بلوک‌ها

### GET /api/chain/stats
آمار کلی زنجیره

### GET /api/chain/block/:index
اطلاعات یه بلوک خاص

### POST /api/chain/mine
استخراج بلوک جدید
```json
{ "miner": "GDM-address" }
```

### POST /api/chain/tx
ارسال تراکنش
```json
{ "from": "...", "to": "...", "amount": 100 }
```

### GET /api/chain/pending
تراکنش‌های در انتظار

### GET /api/chain/validate
بررسی اعتبار زنجیره

## 👥 Users

### POST /api/users/register
ثبت‌نام
```json
{
  "username": "alice",
  "email": "alice@gandom.io",
  "password": "secure_password"
}
```

### POST /api/users/login
ورود
```json
{ "username": "alice", "password": "secure_password" }
```

### GET /api/users/me
اطلاعات کاربر جاری (با توکن)

### GET /api/users/list
لیست همه کاربران

### GET /api/users/stats
آمار کاربران

## 🌐 Network

### GET /health
سلامت سرور

### GET /api/peers
لیست همتاها

### GET /api/stats
آمار سیستم

## 📋 نمونه درخواست‌ها

### استخراج بلوک
```bash
curl -X POST http://127.0.0.1:8787/api/chain/mine \
  -H "Content-Type: application/json" \
  -d \x27{"miner":"GDM-alice"}\x27
```

### ثبت‌نام
```bash
curl -X POST http://127.0.0.1:8787/api/users/register \
  -H "Content-Type: application/json" \
  -d \x27{"username":"alice","email":"a@b.com","password":"123456"}\x27
```

### بررسی بلاک‌چین
```bash
curl http://127.0.0.1:8787/api/chain/stats
```

---
GANDOM 2558 - API v1.0
