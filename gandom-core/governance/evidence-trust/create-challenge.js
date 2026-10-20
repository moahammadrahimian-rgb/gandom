const fs=require("fs");
const crypto=require("crypto");
const cp=require("child_process");

const runId="RUN-"+new Date().toISOString().replace(/[-:.TZ]/g,"")+"-"+crypto.randomBytes(8).toString("hex");
const challenge=crypto.randomBytes(32).toString("hex");

const root=process.cwd();
const head=cp.execSync("git rev-parse HEAD",{encoding:"utf8"}).trim();

const record={
  protocol:"2558-EVIDENCE",
  runId,
  challenge,
  createdAt:new Date().toISOString(),
  projectRoot:root,
  gitHead:head,
  status:"OPEN"
};

const file=`gandom-core/governance/evidence-trust/${runId}.challenge.json`;
fs.writeFileSync(file,JSON.stringify(record,null,2)+"\n");

console.log("RUN_ID="+runId);
console.log("CHALLENGE_FILE="+file);
console.log("CHALLENGE_CREATED=PASS");
console.log("GIT_HEAD="+head);
