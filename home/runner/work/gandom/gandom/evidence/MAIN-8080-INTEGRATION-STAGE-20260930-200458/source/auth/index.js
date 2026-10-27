const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, 'users.json');
const OTP_FILE = path.join(__dirname, 'otp-codes.json');
const KYC_FILE = path.join(__dirname, 'kyc-records.json');

const OTP_EXPIRY = 2 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadOTPs() {
  if (!fs.existsSync(OTP_FILE)) return [];
  return JSON.parse(fs.readFileSync(OTP_FILE, 'utf8'));
}

function saveOTPs(otps) {
  fs.writeFileSync(OTP_FILE, JSON.stringify(otps, null, 2));
}

function loadKYC() {
  if (!fs.existsSync(KYC_FILE)) return [];
  return JSON.parse(fs.readFileSync(KYC_FILE, 'utf8'));
}

function saveKYC(records) {
  fs.writeFileSync(KYC_FILE, JSON.stringify(records, null, 2));
}

function validatePhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const pattern = /^09[0-9]{9}$/;
  return pattern.test(cleaned);
}

function validateNationalId(code) {
  if (!/^[0-9]{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(code[i]) * (10 - i);
  }
  const remainder = sum % 11;
  const checkDigit = parseInt(code[9]);
  
  return (remainder < 2 && checkDigit === remainder) || (remainder >= 2 && checkDigit === 11 - remainder);
}

function sendOTP(phone) {
  if (!validatePhone(phone)) {
    console.log('شماره موبایل نامعتبر است');
    return null;
  }
  
  const otps = loadOTPs();
  const cleanPhone = phone.replace(/\D/g, '');
  
  otps.forEach(o => {
    if (o.phone === cleanPhone) o.used = true;
  });
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const otp = {
    id: crypto.randomUUID(),
    phone: cleanPhone,
    code: code,
    attempts: 0,
    used: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_EXPIRY
  };
  
  otps.push(otp);
  saveOTPs(otps);
  
  console.log('OTP sent to ' + cleanPhone);
  console.log('  Code: ' + code);
  console.log('  Expires in: 2 minutes');
  
  return otp;
}

function verifyOTP(phone, code) {
  const otps = loadOTPs();
  const cleanPhone = phone.replace(/\D/g, '');
  const now = Date.now();
  
  const otp = otps.find(o => 
    o.phone === cleanPhone && 
    !o.used && 
    o.expiresAt > now
  );
  
  if (!otp) {
    console.log('کد OTP یافت نشد یا منقضی شده');
    return false;
  }
  
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    console.log('تعداد تلاش‌ها بیش از حد مجاز');
    otp.used = true;
    saveOTPs(otps);
    return false;
  }
  
  otp.attempts += 1;
  
  if (otp.code === code) {
    otp.used = true;
    saveOTPs(otps);
    console.log('کد OTP تأیید شد');
    return true;
  }
  
  saveOTPs(otps);
  console.log('کد OTP نادرست (تلاش ' + otp.attempts + '/' + MAX_OTP_ATTEMPTS + ')');
  return false;
}

function registerUser(phone, password) {
  if (!validatePhone(phone)) {
    console.log('شماره موبایل نامعتبر');
    return null;
  }
  
  const users = loadUsers();
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (users.find(u => u.phone === cleanPhone)) {
    console.log('این شماره قبلاً ثبت‌نام شده');
    return null;
  }
  
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  
  const user = {
    id: crypto.randomUUID(),
    phone: cleanPhone,
    passwordHash: passwordHash,
    salt: salt,
    kycStatus: 'pending',
    kycLevel: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  users.push(user);
  saveUsers(users);
  
  console.log('کاربر ثبت‌نام شد');
  console.log('  ID: ' + user.id.substring(0, 8));
  console.log('  Phone: ' + cleanPhone);
  console.log('  KYC Status: ' + user.kycStatus);
  
  return user;
}

function submitKYC(userId, nationalId, firstName, lastName, birthDate, address) {
  if (!validateNationalId(nationalId)) {
    console.log('کد ملی نامعتبر');
    return null;
  }
  
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    console.log('کاربر یافت نشد');
    return null;
  }
  
  const kycRecords = loadKYC();
  
  if (kycRecords.find(r => r.nationalId === nationalId)) {
    console.log('این کد ملی قبلاً ثبت شده');
    return null;
  }
  
  const record = {
    id: crypto.randomUUID(),
    userId: userId,
    phone: user.phone,
    nationalId: nationalId,
    firstName: firstName,
    lastName: lastName,
    birthDate: birthDate,
    address: address,
    status: 'pending_verification',
    submittedAt: Date.now()
  };
  
  kycRecords.push(record);
  saveKYC(kycRecords);
  
  user.kycStatus = 'pending_verification';
  user.updatedAt = Date.now();
  saveUsers(users);
  
  console.log('KYC submitted');
  console.log('  User ID: ' + userId.substring(0, 8));
  console.log('  National ID: ' + nationalId);
  console.log('  Name: ' + firstName + ' ' + lastName);
  console.log('  Status: pending_verification');
  
  return record;
}

function approveKYC(userId) {
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    console.log('کاربر یافت نشد');
    return false;
  }
  
  const kycRecords = loadKYC();
  const record = kycRecords.find(r => r.userId === userId);
  
  if (!record) {
    console.log('KYC record یافت نشد');
    return false;
  }
  
  record.status = 'verified';
  record.verifiedAt = Date.now();
  saveKYC(kycRecords);
  
  user.kycStatus = 'verified';
  user.kycLevel = 2;
  user.updatedAt = Date.now();
  saveUsers(users);
  
  console.log('KYC approved');
  console.log('  User ID: ' + userId.substring(0, 8));
  console.log('  Name: ' + record.firstName + ' ' + record.lastName);
  console.log('  KYC Level: 2');
  
  return true;
}

function login(phone, password) {
  const users = loadUsers();
  const cleanPhone = phone.replace(/\D/g, '');
  const user = users.find(u => u.phone === cleanPhone);
  
  if (!user) {
    console.log('کاربر یافت نشد');
    return null;
  }
  
  const passwordHash = crypto.pbkdf2Sync(password, user.salt, 10000, 64, 'sha512').toString('hex');
  
  if (passwordHash !== user.passwordHash) {
    console.log('رمز عبور نادرست');
    return null;
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  
  console.log('ورود موفق');
  console.log('  User ID: ' + user.id.substring(0, 8));
  console.log('  KYC Status: ' + user.kycStatus);
  console.log('  Token: ' + token.substring(0, 16) + '...');
  
  return { user: user, token: token };
}

function getStats() {
  const users = loadUsers();
  const kycRecords = loadKYC();
  return {
    totalUsers: users.length,
    verifiedUsers: users.filter(u => u.kycStatus === 'verified').length,
    pendingUsers: users.filter(u => u.kycStatus === 'pending_verification').length,
    kycRecords: kycRecords.length
  };
}

module.exports = {
  validatePhone,
  validateNationalId,
  sendOTP,
  verifyOTP,
  registerUser,
  submitKYC,
  approveKYC,
  login,
  getStats
};
