const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEALERS_FILE = path.join(__dirname, 'dealers.json');
const COMMISSION_RATE = 0.025;

function loadDealers() {
  if (!fs.existsSync(DEALERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(DEALERS_FILE, 'utf8'));
}

function saveDealers(dealers) {
  fs.writeFileSync(DEALERS_FILE, JSON.stringify(dealers, null, 2));
}

function registerDealer(name, phone, city, brand) {
  const dealers = loadDealers();
  const dealer = {
    id: crypto.randomUUID(),
    name: name,
    phone: phone,
    city: city,
    brand: brand,
    cars: [],
    totalSales: 0,
    totalCommission: 0,
    status: 'active',
    joinedAt: Date.now()
  };
  dealers.push(dealer);
  saveDealers(dealers);

  console.log('Dealer registered');
  console.log('  Name: ' + name);
  console.log('  Phone: ' + phone);
  console.log('  City: ' + city);
  console.log('  Brand: ' + brand);

  return dealer;
}

function addCar(dealerId, model, year, priceGDM) {
  const dealers = loadDealers();
  const dealer = dealers.find(d => d.id === dealerId);
  if (!dealer) {
    console.log('Dealer not found');
    return null;
  }

  const car = {
    id: crypto.randomUUID(),
    model: model,
    year: year,
    priceGDM: priceGDM,
    status: 'available',
    listedAt: Date.now()
  };
  dealer.cars.push(car);
  saveDealers(dealers);

  console.log('Car added by ' + dealer.name);
  console.log('  Model: ' + model);
  console.log('  Year: ' + year);
  console.log('  Price: ' + priceGDM + ' GDM');

  return car;
}

function recordCarSale(dealerId, carId, salePriceGDM) {
  const dealers = loadDealers();
  const dealer = dealers.find(d => d.id === dealerId);
  if (!dealer) {
    console.log('Dealer not found');
    return null;
  }

  const commission = salePriceGDM * COMMISSION_RATE;
  dealer.totalSales += 1;
  dealer.totalCommission += commission;
  saveDealers(dealers);

  console.log('Car sale recorded');
  console.log('  Dealer: ' + dealer.name);
  console.log('  Sale Price: ' + salePriceGDM + ' GDM');
  console.log('  Commission: ' + commission.toFixed(2) + ' GDM (2.5%)');

  return { dealer: dealer.name, commission: commission };
}

console.log('==========================================');
console.log('GANDOM AUTO DEALERS SYSTEM');
console.log('==========================================');
console.log('');

const dealer1 = registerDealer('Iran Khodro Tehran', '021-44556677', 'Tehran', 'Iran Khodro');
console.log('');
addCar(dealer1.id, 'Samand', 2024, 500000);
addCar(dealer1.id, 'Dena Plus', 2024, 700000);
console.log('');
recordCarSale(dealer1.id, 'car-1', 500000);

module.exports = { registerDealer, addCar, recordCarSale };
