const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AIRDROP_FILE = path.join(__dirname, 'airdrops.json');
const TOTAL_AIRDROP = 1200000000;
const REWARD_PER_USER = 1000;

function loadAirdrops() {
  if (!fs.existsSync(AIRDROP_FILE)) return [];
  return JSON.parse(fs.readFileSync(AIRDROP_FILE, 'utf8'));
}

function saveAirdrops(airdrops) {
  fs.writeFileSync(AIRDROP_FILE, JSON.stringify(airdrops, null, 2));
}

function registerAirdrop(address, socialMedia, referrer) {
  socialMedia = socialMedia || 'telegram';
  referrer = referrer || null;
  const airdrops = loadAirdrops();
  
  if (airdrops.find(a => a.address === address)) {
    console.log('Address already registered');
    return null;
  }
  
  const totalGiven = airdrops.reduce((sum, a) => sum + a.amount, 0);
  if (totalGiven + REWARD_PER_USER > TOTAL_AIRDROP) {
    console.log('Airdrop pool is empty');
    return null;
  }
  
  const record = {
    id: crypto.randomUUID(),
    address: address,
    amount: REWARD_PER_USER,
    socialMedia: socialMedia,
    referrer: referrer,
    status: 'completed',
    createdAt: Date.now()
  };
  
  airdrops.push(record);
  saveAirdrops(airdrops);
  
  console.log('Airdrop: ' + REWARD_PER_USER + ' GDM to ' + address);
  console.log('   Source: ' + socialMedia);
  if (referrer) console.log('   Referrer: ' + referrer);
  console.log('   Remaining Pool: ' + (TOTAL_AIRDROP - totalGiven - REWARD_PER_USER) + ' GDM');
  
  return record;
}

function getAirdropStats() {
  const airdrops = loadAirdrops();
  const totalGiven = airdrops.reduce((sum, a) => sum + a.amount, 0);
  return {
    totalPool: TOTAL_AIRDROP,
    totalGiven: totalGiven,
    remaining: TOTAL_AIRDROP - totalGiven,
    totalUsers: airdrops.length
  };
}

console.log('==========================================');
console.log('GANDOM AIRDROP SYSTEM');
console.log('==========================================');

registerAirdrop('1User1Address', 'telegram');
registerAirdrop('1User2Address', 'twitter');
registerAirdrop('1User3Address', 'instagram', '1User1Address');

console.log('');
console.log('--- Stats ---');
const stats = getAirdropStats();
console.log('Total Pool:  ' + stats.totalPool + ' GDM');
console.log('Given:       ' + stats.totalGiven + ' GDM');
console.log('Remaining:   ' + stats.remaining + ' GDM');
console.log('Users:       ' + stats.totalUsers);

module.exports = { registerAirdrop, getAirdropStats };
