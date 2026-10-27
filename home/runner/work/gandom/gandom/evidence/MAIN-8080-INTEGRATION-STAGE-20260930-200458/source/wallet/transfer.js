// ==========================================
// GANDOM TRANSFER SYSTEM (قدم ۸)
// انتقال گندم بین کاربران
// ==========================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TRANSFER_FILE = path.join(__dirname, 'transfers.json');
const FEE_RATE = 0.001; // ۰.۱٪
const OWNER_SHARE = 0.05; // ۵٪ کارمزد به مالک

function loadTransfers() {
  if (!fs.existsSync(TRANSFER_FILE)) return [];
  return JSON.parse(fs.readFileSync(TRANSFER_FILE, 'utf8'));
}

function saveTransfers(transfers) {
  fs.writeFileSync(TRANSFER_FILE, JSON.stringify(transfers, null, 2));
}

function transfer(fromAddress, toAddress, amount, privateKey, publicKey) {
  if (amount <= 0) throw new Error('Amount must be positive');
  if (fromAddress === toAddress) throw new Error('Cannot transfer to self');
  
  const fee = amount * FEE_RATE;
  const ownerFee = fee * OWNER_SHARE;
  const minerFee = fee - ownerFee;
  const netAmount = amount - fee;
  
  const transferRecord = {
    id: crypto.randomUUID(),
    from: fromAddress,
    to: toAddress,
    amount,
    fee,
    ownerFee,
    minerFee,
    netAmount,
    status: 'completed',
    createdAt: Date.now()
  };
  
  // امضای تراکنش
  try {
    const { signTransaction } = require('./index.js');
    transferRecord.signature = signTransaction(privateKey, {
      from: fromAddress,
      to: toAddress,
      amount
    });
  } catch (e) {
    console.log('⚠️  Signature error:', e.message);
  }
  
  const transfers = loadTransfers();
  transfers.push(transferRecord);
  saveTransfers(transfers);
  
  console.log(`✅ Transfer: ${amount} GDM`);
  console.log(`   From:      ${fromAddress}`);
  console.log(`   To:        ${toAddress}`);
  console.log(`   Fee:       ${fee} GDM (0.1%)`);
  console.log(`   Owner Fee: ${ownerFee} GDM (5% of fee)`);
  console.log(`   Net:       ${netAmount} GDM`);
  console.log(`   ID:        ${transferRecord.id}`);
  return transferRecord;
}

function getTransfers(address) {
  const transfers = loadTransfers();
  return transfers.filter(t => t.from === address || t.to === address);
}

if (require.main === module) {
  console.log('==========================================');
  console.log('🔄 GANDOM TRANSFER SYSTEM');
  console.log('==========================================\n');
  
  // ساخت یک کیف پول گیرنده
  const { createWallet } = require('./index.js');
  const receiverWallet = createWallet(0); // گیرنده با موجودی صفر
  
  console.log(`\n📤 Sending 1000 GDM to receiver...\n`);
  
  transfer(
    'CdDUfT6gsUJFb5VArH21ZVRWqT8bM6Cqz',
    receiverWallet.address,
    1000,
    'd0f60dd30fbe1135b6460000000000000000000000000000000000000000000',
    '041fb3e64146d233569cd0eed92a2e02471155eb0000000000000000000000000000000000000000000000000000000000000000000000'
  );
  
  console.log(`\n📋 Total Transfers: ${getTransfers('CdDUfT6gsUJFb5VArH21ZVRWqT8bM6Cqz').length}`);
}

module.exports = { transfer, getTransfers };

