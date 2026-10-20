const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REALTORS_FILE = path.join(__dirname, 'realtors.json');
const COMMISSION_RATE = 0.02;

function loadRealtors() {
  if (!fs.existsSync(REALTORS_FILE)) return [];
  return JSON.parse(fs.readFileSync(REALTORS_FILE, 'utf8'));
}

function saveRealtors(realtors) {
  fs.writeFileSync(REALTORS_FILE, JSON.stringify(realtors, null, 2));
}

function registerRealtor(name, phone, city, license) {
  const realtors = loadRealtors();
  const realtor = {
    id: crypto.randomUUID(),
    name: name,
    phone: phone,
    city: city,
    license: license,
    properties: [],
    totalSales: 0,
    totalCommission: 0,
    status: 'active',
    joinedAt: Date.now()
  };
  realtors.push(realtor);
  saveRealtors(realtors);

  console.log('Realtor registered');
  console.log('  Name: ' + name);
  console.log('  Phone: ' + phone);
  console.log('  City: ' + city);
  console.log('  License: ' + license);

  return realtor;
}

function addProperty(realtorId, propertyName, priceGDM) {
  const realtors = loadRealtors();
  const realtor = realtors.find(r => r.id === realtorId);
  if (!realtor) {
    console.log('Realtor not found');
    return null;
  }

  const property = {
    id: crypto.randomUUID(),
    name: propertyName,
    priceGDM: priceGDM,
    status: 'available',
    listedAt: Date.now()
  };
  realtor.properties.push(property);
  saveRealtors(realtors);

  console.log('Property added by ' + realtor.name);
  console.log('  Property: ' + propertyName);
  console.log('  Price: ' + priceGDM + ' GDM');

  return property;
}

function recordSale(realtorId, propertyId, salePriceGDM) {
  const realtors = loadRealtors();
  const realtor = realtors.find(r => r.id === realtorId);
  if (!realtor) {
    console.log('Realtor not found');
    return null;
  }

  const commission = salePriceGDM * COMMISSION_RATE;
  realtor.totalSales += 1;
  realtor.totalCommission += commission;
  saveRealtors(realtors);

  console.log('Sale recorded');
  console.log('  Realtor: ' + realtor.name);
  console.log('  Sale Price: ' + salePriceGDM + ' GDM');
  console.log('  Commission: ' + commission.toFixed(2) + ' GDM (2%)');

  return { realtor: realtor.name, commission: commission };
}

console.log('==========================================');
console.log('GANDOM REALTORS SYSTEM');
console.log('==========================================');
console.log('');

const realtor1 = registerRealtor('Ali Ahmadi', '0912-1234567', 'Tehran', 'RE-12345');
console.log('');
addProperty(realtor1.id, 'Gandom Tower Apt 101', 1000000);
addProperty(realtor1.id, 'Gandom Tower Apt 102', 1200000);
console.log('');
recordSale(realtor1.id, 'prop-1', 1000000);

module.exports = { registerRealtor, addProperty, recordSale };
