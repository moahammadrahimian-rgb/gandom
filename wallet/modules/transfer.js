'use strict';
// GANDOM TRANSFER MODULE
const { calculateFee } = require('./fee.js');

const transfers = [];

function transfer(fromWallet, toWallet, amount_irt) {
    if (amount_irt <= 0) return { error: 'INVALID_AMOUNT' };
    if ((fromWallet.balance_irt || 0) < amount_irt) return { error: 'INSUFFICIENT_BALANCE' };
    const fee = calculateFee('TRANSFER', amount_irt);
    const net = amount_irt - fee;
    fromWallet.balance_irt -= amount_irt;
    toWallet.balance_irt = (toWallet.balance_irt || 0) + net;
    const tx = {
        type: 'TRANSFER', from: fromWallet.address, to: toWallet.address,
        amount: amount_irt, fee: fee, net: net, ts: new Date().toISOString()
    };
    transfers.push(tx);
    return tx;
}

module.exports = { transfer, transfers };
