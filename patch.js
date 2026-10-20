const fs = require('fs');
let content = fs.readFileSync('blockchain-100.js', 'utf8');

// ─── پچ ۱: KeyPair ───
content = content.replace(
  /class KeyPair \{[\s\S]*?\n\}/,
  `class KeyPair {
  constructor() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    this.privateKeyObj = privateKey;
    this.publicKeyObj = publicKey;
    this.privateKey = privateKey.export({ type: 'pkcs8', format: 'pem' });
    this.publicKey = publicKey.export({ type: 'spki', format: 'pem' });
  }
  sign(data) {
    try {
      return crypto.sign(null, Buffer.from(data), this.privateKeyObj).toString('hex');
    } catch(e) { return null; }
  }
  static verify(publicKeyPem, data, signatureHex) {
    try {
      const pk = crypto.createPublicKey(publicKeyPem);
      return crypto.verify(null, Buffer.from(data), pk, Buffer.from(signatureHex, 'hex'));
    } catch(e) { return false; }
  }
}`
);

// ─── پچ ۲: Transaction.sign ───
content = content.replace(
  /sign\(privateKey\) \{[\s\S]*?\n  \}/,
  `sign(privateKey) {
    if (this.type === 'COINBASE') return true;
    try {
      const keyObj = crypto.createPrivateKey(privateKey);
      this.signature = crypto.sign(null, Buffer.from(this.getHash()), keyObj).toString('hex');
      return true;
    } catch(e) { 
      console.error('Sign err:', e.message);
      return false; 
    }
  }`
);

// ─── پچ ۳: Transaction.verify ───
content = content.replace(
  /verify\(\) \{[\s\S]*?\n  \}/,
  `verify() {
    if (this.type === 'COINBASE') return true;
    if (!this.signature || !this.publicKey) return false;
    try {
      const pk = crypto.createPublicKey(this.publicKey);
      return crypto.verify(null, Buffer.from(this.getHash()), pk, Buffer.from(this.signature, 'hex'));
    } catch(e) { return false; }
  }`
);

fs.writeFileSync('blockchain-100.js', content);
console.log('✅ پچ اعمال شد');

// بررسی
const check = fs.readFileSync('blockchain-100.js', 'utf8');
console.log('crypto.sign(null, ...):', check.includes('crypto.sign(null'));
console.log('crypto.verify(null, ...):', check.includes('crypto.verify(null'));
