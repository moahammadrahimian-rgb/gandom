const f = require('./GANDOM-FPAY-ADAPTER-2558.js');
console.log('ENV=' + f.FPAY_ENV);
console.log('HOST=' + f.HOST);
console.log('API_SET=' + !!process.env.GANDOM_FPAY_API_KEY);
console.log('AUTH_SET=' + !!process.env.GANDOM_FPAY_AUTH_KEY);
console.log('MERCHANT_SET=' + !!process.env.GANDOM_FPAY_MERCHANT_NAME);
console.log('FUNCTIONS=' + Object.keys(f).filter(k => typeof f[k] === 'function').join(','));
