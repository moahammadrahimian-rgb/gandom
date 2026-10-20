const PANCAKESWAP_CONFIG = {
  network: 'Binance Smart Chain',
  chainId: 56,
  router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
  wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  gdm: '0xGDM_ADDRESS_HERE'
};

const LISTING_STEPS = [
  { step: 1, title: 'Deploy GDM Contract', description: 'Deploy BEP-20 contract on BSC', command: 'deploy gandom-token.sol' },
  { step: 2, title: 'Verify Contract', description: 'Verify contract on BscScan', command: 'verify contract on bscscan.com' },
  { step: 3, title: 'Add Liquidity', description: 'Create GDM/BNB pool on PancakeSwap', command: 'add liquidity GDM + BNB' },
  { step: 4, title: 'Set Initial Price', description: 'Initial price: $0.001 per GDM', command: 'set initial price: $0.001/GDM' },
  { step: 5, title: 'Lock Liquidity', description: 'Lock liquidity for 1 year', command: 'lock liquidity for 1 year' },
  { step: 6, title: 'Submit to CoinMarketCap', description: 'Submit listing request to CMC', command: 'submit to coinmarketcap.com' },
  { step: 7, title: 'Submit to CoinGecko', description: 'Submit listing request to CoinGecko', command: 'submit to coingecko.com' }
];

function getListingInfo() {
  return {
    exchange: 'PancakeSwap',
    network: PANCAKESWAP_CONFIG.network,
    chainId: PANCAKESWAP_CONFIG.chainId,
    pair: 'GDM/BNB',
    totalSteps: LISTING_STEPS.length
  };
}

function showSteps() {
  console.log('==========================================');
  console.log('GANDOM - PANCAKESWAP LISTING STEPS');
  console.log('==========================================');
  console.log('');
  LISTING_STEPS.forEach(step => {
    console.log('Step ' + step.step + ': ' + step.title);
    console.log('  ' + step.description);
    console.log('  Command: ' + step.command);
    console.log('');
  });
}

function calculateInitialLiquidity(gdmAmount, bnbAmount) {
  const price = bnbAmount / gdmAmount;
  return {
    gdmAmount: gdmAmount,
    bnbAmount: bnbAmount,
    price: price,
    priceUSD: price * 600,
    totalValue: gdmAmount * price * 600
  };
}

console.log('==========================================');
console.log('GANDOM - PANCAKESWAP LISTING');
console.log('==========================================');
console.log('');

const info = getListingInfo();
console.log('--- Listing Info ---');
console.log('Exchange:  ' + info.exchange);
console.log('Network:   ' + info.network);
console.log('Chain ID:  ' + info.chainId);
console.log('Pair:      ' + info.pair);
console.log('');

showSteps();

console.log('--- Initial Liquidity Example ---');
const liq = calculateInitialLiquidity(1000000, 1);
console.log('GDM Amount:  ' + liq.gdmAmount.toLocaleString());
console.log('BNB Amount:  ' + liq.bnbAmount);
console.log('Price:       ' + liq.price.toFixed(6) + ' BNB/GDM');
console.log('Price (USD): $' + liq.priceUSD.toFixed(4));
console.log('Total Value: $' + liq.totalValue.toLocaleString());

module.exports = { PANCAKESWAP_CONFIG, LISTING_STEPS, getListingInfo, calculateInitialLiquidity };
