const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GOLD_FILE = path.join(__dirname, 'gold.json');
const GDM_PER_GRAM = 100;

function loadGold() {
  if (!fs.existsSync(GOLD_FILE)) return [];
  return JSON.parse(fs.readFileSync(GOLD_FILE, 'utf8'));
}

function saveGold(goldList) {
  fs.writeFileSync(GOLD_FILE, JSON.stringify(goldList, null, 2));
}

function tokenizeGold(type, weightGrams, purity) {
  purity = purity || 999;
  const priceGDM = weightGrams * GDM_PER_GRAM;
  const gold = {
    id: crypto.randomUUID(),
    type: type,
    weightGrams: weightGrams,
    purity: purity,
    priceGDM: priceGDM,
    tokens: priceGDM,
    owners: [],
    status: 'available',
    createdAt: Date.now()
  };
  
  const goldList = loadGold();
  goldList.push(gold);
  saveGold(goldList);
  
  console.log('Gold tokenized');
  console.log('   Type:      ' + type);
  console.log('   Weight:    ' + weightGrams + ' gram');
  console.log('   Purity:    ' + purity);
  console.log('   In GDM:    ' + priceGDM.toLocaleString() + ' GDM');
  
  return gold;
}

function buyGold(goldId, buyer, amount) {
  const goldList = loadGold();
  const gold = goldList.find(g => g.id === goldId);
  
  if (!gold) {
    console.log('Gold not found');
    return null;
  }
  
  const purchase = {
    buyer: buyer,
    amount: amount,
    grams: (amount / gold.priceGDM) * gold.weightGrams,
    date: Date.now()
  };
  
  gold.owners.push(purchase);
  saveGold(goldList);
  
  console.log('Gold purchase registered');
  console.log('   Type:      ' + gold.type);
  console.log('   Buyer:     ' + buyer);
  console.log('   Amount:    ' + amount + ' GDM');
  console.log('   Grams:     ' + purchase.grams.toFixed(2) + ' gram');
  
  return purchase;
}

console.log('==========================================');
console.log('GANDOM GOLD MARKET');
console.log('==========================================');

const gold = tokenizeGold('Gold Coin', 10, 999);
console.log('');
buyGold(gold.id, '1User1Address', 500);
buyGold(gold.id, '1User2Address', 200);

module.exports = { tokenizeGold, buyGold };
