// ==========================================
// GANDOM DEPOSIT SYSTEM (قدم ۶)
// سیستم واریز گندم
// ==========================================

const fs = require('fs');
const path = require('path');

const DEPOSIT_FILE = path.join(__dirname, 'deposits.json');

function loadDeposits() {
  if (!fs.existsSync(DEPOSIT_FILE)) return [];
  return JSON.parse(fs.readFileSync(DEPOSIT_FILE, 'utf8'));
}

function saveDeposits(deposits) {
  fs.writeFileSync(DEPOSIT_FILE, JSON.stringify(deposits, null, 2));
}

function deposit(address, amount, source = 'exchange') {
  if (amount <= 0) throw new Error('Amount must be positive');
  
  const deposits = loadDeposits();
  const depositRecord = {
    id: require('crypto').randomUUID(),
    address,
    amount,
    source,
    status: 'completed',
    createdAt: Date.now()
  };
  
  deposits.push(depositRecord);
  saveDeposits(deposits);
  
  console.log(`✅ Deposit: ${amount} GDM to ${address}`);
  console.log(`   Source: ${source}`);
  console.log(`   ID: ${depositRecord.id}`);
  return depositRecord;
}

function getBalance(address) {
  const deposits = loadDeposits();
  const total = deposits
    .filter(d => d.address === address && d.status === 'completed')
    .reduce((sum, d) => sum + d.amount, 0);
  return total;
}

if (require.main === module) {
  console.log('==========================================');
  console.log('💰 GANDOM DEPOSIT SYSTEM');
  console.log('==========================================\n');
  
  deposit('CdDUfT6gsUJFb5VArH21ZVRWqT8bM6Cqz', 5000000, 'exchange');
  console.log(`\n💰 Balance: ${getBalance('CdDUfT6gsUJFb5VArH21ZVRWqT8bM6Cqz')} GDM`);
}

module.exports = { deposit, getBalance };

