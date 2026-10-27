const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ORDERBOOK_FILE = path.join(__dirname, 'orderbook.json');
const FEE_RATE = 0.002;

function loadOrderbook() {
  if (!fs.existsSync(ORDERBOOK_FILE)) {
    return { buyOrders: [], sellOrders: [], trades: [] };
  }
  return JSON.parse(fs.readFileSync(ORDERBOOK_FILE, 'utf8'));
}

function saveOrderbook(orderbook) {
  fs.writeFileSync(ORDERBOOK_FILE, JSON.stringify(orderbook, null, 2));
}

function placeBuyOrder(address, price, amount) {
  const orderbook = loadOrderbook();
  const order = {
    id: crypto.randomUUID(),
    type: 'buy',
    address: address,
    price: price,
    amount: amount,
    filled: 0,
    status: 'open',
    createdAt: Date.now()
  };
  orderbook.buyOrders.push(order);
  saveOrderbook(orderbook);
  
  console.log('Buy order placed');
  console.log('   ID:      ' + order.id);
  console.log('   Address: ' + address);
  console.log('   Price:   ' + price + ' USDT');
  console.log('   Amount:  ' + amount + ' GDM');
  
  matchOrders();
  return order;
}

function placeSellOrder(address, price, amount) {
  const orderbook = loadOrderbook();
  const order = {
    id: crypto.randomUUID(),
    type: 'sell',
    address: address,
    price: price,
    amount: amount,
    filled: 0,
    status: 'open',
    createdAt: Date.now()
  };
  orderbook.sellOrders.push(order);
  saveOrderbook(orderbook);
  
  console.log('Sell order placed');
  console.log('   ID:      ' + order.id);
  console.log('   Address: ' + address);
  console.log('   Price:   ' + price + ' USDT');
  console.log('   Amount:  ' + amount + ' GDM');
  
  matchOrders();
  return order;
}

function matchOrders() {
  const orderbook = loadOrderbook();
  let matched = 0;
  
  orderbook.buyOrders.sort((a, b) => b.price - a.price);
  orderbook.sellOrders.sort((a, b) => a.price - b.price);
  
  for (const buyOrder of orderbook.buyOrders) {
    if (buyOrder.status === 'filled') continue;
    
    for (const sellOrder of orderbook.sellOrders) {
      if (sellOrder.status === 'filled') continue;
      if (buyOrder.price < sellOrder.price) break;
      
      const buyRemaining = buyOrder.amount - buyOrder.filled;
      const sellRemaining = sellOrder.amount - sellOrder.filled;
      const tradeAmount = Math.min(buyRemaining, sellRemaining);
      const tradePrice = sellOrder.price;
      
      buyOrder.filled += tradeAmount;
      sellOrder.filled += tradeAmount;
      
      if (buyOrder.filled >= buyOrder.amount) buyOrder.status = 'filled';
      if (sellOrder.filled >= sellOrder.amount) sellOrder.status = 'filled';
      
      const trade = {
        id: crypto.randomUUID(),
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        buyer: buyOrder.address,
        seller: sellOrder.address,
        price: tradePrice,
        amount: tradeAmount,
        total: tradePrice * tradeAmount,
        fee: tradePrice * tradeAmount * FEE_RATE,
        timestamp: Date.now()
      };
      orderbook.trades.push(trade);
      matched++;
      
      console.log('Trade matched!');
      console.log('   Buyer:   ' + buyOrder.address);
      console.log('   Seller:  ' + sellOrder.address);
      console.log('   Price:   ' + tradePrice + ' USDT');
      console.log('   Amount:  ' + tradeAmount + ' GDM');
      console.log('   Total:   ' + trade.total + ' USDT');
      
      if (buyOrder.status === 'filled') break;
    }
  }
  
  saveOrderbook(orderbook);
  return matched;
}

function getOrderbookStats() {
  const orderbook = loadOrderbook();
  return {
    buyOrders: orderbook.buyOrders.filter(o => o.status === 'open').length,
    sellOrders: orderbook.sellOrders.filter(o => o.status === 'open').length,
    trades: orderbook.trades.length,
    lastPrice: orderbook.trades.length > 0 
      ? orderbook.trades[orderbook.trades.length - 1].price 
      : null
  };
}

console.log('==========================================');
console.log('GANDOM DEX - ORDER BOOK');
console.log('==========================================');

placeSellOrder('1SellerAddress', 1.00, 1000);
placeSellOrder('1SellerAddress', 1.10, 500);
placeBuyOrder('1BuyerAddress', 1.05, 800);
placeBuyOrder('1BuyerAddress', 1.10, 600);

console.log('');
console.log('--- Stats ---');
const stats = getOrderbookStats();
console.log('Open Buy Orders:  ' + stats.buyOrders);
console.log('Open Sell Orders: ' + stats.sellOrders);
console.log('Total Trades:     ' + stats.trades);
console.log('Last Price:       ' + stats.lastPrice + ' USDT');

module.exports = { placeBuyOrder, placeSellOrder, matchOrders, getOrderbookStats };
