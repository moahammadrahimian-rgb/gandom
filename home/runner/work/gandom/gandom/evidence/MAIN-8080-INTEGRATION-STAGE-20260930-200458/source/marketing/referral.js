const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REFERRAL_FILE = path.join(__dirname, 'referrals.json');
const REFERRAL_REWARD = 0.1;

function loadReferrals() {
  if (!fs.existsSync(REFERRAL_FILE)) return [];
  return JSON.parse(fs.readFileSync(REFERRAL_FILE, 'utf8'));
}

function saveReferrals(referrals) {
  fs.writeFileSync(REFERRAL_FILE, JSON.stringify(referrals, null, 2));
}

function registerReferral(referrer, newUser, userAmount) {
  const reward = userAmount * REFERRAL_REWARD;
  
  const record = {
    id: crypto.randomUUID(),
    referrer: referrer,
    newUser: newUser,
    userAmount: userAmount,
    reward: reward,
    status: 'completed',
    createdAt: Date.now()
  };
  
  const referrals = loadReferrals();
  referrals.push(record);
  saveReferrals(referrals);
  
  console.log('Referral registered');
  console.log('   Referrer:  ' + referrer);
  console.log('   New User:  ' + newUser);
  console.log('   Amount:    ' + userAmount + ' GDM');
  console.log('   Reward:    ' + reward + ' GDM');
  
  return record;
}

function getReferralStats(address) {
  const referrals = loadReferrals();
  const userReferrals = referrals.filter(r => r.referrer === address);
  const totalReward = userReferrals.reduce((sum, r) => sum + r.reward, 0);
  return {
    totalReferrals: userReferrals.length,
    totalReward: totalReward,
    referrals: userReferrals
  };
}

console.log('==========================================');
console.log('GANDOM REFERRAL SYSTEM');
console.log('==========================================');

registerReferral('1OwnerAddress', '1NewUser1', 5000000);
registerReferral('1OwnerAddress', '1NewUser2', 3000000);

console.log('');
console.log('--- Stats for 1OwnerAddress ---');
const stats = getReferralStats('1OwnerAddress');
console.log('Total Referrals: ' + stats.totalReferrals);
console.log('Total Reward:    ' + stats.totalReward + ' GDM');

module.exports = { registerReferral, getReferralStats };
