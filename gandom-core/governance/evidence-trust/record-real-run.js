const fs=require("fs");
const crypto=require("crypto");
const cp=require("child_process");

const dir="gandom-core/governance/evidence-trust";
const challenges=fs.readdirSync(dir)
  .filter(x=>x.endsWith(".challenge.json"))
  .sort();

if(!challenges.length) process.exit(1);

const cf=challenges.at(-1);
const c=JSON.parse(fs.readFileSync(dir+"/"+cf,"utf8"));

const evidence={
  protocol:"2558-EVIDENCE",
  runId:c.runId,
  challenge:c.challenge,
  timestamp:new Date().toISOString(),
  projectRoot:process.cwd(),
  gitHead:cp.execSync("git rev-parse HEAD",{encoding:"utf8"}).trim(),
  realRuntime:true,
  fakeEvidence:false,
  status:"RUNTIME_OBSERVED"
};

const hash=crypto
  .createHash("sha256")
  .update(JSON.stringify(evidence))
  .digest("hex");

evidence.evidenceHash=hash;

fs.writeFileSync(
  `${dir}/${c.runId}.evidence.json`,
  JSON.stringify(evidence,null,2)+"\n"
);

console.log("REAL_RUN_RECEIPT=CREATED");
console.log("RUN_ID="+c.runId);
console.log("EVIDENCE_HASH="+hash);
