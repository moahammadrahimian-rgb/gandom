const fs = require("fs");
let code = fs.readFileSync("server.js", "utf8");

if (code.includes("/api/father/vault")) {
    console.log("INFO: vault already connected");
    process.exit(0);
}

const requireLine = 'const { handleUsersAPI } = require("./users-api.js");';
if (!code.includes(requireLine)) {
    console.log("ERROR: require line not found");
    process.exit(1);
}
if (!code.includes("// --- Users APIs ---")) {
    console.log("ERROR: Users APIs marker not found");
    process.exit(1);
}

const vaultRequire = requireLine + '\nconst { fatherVault, FATHER_SECRET_KEY } = require("./father-vault.js");';
code = code.replace(requireLine, vaultRequire);

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
'        // --- Users APIs ---'
].join('\n');

code = code.replace("// --- Users APIs ---", vaultBlock);
fs.writeFileSync("server.js", code);
console.log("SUCCESS: Vault installed in server.js");
