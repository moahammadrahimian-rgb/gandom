const http=require('http');
const base='http://127.0.0.1:'+(process.env.PORT||8787);

function get(path){return new Promise((ok,no)=>{
  const r=http.get(base+path,{timeout:5000},x=>{
    let b='';x.on('data',d=>b+=d);x.on('end',()=>{
      try{ok({path,status:x.statusCode,data:JSON.parse(b)})}
      catch{ok({path,status:x.statusCode,data:b})}
    })
  });r.on('error',e=>no(e));r.on('timeout',()=>{r.destroy();no(Error('TIMEOUT'))})
})}

(async()=>{
  console.log('=== GANDOM FULL AUDIT ===');
  let health,peers,chain;
  try{health=await get('/health')}catch(e){console.log('FINAL: FAIL - server unreachable');return}
  try{peers=await get('/api/peers')}catch(e){peers=null}
  try{chain=await get('/api/chain')}catch(e){chain=null}

  console.log('HEALTH:',health.status,JSON.stringify(health.data));
  console.log('PEERS:',peers?peers.status:'ERROR',peers?JSON.stringify(peers.data):'unavailable');
  console.log('CHAIN:',chain?chain.status:'ERROR');

  const c=chain&&chain.data&&Array.isArray(chain.data.chain)?chain.data.chain:[];
  let links=true,tx=0;
  for(let i=0;i<c.length;i++){
    tx+=Number(c[i].tx_count||c[i].transactions?.length||0);
    if(i>0&&(c[i].index!==c[i-1].index+1||
      c[i].prevHash!==c[i-1].hash))links=false;
  }

  const pc=peers&&peers.data&&(
    peers.data.peers_count??peers.data.peers?.length??0
  );

  console.log('BLOCK HEIGHT:',c.length);
  console.log('TRANSACTIONS:',tx);
  console.log('CHAIN LINKS:',links?'PASS':'FAIL');
  console.log('CONNECTED PEERS:',pc);
  console.log('HEALTH CHECK:',health.data?.ok?'PASS':'FAIL');
  console.log('P2P CHECK:',pc>0?'PASS':'FAIL');
  console.log('CHAIN CHECK:',c.length>=2&&links?'PASS':'FAIL');

  if(health.data?.ok&&pc>0&&c.length>=2&&links)
    console.log('FINAL: PASS_CORE');
  else console.log('FINAL: NEEDS_FIX');
})().catch(e=>console.log('FINAL: FAIL - '+e.message));
