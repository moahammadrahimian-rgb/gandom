// ═══════════════════════════════════════════════════════
// 👑 GANDOM MOTHER NODE - نود مادر ۲۵۵۸
// ═══════════════════════════════════════════════════════

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "mother-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const IDENTITY_FILE = path.join(DIR, "identity.json");
const KEYS_FILE = path.join(DIR, "keys.json");

// ─── اطلاعات ثابت نود مادر ───
const MOTHER_INFO = {
  mother_id: "GDM-MOTHER-2558",
  mother_name: "GANDOM-MOTHER-NODE",
  law: "2558",
  version: "1.0.0",
  network: "GANDOM-NETWORK",
  wallet_address: "GDM-MOTHER-WALLET-2558-OWNER",
  created_at: "2026-10-14",
  owner: "MOHAMMAD-RAHIMIAN",
  role: "MOTHER"
};

class MotherNode {
  constructor() {
    this.identity = null;
    this.keys = null;
    this.loadOrCreate();
  }

  loadOrCreate() {
    try {
      if (fs.existsSync(IDENTITY_FILE) && fs.existsSync(KEYS_FILE)) {
        this.identity = JSON.parse(fs.readFileSync(IDENTITY_FILE, "utf8"));
        this.keys = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
        console.log("✅ نود مادر از دیسک بارگذاری شد");
        return;
      }
    } catch(e) {}

    // ساخت هویت جدید
    this.generateIdentity();
  }

  generateIdentity() {
    console.log("🔑 ساخت هویت جدید نود مادر...");

    // ED25519 keypair
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });

    // Fingerprint (اثر انگشت)
    const fingerprint = crypto.createHash("sha256")
      .update(publicKeyPem)
      .digest("hex")
      .substring(0, 32);

    // Hash نهایی هویت
    const identityData = {
      ...MOTHER_INFO,
      public_key: publicKeyPem,
      fingerprint: fingerprint,
      generated_at: new Date().toISOString()
    };

    const identityHash = crypto.createHash("sha256")
      .update(JSON.stringify(identityData))
      .digest("hex");

    this.identity = {
      ...identityData,
      identity_hash: identityHash
    };

    this.keys = {
      public_key: publicKeyPem,
      private_key: privateKeyPem,
      fingerprint: fingerprint
    };

    fs.writeFileSync(IDENTITY_FILE, JSON.stringify(this.identity, null, 2));
    fs.writeFileSync(KEYS_FILE, JSON.stringify(this.keys, null, 2));

    console.log("✅ هویت نود مادر ساخته شد");
  }

  // ─── امضا ───
  sign(data) {
    try {
      const privateKey = crypto.createPrivateKey(this.keys.private_key);
      const signature = crypto.sign(null, Buffer.from(JSON.stringify(data)), privateKey);
      return signature.toString("hex");
    } catch(e) {
      return null;
    }
  }

  // ─── تأیید امضا ───
  static verify(publicKeyPem, data, signature) {
    try {
      const publicKey = crypto.createPublicKey(publicKeyPem);
      return crypto.verify(
        null,
        Buffer.from(JSON.stringify(data)),
        publicKey,
        Buffer.from(signature, "hex")
      );
    } catch(e) {
      return false;
    }
  }

  // ─── اطلاعات عمومی ───
  getPublicInfo() {
    return {
      mother_id: this.identity.mother_id,
      mother_name: this.identity.mother_name,
      law: this.identity.law,
      wallet_address: this.identity.wallet_address,
      public_key: this.identity.public_key,
      fingerprint: this.identity.fingerprint,
      identity_hash: this.identity.identity_hash,
      created_at: this.identity.created_at,
      role: "MOTHER"
    };
  }

  // ─── امضای بلوک ───
  signBlock(block) {
    const blockData = {
      index: block.index,
      hash: block.hash,
      timestamp: block.timestamp,
      mother_id: this.identity.mother_id
    };
    return {
      block: blockData,
      signature: this.sign(blockData),
      signed_by: this.identity.mother_id,
      signed_at: new Date().toISOString()
    };
  }

  // ─── چک کردن مالکیت ───
  isOwner(address) {
    return address === this.identity.wallet_address;
  }
}

module.exports = { MotherNode, MOTHER_INFO };
