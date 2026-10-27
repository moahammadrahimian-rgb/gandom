const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GOLD_SHOPS_FILE = path.join(__dirname, 'gold-shops.json');
const COMMISSION_RATE = 0.015;

function loadGoldShops() {
  if (!fs.existsSync(GOLD_SHOPS_FILE)) return [];
  return JSON.parse(fs.readFileSync(GOLD_SHOPS_FILE, 'utf8'));
}

function saveGoldShops(shops) {
  fs.writeFileSync(GOLD_SHOPS_FILE, JSON.stringify(shops, null, 2));
}

function registerGoldShop(name, phone, city, license) {
  const shops = loadGoldShops();
  const shop = {
    id: crypto.randomUUID(),
    name: name,
    phone: phone,
    city: city,
    license: license,
    goldItems: [],
    totalSales: 0,
    totalCommission: 0,
    status: 'active',
    joinedAt: Date.now()
  };
  shops.push(shop);
  saveGoldShops(shops);

  console.log('Gold shop registered');
  console.log('  Name: ' + name);
  console.log('  Phone: ' + phone);
  console.log('  City: ' + city);
  console.log('  License: ' + license);

  return shop;
}

function addGoldItem(shopId, type, weightGrams, priceGDM) {
  const shops = loadGoldShops();
  const shop = shops.find(s => s.id === shopId);
  if (!shop) {
    console.log('Gold shop not found');
    return null;
  }

  const item = {
    id: crypto.randomUUID(),
    type: type,
    weightGrams: weightGrams,
    priceGDM: priceGDM,
    status: 'available',
    listedAt: Date.now()
  };
  shop.goldItems.push(item);
  saveGoldShops(shops);

  console.log('Gold item added by ' + shop.name);
  console.log('  Type: ' + type);
  console.log('  Weight: ' + weightGrams + ' gram');
  console.log('  Price: ' + priceGDM + ' GDM');

  return item;
}

function recordGoldSale(shopId, itemId, salePriceGDM) {
  const shops = loadGoldShops();
  const shop = shops.find(s => s.id === shopId);
  if (!shop) {
    console.log('Gold shop not found');
    return null;
  }

  const commission = salePriceGDM * COMMISSION_RATE;
  shop.totalSales += 1;
  shop.totalCommission += commission;
  saveGoldShops(shops);

  console.log('Gold sale recorded');
  console.log('  Shop: ' + shop.name);
  console.log('  Sale Price: ' + salePriceGDM + ' GDM');
  console.log('  Commission: ' + commission.toFixed(2) + ' GDM (1.5%)');

  return { shop: shop.name, commission: commission };
}

console.log('==========================================');
console.log('GANDOM GOLD SHOPS SYSTEM');
console.log('==========================================');
console.log('');

const shop1 = registerGoldShop('Gold Palace', '021-88776655', 'Tehran', 'GS-98765');
console.log('');
addGoldItem(shop1.id, 'Gold Coin', 10, 1000);
addGoldItem(shop1.id, 'Gold Bar', 100, 10000);
console.log('');
recordGoldSale(shop1.id, 'item-1', 1000);

module.exports = { registerGoldShop, addGoldItem, recordGoldSale };
