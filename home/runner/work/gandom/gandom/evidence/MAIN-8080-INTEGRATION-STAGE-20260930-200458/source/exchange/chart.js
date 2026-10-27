const fs = require('fs');
const path = require('path');

const CHART_FILE = path.join(__dirname, 'chart-data.json');

function loadChartData() {
  if (!fs.existsSync(CHART_FILE)) return [];
  return JSON.parse(fs.readFileSync(CHART_FILE, 'utf8'));
}

function saveChartData(data) {
  fs.writeFileSync(CHART_FILE, JSON.stringify(data, null, 2));
}

function recordPrice(price, volume) {
  const data = loadChartData();
  const point = {
    timestamp: Date.now(),
    price: price,
    volume: volume,
    date: new Date().toISOString()
  };
  data.push(point);
  saveChartData(data);
  return point;
}

function getChartData(limit) {
  limit = limit || 30;
  const data = loadChartData();
  return data.slice(-limit);
}

function getPriceStats() {
  const data = loadChartData();
  if (data.length === 0) return null;
  
  const prices = data.map(d => d.price);
  return {
    current: prices[prices.length - 1],
    high: Math.max(...prices),
    low: Math.min(...prices),
    average: prices.reduce((a, b) => a + b, 0) / prices.length,
    change: prices.length > 1 
      ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 
      : 0,
    totalPoints: data.length
  };
}

console.log('==========================================');
console.log('GANDOM DEX - PRICE CHART');
console.log('==========================================');

console.log('');
console.log('--- Recording Price Points ---');
recordPrice(1.00, 10000);
recordPrice(1.05, 15000);
recordPrice(0.98, 8000);
recordPrice(1.02, 12000);
recordPrice(1.10, 20000);
recordPrice(1.08, 18000);
recordPrice(1.15, 25000);

console.log('');
console.log('--- Last 5 Price Points ---');
const chartData = getChartData(5);
chartData.forEach(point => {
  console.log(point.date + ' | Price: ' + point.price + ' USDT | Volume: ' + point.volume);
});

console.log('');
console.log('--- Price Statistics ---');
const stats = getPriceStats();
console.log('Current Price: ' + stats.current + ' USDT');
console.log('High (30d):    ' + stats.high + ' USDT');
console.log('Low (30d):     ' + stats.low + ' USDT');
console.log('Average:       ' + stats.average.toFixed(4) + ' USDT');
console.log('Change:        ' + stats.change.toFixed(2) + '%');
console.log('Total Points:  ' + stats.totalPoints);

console.log('');
console.log('--- ASCII Chart ---');
const maxPrice = stats.high;
const minPrice = stats.low;
const range = maxPrice - minPrice || 1;

chartData.forEach(point => {
  const normalized = (point.price - minPrice) / range;
  const barLength = Math.round(normalized * 40);
  const bar = '#'.repeat(barLength);
  console.log(point.price.toFixed(2) + ' |' + bar);
});

module.exports = { recordPrice, getChartData, getPriceStats };
