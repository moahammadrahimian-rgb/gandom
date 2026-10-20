const crypto = require('crypto');
const fs = require('fs');

const GANDOM_MAX_SUPPLY = 24000000000;
const FATHER_SHARE_PERCENT = 0.05;
const FATHER_WALLET_ID = "GDM-FATHER-2558";
const FATHER_SECRET_KEY = "GANDOM-FATHER-SUPER-SECRET-KEY-2558";
const WALLET_FILE = "./father-wallet.json";
const AUDIT_FILE = "./father-audit.json";

class FatherVault {
    constructor() {
        this.wallet = this.loadWallet();
        this.auditLog = this.loadAudit();
        // ذخیره دوره‌ای هر ۵ ثانیه
        setInterval(() => this.persist(), 5000);
    }

    loadWallet() {
        if (fs.existsSync(WALLET_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
                console.log("📂 قلعه پدر از فایل بارگذاری شد");
                return data;
            } catch (e) {
                console.log("⚠️ خطا در بارگذاری قلعه، ایجاد نسخه جدید");
            }
        }
        console.log("=========================================");
        console.log("👑 قلعه امنیتی پدر راه‌اندازی شد (نسخه اول)");
        console.log(`💰 موجودی کل شبکه: ${GANDOM_MAX_SUPPLY.toLocaleString()} GDM`);
        console.log(`👑 سهم پدر (۵٪): ${(GANDOM_MAX_SUPPLY * FATHER_SHARE_PERCENT).toLocaleString()} GDM`);
        console.log("🔒 وضعیت: قفل شده");
        console.log("=========================================");
        return {
            id: FATHER_WALLET_ID,
            balance_gdm: GANDOM_MAX_SUPPLY * FATHER_SHARE_PERCENT,
            balance_irt: 0,
            total_tax_collected: 0,
            transactions_count: 0,
            last_audit: new Date().toISOString(),
            status: "LOCKED"
        };
    }

    loadAudit() {
        if (fs.existsSync(AUDIT_FILE)) {
            try { return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8')); } catch (e) { return []; }
        }
        return [];
    }

    persist() {
        try {
            this.wallet.last_audit = new Date().toISOString();
            fs.writeFileSync(WALLET_FILE, JSON.stringify(this.wallet, null, 2));
            fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.auditLog.slice(-100), null, 2));
        } catch (e) {
            console.log("⚠️ خطا در ذخیره قلعه:", e.message);
        }
    }

    generateSignature(amount, action, timestamp) {
        const data = `${FATHER_WALLET_ID}|${action}|${amount}|${timestamp}`;
        return crypto.createHmac('sha256', FATHER_SECRET_KEY).update(data).digest('hex');
    }

    executeFatherTransaction(action, amount, signature, timestamp) {
        console.log(`\n🔐 تراکنش پدر: ${action} به مبلغ ${amount} GDM`);
        const now = Date.now();
        if (now - timestamp > 60000) {
            console.log("❌ زمان تراکنش منقضی شده");
            return false;
        }
        const expectedSig = this.generateSignature(amount, action, timestamp);
        if (signature !== expectedSig) {
            console.log("❌ امضای دیجیتال نامعتبر");
            return false;
        }
        if (action === 'WITHDRAW' && amount > this.wallet.balance_gdm) {
            console.log("❌ موجودی کافی نیست");
            return false;
        }
        if (action === 'WITHDRAW') this.wallet.balance_gdm -= amount;
        if (action === 'DEPOSIT') this.wallet.balance_gdm += amount;
        this.wallet.transactions_count++;
        this.auditLog.push({
            timestamp: new Date().toISOString(),
            action, amount,
            status: "SUCCESS"
        });
        this.persist();
        console.log(`✅ موفق. موجودی جدید: ${this.wallet.balance_gdm.toLocaleString()} GDM`);
        return true;
    }

    // 🆕 تابع جدید: دریافت مالیات خودکار از حسابدار (بدون نیاز به امضا)
    addTaxIncome(amount, source) {
        if (amount <= 0 || !isFinite(amount)) return false;
        this.wallet.balance_gdm += amount;
        this.wallet.total_tax_collected += amount;
        this.wallet.transactions_count++;
        this.persist(); // ذخیره فوری
        return true;
    }

    getAuditReport() {
        return {
            total_supply: GANDOM_MAX_SUPPLY,
            father_share: this.wallet.balance_gdm,
            total_tax_collected: this.wallet.total_tax_collected,
            circulating_supply: GANDOM_MAX_SUPPLY - this.wallet.balance_gdm,
            last_audit: this.wallet.last_audit,
            transactions_count: this.wallet.transactions_count
        };
    }
}

const fatherVault = new FatherVault();
module.exports = { fatherVault, FATHER_SECRET_KEY };
