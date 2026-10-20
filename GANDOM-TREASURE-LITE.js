const fs=require('fs');
const path=require('path');

const ROOT=process.cwd();
const OUT=path.join(ROOT,'runtime-logs');
fs.mkdirSync(OUT,{recursive:true});

const SKIP=new Set([
'.git','node_modules','.gradle','build','dist',
'coverage','.cache','tmp','temp'
]);

const EXT=new Set([
'.js','.mjs','.cjs','.ts','.tsx','.jsx',
'.json','.md','.txt','.sh','.py',
'.yml','.yaml','.html','.css','.xml',
'.kt','.java','.gradle'
]);

const GROUPS={
SPECIES:['species','specie','organism','organismid','creature','population','ecology','ecosystem','گونه'],
GENOME:['genome','genotype','phenotype','dna','rna','gene','genes','heredity','inheritance','mutation','ژن','ژنوم','وراثت','جهش'],
REPRODUCTION:['birth','born','reproduction','reproduce','replication','self-replication','division','offspring','child','parent','generation','تولد','تولیدمثل','تکثیر','تقسیم','فرزند','والد'],
CELL:['cell','cell-life','celllife','metabolism','behavior','communication','selection','death','alive','سلول','حیات','متابولیسم'],
NEURAL:['neuron','synapse','brain','neural','activation','learning','decision','نورون','سیناپس','مغز','یادگیری'],
P2P:['p2p','peer','discovery','registry','handshake','heartbeat','reconnect','node','tcp','websocket','ws://','نود','همتا','کشف','شبکه'],
AI:['artificial intelligence','agent','worker','workforce','scheduler','task','هوش','عامل','کارگر'],
ECONOMY:['wallet','ledger','payment','transaction','revenue','escrow','settlement','commerce','کیف پول','پرداخت','تراکنش','درآمد'],
SECURITY:['security','safety','quarantine','revoke','killswitch','authorization','owner','trust','verification','امنیت','ایمنی','قرنطینه'],
MATH:['geometry','function','derivative','integral','limit','continuity','equation','physics','electromagnet','dynamics','math','هندسه','تابع','مشتق','انتگرال','فیزیک'],
EVIDENCE:['evidence','audit','verify','PASS_REAL','FAIL','NOT_CLAIMED','BLOCKED_REAL','rollback','backup'],
ANDROID:['android','capacitor','apk','manifest','com.gandom.app']
};

const counts={};
const samples={};

for(const g of Object.keys(GROUPS)){
 counts[g]=0;
 samples[g]=[];
}

let files=0;
let totalBytes=0;
let statusLines=0;

function walk(dir){
 let list;
 try{list=fs.readdirSync(dir,{withFileTypes:true})}catch{return}

 for(const e of list){
  if(SKIP.has(e.name))continue;

  const f=path.join(dir,e.name);

  if(e.isDirectory()){
   walk(f);
   continue;
  }

  if(!e.isFile())continue;

  const ext=path.extname(e.name).toLowerCase();
  if(!EXT.has(ext))continue;

  files++;

  try{
   const st=fs.statSync(f);
   totalBytes+=st.size;
  }catch{}

  let text;
  try{
   text=fs.readFileSync(f,'utf8');
  }catch{
   continue;
  }

  const lines=text.split(/\r?\n/);

  for(let i=0;i<lines.length;i++){
   const line=lines[i];
   const low=line.toLowerCase();
   const rel=path.relative(ROOT,f);

   for(const [group,terms] of Object.entries(GROUPS)){
    let hit=false;

    for(const term of terms){
     if(low.includes(term.toLowerCase())){
      hit=true;
      break;
     }
    }

    if(hit){
     counts[group]++;

     if(samples[group].length<30){
      samples[group].push(
       rel+':'+(i+1)+': '+line.trim().slice(0,220)
      );
     }
    }
   }

   if(/PASS_REAL|FAIL|NOT_CLAIMED|BLOCKED_REAL/i.test(line)){
    statusLines++;
   }
  }
 }
}

console.log('===== GANDOM TREASURE LITE =====');
console.log('LAW=2558');
console.log('NO_FAKE_PASS=1');
console.log('SCAN=START');

walk(ROOT);

const result={
LAW:'2558',
NO_FAKE_PASS:true,
ROOT,
FILES_SCANNED:files,
TOTAL_SOURCE_BYTES:totalBytes,
STATUS_LINES:statusLines,
GROUP_COUNTS:counts,
SAMPLES:samples,
SCAN_ONLY:true,
PROJECT_FILES_MODIFIED:false,
TIMESTAMP:new Date().toISOString()
};

const stamp=new Date().toISOString().replace(/[:.]/g,'-');

const json=path.join(
 OUT,
 'GANDOM-TREASURE-LITE-'+stamp+'.json'
);

fs.writeFileSync(json,JSON.stringify(result,null,2));

console.log('');
console.log('===== RESULT =====');
console.log('FILES_SCANNED='+files);
console.log('TOTAL_SOURCE_BYTES='+totalBytes);
console.log('STATUS_LINES='+statusLines);

for(const [k,v] of Object.entries(counts)){
 console.log(k+'_HITS='+v);
}

console.log('');
console.log('JSON_EVIDENCE='+json);
console.log('SCAN_ONLY=TRUE');
console.log('PROJECT_FILES_MODIFIED=FALSE');
console.log('NEXT=CLASSIFY_DISCOVERED_COMPONENTS');
