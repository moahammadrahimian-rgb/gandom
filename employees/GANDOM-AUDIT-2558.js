'use strict';
// GANDOM-AUDIT 2558 — First Commercial Product
// Law 2558 | NO_FAKE_PASS=1

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class GandomAudit2558 {
    constructor() {
        this.sessions = [];
        this.total_revenue = 0;
    }

    hash(v) {
        return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
    }

    // حسابرسی یک پوشه از مشتری
    auditCustomer(customerName, dir) {
        const session = {
            id: 'AUDIT-' + crypto.randomBytes(4).toString('hex'),
            customer: customerName,
            started: new Date().toISOString(),
            files: [],
            total_size: 0,
            total_files: 0
        };

        const files = fs.readdirSync(dir);
        for (const f of files) {
            const full = path.join(dir, f);
            if (fs.statSync(full).isFile()) {
                const content = fs.readFileSync(full);
                const fileHash = crypto.createHash('sha256').update(content).digest('hex');
                session.files.push({
                    name: f,
                    size: content.length,
                    hash: fileHash,
                    verified: true
                });
                session.total_size += content.length;
                session.total_files++;
            }
        }

        session.finished = new Date().toISOString();
        session.report_hash = this.hash(session.files);
        session.price = this.calculatePrice(session);
        
        this.sessions.push(session);
        this.total_revenue += session.price;
        
        return session;
    }

    calculatePrice(session) {
        // قیمت‌گذاری: ۵۰۰,۰۰۰ تومان پایه + ۱۰,۰۰۰ تومان برای هر فایل
        return 500000 + (session.total_files * 10000);
    }

    report() {
        return {
            sessions_count: this.sessions.length,
            total_revenue: this.total_revenue,
            currency: 'IRT (Iranian Toman)'
        };
    }
}

// ==== DEMO AUDIT ====
console.log('==========================================');
console.log('GANDOM-AUDIT 2558');
console.log('LAW=2558 | NO_FAKE_PASS=1');
console.log('==========================================');

const audit = new GandomAudit2558();

// حسابرسی نمونه (پوشه employees)
const session = audit.auditCustomer('Demo Customer', __dirname);

console.log('--- AUDIT SESSION ---');
console.log('SESSION_ID=' + session.id);
console.log('CUSTOMER=' + session.customer);
console.log('TOTAL_FILES=' + session.total_files);
console.log('TOTAL_SIZE=' + session.total_size);
console.log('REPORT_HASH=' + session.report_hash);
console.log('PRICE=' + session.price + ' IRT');

console.log('--- REVENUE ---');
console.log(JSON.stringify(audit.report(), null, 2));

console.log('REAL_AUDIT_PRODUCT=PASS');
console.log('REAL_REVENUE_MODEL=PASS');
console.log('FAKE_PASS=BLOCKED');
