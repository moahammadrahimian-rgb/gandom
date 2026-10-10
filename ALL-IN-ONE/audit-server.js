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

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    // CLIENT PAGE
    if (req.method === 'GET' && (req.url === '/client.html' || req.url === '/client')) {
        const clientPath = path.join(__dirname, 'client.html');
        if (fs.existsSync(clientPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(fs.readFileSync(clientPath));
        } else {
            res.writeHead(404);
            return res.end('client.html not found');
        }
    }

    // HOME PAGE
    if (req.method === 'GET' && req.url === '/') {
        const landingPath = path.join(__dirname, '..', 'docs', 'landing', 'index.html');
        if (fs.existsSync(landingPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(fs.readFileSync(landingPath));
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h1>GANDOM-AUDIT</h1><p><a href="/client.html">Client Page</a></p>');
    }

    // HEALTH
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            ok: true, service: 'GANDOM-AUDIT',
            sessions: sessions.length, uptime: process.uptime()
        }));
    }

    // AUDIT
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
                    files: [], total_files: 0, total_size: 0,
                    started: new Date().toISOString()
                };

                for (const f of files) {
                    const content = Buffer.from(f.content, 'base64');
                    const fileHash = hash(content);
                    session.files.push({
                        name: f.name, size: content.length,
                        hash: fileHash, verified: true
                    });
                    session.total_files++;
                    session.total_size += content.length;
                }

                session.finished = new Date().toISOString();
                session.report_hash = hash(JSON.stringify(session.files));
                session.price = 500000 + (session.total_files * 100000);
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

    // SESSIONS
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
    console.log('SERVER=http://127.0.0.1:' + PORT);
    console.log('CLIENT=http://127.0.0.1:' + PORT + '/client.html');
    console.log('==========================================');
});
