// ==========================================
// GANDOM WALLET MODULE
// ماژول کیف پول گندم (قدم ۱ تا ۷)
// ==========================================

const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const fs = require('fs');
const path = require('path');

const WALLET_FILE = path.join(__dirname, 'wallet.json');

// ==========================================
// قدم ۱: ساخت کلید خصوصی (Private Key)
// ==========================================
function generatePrivateKey() {
  const privateKey = crypto.randomBytes(32).toString('hex');
  console.log('✅ Private Key generated');
  return privateKey;
}

// ==========================================
// قدم ۲: ساخت کلید عمومی (Public Key)
// ==========================================
function getPublicKey(privateKey) {
  const key = ec.keyFromPrivate(privateKey, 'hex');
  const publicKey = key.getPublic('hex');
  console.log('✅ Public Key generated');
  return publicKey;
}

// ==========================================
// قدم ۳: ساخت آدرس (Address)
// ==========================================
function getAddress(publicKey) {
  const sha256 = crypto.createHash('sha256').update(publicKey).digest();
  const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest();
  const versioned = Buffer.concat([Buffer.from([0x00]), ripemd160]);
  const checksum = crypto.createHash('sha256')
    .update(crypto.createHash('sha256').update(versioned).digest())
    .digest()
    .slice(0, 4);
  const address = base58Encode(Buffer.concat([versioned, checksum]));
  console.log(`✅ Address generated: ${address}`);
  return address;
}

function base58Encode(buffer) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt('0x' + buffer.toString('hex'));
  let result = '';
  while (num > 0) {
    const mod = num % 58n;
    result = ALPHABET[Number(mod)] + result;
    num = num / 58n;
  }
  return result;
}

// ==========================================
// قدم ۴: ساخت Mnemonic (۲۴ کلمه)
// ==========================================
function generateMnemonic() {
  const wordlist = [
    'apple', 'banana', 'cat', 'dog', 'elephant', 'fish', 'goat', 'horse',
    'ice', 'jump', 'kite', 'lion', 'moon', 'night', 'ocean', 'piano',
    'queen', 'rabbit', 'sun', 'tree', 'umbrella', 'violin', 'water', 'xray',
    'yellow', 'zebra', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
    'sigma', 'omega', 'nova', 'orbit', 'pulse', 'quantum', 'radar', 'solar',
    'titan', 'ultra', 'vortex', 'warp', 'xenon', 'yield', 'zenith', 'atom'
  ];
  const words = [];
  for (let i = 0; i < 24; i++) {
    words.push(wordlist[Math.floor(Math.random() * wordlist.length)]);
  }
  console.log('✅ Mnemonic generated (24 words)');
  return words.join(' ');
}

// ==========================================
// قدم ۵: ذخیره امن کیف پول
// ==========================================
function saveWallet(wallet) {
  const key = crypto.scryptSync('gandom-secret-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(wallet), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const encryptedWallet = { iv: iv.toString('hex'), data: encrypted };
  fs.writeFileSync(WALLET_FILE, JSON.stringify(encryptedWallet, null, 2));
  console.log(`✅ Wallet saved to ${WALLET_FILE}`);
  return encryptedWallet;
}

function loadWallet() {
  if (!fs.existsSync(WALLET_FILE)) {
    console.log('⚠️  Wallet not found');
    return null;
  }
  const encryptedWallet = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
  const key = crypto.scryptSync('gandom-secret-key', 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(encryptedWallet.iv, 'hex'));
  let decrypted = decipher.update(encryptedWallet.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  console.log('✅ Wallet loaded');
  return JSON.parse(decrypted);
}

// ==========================================
// قدم ۶: امضای تراکنش
// ==========================================
function signTransaction(privateKey, transaction) {
  const key = ec.keyFromPrivate(privateKey, 'hex');
  const txHash = crypto.createHash('sha256').update(JSON.stringify(transaction)).digest('hex');
  const signature = key.sign(txHash).toDER('hex');
  console.log('✅ Transaction signed');
  return signature;
}

// ==========================================
// قدم ۷: تأیید امضا
// ==========================================
function verifyTransaction(publicKey, transaction, signature) {
  const key = ec.keyFromPublic(publicKey, 'hex');
  const txHash = crypto.createHash('sha256').update(JSON.stringify(transaction)).digest('hex');
  const isValid = key.verify(txHash, signature);
  console.log(`✅ Signature ${isValid ? 'VALID' : 'INVALID'}`);
  return isValid;
}

// ==========================================
// ساخت کیف پول کامل
// ==========================================
function createWallet(ownerShare = 1200000000) {
  const privateKey = generatePrivateKey();
  const publicKey = getPublicKey(privateKey);
  const address = getAddress(publicKey);
  const mnemonic = generateMnemonic();
  const wallet = {
    address,
    publicKey,
    privateKey,
    mnemonic,
    balance: ownerShare,
    createdAt: new Date().toISOString()
  };
  saveWallet(wallet);
  return wallet;
}

// ==========================================
// اجرا
// ==========================================
if (require.main === module) {
  console.log('==========================================');
  console.log('🌾 GANDOM WALLET GENERATOR');
  console.log('==========================================\n');
  const wallet = createWallet();
  console.log('\n--- Wallet Created ---');
  console.log(`📍 Address:    ${wallet.address}`);
  console.log(`🔓 Public Key: ${wallet.publicKey.substring(0, 40)}...`);
  console.log(`🔑 Private Key: ${wallet.privateKey.substring(0, 20)}...`);
  console.log(`📝 Mnemonic:   ${wallet.mnemonic}`);
  console.log(`💰 Balance:    ${wallet.balance} GDM`);
  console.log('\n⚠️  BACKUP your private key and mnemonic!');
  console.log('==========================================');
}

module.exports = {
  generatePrivateKey,
  getPublicKey,
  getAddress,
  generateMnemonic,
  saveWallet,
  loadWallet,
  signTransaction,
  verifyTransaction,
  createWallet
};
