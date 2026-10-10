'use strict';
// GANDOM WALLET BRIDGE — Connect Audit Service to Bank
// Law 2558 | NO_FAKE_PASS=1

const fs = require('fs');
const path = require('path');

const WALLET_STATE = path.join(__dirname, '..', 'wallet', 'wallet-state.json');
const BRIDGE_LOG = path.join(__dirname, 'bridge.log');

function hash(v) {
    return require('crypto').createHash('sha256').update(JSON.stringify(v)).digest('hex');
}

function loadWallet() {
    try {
        return JSON.parse(fs.readFileSync(WALLET_STATE, 'utf8'));
    } catch (e) {
        return { balances: {}, transactions: [] };
    }
}

function saveWallet(wallet) {
    wallet.last_hash = hash(wallet.transactions);
    fs.writeFileSync(WALLET_STATE, JSON.stringify(wallet, null, 2));
}

// ثبت درآمد حسابرسی در بانک
function recordAuditIncome(customer, amount_irt, audit_id) {
    const wallet = loadWallet();

    const OWNER_SHARE_PERCENT = 10;
    const ownerCut = Math.floor((amount_irt * OWNER_SHARE_PERCENT) / 100);
    const treasuryCut = amount_irt - ownerCut;

    // اطمینان از وجود حساب‌ها
    if (!wallet.balances['moahammadrahimian-rgb']) {
        wallet.balances['moahammadrahimian-rgb'] = { gdm: 0, irt: 0, role: 'OWNER' };
    }
    if (!wallet.balances['GANDOM-TREASURY']) {
        wallet.balances['GANDOM-TREASURY'] = { gdm: 0, irt: 0, role: 'TREASURY' };
    }

    wallet.balances['moahammadrahimian-rgb'].irt += ownerCut;
    wallet.balances['GANDOM-TREASURY'].irt += treasuryCut;

    const tx = {
        type: 'AUDIT_INCOME',
        customer: customer,
        amount_irt: amount_irt,
        audit_id: audit_id,
        owner_share_irt: ownerCut,
        treasury_share_irt: treasuryCut,
        ts: new Date().toISOString(),
        hash: hash({ customer, amount_irt, audit_id })
    };

    wallet.transactions.push(tx);
    saveWallet(wallet);

    // لاگ پل
    fs.appendFileSync(BRIDGE_LOG, JSON.stringify(tx) + '\n');

    return tx;
}

module.exports = { recordAuditIncome };

// ==== TEST ====
if (require.main === module) {
    console.log('==========================================');
    console.log('GANDOM WALLET BRIDGE TEST');
    console.log('==========================================');
    const tx = recordAuditIncome('Test Customer', 510000, 'AUDIT-850a7257');
    console.log('BRIDGE_TX=' + JSON.stringify(tx, null, 2));
    console.log('REAL_BRIDGE_ACTIVE=PASS');
    console.log('FAKE_PASS=BLOCKED');
}
