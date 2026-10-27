// ==========================================
// GANDOM WITHDRAWAL SYSTEM (قدم ۷)
// سیستم برداشت گندم
// ==========================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WITHDRAW_FILE = path.join(__dirname, 'withdrawals.json');
const FEE_RATE = 0.002; // ۰.۲٪ کارمزد
const OWNER_SHARE = 0.05; // ۵٪ کارمزد به مالک

function loadWithdrawals() {
  if (!fs.existsSync(WITHDRAW_FILE)) return [];
  return JSON.parse(fs.readFileSync(WITHDRAW_FILE, 'utf8'));
}

function saveWithdrawals(withdrawals) {
  fs.writeFileSync(WITHDRAW_FILE, JSON.stringify(withdrawals, null, 2));
}

function withdraw(address, amount, destination, method = 'exchange') {
  if (amount <= 0) throw new Error('Amount must be positive');
  
  const fee = amount * FEE_RATE;
  const ownerFee = fee * OWNER_SHARE;
  const minerFee = fee - ownerFee;
  const netAmount = amount - fee;
  
  const withdrawals = loadWithdrawals();
  const withdrawRecord = {
    id: crypto.randomUUID(),
    address,
    amount,
    fee,
    ownerFee,
    minerFee,
    netAmount,
    destination,
    method,
    status: 'completed',
    createdAt: Date.now()
  };
  
  withdrawals.push(withdrawRecord);
  saveWithdrawals(withdrawals);
  
  console.log(`✅ Withdrawal: ${amount} GDM from ${address}`);
  console.log(`   Fee:       ${fee} GDM (0.2%)`);
  console.log(`   Owner Fee: ${ownerFee} GDM (5% of fee)`);
  console.log(`   Miner Fee: ${minerFee} GDM`);
  console.log(`   Net:       ${netAmount} GDM`);
  console.log(`   To:        ${destination}`);
  console.log(`   ID:        ${withdrawRecord.id}`);
  return withdrawRecord;
}

function getWithdrawals(address) {
  const withdrawals = loadWithdrawals();
  return withdrawals.filter(w => w.address === address);
}

if (require.main === module) {
  console.log('==========================================');
  console.log('💸 GANDOM WITHDRAWAL SYSTEM');
  console.log('==========================================\n');
  
  withdraw('CdDUfT6gsUJFb5VArH21ZVRWqT8bM6Cqz', 1000000, 'USDT', 'exchange');
  console.log(`\n💸 Total Withdrawals: ${getWithdrawals('CdDUfT6gsUJFb5VArH21ZVRWqT8bM6Cqz').length}`);
}

module.exports = { withdraw, getWithdrawals };
