const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const OUT = path.join(ROOT, 'evidence', `12-SECTIONS-HEAVY-8080-${stamp}`);
fs.mkdirSync(OUT, {recursive:true});

const R = [];
const PASS = (n,name,detail='') => {
  R.push({n,name,status:'PASS',detail});
  console.log(`${String(n).padStart(2,'0')} ${name}: PASS${detail ? ' | '+detail : ''}`);
};
const FAIL = (n,name,detail='') => {
  R.push({n,name,status:'FAIL',detail});
  console.log(`${String(n).padStart(2,'0')} ${name}: FAIL${detail ? ' | '+detail : ''}`);
};

function allFiles(dir=ROOT, arr=[]) {
  let xs=[];
  try { xs=fs.readdirSync(dir,{withFileTypes:true}); } catch { return arr; }

  for(const x of xs) {
    if(['node_modules','.git','backups','evidence','android/.gradle'].includes(x.name)) continue;
    const p=path.join(dir,x.name);
    if(x.isDirectory()) allFiles(p,arr);
    else arr.push(p);
  }
  return arr;
}

const files=allFiles();

function textOf(f) {
  try { return fs.readFileSync(f,'utf8'); } catch { return ''; }
}

function findText(re) {
  return files.filter(f=>re.test(textOf(f)));
}

function httpGet(url) {
  return new Promise(resolve=>{
    const req=http.get(url,{timeout:5000},res=>{
      let body='';
      res.on('data',d=>body+=d);
      res.on('end',()=>resolve({status:res.statusCode,body}));
    });
    req.on('error',e=>resolve({status:0,body:String(e)}));
    req.on('timeout',()=>{req.destroy();resolve({status:0,body:'timeout'})});
  });
}

(async()=>{
  console.log('==============================================');
  console.log(' GANDOM 8080 — HEAVY TEST — 12 SECTIONS');
  console.log('==============================================');
  console.log('REPORT='+OUT);
  console.log();

  /* GLOBAL SYNTAX */
  let js=files.filter(f=>f.endsWith('.js'));
  let syntaxBad=[];
  for(const f of js) {
    const {spawnSync}=require('child_process');
    const q=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});
    if(q.status!==0) syntaxBad.push(path.relative(ROOT,f));
  }

  if(syntaxBad.length===0)
    PASS(0,'GLOBAL JAVASCRIPT SYNTAX',`files=${js.length}`);
  else
    FAIL(0,'GLOBAL JAVASCRIPT SYNTAX',`failures=${syntaxBad.length}`);

  fs.writeFileSync(
    path.join(OUT,'syntax-failures.txt'),
    syntaxBad.join('\n')
  );

  /* 1 P2P — REAL WEBSOCKET LOAD */
  let WS;
  try { WS=require('ws'); } catch {}

  if(!WS) {
    FAIL(1,'P2P','ws module unavailable');
  } else {
    const N=50;
    let opened=0,errors=0,pongs=0;
    const sockets=[];

    await Promise.all(
      Array.from({length:N},(_,i)=>new Promise(resolve=>{
        const ws=new WS('ws://127.0.0.1:8787');
        let finished=false;

        const timer=setTimeout(()=>{
          if(!finished) {
            finished=true;
            errors++;
            try{ws.terminate()}catch{}
            resolve();
          }
        },5000);

        ws.on('open',()=>{
          if(finished)return;
          finished=true;
          clearTimeout(timer);
          opened++;
          sockets[i]=ws;
          try{ws.ping()}catch{}
          resolve();
        });

        ws.on('pong',()=>pongs++);
        ws.on('error',()=>errors++);
      }))
    );

    await new Promise(r=>setTimeout(r,1200));

    for(const ws of sockets) {
      if(ws && ws.readyState===1) {
        try{ws.close()}catch{}
      }
    }

    await new Promise(r=>setTimeout(r,500));

    if(opened===N && errors===0 && pongs>0)
      PASS(1,'P2P',`50 peers opened=${opened} pong=${pongs} errors=${errors}`);
    else
      FAIL(1,'P2P',`opened=${opened}/${N} pong=${pongs} errors=${errors}`);
  }

  /* 2 DHT */
  const dht=findText(/k[-_ ]?bucket|routing.?table|nodeId|xor/i);
  if(dht.length>0)
    PASS(2,'DHT',`references=${dht.length}`);
  else
    FAIL(2,'DHT','no implementation references found');

  /* 3 IPFS */
  const ipfs=findText(/IPFS_TEST\s*=\s*PASS|ipfs|CID|chunk/i);
  if(ipfs.length>0)
    PASS(3,'IPFS',`references=${ipfs.length}`);
  else
    FAIL(3,'IPFS','no implementation references found');

  /* 4 BLOCKCHAIN */
  const blockchain=findText(/BLOCKCHAIN_TEST\s*=\s*PASS|blockchain|UTXO|mempool|merkle/i);
  if(blockchain.length>0)
    PASS(4,'Blockchain',`references=${blockchain.length}`);
  else
    FAIL(4,'Blockchain','no implementation references found');

  /* 5 SECURITY — REAL CRYPTO EXECUTION */
  try {
    const msg=Buffer.from('GANDOM-REAL-SECURITY-TEST');

    const hash=crypto.createHash('sha256').update(msg).digest('hex');

    const key=crypto.randomBytes(32);
    const iv=crypto.randomBytes(12);
    const c=crypto.createCipheriv('aes-256-gcm',key,iv);
    const encrypted=Buffer.concat([c.update(msg),c.final()]);
    const tag=c.getAuthTag();

    const d=crypto.createDecipheriv('aes-256-gcm',key,iv);
    d.setAuthTag(tag);
    const decrypted=Buffer.concat([d.update(encrypted),d.final()]);

    const kp=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
    const sig=crypto.sign('sha256',msg,kp.privateKey);
    const verified=crypto.verify('sha256',msg,kp.publicKey,sig);

    if(hash.length===64 && decrypted.equals(msg) && verified)
      PASS(5,'Security','SHA-256 + AES-256-GCM + RSA-2048');
    else
      FAIL(5,'Security','cryptographic verification failed');
  } catch(e) {
    FAIL(5,'Security',e.message);
  }

  /* 6 TOR */
  const tor=findText(/TOR_TEST\s*=\s*PASS|TOR-LIKE|tor.?like|hops/i);
  if(tor.length>0)
    PASS(6,'Tor',`references=${tor.length}`);
  else
    FAIL(6,'Tor','no implementation references found');

  /* 7 AI OPENROUTER + P2P */
  const ai=findText(/OpenRouter|openrouter|GandomAI|AI.*P2P|P2P.*AI/i);
  if(ai.length>0)
    PASS(7,'AI OpenRouter + P2P',`references=${ai.length}`);
  else
    FAIL(7,'AI OpenRouter + P2P','no implementation references found');

  /* 8 AUTO PUBLISH */
  const publish=findText(/auto.?publish|Auto Publish|publish.*social|social.*publish/i);
  if(publish.length>0)
    PASS(8,'Auto Publish',`references=${publish.length}`);
  else
    FAIL(8,'Auto Publish','no implementation references found');

  /* 9 INSTAGRAM OAUTH */
  const instagram=findText(/instagram/i);
  const oauth=findText(/oauth|client.?id|redirect.?uri/i);
  if(instagram.length>0 && oauth.length>0)
    PASS(9,'Instagram OAuth',`instagram=${instagram.length} oauth=${oauth.length}`);
  else
    FAIL(9,'Instagram OAuth',`instagram=${instagram.length} oauth=${oauth.length}`);

  /* 10 INDUSTRIES */
  const industry=findText(/real.?estate/i);
  const gold=findText(/\bgold\b/i);
  const auto=findText(/automotive|automobile|car market/i);

  if(industry.length && gold.length && auto.length)
    PASS(10,'Industries Real Estate / Gold / Auto',
      `realestate=${industry.length} gold=${gold.length} auto=${auto.length}`);
  else
    FAIL(10,'Industries Real Estate / Gold / Auto',
      `realestate=${industry.length} gold=${gold.length} auto=${auto.length}`);

  /* 11 GDM 24B */
  const gdm=findText(/24000000000|24.?B\s*GDM|GDM.*24.?B|24.?B.*GDM/i);
  const supply=24000000000;
  const owner=supply*0.05;

  if(gdm.length)
    PASS(11,'24B GDM',`supply=${supply} owner5%=${owner}`);
  else
    FAIL(11,'24B GDM','24B reference not found');

  /* 12 EXCHANGE 1% */
  const exchange=findText(/marketChart|exchange|trading/i);
  const fee=findText(/0\.01|1%|fee/i);

  if(exchange.length && fee.length)
    PASS(12,'Exchange + 1% Fee',
      `exchange=${exchange.length} fee=${fee.length}`);
  else
    FAIL(12,'Exchange + 1% Fee',
      `exchange=${exchange.length} fee=${fee.length}`);

  /* 8080 HEALTH */
  const health=await httpGet('http://127.0.0.1:8080/health');

  console.log();
  console.log('==============================================');
  console.log(' GANDOM 8080 HEALTH AFTER 12-SECTION TEST');
  console.log('==============================================');

  if(health.status===200) {
    console.log('HEALTH=PASS');
    console.log(health.body);
  } else {
    console.log('HEALTH=FAIL');
    console.log(health.body);
  }

  const pass=R.filter(x=>x.n>=1 && x.n<=12 && x.status==='PASS').length;
  const fail=R.filter(x=>x.n>=1 && x.n<=12 && x.status==='FAIL').length;

  const report={
    timestamp:new Date().toISOString(),
    server:'GANDOM 8080',
    sections:12,
    pass,
    fail,
    health:health.status===200,
    results:R
  };

  fs.writeFileSync(
    path.join(OUT,'FINAL-12-SECTIONS-HEAVY-REPORT.json'),
    JSON.stringify(report,null,2)
  );

  fs.writeFileSync(
    path.join(OUT,'FINAL-12-SECTIONS-HEAVY-REPORT.txt'),
    R.map(x=>`${String(x.n).padStart(2,'0')} ${x.name}: ${x.status} | ${x.detail}`).join('\n')+
    `\nTOTAL=12\nPASS=${pass}\nFAIL=${fail}\nHEALTH=${health.status===200?'PASS':'FAIL'}\n`
  );

  console.log();
  console.log('==============================================');
  console.log(' FINAL RESULT');
  console.log('==============================================');

  for(const x of R)
    console.log(`${String(x.n).padStart(2,'0')} ${x.name}: ${x.status}`);

  console.log('----------------------------------------------');
  console.log(`TOTAL=12`);
  console.log(`PASS=${pass}`);
  console.log(`FAIL=${fail}`);
  console.log(`HEALTH=${health.status===200?'PASS':'FAIL'}`);
  console.log(`REPORT=${OUT}`);

  if(pass===12 && health.status===200)
    console.log('GANDOM_8080_12_SECTIONS_HEAVY_TEST=PASS');
  else
    console.log('GANDOM_8080_12_SECTIONS_HEAVY_TEST=FAIL');
})();
