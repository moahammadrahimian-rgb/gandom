"use strict";

const fs = require("fs");
const crypto = require("crypto");
const engine = require("./engine");
const verifier = require("./independent-verifier");

const result = engine.run();
const verification = verifier.verify(result);

const evidence = {
  law: "2558",
  layer: "GML-2558-MATH-PHYSICS",
  timestamp: new Date().toISOString(),
  engine: result,
  independentVerification: verification,
  locked: verification.INDEPENDENT_ALL_PASS === true
};

const raw = JSON.stringify(evidence, null, 2);
const hash = crypto.createHash("sha256").update(raw).digest("hex");

evidence.evidenceSha256 = hash;

fs.writeFileSync(
  __dirname + "/EVIDENCE-GML-2558-MATH-PHYSICS.json",
  JSON.stringify(evidence, null, 2)
);

console.log("=== GML-2558 MATH / GEOMETRY / PHYSICS ===");
console.log("FUNCTION=" + result.checks.FUNCTION_FINITE);
console.log("DERIVATIVE=" + result.checks.DERIVATIVE_MATCH);
console.log("GEOMETRY=" + result.checks.GEOMETRY_3_4_5);
console.log("PHYSICS=" + result.checks.PHYSICS_F_MA);
console.log("NUMERICAL=" + result.checks.NUMERIC_FINITE);
console.log("INDEPENDENT_VERIFICATION=" +
  verification.INDEPENDENT_ALL_PASS);
console.log("EVIDENCE_SHA256=" + hash);

if (!verification.INDEPENDENT_ALL_PASS) {
  console.log("GML_2558_LOCK=BLOCKED");
  process.exit(1);
}

console.log("GML_2558_LOCK=PASS");
console.log("GML_2558_STATUS=LOCKED");
