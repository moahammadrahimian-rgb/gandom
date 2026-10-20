// ==========================================
// GANDOM FEE SYSTEM (قدم ۹)
// محاسبه کارمزد تراکنش
// ==========================================

const OWNER_SHARE = 0.05; // ۵٪ کارمزد به مالک

function calculateFee(amount, type = 'transfer') {
  const feeRates = {
    transfer: 0.001,    // ۰.۱٪ انتقال
    exchange: 0.002,    // ۰.۲٪ صرافی
    payment: 0.001,     // ۰.۱٪ پرداخت
    mining: 0           // ۰٪ استخراج
  };
  
  const rate = feeRates[type] !== undefined ? feeRates[type] : 0.001;
  const fee = amount * rate;
  const ownerFee = fee * OWNER_SHARE;
  const minerFee = fee - ownerFee;
  
  return {
    amount,
    type,
    rate: `${(rate * 100).toFixed(2)}%`,
    totalFee: fee,
    ownerFee,
    minerFee,
    netAmount: amount - fee
  };
}

if (require.main === module) {
  console.log('==========================================');
  console.log('💵 GANDOM FEE CALCULATOR');
  console.log('==========================================\n');
  
  const result = calculateFee(1000000, 'transfer');
  console.log(`Amount:     ${result.amount} GDM`);
  console.log(`Type:       ${result.type}`);
  console.log(`Rate:       ${result.rate}`);
  console.log(`Total Fee:  ${result.totalFee} GDM`);
  console.log(`Owner Fee:  ${result.ownerFee} GDM (5%)`);
  console.log(`Miner Fee:  ${result.minerFee} GDM`);
  console.log(`Net Amount: ${result.netAmount} GDM`);
}

module.exports = { calculateFee };

