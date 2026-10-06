'use strict';

const fs = require('fs');
const path = require('path');

const TOTAL_SUPPLY = 24000000000;
const OWNER_PERCENT = 5;
const USER_PERCENT = 95;

const OWNER_SUPPLY = 1200000000;
const USER_SUPPLY = 22800000000;

const CONFIG_FILE = path.join(__dirname, '..', 'coins-config.json');
const DATA_FILE = path.join(__dirname, '..', 'coins.json');

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function getDefaultConfig() {
  return {
    totalSupply: TOTAL_SUPPLY,
    ownerPercent: OWNER_PERCENT,
    userPercent: USER_PERCENT,
    ownerSupply: OWNER_SUPPLY,
    userSupply: USER_SUPPLY
  };
}

class CoinSystem {
  constructor() {
    this.ensureConfig();

    const data = readJson(DATA_FILE, {
      ownerBalance: OWNER_SUPPLY,
      userBalances: {},
      totalUserIssued: 0
    });

    this.ownerBalance = data.ownerBalance;
    this.userBalances = data.userBalances || {};
    this.totalUserIssued = data.totalUserIssued || 0;

    this.validateState();
  }

  ensureConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
      writeJson(CONFIG_FILE, getDefaultConfig());
      return;
    }

    const config = readJson(CONFIG_FILE, null);

    if (
      !config ||
      config.totalSupply !== TOTAL_SUPPLY ||
      config.ownerPercent !== OWNER_PERCENT ||
      config.userPercent !== USER_PERCENT ||
      config.ownerSupply !== OWNER_SUPPLY ||
      config.userSupply !== USER_SUPPLY
    ) {
      throw new Error('COIN_CONFIG_INTEGRITY_FAILED');
    }
  }

  save() {
    writeJson(DATA_FILE, {
      ownerBalance: this.ownerBalance,
      userBalances: this.userBalances,
      totalUserIssued: this.totalUserIssued
    });
  }

  validateState() {
    if (!Number.isSafeInteger(this.ownerBalance) || this.ownerBalance < 0) {
      throw new Error('INVALID_OWNER_BALANCE');
    }

    if (
      !Number.isSafeInteger(this.totalUserIssued) ||
      this.totalUserIssued < 0 ||
      this.totalUserIssued > USER_SUPPLY
    ) {
      throw new Error('INVALID_USER_SUPPLY');
    }

    for (const [userId, balance] of Object.entries(this.userBalances)) {
      if (!Number.isSafeInteger(balance) || balance < 0) {
        throw new Error('INVALID_USER_BALANCE_' + userId);
      }
    }

    const totalUserBalance = Object.values(this.userBalances)
      .reduce((sum, value) => sum + value, 0);

    if (totalUserBalance > USER_SUPPLY) {
      throw new Error('USER_SUPPLY_LIMIT_EXCEEDED');
    }
  }

  getBalance(userId) {
    if (userId === 'OWNER') {
      return this.ownerBalance;
    }

    return this.userBalances[userId] || 0;
  }

  getOwnerBalance() {
    return this.ownerBalance;
  }

  getUserSupplyCap() {
    return USER_SUPPLY;
  }

  getTotalSupply() {
    return TOTAL_SUPPLY;
  }

  getCirculatingSupply() {
    return Object.values(this.userBalances)
      .reduce((sum, value) => sum + value, 0);
  }

  creditUser(userId, amount) {
    if (!userId || userId === 'OWNER') {
      throw new Error('INVALID_USER_ID');
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error('INVALID_COIN_AMOUNT');
    }

    if (
      this.totalUserIssued + amount >
      USER_SUPPLY
    ) {
      throw new Error('USER_SUPPLY_LIMIT_EXCEEDED');
    }

    this.userBalances[userId] =
      (this.userBalances[userId] || 0) + amount;

    this.totalUserIssued += amount;

    this.save();

    return this.userBalances[userId];
  }

  transfer(from, to, amount) {
    if (!from || !to || from === to) {
      throw new Error('INVALID_TRANSFER');
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error('INVALID_COIN_AMOUNT');
    }

    if (from === 'OWNER') {
      throw new Error('OWNER_TRANSFER_DISABLED');
    }

    const senderBalance = this.getBalance(from);

    if (senderBalance < amount) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    this.userBalances[from] = senderBalance - amount;
    this.userBalances[to] =
      (this.userBalances[to] || 0) + amount;

    this.save();

    return {
      from,
      to,
      amount,
      fromBalance: this.userBalances[from],
      toBalance: this.userBalances[to]
    };
  }

  getConfig() {
    return getDefaultConfig();
  }
}

module.exports = {
  CoinSystem,
  TOTAL_SUPPLY,
  OWNER_SUPPLY,
  USER_SUPPLY
};

if (require.main === module) {
  const backupConfig = fs.existsSync(CONFIG_FILE)
    ? fs.readFileSync(CONFIG_FILE)
    : null;

  const backupData = fs.existsSync(DATA_FILE)
    ? fs.readFileSync(DATA_FILE)
    : null;

  try {
    if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);

    const coins = new CoinSystem();

    const config = coins.getConfig();

    console.log('TOTAL_SUPPLY=' + config.totalSupply);
    console.log('OWNER_SUPPLY=' + config.ownerSupply);
    console.log('USER_SUPPLY=' + config.userSupply);

    const alice = coins.creditUser(
      'alice',
      1000000
    );

    console.log('ALICE_BALANCE=' + alice);

    const bob = coins.creditUser(
      'bob',
      500000
    );

    console.log('BOB_BALANCE=' + bob);

    const transfer = coins.transfer(
      'alice',
      'bob',
      250000
    );

    console.log(
      'TRANSFER_AMOUNT=' +
      transfer.amount
    );

    console.log(
      'ALICE_AFTER=' +
      coins.getBalance('alice')
    );

    console.log(
      'BOB_AFTER=' +
      coins.getBalance('bob')
    );

    console.log(
      'OWNER_BALANCE=' +
      coins.getOwnerBalance()
    );

    console.log(
      'CIRCULATING_SUPPLY=' +
      coins.getCirculatingSupply()
    );

    let ownerBlocked = false;

    try {
      coins.transfer(
        'OWNER',
        'alice',
        1
      );
    } catch (error) {
      ownerBlocked =
        error.message === 'OWNER_TRANSFER_DISABLED';
    }

    console.log(
      'OWNER_TRANSFER_BLOCKED=' +
      ownerBlocked
    );

    const expected =
      config.totalSupply === 24000000000 &&
      config.ownerSupply === 1200000000 &&
      config.userSupply === 22800000000 &&
      coins.getBalance('alice') === 750000 &&
      coins.getBalance('bob') === 750000 &&
      coins.getOwnerBalance() === 1200000000 &&
      coins.getCirculatingSupply() === 1500000 &&
      ownerBlocked;

    console.log(
      expected
        ? 'COIN_SYSTEM_TEST=PASS'
        : 'COIN_SYSTEM_TEST=FAIL'
    );

    if (!expected) {
      process.exitCode = 1;
    }
  } finally {
    if (backupConfig !== null) {
      fs.writeFileSync(CONFIG_FILE, backupConfig);
    } else if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }

    if (backupData !== null) {
      fs.writeFileSync(DATA_FILE, backupData);
    } else if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  }
}
