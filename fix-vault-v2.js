const fs = require("fs");

// ۱. اطمینان از وجود فایل father-vault.js
if (!fs.existsSync("father-vault.js")) {
    console.log("ERROR: father-vault.js وجود ندارد. ابتدا آن را بسازید.");
    process.exit(1);
}

let code = fs.readFileSync("server.js", "utf8");

if (code.includes("/api/father/vault")) {
    console.log("INFO: vault already installed");
    process.exit(0);
}

// ۲. اضافه کردن require در ابتدای فایل
const requireLine = 'const { fatherVault, FATHER_SECRET_KEY } = require("./father-vault.js");\n';
if (!code.includes("father-vault.js")) {
    // آن را بعد از اولین require قرار می‌دهیم
    const firstRequireMatch = code.match(/^const .* = require\([^\n]+\);$/m);
    if (firstRequireMatch) {
        code = code.replace(firstRequireMatch[0], firstRequireMatch[0] + "\n" + requireLine.trim());
    } else {
        code = requireLine + code;
    }
}

// ۳. تزریق بلوک قلعه قبل از نشانگر Users APIs
const marker = "// --- Users APIs ---";
if (!code.includes(marker)) {
    console.log("ERROR: users API marker not found in server.js");
    process.exit(1);
}

const vaultBlock = [
'// --- FATHER VAULT APIs (TOP SECRET) ---',
'        if (req.url.startsWith("/api/father/vault")) {',
'            if (req.method === "POST") {',
'                let body = "";',
'                req.on("data", c => body += c.toString());',
'                req.on("end", () => {',
'                    try {',
'                        const data = JSON.parse(body);',
'                        if (data.secret_key !== FATHER_SECRET_KEY) {',
'                            res.writeHead(403, {"Content-Type":"application/json"});',
'                            res.end(JSON.stringify({ok:false, error:"ACCESS DENIED: YOU ARE NOT THE FATHER"}));',
'                            return;',
'                        }',
'                        const ok = fatherVault.executeFatherTransaction(data.action, data.amount, data.signature, data.timestamp);',
'                        res.writeHead(ok ? 200 : 400, {"Content-Type":"application/json"});',
'                        res.end(JSON.stringify({ok: ok, wallet: fatherVault.wallet}));',
'                    } catch (e) {',
'                        res.writeHead(400, {"Content-Type":"application/json"});',
'                        res.end(JSON.stringify({ok:false, error:"Invalid Request"}));',
'                    }',
'                });',
'                return;',
'            } else {',
'                if (req.headers["x-father-key"] === FATHER_SECRET_KEY) {',
'                    res.writeHead(200, {"Content-Type":"application/json"});',
'                    res.end(JSON.stringify({ok:true, audit: fatherVault.getAuditReport()}));',
'                } else {',
'                    res.writeHead(403, {"Content-Type":"application/json"});',
'                    res.end(JSON.stringify({ok:false, error:"ACCESS DENIED"}));',
'                }',
'                return;',
'            }',
'        }',
'',
marker
].join('\n');

code = code.replace(marker, vaultBlock);
fs.writeFileSync("server.js", code);

// ۴. بررسی نتیجه
const finalCheck = fs.readFileSync("server.js", "utf8");
if (finalCheck.includes("/api/father/vault") && finalCheck.includes("father-vault.js")) {
    console.log("SUCCESS: Vault fully installed");
} else {
    console.log("ERROR: Installation failed");
    process.exit(1);
}
