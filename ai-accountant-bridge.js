const { fatherVault } = require("./father-vault.js");
const FATHER_TAX_PERCENT = 0.05;

class AIAccountantBridge {
    constructor() {
        this.total_tax_collected = 0;
        this.transactions_processed = 0;
        console.log("👑 پل حسابدار راه‌اندازی شد. مالیات ۵٪ فعال.");
    }
    processTransaction(txData) {
        const { amount_gdm, type, user_id } = txData;
        const tax = amount_gdm * FATHER_TAX_PERCENT;
        // 🔑 حالا از تابع addTaxIncome استفاده می‌کنیم که در فایل ذخیره می‌کند
        fatherVault.addTaxIncome(tax, type);
        this.total_tax_collected += tax;
        this.transactions_processed++;
        console.log(`💰 مالیات ۵٪ | ${type} | ${user_id} | کل: ${amount_gdm} | سهم پدر: +${tax.toFixed(2)} GDM`);
        return { success: true, tax_collected: tax };
    }
}
const accountantBridge = new AIAccountantBridge();
setInterval(() => {
    const mockTx = { amount_gdm: Math.floor(Math.random() * 10000) + 100, type: "EXCHANGE_TRADE", user_id: "USR-alice" };
    accountantBridge.processTransaction(mockTx);
}, 5000); // هر ۵ ثانیه
module.exports = { accountantBridge };
