const Auth = require('./index.js');

console.log('==========================================');
console.log('GANDOM KYC FULL TEST');
console.log('==========================================');
console.log('');

console.log('--- Step 1: Validate National IDs ---');
const testIds = ['0084575948', '0938650674', '0013542419', '1234567890'];
testIds.forEach(id => {
  const valid = Auth.validateNationalId(id);
  console.log('  ' + id + ' -> ' + (valid ? 'VALID' : 'INVALID'));
});
console.log('');

console.log('--- Step 2: Register User ---');
const user = Auth.registerUser('09121234567', 'mypassword123');
console.log('');

if (user) {
  console.log('--- Step 3: Submit KYC ---');
  const kyc = Auth.submitKYC(user.id, '0084575948', 'Ali', 'Ahmadi', '1370/01/01', 'Tehran');
  console.log('');
  
  if (kyc) {
    console.log('--- Step 4: Approve KYC ---');
    Auth.approveKYC(user.id);
    console.log('');
  }
  
  console.log('--- Step 5: Login ---');
  Auth.login('09121234567', 'mypassword123');
  console.log('');
}

console.log('--- Final Stats ---');
const stats = Auth.getStats();
console.log('Total Users:    ' + stats.totalUsers);
console.log('Verified Users: ' + stats.verifiedUsers);
console.log('KYC Records:    ' + stats.kycRecords);
