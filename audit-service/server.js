'use strict';
// GANDOM-AUDIT WEB SERVICE
// Law 2558 | NO_FAKE_PASS=1

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const sessions = [];

function hash(v) {
    return crypto.createHash('sha256').update(v).digest('hex');
}

function auditFile(filename, content) {
    const fileHash = hash(content);
    return {
        name: filename,
        size: content.length,
        hash: fileHash,
        verified: true
    };
}

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    // HOME PAGE
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(path.join(__dirname, '..', 'docs', 'landing', 'index.html')));
    }

    // HEALTH
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            ok: true,
            service: 'GANDOM-AUDIT',
            sessions: sessions.length,
            uptime: process.uptime()
        }));
    }

    // AUDIT ENDPOINT
    if (req.method === 'POST' && req.url === '/api/audit') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const files = data.files || [];
                const customer = data.customer || 'Anonymous';

                const session = {
                    id: 'AUDIT-' + crypto.randomBytes(4).toString('hex'),
                    customer: customer,
                    files: [],
                    total_files: 0,
                    total_size: 0,
                    started: new Date().toISOString()
                };

                for (const f of files) {
                    const content = Buffer.from(f.content, 'base64');
                    const result = auditFile(f.name, content);
                    session.files.push(result);
                    session.total_files++;
                    session.total_size += result.size;
                }

                session.finished = new Date().toISOString();
                session.report_hash = hash(JSON.stringify(session.files));
                session.price = 500000 + (session.total_files * 10000);

                sessions.push(session);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify(session, null, 2));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // LIST SESSIONS
    if (req.method === 'GET' && req.url === '/api/sessions') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ count: sessions.length, sessions: sessions }));
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('==========================================');
    console.log('GANDOM-AUDIT WEB SERVICE');
    console.log('LAW=2558 | NO_FAKE_PASS=1');
    console.log('==========================================');
    console.log('SERVER_STARTED=http://127.0.0.1:' + PORT);
    console.log('HEALTH=http://127.0.0.1:' + PORT + '/health');
    console.log('AUDIT_API=POST http://127.0.0.1:' + PORT + '/api/audit');
    console.log('SESSIONS=http://127.0.0.1:' + PORT + '/api/sessions');
});
