"use strict";

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const SRC = path.join(__dirname, "EVIDENCE-GML-2558-MATH-PHYSICS.json");
const OUT = path.join(
  __dirname,
  "EVIDENCE-GML-2558-MATH-PHYSICS-SIGNED.json"
);

const SIGN = path.join(
  __dirname,
  "..",
  "evidence-trust",
  "sign.js"
);

const { ensureKeys } = require(SIGN);

function canonicalJSON(obj) {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJSON).join(",") + "]";
  }

  const keys = Object.keys(obj).sort();

  return "{" +
    keys.map(k =>
      JSON.stringify(k) + ":" + canonicalJSON(obj[k])
    ).join(",") +
  "}";
}

const source = JSON.parse(fs.readFileSync(SRC, "utf8"));
const { publicKey, privateKey } = ensureKeys();

const timestampWall = Date.now();
const timestampMono = Number(process.hrtime.bigint() / 1000000n);

const payload = {
  sourceEvidenceFile: path.relative(process.cwd(), SRC),
  engine: source.engine || "GML-2558-MATH-PHYSICS",
  law: source.law || "2558",
  layer: source.layer || "math-physics",
  locked: source.locked === true,
  result: source.result || null,
  independentVerification:
    source.independentVerification || null,
  originalEvidenceSha256:
    source.evidenceSha256 || null
};

const evidence = {
  evidenceId:
    "gml-2558-math-physics-" +
    crypto.randomUUID(),

  subject: "GML_2558_MATH_GEOMETRY_PHYSICS_EXECUTION",

  observer: "GANDOM-LOCAL-INDEPENDENT-OBSERVER",

  counterparty: null,

  timestamp_wall: timestampWall,

  timestamp_mono: timestampMono,

  payload,

  prev_evidence_hash: "0".repeat(64),

  sig_alg: "ed25519",

  public_key_spki_pem: publicKey
};

const unsignedCanonical = canonicalJSON(evidence);

const evidenceHash = crypto
  .createHash("sha256")
  .update(unsignedCanonical)
  .digest("hex");

const signature = crypto
  .sign(
    null,
    Buffer.from(evidenceHash, "hex"),
    privateKey
  )
  .toString("base64");

evidence.evidence_hash = evidenceHash;
evidence.signature = signature;

fs.writeFileSync(
  OUT,
  JSON.stringify(evidence, null, 2) + "\n"
);

console.log("SIGNED_EVIDENCE=CREATED");
console.log("EVIDENCE_ID=" + evidence.evidenceId);
console.log("EVIDENCE_FILE=" + OUT);
console.log("SIG_ALG=" + evidence.sig_alg);
console.log("SIGNATURE_PRESENT=" + (!!evidence.signature));
console.log("PUBLIC_KEY_PRESENT=" + (!!evidence.public_key_spki_pem));
console.log("PREV_EVIDENCE_HASH=" + evidence.prev_evidence_hash);
console.log("EVIDENCE_HASH=" + evidence.evidence_hash);
