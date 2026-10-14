# ⛓️ بلاک‌چین گندم ۲۵۵۸

## 🧱 ساختار Block

```javascript
{
  index: 5,
  prevHash: "00d533...",
  timestamp: 1791980795095,
  transactions: [...],
  merkleRoot: "abc123...",
  nonce: 50,
  difficulty: 3,
  reward: 50,
  hash: "000d53305..."
}
```

## 💸 Transaction

```javascript
{
  txid: "abc123...",
  from: "GDM-address-1",
  to: "GDM-address-2",
  amount: 100,
  fee: 0.001,
  publicKey: "-----BEGIN...",
  signature: "abc123...",
  type: "TRANSFER"
}
```

## 🌳 Merkle Tree

```
        Root
       /    \
      H12    H34
     /  \   /  \
    H1  H2 H3  H4
    |   |  |   |
   TX1 TX2 TX3 TX4
```

## ⛏️ Mining (Proof of Work)

```javascript
mine(difficulty) {
  const target = "0".repeat(difficulty);
  while (hash.substring(0, difficulty) !== target) {
    nonce++;
    hash = calculateHash();
  }
}
```

## 🎁 Halving (کاهش پاداش)

| بلوک | پاداش |
| :---: | :---: |
| 0 | 50 GDM |
| 210,000 | 25 GDM |
| 420,000 | 12.5 GDM |
| 630,000 | 6.25 GDM |

## 🔐 ED25519 Signature

```javascript
// امضا
const signature = crypto.sign(null, data, privateKey);

// تأیید
const valid = crypto.verify(null, data, publicKey, signature);
```

## 🗳️ Consensus (اجماع)

- **آستانه**: ۵۱٪ نودها
- **روش**: رأی‌گیری YES/NO
- **نتیجه**: بلوک پذیرفته یا رد

## 📊 API بلاک‌چین

| مسیر | متد | کار |
| :--- | :---: | :--- |
| /api/chain | GET | لیست بلوک‌ها |
| /api/chain/stats | GET | آمار |
| /api/chain/mine | POST | استخراج |
| /api/chain/tx | POST | تراکنش |
| /api/chain/validate | GET | اعتبار |

## 🎯 ۱۵ ویژگی

| # | ویژگی |
| :---: | :--- |
| ۱ | Block |
| ۲ | Blockchain |
| ۳ | Transaction |
| ۴ | Wallet |
| ۵ | Mining |
| ۶ | Consensus |
| ۷ | P2P Sync |
| ۸ | Persistence |
| ۹ | Merkle Tree |
| ۱۰ | ED25519 |
| ۱۱ | Difficulty Adjustment |
| ۱۲ | Halving |
| ۱۳ | HTTP API |
| ۱۴ | Explorer |
| ۱۵ | Multi-Node |

---
GANDOM 2558 - Blockchain v1.0
