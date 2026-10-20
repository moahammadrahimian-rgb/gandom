'use strict';
// GANDOM WALLET INDEX — Main Controller
const crypto = require('crypto');
const { deposit } = require('./deposit.js');
const { withdraw } = require('./withdraw.js');
const { transfer } = require('./transfer.js');
const { calculateFee } = require('./fee.js');

function createWallet(initial_balance) {
    const wallet = {
        address: 'GDM-' + crypto.randomBytes(16).toString('hex'),
        balance_irt: initial_balance || 0,
        balance_gdm: 0,
        created: new Date().toISOString()
    };
    return wallet;
}

module.exports = { createWallet, deposit, withdraw, transfer, calculateFee };
