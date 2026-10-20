const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const WWW = path.join(ROOT, 'www');
const STAMP = new Date().toISOString().replace(/[:.]/g,'-');
const OUT = path.join(ROOT, 'evidence', `UI-DESIGN-8080-${STAMP}`);
fs.mkdirSync(OUT,{recursive:true});

const files=[];
function walk(d){
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    if(['node_modules','.git','backups','evidence'].includes(e.name)) continue;
    const p=path.join(d,e.name);
    if(e.isDirectory()) walk(p);
    else files.push(p);
  }
}
walk(WWW);

const html=files.filter(x=>x.endsWith('.html'));
const js=files.filter(x=>x.endsWith('.js'));
const css=files.filter(x=>x.endsWith('.css'));

let H=html.map(f=>fs.readFileSync(f,'utf8')).join('\n');
let J=js.map(f=>fs.readFileSync(f,'utf8')).join('\n');
let C=css.map(f=>fs.readFileSync(f,'utf8')).join('\n');

const checks=[];

function check(name,ok,detail){
  checks.push({name,status:ok?'PASS':'FAIL',detail});
  console.log(`${name}=${ok?'PASS':'FAIL'}${detail?' | '+detail:''}`);
}

console.log('==============================================');
console.log(' GANDOM 8080 — REAL UI DESIGN AUDIT');
console.log('==============================================');
console.log('REPORT='+OUT);
console.log();

check('WWW_EXISTS',fs.existsSync(WWW),WWW);
check('HTML_FILES',html.length>0,`count=${html.length}`);
check('JS_FILES',js.length>0,`count=${js.length}`);
check('CSS_FILES',css.length>0,`count=${css.length}`);

/* BUTTONS */
const buttons=[...(H.matchAll(/<button\b[^>]*>/gi))];
const buttonsWithAction=buttons.filter(m =>
  /onclick\s*=|data-action\s*=|type\s*=\s*["']submit|id\s*=/i.test(m[0])
);

check(
  'BUTTON_ACTION_SURFACE',
  buttons.length>0 && buttonsWithAction.length===buttons.length,
  `buttons=${buttons.length} actionable=${buttonsWithAction.length}`
);

/* FORMS */
const forms=[...(H.matchAll(/<form\b/gi))].length;
const inputs=[...(H.matchAll(/<input\b[^>]*>/gi))];
const namedInputs=inputs.filter(m=>/name\s*=|id\s*=|placeholder\s*=/i.test(m[0]));

check(
  'FORM_INPUTS',
  inputs.length>0 && namedInputs.length===inputs.length,
  `inputs=${inputs.length} named=${namedInputs.length}`
);

/* WALLET */
const wallet=/wallet|کیف.?پول/i.test(H+J);
const transfer=/transfer|انتقال|withdraw|برداشت|deposit|واریز/i.test(H+J);
const amount=/amount|مبلغ|quantity|تعداد/i.test(H+J);
const address=/wallet.?address|آدرس.?کیف|destination|recipient/i.test(H+J);

check('WALLET_UI',wallet,`wallet=${wallet}`);
check('WALLET_TRANSFER_UI',wallet&&transfer,`transfer=${transfer}`);
check('WALLET_AMOUNT_INPUT',wallet&&amount,`amount=${amount}`);
check('WALLET_DESTINATION_INPUT',wallet&&address,`address=${address}`);

/* EXCHANGE */
const exchange=/exchange|صرافی|market|بازار|buy|خرید|sell|فروش/i.test(H+J);
const buy=/buy|خرید/i.test(H+J);
const sell=/sell|فروش/i.test(H+J);
const chart=/marketChart|chart|نمودار/i.test(H+J);

check('EXCHANGE_UI',exchange,`exchange=${exchange}`);
check('BUY_UI',buy,`buy=${buy}`);
check('SELL_UI',sell,`sell=${sell}`);
check('MARKET_CHART_UI',chart,`chart=${chart}`);

/* REVENUE → WALLET */
const revenue=/revenue|درآمد/i.test(H+J);
const revenueWallet=revenue&&wallet&&transfer;

check(
  'REVENUE_TO_WALLET_PATH',
  revenueWallet,
  `revenue=${revenue} wallet=${wallet} transfer=${transfer}`
);

/* API */
const fetchCalls=[...(J.matchAll(/\bfetch\s*\(/g))].length;
const xhrCalls=[...(J.matchAll(/\bXMLHttpRequest\b/g))].length;
const apiCalls=fetchCalls+xhrCalls;

check(
  'API_CALL_SURFACE',
  apiCalls>0,
  `fetch=${fetchCalls} xhr=${xhrCalls}`
);

/* REAL SERVER ROUTES */
const apiRoutes=[...(J.matchAll(/['"`]\/api\/[^'"`? ]+/g))].map(x=>x[0]);
const uniqueRoutes=[...new Set(apiRoutes)];

check(
  'API_ROUTES_IN_UI',
  uniqueRoutes.length>0,
  `routes=${uniqueRoutes.length}`
);

/* KEYBOARD */
const numericInputs=inputs.filter(m =>
  /type\s*=\s*["'](number|tel)["']/i.test(m[0]) ||
  /inputmode\s*=\s*["']numeric["']/i.test(m[0])
);

check(
  'MOBILE_NUMERIC_KEYBOARD',
  numericInputs.length>0,
  `numeric/tel inputs=${numericInputs.length}`
);

/* DISABLED BUTTONS */
const disabled=[...(H.matchAll(/<button\b[^>]*disabled[^>]*>/gi))].length;
check(
  'DISABLED_BUTTON_AUDIT',
  disabled===0,
  `disabled_buttons=${disabled}`
);

/* JS EVENT SURFACE */
const listeners=
  (J.match(/addEventListener\s*\(/g)||[]).length+
  (H.match(/onclick\s*=/gi)||[]).length;

check(
  'UI_EVENT_HANDLERS',
  listeners>0,
  `handlers=${listeners}`
);

/* ERROR/LOADING/SUCCESS */
const states=/loading|success|error|خطا|موفق|درحال|در حال/i.test(H+J);

check(
  'UI_STATE_HANDLING',
  states,
  `loading/error/success surface=${states}`
);

/* RESPONSIVE */
const responsive=/@media|viewport/i.test(H+C);

check(
  'MOBILE_RESPONSIVE',
  responsive,
  `responsive=${responsive}`
);

/* JAVASCRIPT SYNTAX */
const {spawnSync}=require('child_process');
let syntaxFail=[];
for(const f of js){
  const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});
  if(r.status!==0) syntaxFail.push(path.relative(ROOT,f));
}

check(
  'UI_JS_SYNTAX',
  syntaxFail.length===0,
  `files=${js.length} failures=${syntaxFail.length}`
);

fs.writeFileSync(
  path.join(OUT,'syntax-failures.txt'),
  syntaxFail.join('\n')
);

fs.writeFileSync(
  path.join(OUT,'ui-api-routes.txt'),
  uniqueRoutes.join('\n')
);

fs.writeFileSync(
  path.join(OUT,'UI-DESIGN-REPORT.json'),
  JSON.stringify({
    timestamp:new Date().toISOString(),
    server:'GANDOM 8080',
    files:{html:html.length,js:js.length,css:css.length},
    buttons:buttons.length,
    inputs:inputs.length,
    apiCalls,
    checks
  },null,2)
);

const failed=checks.filter(x=>x.status==='FAIL').length;
const passed=checks.filter(x=>x.status==='PASS').length;

console.log();
console.log('==============================================');
console.log(' FINAL UI DESIGN AUDIT');
console.log('==============================================');
console.log(`CHECKS=${checks.length}`);
console.log(`PASS=${passed}`);
console.log(`FAIL=${failed}`);
console.log(`REPORT=${OUT}`);

if(failed===0)
  console.log('GANDOM_8080_UI_DESIGN_AUDIT=PASS');
else
  console.log('GANDOM_8080_UI_DESIGN_AUDIT=FAIL');
