'use strict';
// GANDOM WITHDRAW MODULE
const { calculateFee } = require('./fee.js');

const withdrawals = [];

function withdraw(wallet, amount_irt, destination) {
    if (amount_irt <= 0) return { error: 'INVALID_AMOUNT' };
    if ((wallet.balance_irt || 0) < amount_irt) return { error: 'INSUFFICIENT_BALANCE' };
    const fee = calculateFee('WITHDRAW', amount_irt);
    const net = amount_irt - fee;
    wallet.balance_irt -= amount_irt;
    const tx = {
        type: 'WITHDRAW', amount: amount_irt, fee: fee,
        net: net, destination: destination, ts: new Date().toISOString()
    };
    withdrawals.push(tx);
    return tx;
}

module.exports = { withdraw, withdrawals };
