const fs = require("fs");
let code = fs.readFileSync("server.js", "utf8");

// بررسی نصب قبلی
if (code.includes("memories/private-chat.js")) {
    console.log("INFO: memory already installed");
    process.exit(0);
}

// ۱. اضافه کردن require با چند استراتژی
let requireAdded = false;
const patterns = [
    /const \{ fatherVault, FATHER_SECRET_KEY \} = require\("\.\/father-vault\.js"\);/,
    /const \{ fatherVault[^}]*\} = require\(["']\.\/father-vault\.js["']\);/,
    /require\(["']\.\/father-vault\.js["']\)/
];

for (const pat of patterns) {
    const m = code.match(pat);
    if (m) {
        code = code.replace(m[0], m[0] + '\nconst { privateMemory } = require("./memories/private-chat.js");');
        requireAdded = true;
        console.log("OK: require added after:", m[0].substring(0, 50));
        break;
    }
}

if (!requireAdded) {
    // اگر قلعه را پیدا نکرد، بعد از اولین require می‌گذاریم
    const firstReq = code.match(/const .+ = require\(["'][^"']+["']\);/);
    if (firstReq) {
        code = code.replace(firstReq[0], firstReq[0] + '\nconst { privateMemory } = require("./memories/private-chat.js");');
        requireAdded = true;
        console.log("OK: require added (fallback)");
    }
}

if (!requireAdded) {
    console.log("ERROR: cannot add require");
    process.exit(1);
}

// ۲. پیدا کردن لنگرگاه و تزریق بلوک حافظه
const anchor = "http.createServer((req, res) => {";
if (!code.includes(anchor)) {
    console.log("ERROR: server anchor not found");
    process.exit(1);
}

// بلوک حافظه باید بلافاصله بعد از شروع createServer بیاید
const memoryBlock = anchor + '\n' +
'        // --- PRIVATE VOICE MEMORY (FATHER ONLY) ---\n' +
'        if (req.url.startsWith("/api/memory/private")) {\n' +
'            if (req.headers["x-father-key"] !== FATHER_SECRET_KEY) {\n' +
'                res.writeHead(403, {"Content-Type":"application/json"});\n' +
'                res.end(JSON.stringify({ok:false, error:"PRIVATE ACCESS ONLY"}));\n' +
'                return;\n' +
'            }\n' +
'            if (req.method === "GET" && req.url === "/api/memory/private/stats") {\n' +
'                res.writeHead(200, {"Content-Type":"application/json"});\n' +
'                res.end(JSON.stringify({ok:true, stats: privateMemory.stats()}));\n' +
'                return;\n' +
'            }\n' +
'            if (req.method === "GET" && req.url === "/api/memory/private/recall") {\n' +
'                res.writeHead(200, {"Content-Type":"application/json"});\n' +
'                res.end(JSON.stringify({ok:true, memories: privateMemory.recall(20)}));\n' +
'                return;\n' +
'            }\n' +
'            if (req.method === "POST" && req.url === "/api/memory/private/record") {\n' +
'                let body = "";\n' +
'                req.on("data", c => body += c.toString());\n' +
'                req.on("end", () => {\n' +
'                    try {\n' +
'                        const data = JSON.parse(body);\n' +
'                        if (data.from === "father") privateMemory.fatherSaid(data.text, data.language || "fa");\n' +
'                        else if (data.from === "gandom") privateMemory.gandomReplied(data.text, data.emotion || "love");\n' +
'                        res.writeHead(200, {"Content-Type":"application/json"});\n' +
'                        res.end(JSON.stringify({ok:true, saved:true}));\n' +
'                    } catch(e) {\n' +
'                        res.writeHead(400, {"Content-Type":"application/json"});\n' +
'                        res.end(JSON.stringify({ok:false, error:"Bad Request"}));\n' +
'                    }\n' +
'                });\n' +
'                return;\n' +
'            }\n' +
'            res.writeHead(404, {"Content-Type":"application/json"});\n' +
'            res.end(JSON.stringify({ok:false, error:"Unknown memory route"}));\n' +
'            return;\n' +
'        }\n';

code = code.replace(anchor, memoryBlock);
fs.writeFileSync("server.js", code);

const check = fs.readFileSync("server.js", "utf8");
if (check.includes("privateMemory") && check.includes("/api/memory/private")) {
    console.log("SUCCESS: memory installed");
} else {
    console.log("ERROR: install failed");
    process.exit(1);
}
