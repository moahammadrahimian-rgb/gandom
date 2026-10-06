const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTO_FILE = path.join(__dirname, 'auto.json');
const GDM_PER_TOMAN = 0.0001;

function loadCars() {
  if (!fs.existsSync(AUTO_FILE)) return [];
  return JSON.parse(fs.readFileSync(AUTO_FILE, 'utf8'));
}

function saveCars(cars) {
  fs.writeFileSync(AUTO_FILE, JSON.stringify(cars, null, 2));
}

function tokenizeCar(brand, model, year, priceToman) {
  const priceGDM = priceToman * GDM_PER_TOMAN;
  const car = {
    id: crypto.randomUUID(),
    brand: brand,
    model: model,
    year: year,
    priceToman: priceToman,
    priceGDM: priceGDM,
    tokens: priceGDM,
    owners: [],
    status: 'available',
    createdAt: Date.now()
  };
  
  const cars = loadCars();
  cars.push(car);
  saveCars(cars);
  
  console.log('Car tokenized');
  console.log('   Brand:     ' + brand);
  console.log('   Model:     ' + model);
  console.log('   Year:      ' + year);
  console.log('   Price:     ' + priceToman.toLocaleString() + ' Toman');
  console.log('   In GDM:    ' + priceGDM.toLocaleString() + ' GDM');
  
  return car;
}

function buyCar(carId, buyer, amount) {
  const cars = loadCars();
  const car = cars.find(c => c.id === carId);
  
  if (!car) {
    console.log('Car not found');
    return null;
  }
  
  const purchase = {
    buyer: buyer,
    amount: amount,
    percentage: (amount / car.tokens) * 100,
    date: Date.now()
  };
  
  car.owners.push(purchase);
  saveCars(cars);
  
  console.log('Car purchase registered');
  console.log('   Brand:      ' + car.brand + ' ' + car.model);
  console.log('   Buyer:      ' + buyer);
  console.log('   Amount:     ' + amount + ' GDM');
  console.log('   Ownership:  ' + purchase.percentage.toFixed(2) + '%');
  
  return purchase;
}

console.log('==========================================');
console.log('GANDOM AUTO MARKET');
console.log('==========================================');

const car = tokenizeCar('Toyota', 'Camry', 2024, 5000000000);
console.log('');
buyCar(car.id, '1User1Address', 100000);
buyCar(car.id, '1User2Address', 50000);

module.exports = { tokenizeCar, buyCar };
