const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const evidence = process.env.EVIDENCE_DIR || 'evidence/FINAL-UI-E2E';
  fs.mkdirSync(evidence, {recursive:true});

  const results = [];
  const add = (name, status, detail='') => {
    results.push({name,status,detail});
    console.log(`${name}=${status}${detail ? ` | ${detail}` : ''}`);
  };

  let browser;

  try {
    browser = await chromium.launch({
      executablePath: process.env.GANDOM_CHROMIUM,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    add('CHROMIUM_LAUNCH','PASS');

    const context = await browser.newContext({
      viewport:{width:390,height:844},
      isMobile:true,
      hasTouch:true
    });

    const page = await context.newPage();

    const consoleErrors=[];
    const failedRequests=[];

    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });

    page.on('requestfailed', r => {
      failedRequests.push({
        url:r.url(),
        error:r.failure()?.errorText || 'unknown'
      });
    });

    await page.goto('http://127.0.0.1:8080/', {
      waitUntil:'networkidle',
      timeout:30000
    });

    add('PAGE_LOAD','PASS',await page.title());

    await page.screenshot({
      path:`${evidence}/mobile-home.png`,
      fullPage:true
    });

    const buttons = await page.locator('button').all();
    add('BUTTONS_FOUND', buttons.length > 0 ? 'PASS':'FAIL', String(buttons.length));

    let clickable=0;

    for (let i=0;i<buttons.length;i++) {
      const b=buttons[i];
      const visible=await b.isVisible().catch(()=>false);
      const enabled=await b.isEnabled().catch(()=>false);

      if (!visible || !enabled) continue;

      const text=((await b.innerText().catch(()=>'')) || '').trim();

      const destructive=/buy|sell|transfer|withdraw|deposit|confirm|publish|delete|حذف|برداشت|واریز|انتقال|خرید|فروش|تأیید/i.test(text);

      if (destructive) continue;

      await b.click({timeout:3000}).catch(()=>{});
      clickable++;
    }

    add(
      'SAFE_BUTTON_INTERACTION',
      clickable > 0 ? 'PASS':'FAIL',
      `${clickable} safe buttons interacted`
    );

    const inputs=await page.locator('input,textarea,select').count();
    add('FORM_CONTROLS',inputs>0?'PASS':'FAIL',String(inputs));

    const numeric=await page.locator(
      'input[type="number"],input[type="tel"],input[inputmode="numeric"],input[inputmode="decimal"]'
    ).count();

    add('NUMERIC_INPUT',numeric>0?'PASS':'FAIL',String(numeric));

    const body=(await page.locator('body').innerText()).toLowerCase();

    const wallet=/wallet|کیف پول|کیف‌پول/.test(body);
    const exchange=/exchange|صرافی|market|بازار/.test(body);
    const transfer=/transfer|انتقال درآمد|انتقال/.test(body);
    const buySell=/buy|sell|خرید|فروش/.test(body);

    add('WALLET_UI',wallet?'PASS':'FAIL');
    add('EXCHANGE_UI',exchange?'PASS':'FAIL');
    add('TRANSFER_UI',transfer?'PASS':'FAIL');
    add('BUY_SELL_UI',buySell?'PASS':'FAIL');

    const overflow=await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );

    add('MOBILE_HORIZONTAL_OVERFLOW',overflow?'FAIL':'PASS');

    const smallTargets=await page.locator('button,a,[role="button"]').evaluateAll(els =>
      els.filter(e => {
        const r=e.getBoundingClientRect();
        return r.width>0 && r.height>0 && (r.width<44 || r.height<44);
      }).length
    );

    add(
      'TOUCH_TARGETS',
      smallTargets===0?'PASS':'WARN',
      `${smallTargets} targets below 44px`
    );

    const criticalText=/GDM|AI|P2P|DHT|IPFS|Blockchain|Security|Revenue|اقتصاد|شبکه/i.test(body);

    add('CORE_UI_SURFACE',criticalText?'PASS':'FAIL');

    await page.setViewportSize({width:1440,height:900});

    await page.goto('http://127.0.0.1:8080/', {
      waitUntil:'networkidle',
      timeout:30000
    });

    await page.screenshot({
      path:`${evidence}/desktop-home.png`,
      fullPage:true
    });

    const desktopOverflow=await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );

    add('DESKTOP_OVERFLOW',desktopOverflow?'FAIL':'PASS');

    fs.writeFileSync(
      `${evidence}/console-errors.json`,
      JSON.stringify(consoleErrors,null,2)
    );

    fs.writeFileSync(
      `${evidence}/failed-requests.json`,
      JSON.stringify(failedRequests,null,2)
    );

    const failCount=results.filter(x=>x.status==='FAIL').length;

    fs.writeFileSync(
      `${evidence}/RESULTS.json`,
      JSON.stringify({
        results,
        failCount,
        consoleErrors,
        failedRequests
      },null,2)
    );

    console.log(`TOTAL_CHECKS=${results.length}`);
    console.log(`FAIL=${failCount}`);
    console.log(`CONSOLE_ERRORS=${consoleErrors.length}`);
    console.log(`FAILED_REQUESTS=${failedRequests.length}`);
    console.log(`EVIDENCE=${evidence}`);

    if (failCount===0 && consoleErrors.length===0 && failedRequests.length===0) {
      console.log('GANDOM_REAL_UI_E2E=PASS');
      process.exitCode=0;
    } else {
      console.log('GANDOM_REAL_UI_E2E=FAIL');
      process.exitCode=1;
    }

  } catch(e) {
    console.error('REAL_UI_E2E_ERROR=' + e.stack);
    process.exitCode=1;
  } finally {
    if (browser) await browser.close().catch(()=>{});
  }
})();
