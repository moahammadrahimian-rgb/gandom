'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'industries.json');
const INDUSTRY_MAX_COINS = 240000000;

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

class IndustryManager {
  constructor() {
    this.industries = loadData();
  }

  save() {
    saveData(this.industries);
  }

  createIndustry(name, slug) {
    if (!name || !slug) {
      throw new Error('INDUSTRY_NAME_AND_SLUG_REQUIRED');
    }

    if (this.industries.some(i => i.slug === slug)) {
      throw new Error('INDUSTRY_ALREADY_EXISTS');
    }

    const industry = {
      id: `IND-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      slug,
      maxCoins: INDUSTRY_MAX_COINS,
      currentCoins: 0,
      managerId: null,
      managerUntil: null,
      createdAt: Date.now()
    };

    this.industries.push(industry);
    this.save();

    return industry;
  }

  getIndustry(slug) {
    return this.industries.find(i => i.slug === slug) || null;
  }

  addCoinsToIndustry(slug, amount) {
    const industry = this.getIndustry(slug);

    if (!industry) throw new Error('INDUSTRY_NOT_FOUND');
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error('INVALID_COIN_AMOUNT');
    }

    if (industry.currentCoins + amount > INDUSTRY_MAX_COINS) {
      throw new Error('INDUSTRY_COIN_LIMIT_EXCEEDED');
    }

    industry.currentCoins += amount;
    this.save();

    return industry;
  }

  setManager(slug, managerId, durationMs = 30 * 24 * 60 * 60 * 1000) {
    const industry = this.getIndustry(slug);

    if (!industry) throw new Error('INDUSTRY_NOT_FOUND');
    if (!managerId) throw new Error('MANAGER_ID_REQUIRED');

    industry.managerId = managerId;
    industry.managerUntil = Date.now() + durationMs;

    this.save();

    return industry;
  }

  getAll() {
    return this.industries.map(i => ({ ...i }));
  }
}

function ensureDefaultIndustries() {
  const manager = new IndustryManager();

  for (const [name, slug] of [
    ['املاک', 'amlak'],
    ['طلا', 'tala'],
    ['خودرو', 'khodro']
  ]) {
    if (!manager.getIndustry(slug)) {
      manager.createIndustry(name, slug);
    }
  }

  return manager;
}

module.exports = {
  IndustryManager,
  ensureDefaultIndustries,
  INDUSTRY_MAX_COINS
};

if (require.main === module) {
  const backup = fs.existsSync(DATA_FILE)
    ? fs.readFileSync(DATA_FILE)
    : null;

  try {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);

    const manager = ensureDefaultIndustries();
    const industries = manager.getAll();

    console.log('INDUSTRY_COUNT=' + industries.length);
    console.log('INDUSTRIES=' + industries.map(i => i.slug).join(','));
    console.log(
      'MAX_COINS_240M=' +
      industries.every(i => i.maxCoins === 240000000)
    );

    const updated = manager.addCoinsToIndustry(
      'amlak',
      1000000
    );

    console.log('AMLAK_COINS=' + updated.currentCoins);

    const managed = manager.setManager(
      'amlak',
      'MANAGER-TEST'
    );

    console.log('MANAGER_SET=' + Boolean(managed.managerId));

    const finalData = manager.getIndustry('amlak');

    if (
      industries.length === 3 &&
      finalData.maxCoins === 240000000 &&
      finalData.currentCoins === 1000000 &&
      finalData.managerId === 'MANAGER-TEST'
    ) {
      console.log('INDUSTRY_TEST=PASS');
    } else {
      console.log('INDUSTRY_TEST=FAIL');
      process.exitCode = 1;
    }
  } finally {
    if (backup !== null) {
      fs.writeFileSync(DATA_FILE, backup);
    } else if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  }
}
