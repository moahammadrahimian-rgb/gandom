'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), os=require('node:os'), http=require('node:http'), vm=require('node:vm');
const ROOT=__dirname, LAW='2558', DIR=path.join(ROOT,'.gandom-agent-2558');
const LAWFILE=path.join(ROOT,'constitution/GOLDEN-MOTHER-LAW-2558.json');
const DOMAIN=path.join(ROOT,'gandom-core/governance/LAW-2558-GANDOM-SERVERS-AND-DOMAINS.json');
const REG=path.join(ROOT,'gandom-core/governance/GANDOM-AUTONOMOUS-AGENT-REGISTRY-2558.json');
const STATE=path.join(DIR,'final-state.json'), EVID=path.join(DIR,'final-evidence.jsonl');
fs.mkdirSync(DIR,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const json=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){return {__error:e.message}}};
function atomic(p,s){const t=p+'.tmp-'+process.pid;fs.writeFileSync(t,s,{mode:0o600});fs.renameSync(t,p)}
function evidence(x){let prev='GENESIS';try{const a=fs.readFileSync(EVID,'utf8').trim().split('\n').filter(Boolean);if(a.length)prev=JSON.parse(a[a.length-1]).record_hash||prev}catch{}const r={...x,law:LAW,at:new Date().toISOString(),previous_hash:prev};r.record_hash=hash(JSON.stringify(r));fs.appendFileSync(EVID,JSON.stringify(r)+'\n',{mode:0o600});return r}
function check(name,fn){try{const r=fn();const status=r.ok?'PASS_REAL_BOUNDED':'FAIL_REAL';evidence({check:name,status,result:r});return {name,status,result:r}}catch(e){evidence({check:name,status:'FAIL_REAL',error:String(e.stack||e)});return {name,status:'FAIL_REAL',error:e.message}}}
function walk(root,limit=15000){let a=[],stack=[root],capped=false;while(stack.length&&a.length<limit){const d=stack.pop();let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch{}for(const e of es){if(a.length>=limit){capped=true;break}if(['.git','node_modules','.gradle','build','dist','target','.cache'].includes(e.name))continue;const f=path.join(d,e.name);let s;try{s=fs.lstatSync(f)}catch{continue}a.push({path:path.relative(root,f),type:e.isDirectory()?'dir':e.isSymbolicLink()?'symlink':'file',size:s.size});if(e.isDirectory()&&!e.isSymbolicLink())stack.push(f)}}return {entries:a,capped}}
function localHealth(port){return new Promise(resolve=>{const q=http.get({hostname:'127.0.0.1',port,path:'/health',timeout:1000},r=>{let b='';r.on('data',x=>{if(b.length<4096)b+=x});r.on('end',()=>resolve({port,ok:r.statusCode>=200&&r.statusCode<300,statusCode:r.statusCode,body:b}))});q.on('timeout',()=>q.destroy(new Error('timeout')));q.on('error',e=>resolve({port,ok:false,error:e.message}))})}
async function main(){
 const results=[];
 results.push(check('LAW_2558_SCHEMA',()=>{const b=fs.readFileSync(LAWFILE),x=JSON.parse(b);return {ok:x.law_version==='2558'&&x.details?.owner_auth===true&&x.details?.strict_mode===true,law_version:x.law_version,owner_auth:x.details?.owner_auth,strict_mode:x.details?.strict_mode,sha256:hash(b)}}));
 for(const [name,p] of [['DOMAIN_SERVER_MANIFEST',DOMAIN],['AGENT_REGISTRY',REG]])results.push(check(name,()=>{if(!fs.existsSync(p))return {ok:false,path:path.relative(ROOT,p),reason:'MISSING'};const x=json(p);return {ok:!x.__error,path:path.relative(ROOT,p),keys:Object.keys(x),error:x.__error||null}}));
 results.push(check('PACKAGE_METADATA_ONLY',()=>{const x=json(path.join(ROOT,'package.json'));return {ok:!x.__error,name:x.name,version:x.version,scripts:Object.keys(x.scripts||{}),scripts_executed:false,dependencies:Object.keys(x.dependencies||{})}}));
 const inv=walk(ROOT);
 results.push(check('BOUNDED_INVENTORY',()=>({ok:inv.entries.length>0,count:inv.entries.length,capped:inv.capped,sha256:hash(JSON.stringify(inv.entries))})));
 const js=inv.entries.filter(x=>x.type==='file'&&x.path.endsWith('.js')).slice(0,350),bad=[];
 for(const x of js){try{new vm.Script(fs.readFileSync(path.join(ROOT,x.path),'utf8'),{filename:x.path})}catch(e){bad.push({path:x.path,error:e.message})}}
 results.push(check('JS_SYNTAX_ONLY',()=>({ok:bad.length===0,checked:js.length,failed:bad.length,errors:bad})));
 const manifest=json(DOMAIN),ports=[];
 function scan(x,p='manifest'){if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach((v,i)=>scan(v,p+'['+i+']'));return}for(const [k,v] of Object.entries(x)){if(/port/i.test(k)&&(typeof v==='number'||(typeof v==='string'&&/^\d+$/.test(v))))ports.push({path:p+'.'+k,port:Number(v),declaration_only:true});scan(v,p+'.'+k)}}
 if(!manifest.__error)scan(manifest);
 results.push(check('DECLARED_PORTS_ONLY',()=>({ok:!manifest.__error,ports:[...new Map(ports.map(x=>[x.path+':'+x.port,x])).values()],registration_is_not_listener_proof:true})));
 const health=[];for(const p of [...new Set(ports.map(x=>x.port).filter(x=>x>0&&x<65536))].slice(0,8))health.push(await localHealth(p));
 results.push(check('LOCAL_HEALTH_READ_ONLY',()=>({ok:health.length>0&&health.some(x=>x.ok),tested:health,not_tested_if_no_declared_ports:health.length===0})));
 const old=json(STATE),state={law:LAW,agent:'GANDOM-FINAL-AUTONOMOUS-AGENT-2558',run_count:(Number(old.run_count)||0)+1,started_at:new Date().toISOString(),completed_at:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,free_memory:os.freemem(),total_memory:os.totalmem(),inventory_count:inv.entries.length,inventory_capped:inv.capped,checks:results,restrictions:{golden_law_modified:false,backups_deleted:false,package_scripts_executed:false,services_started_or_killed:false,source_files_modified:false},project_status:'NOT_CLAIMED',meaning:'PASS_REAL_BOUNDED applies only to the named check; never means whole-project PASS_REAL'};
 atomic(STATE,JSON.stringify(state,null,2)+'\n');evidence({check:'RUN_SUMMARY',status:'COMPLETED_BOUNDED_AUDIT',run_count:state.run_count,checks:results.map(x=>({name:x.name,status:x.status})),project_status:'NOT_CLAIMED'});
 console.log('GANDOM_FINAL_AGENT=EXECUTED');console.log('LAW_2558='+LAW);console.log('RUN_COUNT='+state.run_count);for(const r of results)console.log(r.name+'='+r.status);console.log('STATE='+STATE);console.log('EVIDENCE='+EVID);console.log('PROJECT_PASS_REAL=NOT_CLAIMED');
}
main().catch(e=>{console.error('AGENT_FATAL='+e.stack);process.exitCode=1});
