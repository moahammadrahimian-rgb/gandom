const fs = require('fs');

// 1. Update server.js
let serverCode = fs.readFileSync('server.js', 'utf8');
if (!serverCode.includes('wheatRegistry')) {
    const serverInject = `
  let wheatRegistry = [];
  if (req.url === '/api/wheat/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        data.id = Date.now();
        wheatRegistry.push(data);
        res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        res.end(JSON.stringify({ok: true, msg: 'ثبت شد'}));
      } catch(e) {
        res.writeHead(400, {'Access-Control-Allow-Origin': '*'}); res.end('{"error":"bad request"}');
      }
    });
    return;
  }
  if (req.url === '/api/wheat/list' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify(wheatRegistry));
    return;
  }
`;
    serverCode = serverCode.replace(/(const httpServer = http\.createServer\(\(req, res\) => \{)/, `$1\n${serverInject}`);
    fs.writeFileSync('server.js', serverCode);
    console.log('✅ server.js با موفقیت آپدیت شد.');
}

// 2. Update www/index.html
let htmlCode = fs.readFileSync('www/index.html', 'utf8');
if (!htmlCode.includes('wheat-registry-section')) {
    const htmlInject = `
    <div id="wheat-registry-section" style="margin: 20px auto; max-width: 800px; padding: 20px; background: #111; border: 1px solid #d4af37; border-radius: 8px; color: white; font-family: sans-serif; position: relative; z-index: 9999;">
      <h3 style="color: #d4af37; text-align: center;">🌾 سامانه ثبت انواع گندم در بلاک‌چین</h3>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; justify-content: center;">
        <input type="text" id="w-variety" placeholder="رقم (مثلا آرتیمان)" style="padding: 8px; border-radius: 4px; border: 1px solid #333; background: #222; color: white;">
        <input type="text" id="w-origin" placeholder="استان (مثلا خوزستان)" style="padding: 8px; border-radius: 4px; border: 1px solid #333; background: #222; color: white;">
        <input type="number" id="w-protein" placeholder="پروتئین %" style="padding: 8px; border-radius: 4px; border: 1px solid #333; background: #222; color: white;">
        <input type="number" id="w-moisture" placeholder="رطوبت %" style="padding: 8px; border-radius: 4px; border: 1px solid #333; background: #222; color: white;">
        <button onclick="registerWheat()" style="padding: 8px 15px; background: #d4af37; color: black; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">ثبت گندم</button>
      </div>
      <ul id="wheat-list" style="list-style: none; padding: 0; text-align: right;"></ul>
    </div>
    `;
    const jsInject = `
      async function registerWheat() {
        const variety = document.getElementById('w-variety').value;
        const origin = document.getElementById('w-origin').value;
        const protein = document.getElementById('w-protein').value;
        const moisture = document.getElementById('w-moisture').value;
        if(!variety) return alert('رقم گندم را وارد کنید');
        const res = await fetch('http://127.0.0.1:8787/api/wheat/register', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ variety, origin, protein, moisture })
        });
        const data = await res.json();
        if(data.ok) { alert('✅ ثبت شد!'); loadWheatList(); }
      }
      async function loadWheatList() {
        const res = await fetch('http://127.0.0.1:8787/api/wheat/list');
        const list = await res.json();
        let html = '';
        for (let i = 0; i < list.length; i++) {
            let w = list[i];
            html += '<li style="padding: 10px; border-bottom: 1px solid #333;">🌾 رقم: <b>' + w.variety + '</b> | استان: ' + w.origin + ' | پروتئین: ' + w.protein + '% | رطوبت: ' + w.moisture + '%</li>';
        }
        document.getElementById('wheat-list').innerHTML = html;
      }
      setTimeout(loadWheatList, 1500);
    `;
    htmlCode = htmlCode.replace('</body>', htmlInject + '\n<script>\n' + jsInject + '\n</script>\n</body>');
    fs.writeFileSync('www/index.html', htmlCode);
    console.log('✅ index.html با موفقیت آپدیت شد.');
}
