// GANDOM SECURITY MODULE
const crypto = require('crypto');

const ENCRYPTION_KEY = crypto.scryptSync('gandom-master-key-2026', 'gandom-salt', 32);
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { iv: iv.toString('hex'), data: encrypted };
}

function decrypt(encryptedData) {
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt: salt, hash: hash };
}

function verifyPassword(password, salt, hash) {
  const newHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return newHash === hash;
}

function generate2FASecret() {
  return crypto.randomBytes(20).toString('hex');
}

function generate2FACode(secret) {
  const time = Math.floor(Date.now() / 30000);
  const hmac = crypto.createHmac('sha1', secret).update(time.toString()).digest('hex');
  const code = parseInt(hmac.substring(0, 8), 16) % 1000000;
  return code.toString().padStart(6, '0');
}

function verify2FACode(secret, code) {
  const expected = generate2FACode(secret);
  return expected === code;
}

function generateWalletBackup(wallet) {
  const backup = {
    address: wallet.address,
    publicKey: wallet.publicKey,
    mnemonic: wallet.mnemonic,
    createdAt: Date.now(),
    version: '1.0'
  };
  return encrypt(JSON.stringify(backup));
}

function restoreWalletFromBackup(encryptedBackup) {
  const decrypted = decrypt(encryptedBackup);
  return JSON.parse(decrypted);
}

console.log('==========================================');
console.log('GANDOM SECURITY MODULE');
console.log('==========================================');
console.log('');

console.log('--- Test 1: Encryption ---');
const originalText = 'Gandom private key: abc123def456';
const encrypted = encrypt(originalText);
console.log('Original:  ' + originalText);
console.log('Encrypted: ' + encrypted.data.substring(0, 32) + '...');
const decrypted = decrypt(encrypted);
console.log('Decrypted: ' + decrypted);
console.log('Match:     ' + (originalText === decrypted));
console.log('');

console.log('--- Test 2: Password Hashing ---');
const pwd = 'MySecurePassword123';
const hashed = hashPassword(pwd);
console.log('Password:  ' + pwd);
console.log('Hash:      ' + hashed.hash.substring(0, 32) + '...');
console.log('Verified:  ' + verifyPassword(pwd, hashed.salt, hashed.hash));
console.log('');

console.log('--- Test 3: 2FA ---');
const secret = generate2FASecret();
const code = generate2FACode(secret);
console.log('Secret:    ' + secret.substring(0, 16) + '...');
console.log('2FA Code:  ' + code);
console.log('Verified:  ' + verify2FACode(secret, code));
console.log('');

console.log('--- Test 4: Wallet Backup ---');
const mockWallet = {
  address: 'CdDUfT6gsUJFb5VArH21ZVRWqT8bM6Cqz',
  publicKey: '041fb3e64146d233569cd0eed92a2e02471155eb',
  mnemonic: 'ice umbrella zenith fish piano sigma solar water'
};
const backup = generateWalletBackup(mockWallet);
console.log('Backup size: ' + backup.data.length + ' bytes');
const restored = restoreWalletFromBackup(backup);
console.log('Restored address: ' + restored.address);
console.log('Match: ' + (restored.address === mockWallet.address));

module.exports = { encrypt, decrypt, hashPassword, verifyPassword, generate2FASecret, generate2FACode, verify2FACode, generateWalletBackup, restoreWalletFromBackup };
