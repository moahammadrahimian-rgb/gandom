// ═══════════════════════════════════════════════════════
// 👤 GANDOM USERS MANAGER - مدیریت کاربران
// ═══════════════════════════════════════════════════════

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const USERS_DIR = path.join(__dirname, 'users-data');
const USERS_FILE = path.join(USERS_DIR, 'users.json');
const SESSIONS_FILE = path.join(USERS_DIR, 'sessions.json');

if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════
// 🗄️ Database
// ═══════════════════════════════════════════════════════
class UsersDB {
  constructor() {
    this.users = {};
    this.sessions = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        this.users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      }
      if (fs.existsSync(SESSIONS_FILE)) {
        this.sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      }
      console.log(`👥 کاربران بارگذاری شد: ${Object.keys(this.users).length}`);
    } catch(e) {
      console.error('Load users error:', e.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2));
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(this.sessions, null, 2));
      return true;
    } catch(e) {
      console.error('Save users error:', e.message);
      return false;
    }
  }
}

const db = new UsersDB();

// ═══════════════════════════════════════════════════════
// 🔐 رمزنگاری رمز عبور
// ═══════════════════════════════════════════════════════
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const result = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return result === hash;
}

// ═══════════════════════════════════════════════════════
// 🎫 توکن JWT-like
// ═══════════════════════════════════════════════════════
function createToken(userId) {
  const payload = {
    userId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // ۳۰ روز
  };
  const tokenData = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', 'GANDOM-2558-SECRET')
    .update(tokenData).digest('hex').substring(0, 32);
  return `${tokenData}.${signature}`;
}

function verifyToken(token) {
  try {
    const [tokenData, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', 'GANDOM-2558-SECRET')
      .update(tokenData).digest('hex').substring(0, 32);
    
    if (signature !== expectedSig) return null;
    
    const payload = JSON.parse(Buffer.from(tokenData, 'base64').toString());
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch(e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// 👤 User Manager
// ═══════════════════════════════════════════════════════
class UserManager {

  // ─── ثبت‌نام ───
  static register(username, email, password) {
    // اعتبارسنجی
    if (!username || username.length < 3) {
      return { ok: false, error: 'USERNAME_TOO_SHORT', min: 3 };
    }
    if (!email || !email.includes('@')) {
      return { ok: false, error: 'INVALID_EMAIL' };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: 'PASSWORD_TOO_SHORT', min: 6 };
    }

    // بررسی تکراری
    for (const [id, u] of Object.entries(db.users)) {
      if (u.username === username) return { ok: false, error: 'USERNAME_TAKEN' };
      if (u.email === email) return { ok: false, error: 'EMAIL_TAKEN' };
    }

    // ساخت کاربر
    const userId = 'USR-' + crypto.randomBytes(6).toString('hex');
    const { hash, salt } = hashPassword(password);
    
    // ساخت آدرس GDM اختصاصی
    const gdmAddress = 'GDM' + crypto.createHash('sha256')
      .update(userId + email).digest('hex').substring(0, 34);

    // ساخت کلید امضا
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

    const user = {
      userId,
      username,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      gdmAddress,
      publicKey: publicKeyPem,
      privateKey: privateKeyPem, // ⚠️ در production رمزنگاری شده ذخیره بشه
      balance: 0,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      verified: false,
      role: 'user'
    };

    db.users[userId] = user;
    db.save();

    console.log(`✅ کاربر جدید: ${username} (${userId})`);

    return {
      ok: true,
      userId,
      username,
      email,
      gdmAddress
    };
  }

  // ─── ورود ───
  static login(username, password) {
    let user = null;
    for (const [id, u] of Object.entries(db.users)) {
      if (u.username === username || u.email === username) {
        user = u;
        break;
      }
    }

    if (!user) return { ok: false, error: 'USER_NOT_FOUND' };

    if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return { ok: false, error: 'WRONG_PASSWORD' };
    }

    // ساخت توکن
    const token = createToken(user.userId);
    db.sessions[token] = {
      userId: user.userId,
      createdAt: Date.now()
    };
    user.lastLogin = new Date().toISOString();
    db.save();

    console.log(`🔓 ورود: ${user.username}`);

    return {
      ok: true,
      token,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        gdmAddress: user.gdmAddress,
        balance: user.balance,
        role: user.role
      }
    };
  }

  // ─── بررسی توکن ───
  static verify(token) {
    const payload = verifyToken(token);
    if (!payload) return { ok: false, error: 'INVALID_TOKEN' };
    
    const user = db.users[payload.userId];
    if (!user) return { ok: false, error: 'USER_NOT_FOUND' };

    return {
      ok: true,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        gdmAddress: user.gdmAddress,
        balance: user.balance,
        publicKey: user.publicKey,
        role: user.role
      }
    };
  }

  // ─── اطلاعات کاربر ───
  static getInfo(userId) {
    const user = db.users[userId];
    if (!user) return null;
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      gdmAddress: user.gdmAddress,
      publicKey: user.publicKey,
      balance: user.balance,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      role: user.role
    };
  }

  // ─── لیست کاربران ───
  static list() {
    return Object.values(db.users).map(u => ({
      userId: u.userId,
      username: u.username,
      email: u.email,
      gdmAddress: u.gdmAddress,
      balance: u.balance,
      createdAt: u.createdAt
    }));
  }

  // ─── به‌روزرسانی موجودی ───
  static updateBalance(userId, newBalance) {
    if (!db.users[userId]) return false;
    db.users[userId].balance = newBalance;
    db.save();
    return true;
  }

  // ─── امضا با کلید کاربر ───
  static sign(userId, data) {
    const user = db.users[userId];
    if (!user) return null;
    try {
      const privateKey = crypto.createPrivateKey(user.privateKey);
      const signature = crypto.sign(null, Buffer.from(data), privateKey);
      return signature.toString('hex');
    } catch(e) {
      return null;
    }
  }

  // ─── خروج ───
  static logout(token) {
    if (db.sessions[token]) {
      delete db.sessions[token];
      db.save();
      return { ok: true };
    }
    return { ok: false, error: 'SESSION_NOT_FOUND' };
  }

  // ─── آمار ───
  static stats() {
    const users = Object.values(db.users);
    return {
      total_users: users.length,
      total_balance: users.reduce((s, u) => s + (u.balance || 0), 0),
      total_sessions: Object.keys(db.sessions).length
    };
  }
}

module.exports = { UserManager, UsersDB };
