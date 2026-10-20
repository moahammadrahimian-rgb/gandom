const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const KEY_DIR = path.join(__dirname, "gandom-keys");
const PRIVATE_KEY = path.join(KEY_DIR, "private.pem");
const PUBLIC_KEY = path.join(KEY_DIR, "public.pem");

function ensureKeys() {
  fs.mkdirSync(KEY_DIR, { recursive: true });

  if (!fs.existsSync(PRIVATE_KEY) || !fs.existsSync(PUBLIC_KEY)) {
    const { publicKey, privateKey } =
      crypto.generateKeyPairSync("ed25519", {
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
      });

    fs.writeFileSync(PRIVATE_KEY, privateKey, { mode: 0o600 });
    fs.writeFileSync(PUBLIC_KEY, publicKey, { mode: 0o644 });
  }

  return {
    publicKey: fs.readFileSync(PUBLIC_KEY, "utf8"),
    privateKey: fs.readFileSync(PRIVATE_KEY, "utf8")
  };
}

function canonicalJSON(obj) {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj))
    return "[" + obj.map(canonicalJSON).join(",") + "]";

  return "{" +
    Object.keys(obj).sort().map(k =>
      JSON.stringify(k) + ":" + canonicalJSON(obj[k])
    ).join(",") +
  "}";
}

function signEvidence(evidence) {
  const { privateKey } = ensureKeys();

  const payload = { ...evidence };
  delete payload.signature;
  delete payload.evidence_hash;

  const canonical = canonicalJSON(payload);

  const evidenceHash = crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex");

  const signature = crypto
    .sign(null, Buffer.from(evidenceHash, "hex"), privateKey)
    .toString("base64");

  return {
    ...evidence,
    evidence_hash: evidenceHash,
    signature,
    sig_alg: "ed25519"
  };
}

module.exports = {
  ensureKeys,
  signEvidence,
  canonicalJSON
};
