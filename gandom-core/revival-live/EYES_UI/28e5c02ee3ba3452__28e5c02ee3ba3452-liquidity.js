const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LIQUIDITY_FILE = path.join(__dirname, 'liquidity.json');
const FEE_RATE = 0.003;

function loadLiquidity() {
  if (!fs.existsSync(LIQUIDITY_FILE)) {
    return { pools: [], providers: [], swaps: [] };
  }
  return JSON.parse(fs.readFileSync(LIQUIDITY_FILE, 'utf8'));
}

function saveLiquidity(liquidity) {
  fs.writeFileSync(LIQUIDITY_FILE, JSON.stringify(liquidity, null, 2));
}

function createPool(gdmAmount, usdtAmount) {
  const liquidity = loadLiquidity();
  const pool = {
    id: crypto.randomUUID(),
    gdmReserve: gdmAmount,
    usdtReserve: usdtAmount,
    k: gdmAmount * usdtAmount,
    createdAt: Date.now()
  };
  liquidity.pools.push(pool);
  saveLiquidity(liquidity);
  
  const initialPrice = usdtAmount / gdmAmount;
  console.log('Pool created');
  console.log('   ID:            ' + pool.id);
  console.log('   GDM Reserve:   ' + gdmAmount + ' GDM');
  console.log('   USDT Reserve:  ' + usdtAmount + ' USDT');
  console.log('   K (constant):  ' + pool.k);
  console.log('   Price:         ' + initialPrice.toFixed(4) + ' USDT/GDM');
  
  return pool;
}

function swapGDMtoUSDT(gdmAmount, poolId) {
  const liquidity = loadLiquidity();
  const pool = poolId 
    ? liquidity.pools.find(p => p.id === poolId)
    : liquidity.pools[0];
  
  if (!pool) {
    console.log('Pool not found');
    return null;
  }
  
  const fee = gdmAmount * FEE_RATE;
  const gdmAfterFee = gdmAmount - fee;
  
  const newGdmReserve = pool.gdmReserve + gdmAfterFee;
  const newUsdtReserve = pool.k / newGdmReserve;
  const usdtOut = pool.usdtReserve - newUsdtReserve;
  
  pool.gdmReserve = newGdmReserve;
  pool.usdtReserve = newUsdtReserve;
  pool.k = newGdmReserve * newUsdtReserve;
  
  const swap = {
    id: crypto.randomUUID(),
    type: 'GDM_TO_USDT',
    gdmIn: gdmAmount,
    usdtOut: usdtOut,
    fee: fee,
    price: usdtOut / gdmAmount,
    timestamp: Date.now()
  };
  liquidity.swaps.push(swap);
  saveLiquidity(liquidity);
  
  console.log('Swap: GDM -> USDT');
  console.log('   GDM In:    ' + gdmAmount);
  console.log('   USDT Out:  ' + usdtOut.toFixed(2));
  console.log('   Fee:       ' + fee.toFixed(2) + ' GDM');
  console.log('   Price:     ' + swap.price.toFixed(4) + ' USDT/GDM');
  
  return swap;
}

function swapUSDTtoGDM(usdtAmount, poolId) {
  const liquidity = loadLiquidity();
  const pool = poolId 
    ? liquidity.pools.find(p => p.id === poolId)
    : liquidity.pools[0];
  
  if (!pool) {
    console.log('Pool not found');
    return null;
  }
  
  const fee = usdtAmount * FEE_RATE;
  const usdtAfterFee = usdtAmount - fee;
  
  const newUsdtReserve = pool.usdtReserve + usdtAfterFee;
  const newGdmReserve = pool.k / newUsdtReserve;
  const gdmOut = pool.gdmReserve - newGdmReserve;
  
  pool.gdmReserve = newGdmReserve;
  pool.usdtReserve = newUsdtReserve;
  pool.k = newGdmReserve * newUsdtReserve;
  
  const swap = {
    id: crypto.randomUUID(),
    type: 'USDT_TO_GDM',
    usdtIn: usdtAmount,
    gdmOut: gdmOut,
    fee: fee,
    price: usdtAmount / gdmOut,
    timestamp: Date.now()
  };
  liquidity.swaps.push(swap);
  saveLiquidity(liquidity);
  
  console.log('Swap: USDT -> GDM');
  console.log('   USDT In:   ' + usdtAmount);
  console.log('   GDM Out:   ' + gdmOut.toFixed(2));
  console.log('   Fee:       ' + fee.toFixed(2) + ' USDT');
  console.log('   Price:     ' + swap.price.toFixed(4) + ' USDT/GDM');
  
  return swap;
}

function getPoolStats(poolId) {
  const liquidity = loadLiquidity();
  const pool = poolId 
    ? liquidity.pools.find(p => p.id === poolId)
    : liquidity.pools[0];
  
  if (!pool) return null;
  
  return {
    gdmReserve: pool.gdmReserve,
    usdtReserve: pool.usdtReserve,
    price: pool.usdtReserve / pool.gdmReserve,
    totalSwaps: liquidity.swaps.length
  };
}

console.log('==========================================');
console.log('GANDOM DEX - LIQUIDITY POOL');
console.log('==========================================');

const pool = createPool(1000000, 1000000);

console.log('');
swapGDMtoUSDT(10000);
console.log('');
swapUSDTtoGDM(5000);

console.log('');
console.log('--- Pool Stats ---');
const stats = getPoolStats();
console.log('GDM Reserve:   ' + stats.gdmReserve.toFixed(2));
console.log('USDT Reserve:  ' + stats.usdtReserve.toFixed(2));
console.log('Price:         ' + stats.price.toFixed(4) + ' USDT/GDM');
console.log('Total Swaps:   ' + stats.totalSwaps);

module.exports = { createPool, swapGDMtoUSDT, swapUSDTtoGDM, getPoolStats };
