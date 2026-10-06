const fs=require("fs");
const crypto=require("crypto");
const cp=require("child_process");

const dir="gandom-core/governance/evidence-trust";
const files=fs.readdirSync(dir).filter(x=>x.endsWith(".evidence.json"));

if(files.length===0){
  console.log("INDEPENDENT_VERIFICATION=FAIL");
  console.log("REASON=NO_EVIDENCE_FILE");
  process.exit(1);
}

const latest=files.sort().at(-1);
const evidence=JSON.parse(fs.readFileSync(dir+"/"+latest,"utf8"));

const challengeFile=dir+"/"+evidence.runId+".challenge.json";

if(!fs.existsSync(challengeFile)){
  console.log("INDEPENDENT_VERIFICATION=FAIL");
  console.log("REASON=CHALLENGE_MISSING");
  process.exit(1);
}

const challenge=JSON.parse(fs.readFileSync(challengeFile,"utf8"));
const currentHead=cp.execSync("git rev-parse HEAD",{encoding:"utf8"}).trim();

const checks=[
  ["RUN_ID_MATCH",evidence.runId===challenge.runId],
  ["CHALLENGE_MATCH",evidence.challenge===challenge.challenge],
  ["PROJECT_ROOT_MATCH",evidence.projectRoot===process.cwd()],
  ["GIT_HEAD_MATCH",evidence.gitHead===currentHead],
  ["REAL_RUNTIME",evidence.realRuntime===true],
  ["FAKE_EVIDENCE",evidence.fakeEvidence===false],
  ["TIMESTAMP_PRESENT",typeof evidence.timestamp==="string"],
  ["EVIDENCE_HASH_PRESENT",typeof evidence.evidenceHash==="string"]
];

let ok=true;

for(const [name,value] of checks){
  console.log(name+"="+(value?"PASS":"FAIL"));
  if(!value) ok=false;
}

const copy={...evidence};
delete copy.evidenceHash;

const actual=crypto
  .createHash("sha256")
  .update(JSON.stringify(copy))
  .digest("hex");

const hashOk=actual===evidence.evidenceHash;

console.log("EVIDENCE_HASH_VERIFICATION="+(hashOk?"PASS":"FAIL"));

if(!hashOk) ok=false;

console.log("INDEPENDENT_VERIFICATION="+(ok?"PASS":"FAIL"));

process.exit(ok?0:1);
