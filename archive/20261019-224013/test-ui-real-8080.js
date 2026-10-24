const fs = require('fs');
const path = require('path');

const { spawnSync } = require('child_process');

function out(s){ console.log(s); }

let playwright;
try {
  playwright = require('playwright');
} catch {
  out('PLAYWRIGHT=NOT_INSTALLED');
  out('UI_REAL_TEST=NOT_RUN');
  out('REASON=Browser automation package is unavailable');
  process.exit(2);
}

const ROOT = process.cwd();
const STAMP = new Date().toISOString().replace(/[:.]/g,'-');
const DIR = path.join(ROOT,'evidence',`UI-REAL-8080-${STAMP}`);
fs.mkdirSync(DIR,{recursive:true});

const results=[];
function check(name,ok,detail=''){
  results.push({name,status:ok?'PASS':'FAIL',detail});
  out(`${name}=${ok?'PASS':'FAIL'}${detail?' | '+detail:''}`);
}

(async()=>{
  let browser;

  try {
    browser = await playwright.chromium.launch({
      headless: true, args: ["--disable-web-security"]
    });

    async function runViewport(name,width,height){
      const context = await browser.newContext({
        viewport:{width,height},
        deviceScaleFactor:1,
        isMobile: width < 600,
        hasTouch: width < 600
      });

      const page = await context.newPage();

      const consoleErrors=[];
      const pageErrors=[];
      const failedRequests=[];

      page.on('console',m=>{
        if(m.type()==='error') consoleErrors.push(m.text());
      });

      page.on('pageerror',e=>{
        pageErrors.push(String(e));
      });

      page.on('requestfailed',r=>{
        failedRequests.push({
          url:r.url(),
          error:r.failure()?.errorText || 'unknown'
        });
      });

      let response;
      try {
        response = await page.goto(
          'http://127.0.0.1:8080/',
          {waitUntil:'networkidle',timeout:15000}
        );
      } catch(e) {
        check(`${name}_PAGE_LOAD`,false,e.message);
        await context.close();
        return;
      }

      check(
        `${name}_PAGE_LOAD`,
        !!response && response.status() < 400,
        `status=${response?.status()}`
      );

      const title=await page.title();
      check(`${name}_TITLE`,title.trim().length>0,`title=${title}`);

      const buttons=page.locator('button');
      const buttonCount=await buttons.count();

      check(
        `${name}_BUTTONS_FOUND`,
        buttonCount>0,
        `count=${buttonCount}`
      );

      const buttonInfo=[];

      for(let i=0;i<buttonCount;i++){
        const b=buttons.nth(i);

        let text='';
        let disabled=false;
        let box=null;

        try{
          text=(await b.innerText()).trim().replace(/\s+/g,' ');
          disabled=await b.isDisabled();
          box=await b.boundingBox();
        }catch{}

        buttonInfo.push({
          index:i,
          text,
          disabled,
          box
        });
      }

      const dangerous=
        /buy|sell|خرید|فروش|transfer|انتقال|withdraw|برداشت|deposit|واریز|confirm|تأیید|publish|انتشار|delete|حذف/i;

      let safeClicks=0;
      let safeFailures=0;
      const clickResults=[];

      for(const b of buttonInfo){
        if(!b.text || b.disabled || dangerous.test(b.text)) continue;

        const locator=buttons.nth(b.index);

        try{
          await locator.scrollIntoViewIfNeeded();
          const before=await page.locator('body').innerText();

          await locator.click({timeout:3000});

          await page.waitForTimeout(250);

          const after=await page.locator('body').innerText();

          const changed=before!==after;
          safeClicks++;

          clickResults.push({
            text:b.text,
            result:'PASS',
            changed
          });
        }catch(e){
          safeFailures++;
          clickResults.push({
            text:b.text,
            result:'FAIL',
            error:e.message
          });
        }
      }

      check(
        `${name}_SAFE_BUTTON_CLICKS`,
        safeClicks>0 && safeFailures===0,
        `clicked=${safeClicks} failures=${safeFailures}`
      );

      const inputs=page.locator('input');
      const inputCount=await inputs.count();

      check(
        `${name}_INPUTS_FOUND`,
        inputCount>0,
        `count=${inputCount}`
      );

      const inputInfo=[];
      let numeric=0;
      let amountInputs=0;

      for(let i=0;i<inputCount;i++){
        const x=inputs.nth(i);

        let type='';
        let mode='';
        let nameAttr='';
        let placeholder='';

        try{
          type=(await x.getAttribute('type'))||'';
          mode=(await x.getAttribute('inputmode'))||'';
          nameAttr=(await x.getAttribute('name'))||'';
          placeholder=(await x.getAttribute('placeholder'))||'';
        }catch{}

        const desc=`${nameAttr} ${placeholder}`.toLowerCase();

        if(
          type==='number' ||
          type==='tel' ||
          mode==='numeric' ||
          mode==='decimal'
        ) numeric++;

        if(/amount|مبلغ|quantity|تعداد|price|قیمت/i.test(desc))
          amountInputs++;

        inputInfo.push({
          index:i,
          type,
          inputmode:mode,
          name:nameAttr,
          placeholder
        });
      }

      check(
        `${name}_NUMERIC_KEYBOARD_SURFACE`,
        numeric>0,
        `numeric_inputs=${numeric}`
      );

      check(
        `${name}_AMOUNT_INPUT`,
        amountInputs>0,
        `amount_inputs=${amountInputs}`
      );

      /* Wallet / Exchange surface */
      const body=(await page.locator('body').innerText()).replace(/\s+/g,' ');

      const wallet=/wallet|کیف\s*پول/i.test(body);
      const exchange=/exchange|صرافی/i.test(body);
      const buy=/buy|خرید/i.test(body);
      const sell=/sell|فروش/i.test(body);
      const transfer=/transfer|انتقال/i.test(body);

      check(`${name}_WALLET_SURFACE`,wallet,`wallet=${wallet}`);
      check(`${name}_EXCHANGE_SURFACE`,exchange,`exchange=${exchange}`);
      check(`${name}_BUY_SURFACE`,buy,`buy=${buy}`);
      check(`${name}_SELL_SURFACE`,sell,`sell=${sell}`);
      check(`${name}_TRANSFER_SURFACE`,transfer,`transfer=${transfer}`);

      /* Mobile touch size */
      if(width<600){
        const small=[];
        for(const b of buttonInfo){
          if(b.box && (b.box.width<44 || b.box.height<44))
            small.push({
              text:b.text,
              width:b.box.width,
              height:b.box.height
            });
        }

        check(
          `${name}_TOUCH_TARGETS`,
          small.length===0,
          `small_targets=${small.length}`
        );

        fs.writeFileSync(
          path.join(DIR,`${name}-small-targets.json`),
          JSON.stringify(small,null,2)
        );
      }

      /* Overflow */
      const overflow=await page.evaluate(()=>{
        return {
          width:document.documentElement.scrollWidth,
          viewport:window.innerWidth
        };
      });

      check(
        `${name}_NO_HORIZONTAL_OVERFLOW`,
        overflow.width <= overflow.viewport + 2,
        `scrollWidth=${overflow.width} viewport=${overflow.viewport}`
      );

      check(
        `${name}_CONSOLE_ERRORS`,
        consoleErrors.length===0,
        `errors=${consoleErrors.length}`
      );

      check(
        `${name}_PAGE_ERRORS`,
        pageErrors.length===0,
        `errors=${pageErrors.length}`
      );

      check(
        `${name}_NETWORK_FAILURES`,
        failedRequests.length===0,
        `failed=${failedRequests.length}`
      );

      await page.screenshot({
        path:path.join(DIR,`${name}.png`),
        fullPage:true
      });

      fs.writeFileSync(
        path.join(DIR,`${name}-buttons.json`),
        JSON.stringify(buttonInfo,null,2)
      );

      fs.writeFileSync(
        path.join(DIR,`${name}-clicks.json`),
        JSON.stringify(clickResults,null,2)
      );

      fs.writeFileSync(
        path.join(DIR,`${name}-inputs.json`),
        JSON.stringify(inputInfo,null,2)
      );

      fs.writeFileSync(
        path.join(DIR,`${name}-errors.json`),
        JSON.stringify({
          consoleErrors,
          pageErrors,
          failedRequests
        },null,2)
      );

      await context.close();
    }

    await runViewport('MOBILE',390,844);
    await runViewport('DESKTOP',1440,900);

    fs.writeFileSync(
      path.join(DIR,'FINAL-UI-REAL-REPORT.json'),
      JSON.stringify({
        timestamp:new Date().toISOString(),
        server:'http://127.0.0.1:8080',
        results
      },null,2)
    );

    const fail=results.filter(x=>x.status==='FAIL').length;
    const pass=results.filter(x=>x.status==='PASS').length;

    out('');
    out('==============================================');
    out(' FINAL REAL UI RESULT');
    out('==============================================');
    out(`CHECKS=${results.length}`);
    out(`PASS=${pass}`);
    out(`FAIL=${fail}`);
    out(`REPORT=${DIR}`);

    if(fail===0)
      out('GANDOM_8080_REAL_UI_TEST=PASS');
    else
      out('GANDOM_8080_REAL_UI_TEST=FAIL');

  }catch(e){
    out('REAL_UI_FATAL_ERROR='+e.stack);
    process.exitCode=1;
  }finally{
    if(browser) await browser.close();
  }
})();
