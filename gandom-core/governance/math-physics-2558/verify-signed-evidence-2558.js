"use strict";

const fs = require("fs");
const crypto = require("crypto");

const file =
  process.argv[2] ||
  "gandom-core/governance/math-physics-2558/EVIDENCE-GML-2558-MATH-PHYSICS-SIGNED.json";

const e =
  JSON.parse(fs.readFileSync(file, "utf8"));

function canonicalJSON(obj) {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJSON).join(",") + "]";
  }

  return "{" +
    Object.keys(obj)
      .sort()
      .map(k =>
        JSON.stringify(k) + ":" + canonicalJSON(obj[k])
      )
      .join(",") +
  "}";
}

let ok = true;

function check(name, value) {
  console.log(name + "=" + (value ? "PASS" : "FAIL"));
  if (!value) ok = false;
}

check("EVIDENCE_ID", typeof e.evidenceId === "string");
check("SUBJECT", typeof e.subject === "string");
check("OBSERVER", typeof e.observer === "string");
check("TIMESTAMP_WALL", Number.isFinite(e.timestamp_wall));
check("TIMESTAMP_MONO", Number.isFinite(e.timestamp_mono));
check("PAYLOAD", e.payload !== undefined);
check(
  "PREV_EVIDENCE_HASH",
  typeof e.prev_evidence_hash === "string" &&
  /^[0-9a-f]{64}$/.test(e.prev_evidence_hash)
);
check("SIGNATURE", typeof e.signature === "string");
check("SIG_ALG", e.sig_alg === "ed25519");
check(
  "PUBLIC_KEY",
  typeof e.public_key_spki_pem === "string"
);
check(
  "EVIDENCE_HASH",
  typeof e.evidence_hash === "string" &&
  /^[0-9a-f]{64}$/.test(e.evidence_hash)
);

const claimedHash = e.evidence_hash;
const signature = e.signature;

delete e.evidence_hash;
delete e.signature;

const canonical = canonicalJSON(e);

const actualHash = crypto
  .createHash("sha256")
  .update(canonical)
  .digest("hex");

console.log(
  "EVIDENCE_HASH_MATCH=" +
  (actualHash === claimedHash ? "PASS" : "FAIL")
);

if (actualHash !== claimedHash) ok = false;

let signatureOk = false;

try {
  signatureOk = crypto.verify(
    null,
    Buffer.from(claimedHash, "hex"),
    e.public_key_spki_pem,
    Buffer.from(signature, "base64")
  );
} catch (_) {
  signatureOk = false;
}

console.log(
  "ED25519_SIGNATURE_VERIFICATION=" +
  (signatureOk ? "PASS" : "FAIL")
);

if (!signatureOk) ok = false;

console.log(
  "INDEPENDENT_2558_EVIDENCE_VERIFICATION=" +
  (ok ? "PASS" : "FAIL")
);

process.exit(ok ? 0 : 1);
