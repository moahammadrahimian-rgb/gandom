const fs = require("fs");

if (!fs.existsSync("father-vault.js")) {
    console.log("ERROR: father-vault.js not found");
    process.exit(1);
}

let code = fs.readFileSync("server.js", "utf8");

if (code.includes("/api/father/vault")) {
    console.log("INFO: vault already installed");
    process.exit(0);
}

// اضافه کردن require
if (!code.includes('require("./father-vault.js")')) {
    const match = code.match(/const \{[^}]+\} = require\("[^"]+"\);/);
    if (match) {
        code = code.replace(match[0], match[0] + '\nconst { fatherVault, FATHER_SECRET_KEY } = require("./father-vault.js");');
        console.log("OK: require added");
    } else {
        code = 'const { fatherVault, FATHER_SECRET_KEY } = require("./father-vault.js");\n' + code;
        console.log("OK: require prepended");
    }
}

// لنگرگاه قطعی
const anchor = "http.createServer((req, res) => {";
if (!code.includes(anchor)) {
    console.log("ERROR: anchor not found");
    process.exit(1);
}

const block = anchor + '\n' +
'        // --- FATHER VAULT APIs (TOP SECRET) ---\n' +
'        if (req.url.startsWith("/api/father/vault")) {\n' +
'            if (req.method === "POST") {\n' +
'                let body = "";\n' +
'                req.on("data", c => body += c.toString());\n' +
'                req.on("end", () => {\n' +
'                    try {\n' +
'                        const data = JSON.parse(body);\n' +
'                        if (data.secret_key !== FATHER_SECRET_KEY) {\n' +
'                            res.writeHead(403, {"Content-Type":"application/json"});\n' +
'                            res.end(JSON.stringify({ok:false, error:"ACCESS DENIED: YOU ARE NOT THE FATHER"}));\n' +
'                            return;\n' +
'                        }\n' +
'                        const ok = fatherVault.executeFatherTransaction(data.action, data.amount, data.signature, data.timestamp);\n' +
'                        res.writeHead(ok ? 200 : 400, {"Content-Type":"application/json"});\n' +
'                        res.end(JSON.stringify({ok: ok, wallet: fatherVault.wallet}));\n' +
'                    } catch (e) {\n' +
'                        res.writeHead(400, {"Content-Type":"application/json"});\n' +
'                        res.end(JSON.stringify({ok:false, error:"Invalid Request"}));\n' +
'                    }\n' +
'                });\n' +
'                return;\n' +
'            } else {\n' +
'                if (req.headers["x-father-key"] === FATHER_SECRET_KEY) {\n' +
'                    res.writeHead(200, {"Content-Type":"application/json"});\n' +
'                    res.end(JSON.stringify({ok:true, audit: fatherVault.getAuditReport()}));\n' +
'                } else {\n' +
'                    res.writeHead(403, {"Content-Type":"application/json"});\n' +
'                    res.end(JSON.stringify({ok:false, error:"ACCESS DENIED"}));\n' +
'                }\n' +
'                return;\n' +
'            }\n' +
'        }\n';

code = code.replace(anchor, block);
fs.writeFileSync("server.js", code);

const check = fs.readFileSync("server.js", "utf8");
if (check.includes("/api/father/vault") && check.includes("father-vault.js")) {
    console.log("SUCCESS: Vault installed");
} else {
    console.log("ERROR: Install failed");
    process.exit(1);
}
