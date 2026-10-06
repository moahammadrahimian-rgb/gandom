const path = require('path');
const fs = require('fs');
const ROOT = __dirname;

console.log('==========================================');
console.log('🌾 GANDOM BLOCKCHAIN CORE V2');
console.log('==========================================');

// ==========================================
// ۱. ماژول‌های اصلی
// ==========================================
let AI = null;
try { AI = require('./ai/index.js'); console.log('✅ AI module loaded'); } catch (e) { console.log('⚠️  AI error:', e.message); }

let Exchange = null;
try { Exchange = require('./market/exchange.js'); console.log('✅ Exchange module loaded'); } catch (e) { console.log('⚠️  Exchange error:', e.message); }

let Coins = null;
try { Coins = require('./coins/index.js'); console.log('✅ Coins module loaded'); } catch (e) { console.log('⚠️  Coins error:', e.message); }

let AutoPublish = null;
try { AutoPublish = require('./autopublish/index.js'); console.log('✅ AutoPublish module loaded'); } catch (e) { console.log('⚠️  AutoPublish error:', e.message); }

let Blockchain = null;
try { Blockchain = require('./blockchain/advanced.js'); console.log('✅ Blockchain loaded'); } catch (e) { console.log('⚠️  Blockchain error:', e.message); }

let P2P = null;
try { P2P = require('./blockchain/index.js'); console.log('✅ P2P network loaded'); } catch (e) { console.log('⚠️  P2P error:', e.message); }

// ==========================================
// ۲. کیف پول
// ==========================================
let Wallet = null;
try { Wallet = require('./wallet/index.js'); console.log('✅ Wallet module loaded'); } catch (e) { console.log('⚠️  Wallet error:', e.message); }

let Deposit = null;
try { Deposit = require('./wallet/deposit.js'); console.log('✅ Deposit module loaded'); } catch (e) { console.log('⚠️  Deposit error:', e.message); }

let Withdraw = null;
try { Withdraw = require('./wallet/withdraw.js'); console.log('✅ Withdraw module loaded'); } catch (e) { console.log('⚠️  Withdraw error:', e.message); }

let Transfer = null;
try { Transfer = require('./wallet/transfer.js'); console.log('✅ Transfer module loaded'); } catch (e) { console.log('⚠️  Transfer error:', e.message); }

let Fee = null;
try { Fee = require('./wallet/fee.js'); console.log('✅ Fee module loaded'); } catch (e) { console.log('⚠️  Fee error:', e.message); }

// ==========================================
// ۳. احراز هویت (KYC)
// ==========================================
let Auth = null;
try { Auth = require('./auth/index.js'); console.log('✅ Auth (KYC) module loaded'); } catch (e) { console.log('⚠️  Auth error:', e.message); }

// ==========================================
// ۴. تبلیغات وایرال
// ==========================================
let Airdrop = null;
try { Airdrop = require('./marketing/airdrop.js'); console.log('✅ Airdrop module loaded'); } catch (e) { console.log('⚠️  Airdrop error:', e.message); }

let Referral = null;
try { Referral = require('./marketing/referral.js'); console.log('✅ Referral module loaded'); } catch (e) { console.log('⚠️  Referral error:', e.message); }

// ==========================================
// ۵. سه بازار اصلی
// ==========================================
let RealEstate = null;
try { RealEstate = require('./markets/real-estate.js'); console.log('✅ Real Estate loaded'); } catch (e) { console.log('⚠️  Real Estate error:', e.message); }

let Gold = null;
try { Gold = require('./markets/gold.js'); console.log('✅ Gold loaded'); } catch (e) { console.log('⚠️  Gold error:', e.message); }

let Auto = null;
try { Auto = require('./markets/auto.js'); console.log('✅ Auto loaded'); } catch (e) { console.log('⚠️  Auto error:', e.message); }

// ==========================================
// ۶. صرافی DEX
// ==========================================
let Orderbook = null;
try { Orderbook = require('./exchange/orderbook.js'); console.log('✅ Orderbook loaded'); } catch (e) { console.log('⚠️  Orderbook error:', e.message); }

let Liquidity = null;
try { Liquidity = require('./exchange/liquidity.js'); console.log('✅ Liquidity loaded'); } catch (e) { console.log('⚠️  Liquidity error:', e.message); }

let Chart = null;
try { Chart = require('./exchange/chart.js'); console.log('✅ Chart loaded'); } catch (e) { console.log('⚠️  Chart error:', e.message); }

let Deploy = null;
try { Deploy = require('./exchange/deploy.js'); console.log('✅ Deploy loaded'); } catch (e) { console.log('⚠️  Deploy error:', e.message); }

// ==========================================
// ۷. وضعیت سیستم
// ==========================================
function showStatus() {
  console.log('');
  console.log('--- System Status ---');
  console.log('🤖 AI Module:        ' + (AI ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🏪 Exchange:         ' + (Exchange ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('💰 Coins:            ' + (Coins ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('📢 AutoPublish:      ' + (AutoPublish ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('⛓️  Blockchain:       ' + (Blockchain ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🌐 P2P Network:      ' + (P2P ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🔑 Wallet:           ' + (Wallet ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('💰 Deposit:          ' + (Deposit ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('💸 Withdraw:         ' + (Withdraw ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🔄 Transfer:         ' + (Transfer ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('💵 Fee:              ' + (Fee ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🔐 Auth (KYC):       ' + (Auth ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🎁 Airdrop:          ' + (Airdrop ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🤝 Referral:         ' + (Referral ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🏠 Real Estate:      ' + (RealEstate ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🥇 Gold:             ' + (Gold ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🚗 Auto:             ' + (Auto ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('📊 Orderbook:        ' + (Orderbook ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('💧 Liquidity:        ' + (Liquidity ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('📈 Chart:            ' + (Chart ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('🚀 Deploy:           ' + (Deploy ? '✅ ACTIVE' : '❌ INACTIVE'));
  console.log('==========================================');
}

async function main() {
  console.log('');
  console.log('--- Loading modules ---');
  showStatus();
  console.log('');
  console.log('🌾 Gandom Core V2 is running');
  console.log('==========================================');
}

main().catch(console.error);
