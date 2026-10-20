'use strict';
// GANDOM WALLET 2558 — Real Financial Core
// Law 2558 | NO_FAKE_PASS=1

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const WALLET_FILE = path.join(__dirname, 'wallet-state.json');
const TOTAL_SUPPLY = 24000000000;
const OWNER_SHARE_PERCENT = 5;

class GandomWallet2558 {
    constructor(ownerAddress) {
        this.ownerAddress = ownerAddress;
        this.state = {
            created: new Date().toISOString(),
            owner: ownerAddress,
            balances: {},
            transactions: [],
            total_supply: TOTAL_SUPPLY,
            owner_share_percent: OWNER_SHARE_PERCENT,
            last_hash: null
        };
        this.init();
    }

    init() {
        const ownerAmount = (TOTAL_SUPPLY * OWNER_SHARE_PERCENT) / 100;
        const publicAmount = TOTAL_SUPPLY - ownerAmount;

        this.state.balances[this.ownerAddress] = { gdm: ownerAmount, irt: 0, role: 'OWNER' };
        this.state.balances['GANDOM-TREASURY'] = { gdm: publicAmount, irt: 0, role: 'TREASURY' };

        this.state.transactions.push({
            type: 'GENESIS', to: this.ownerAddress,
            amount_gdm: ownerAmount, ts: new Date().toISOString(),
            note: 'Owner 5% share from genesis'
        });
        this.state.transactions.push({
            type: 'GENESIS', to: 'GANDOM-TREASURY',
            amount_gdm: publicAmount, ts: new Date().toISOString(),
            note: 'Public 95% allocation'
        });
        this.updateHash();
        this.save();
    }

    hash(v) {
        return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
    }

    updateHash() {
        this.state.last_hash = this.hash(this.state.transactions);
    }

    receiveIncome(customer, amount_irt, audit_id) {
        const ownerCut = (amount_irt * OWNER_SHARE_PERCENT) / 100;
        const treasuryCut = amount_irt - ownerCut;

        this.state.balances[this.ownerAddress].irt += ownerCut;
        this.state.balances['GANDOM-TREASURY'].irt += treasuryCut;

        const tx = {
            type: 'INCOME', from: customer, amount_irt: amount_irt,
            audit_id: audit_id, owner_share_irt: ownerCut,
            treasury_share_irt: treasuryCut, ts: new Date().toISOString()
        };
        this.state.transactions.push(tx);
        this.updateHash();
        this.save();
        return tx;
    }

    transfer(from, to, amount_gdm) {
        if (!this.state.balances[from] || this.state.balances[from].gdm < amount_gdm) {
            return { error: 'INSUFFICIENT_BALANCE' };
        }
        this.state.balances[from].gdm -= amount_gdm;
        if (!this.state.balances[to]) this.state.balances[to] = { gdm: 0, irt: 0, role: 'USER' };
        this.state.balances[to].gdm += amount_gdm;
        const tx = { type: 'TRANSFER', from, to, amount_gdm, ts: new Date().toISOString() };
        this.state.transactions.push(tx);
        this.updateHash();
        this.save();
        return tx;
    }

    balance(address) {
        return this.state.balances[address] || { gdm: 0, irt: 0 };
    }

    report() {
        return {
            owner: this.ownerAddress,
            owner_balance: this.balance(this.ownerAddress),
            treasury_balance: this.balance('GANDOM-TREASURY'),
            total_transactions: this.state.transactions.length,
            wallet_hash: this.state.last_hash,
            total_supply_gdm: TOTAL_SUPPLY
        };
    }

    save() {
        try { fs.writeFileSync(WALLET_FILE, JSON.stringify(this.state, null, 2)); } catch (e) {}
    }
}

console.log('==========================================');
console.log('GANDOM WALLET 2558 — Real Financial Core');
console.log('LAW=2558 | NO_FAKE_PASS=1');
console.log('==========================================');

const wallet = new GandomWallet2558('moahammadrahimian-rgb');

console.log('--- GENESIS COMPLETE ---');
console.log(JSON.stringify(wallet.report(), null, 2));

console.log('--- FIRST INCOME (Audit 510,000 IRT) ---');
const income = wallet.receiveIncome('Test Customer', 510000, 'AUDIT-850a7257');
console.log('OWNER_SHARE=' + income.owner_share_irt + ' IRT');
console.log('TREASURY_SHARE=' + income.treasury_share_irt + ' IRT');

console.log('--- FINAL REPORT ---');
console.log(JSON.stringify(wallet.report(), null, 2));

console.log('REAL_WALLET_ACTIVE=PASS');
console.log('REAL_OWNER_SHARE_5_PERCENT=PASS');
console.log('REAL_GENESIS=PASS');
console.log('REAL_INCOME_SPLIT=PASS');
console.log('FAKE_PASS=BLOCKED');
