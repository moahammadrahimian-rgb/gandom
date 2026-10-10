'use strict';
// GANDOM FEE MODULE — Bank-Style Fees
// Law 2558

const FEES = {
    TRANSFER: 0.001,      // ۰.۱٪ کارمزد انتقال
    DEPOSIT: 0,           // واریز رایگان
    WITHDRAW: 0.005,      // ۰.۵٪ کارمزد برداشت
    AUDIT: 0.05,          // ۵٪ کارمزد حسابرسی
    EXCHANGE: 0.005       // ۰.۵٪ کارمزد تبدیل
};

function calculateFee(type, amount) {
    const rate = FEES[type] || 0;
    return Math.floor(amount * rate);
}

module.exports = { FEES, calculateFee };
