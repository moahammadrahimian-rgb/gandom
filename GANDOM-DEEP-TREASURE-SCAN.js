const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=process.cwd(),OUT=path.join(ROOT,'runtime-logs');
fs.mkdirSync(OUT,{recursive:true});

const SKIP=new Set(['.git','node_modules','.gradle','build','dist','coverage','.cache','tmp','temp']);
const EXT=new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.md','.txt','.sh','.py','.yml','.yaml','.html','.css','.xml','.kt','.java','.gradle']);

const G={
SPECIES:['species','specie','organism','creature','population','ecology','ecosystem','گونه','گونه‌ها'],
GENOME:['genome','genotype','phenotype','dna','rna','gene','genes','heredity','inheritance','mutation','ژن','ژنوم','وراثت','جهش'],
REPRODUCTION:['birth','born','reproduction','reproduce','replication','self-replication','division','offspring','child','parent','generation','تولد','تولیدمثل','تکثیر','تقسیم','فرزند','والد'],
CELL_LIFE:['cell','cell-life','cellLife','metabolism','behavior','communication','selection','death','alive','birth','division','سلول','حیات','متابولیسم','رفتار'],
NEURON_BRAIN:['neuron','neurons','synapse','synapses','brain','neural','activation','learning','decision','نورون','سیناپس','مغز','یادگیری'],
P2P_NETWORK:['p2p','peer','peers','discovery','registry','handshake','heartbeat','reconnect','node','tcp','websocket','ws://','نود','همتا','کشف','شبکه'],
AI:['ai','artificial','intelligence','agent','worker','workforce','scheduler','task','هوش','کارگر','عامل','وظیفه'],
ECONOMY:['wallet','ledger','payment','transaction','revenue','escrow','settlement','commerce','اقتصاد','کیف پول','پرداخت','تراکنش','درآمد'],
SECURITY:['security','safety','quarantine','revoke','killswitch','authorization','owner','trust','verify','verification','امنیت','ایمنی','قرنطینه','مالک','تأیید'],
MATH_PHYSICS:['geometry','function','derivative','integral','limit','continuity','equation','physics','electromagnet','dynamics','math','هندسه','تابع','مشتق','انتگرال','فیزیک'],
EVIDENCE:['evidence','audit','verify','verification','PASS_REAL','FAIL','rollback','backup','شواهد','ممیزی','راستی','بازگشت','پشتیبان'],
ANDROID:['android','capacitor','apk','manifest','com.gandom.app']
};

function walk(d,a=[]){
 for(const e of fs.readdirSync(d,{withFileTypes:true})){
  if(SKIP.has(e.name))continue;
  const f=path.join(d,e.name);
  if(e.isDirectory())walk(f,a);
  else if(e.isFile()&&EXT.has(path.extname(e.name).toLowerCase()))a.push(f);
 }
 return a;
}
function sha(f){return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}

const files=walk(ROOT),report={
law:'2558',no_fake_pass:true,root:ROOT,timestamp:new Date().toISOString(),
files_scanned:files.length,groups:{},files_by_group:{},
species:[],genome:[],reproduction:[],status:[],duplicates:[]
};

for(const g of Object.keys(G)){report.groups[g]=0;report.files_by_group[g]=[]}

const bases=new Map();

for(const f of files){
 let t='';
 try{t=fs.readFileSync(f,'utf8')}catch{continue}
 const rel=path.relative(ROOT,f),lo=t.toLowerCase();
 const b=path.basename(f).toLowerCase();
 if(!bases.has(b))bases.set(b,[]);
 bases.get(b).push(rel);

 for(const [g,terms] of Object.entries(G)){
  let n=0,matched=[];
  for(const term of terms){
   let p=0,c=0,x=term.toLowerCase();
   while((p=lo.indexOf(x,p))>=0){c++;p+=Math.max(1,x.length);if(c>100)break}
   if(c){n+=c;matched.push(term+':'+c)}
  }
  if(n){report.groups[g]+=n;report.files_by_group[g].push({file:rel,hits:n,matched})}
 }

 for(const [i,line] of t.split(/\r?\n/).entries()){
  const z={file:rel,line:i+1,text:line.trim().slice(0,400)};
  if(/species|organism|genome|genotype|phenotype/i.test(line))report.species.push(z);
  if(/genome|genotype|phenotype|gene|mutation|heredity/i.test(line))report.genome.push(z);
  if(/birth|reproduction|replication|offspring|generation|division|mutation|heredity/i.test(line))report.reproduction.push(z);
  if(/PASS_REAL|FAIL|NOT_CLAIMED|BLOCKED_REAL/i.test(line))report.status.push(z);
 }
}

for(const [b,v] of bases)if(v.length>1)report.duplicates.push({basename:b,files:v});

const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const jp=path.join(OUT,'GANDOM-DEEP-TREASURE-SCAN-'+stamp+'.json');
const tp=path.join(OUT,'GANDOM-DEEP-TREASURE-SCAN-'+stamp+'.txt');

fs.writeFileSync(jp,JSON.stringify(report,null,2));

let s='===== GANDOM DEEP TREASURE SCAN =====\n';
s+='LAW=2558\nNO_FAKE_PASS=1\nROOT='+ROOT+'\nFILES_SCANNED='+files.length+'\n\n';
for(const [k,v] of Object.entries(report.groups))s+=k+'='+v+'\n';
s+='\n===== SPECIES/ORGANISM =====\n';
for(const x of report.species.slice(0,1000))s+=x.file+':'+x.line+': '+x.text+'\n';
s+='\n===== GENOME =====\n';
for(const x of report.genome.slice(0,1000))s+=x.file+':'+x.line+': '+x.text+'\n';
s+='\n===== REPRODUCTION =====\n';
for(const x of report.reproduction.slice(0,1000))s+=x.file+':'+x.line+': '+x.text+'\n';
s+='\n===== REAL STATUS =====\n';
for(const x of report.status.slice(0,2000))s+=x.file+':'+x.line+': '+x.text+'\n';
s+='\n===== DUPLICATES =====\n';
for(const x of report.duplicates){s+=x.basename+'\n';for(const f of x.files)s+='  '+f+'\n'}
fs.writeFileSync(tp,s);

console.log('===== GANDOM DEEP TREASURE SCAN =====');
console.log('LAW=2558');
console.log('NO_FAKE_PASS=1');
console.log('FILES_SCANNED='+files.length);
for(const [k,v] of Object.entries(report.groups))console.log(k+'_HITS='+v);
console.log('SPECIES_LINES='+report.species.length);
console.log('GENOME_LINES='+report.genome.length);
console.log('REPRODUCTION_LINES='+report.reproduction.length);
console.log('STATUS_LINES='+report.status.length);
console.log('DUPLICATE_BASENAMES='+report.duplicates.length);
console.log('JSON_EVIDENCE='+jp);
console.log('TEXT_EVIDENCE='+tp);
console.log('SCAN_ONLY=TRUE');
console.log('PROJECT_FILES_MODIFIED=FALSE');
