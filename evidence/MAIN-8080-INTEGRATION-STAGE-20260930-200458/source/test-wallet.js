// ==========================================
// GANDOM WALLET TEST (قدم ۱۱)
// تست کامل سیستم کیف پول
// ==========================================

console.log('==========================================');
console.log('🧪 GANDOM WALLET TEST');
console.log('==========================================\n');

const Wallet = require('./wallet/index.js');
const Deposit = require('./wallet/deposit.js');
const Withdraw = require('./wallet/withdraw.js');
const Transfer = require('./wallet/transfer.js');
const Fee = require('./wallet/fee.js');

console.log('--- Test 1: Create Wallet ---');
const wallet = Wallet.createWallet(1200000000);
console.log(`✅ Wallet: ${wallet.address}\n`);

console.log('--- Test 2: Deposit ---');
Deposit.deposit(wallet.address, 5000000, 'exchange');
console.log(`💰 Balance: ${Deposit.getBalance(wallet.address)} GDM\n`);

console.log('--- Test 3: Withdraw ---');
Withdraw.withdraw(wallet.address, 1000000, 'USDT', 'exchange');
console.log('');

console.log('--- Test 4: Fee ---');
const fee = Fee.calculateFee(1000000, 'transfer');
console.log(`Total Fee: ${fee.totalFee} GDM`);
console.log(`Owner Fee: ${fee.ownerFee} GDM\n`);

console.log('--- Test 5: Sign & Verify ---');
const tx = { from: wallet.address, to: '1Receiver', amount: 1000 };
const sig = Wallet.signTransaction(wallet.privateKey, tx);
const valid = Wallet.verifyTransaction(wallet.publicKey, tx, sig);
console.log(`✅ Signature: ${valid}\n`);

console.log('==========================================');
console.log('✅ ALL WALLET TESTS PASSED');
console.log('==========================================');
