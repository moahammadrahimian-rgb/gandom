const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RE_FILE = path.join(__dirname, 'real-estate.json');
const GDM_PER_TOMAN = 0.0001;

function loadProperties() {
  if (!fs.existsSync(RE_FILE)) return [];
  return JSON.parse(fs.readFileSync(RE_FILE, 'utf8'));
}

function saveProperties(properties) {
  fs.writeFileSync(RE_FILE, JSON.stringify(properties, null, 2));
}

function tokenizeProperty(name, address, priceToman, area) {
  const priceGDM = priceToman * GDM_PER_TOMAN;
  const property = {
    id: crypto.randomUUID(),
    name: name,
    address: address,
    area: area,
    priceToman: priceToman,
    priceGDM: priceGDM,
    tokens: priceGDM,
    owners: [],
    status: 'available',
    createdAt: Date.now()
  };
  
  const properties = loadProperties();
  properties.push(property);
  saveProperties(properties);
  
  console.log('Property tokenized');
  console.log('   Name:      ' + name);
  console.log('   Address:   ' + address);
  console.log('   Area:      ' + area + ' m2');
  console.log('   Price:     ' + priceToman.toLocaleString() + ' Toman');
  console.log('   In GDM:    ' + priceGDM.toLocaleString() + ' GDM');
  console.log('   Tokens:    ' + property.tokens.toLocaleString());
  
  return property;
}

function buyProperty(propertyId, buyer, amount) {
  const properties = loadProperties();
  const property = properties.find(p => p.id === propertyId);
  
  if (!property) {
    console.log('Property not found');
    return null;
  }
  
  const purchase = {
    buyer: buyer,
    amount: amount,
    percentage: (amount / property.tokens) * 100,
    date: Date.now()
  };
  
  property.owners.push(purchase);
  saveProperties(properties);
  
  console.log('Purchase registered');
  console.log('   Property:   ' + property.name);
  console.log('   Buyer:      ' + buyer);
  console.log('   Amount:     ' + amount + ' GDM');
  console.log('   Ownership:  ' + purchase.percentage.toFixed(2) + '%');
  
  return purchase;
}

console.log('==========================================');
console.log('GANDOM REAL ESTATE MARKET');
console.log('==========================================');

const prop = tokenizeProperty(
  'Gandom Tower',
  'Tehran, Valiasr St',
  10000000000,
  500
);

console.log('');

buyProperty(prop.id, '1User1Address', 100000);
buyProperty(prop.id, '1User2Address', 50000);

module.exports = { tokenizeProperty, buyProperty };
