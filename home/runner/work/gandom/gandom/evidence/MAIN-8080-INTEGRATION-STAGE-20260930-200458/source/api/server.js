const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load(file) {
  const fp = path.join(DATA_DIR, file + '.json');
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function save(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file + '.json'), JSON.stringify(data, null, 2));
}

function getStats() {
  return {
    users: load('users').length,
    realEstate: load('real-estate').length,
    gold: load('gold').length,
    auto: load('auto').length,
    totalSupply: 24000000000
  };
}

function registerUser(phone, password) {
  const users = load('users');
  if (users.find(u => u.phone === phone)) return { success: false, message: 'کاربر قبلاً ثبت‌نام شده' };
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  const user = {
    id: crypto.randomUUID(),
    phone: phone,
    passwordHash: hash,
    salt: salt,
    balance: 1000,
    kycStatus: 'pending',
    referralCode: 'GDM' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    createdAt: Date.now()
  };
  users.push(user);
  save('users', users);
  return { success: true, user: user };
}

function loginUser(phone, password) {
  const users = load('users');
  const user = users.find(u => u.phone === phone);
  if (!user) return { success: false, message: 'کاربر یافت نشد' };
  const hash = crypto.pbkdf2Sync(password, user.salt, 10000, 64, 'sha512').toString('hex');
  if (hash !== user.passwordHash) return { success: false, message: 'رمز نادرست' };
  return { success: true, user: user };
}

function addProperty(data) {
  const properties = load('real-estate');
  const property = {
    id: crypto.randomUUID(),
    title: data.title,
    province: data.province,
    city: data.city,
    area: data.area,
    price: data.price,
    priceGDM: Math.round(data.price * 0.0001),
    owner: data.owner || 'system',
    status: 'available',
    createdAt: Date.now()
  };
  properties.push(property);
  save('real-estate', properties);
  return { success: true, property: property };
}

function addGold(data) {
  const items = load('gold');
  const item = {
    id: crypto.randomUUID(),
    title: data.title,
    weight: data.weight,
    price: data.price,
    priceGDM: Math.round(data.price * 0.0001),
    owner: data.owner || 'system',
    status: 'available',
    createdAt: Date.now()
  };
  items.push(item);
  save('gold', items);
  return { success: true, gold: item };
}

function addCar(data) {
  const cars = load('auto');
  const car = {
    id: crypto.randomUUID(),
    title: data.title,
    brand: data.brand,
    year: data.year,
    price: data.price,
    priceGDM: Math.round(data.price * 0.0001),
    owner: data.owner || 'system',
    status: 'available',
    createdAt: Date.now()
  };
  cars.push(car);
  save('auto', cars);
  return { success: true, car: car };
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let data = {};
    try { data = body ? JSON.parse(body) : {}; } catch(e) {}
    
    let response = { success: false, message: 'مسیر یافت نشد' };
    
    // GET Routes
    if (pathname === '/api/stats' && req.method === 'GET') response = { success: true, data: getStats() };
    else if (pathname === '/api/market/real-estate' && req.method === 'GET') response = { success: true, data: load('real-estate') };
    else if (pathname === '/api/market/gold' && req.method === 'GET') response = { success: true, data: load('gold') };
    else if (pathname === '/api/market/auto' && req.method === 'GET') response = { success: true, data: load('auto') };
    // POST Routes
    else if (pathname === '/api/register' && req.method === 'POST') response = registerUser(data.phone, data.password);
    else if (pathname === '/api/login' && req.method === 'POST') response = loginUser(data.phone, data.password);
    else if (pathname === '/api/market/real-estate' && req.method === 'POST') response = addProperty(data);
    else if (pathname === '/api/market/gold' && req.method === 'POST') response = addGold(data);
    else if (pathname === '/api/market/auto' && req.method === 'POST') response = addCar(data);
    
    res.writeHead(200);
    res.end(JSON.stringify(response, null, 2));
  });
});

server.listen(PORT, () => {
  console.log('==========================================');
  console.log('GANDOM API SERVER v2.0');
  console.log('==========================================');
  console.log('');
  console.log('Server: http://localhost:' + PORT);
  console.log('');
  console.log('GET:  /api/stats, /api/market/*');
  console.log('POST: /api/register, /api/login, /api/market/*');
  console.log('');
});
