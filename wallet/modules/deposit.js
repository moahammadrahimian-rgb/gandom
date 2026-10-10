'use strict';
// GANDOM DEPOSIT MODULE
const { calculateFee } = require('./fee.js');

const deposits = [];

function deposit(wallet, amount_irt, source) {
    if (amount_irt <= 0) return { error: 'INVALID_AMOUNT' };
    const fee = calculateFee('DEPOSIT', amount_irt); // رایگان
    const net = amount_irt - fee;
    wallet.balance_irt = (wallet.balance_irt || 0) + net;
    const tx = {
        type: 'DEPOSIT', amount: amount_irt, fee: fee,
        net: net, source: source, ts: new Date().toISOString()
    };
    deposits.push(tx);
    return tx;
}

module.exports = { deposit, deposits };
