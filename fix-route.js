const fs = require("fs");
let code = fs.readFileSync("server.js", "utf8");
const marker = "// --- FATHER VAULT APIs";
const route = `// --- GANDOM 3D HTML ROUTE ---
        if (req.url === "/gandom-3d.html" || req.url.startsWith("/gandom-3d.html?")) {
            const fs2 = require("fs");
            const path2 = require("path");
            const file = path2.join(__dirname, "public", "gandom-3d.html");
            fs2.readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end("NOT FOUND"); return; }
                res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(data);
            });
            return;
        }

        ` + marker;
if (code.includes("/gandom-3d.html")) { console.log("INFO: route exists"); process.exit(0); }
if (!code.includes(marker)) { console.log("ERROR: marker not found"); process.exit(1); }
code = code.replace(marker, route);
fs.writeFileSync("server.js", code);
console.log("SUCCESS: gandom-3d route added");
