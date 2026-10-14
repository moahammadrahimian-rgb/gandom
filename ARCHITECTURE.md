# 🏗️ معماری گندم ۲۵۵۸

## 📊 نمای کلی

```
Frontend (8080)  ←→  Server A (8787)  ←→  Node B (P2P)
```

## 🔌 سرویس‌ها

| سرویس | پورت | نقش |
| :--- | :---: | :--- |
| Server A | 8787 | API + Blockchain + Users |
| Node B | - | P2P Peer + Sync |
| Frontend | 8080 | UI |

## 📦 ماژول‌ها

| ماژول | فایل |
| :--- | :--- |
| Core | server.js |
| Blockchain | blockchain-100.js |
| Blockchain API | blockchain-api.js |
| P2P Handler | blockchain-p2p-handler.js |
| Users | users-manager.js |
| Users API | users-api.js |
| Node B | node-b-chain.js |

## 🔄 جریان داده

### استخراج بلوک
```
User → POST /api/chain/mine
     → mineBlock()
     → broadcastNewBlock()
     → Node B sync
```

## 🔐 امنیت

| لایه | روش |
| :--- | :--- |
| Hash | SHA-256 |
| Signature | ED25519 |
| Password | PBKDF2 |
| Token | HMAC-SHA256 |
| Integrity | Merkle Tree |

---
GANDOM 2558 - Architecture v1.0
