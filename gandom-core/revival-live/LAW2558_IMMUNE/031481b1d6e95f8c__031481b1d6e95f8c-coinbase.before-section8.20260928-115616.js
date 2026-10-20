'use strict';

const crypto = require('crypto');

const COINBASE_MATURITY = 12;
const INITIAL_BLOCK_REWARD = 50n;

function assertIntegerBigInt(value, name) {
  try {
    const n = BigInt(value);
    if (n < 0n) throw new Error(name + '_NEGATIVE');
    return n;
  } catch (e) {
    if (e.message === name + '_NEGATIVE') throw e;
    throw new Error(name + '_INVALID');
  }
}

function calculateBlockReward(height) {
  const h = Number(height);
  if (!Number.isSafeInteger(h) || h < 0) {
    throw new Error('INVALID_HEIGHT');
  }

  // Deterministic halving every 210000 blocks.
  const halvings = Math.floor(h / 210000);
  if (halvings >= 63) return 0n;

  return INITIAL_BLOCK_REWARD >> BigInt(halvings);
}

function createCoinbaseTransaction({
  height,
  minerAddress,
  fees = 0n,
  timestamp = 0,
  extraNonce = ''
}) {
  if (!Number.isSafeInteger(Number(height)) || Number(height) < 0) {
    throw new Error('INVALID_HEIGHT');
  }

  if (typeof minerAddress !== 'string' || minerAddress.length === 0) {
    throw new Error('INVALID_MINER_ADDRESS');
  }

  const fee = assertIntegerBigInt(fees, 'FEES');
  const reward = calculateBlockReward(Number(height));
  const amount = reward + fee;

  const payload = JSON.stringify({
    type: 'coinbase',
    height: Number(height),
    minerAddress,
    reward: reward.toString(),
    fees: fee.toString(),
    extraNonce: String(extraNonce)
  });

  const txId = crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex');

  return {
    id: txId,
    type: 'coinbase',
    version: 1,
    height: Number(height),
    timestamp: Number(timestamp),
    inputs: [],
    outputs: [{
      index: 0,
      address: minerAddress,
      amount: amount.toString()
    }],
    reward: reward.toString(),
    fees: fee.toString(),
    extraNonce: String(extraNonce),
    coinbase: true
  };
}

function isCoinbaseMature(txHeight, currentHeight) {
  const a = Number(txHeight);
  const b = Number(currentHeight);

  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) {
    return false;
  }

  return b >= a + COINBASE_MATURITY;
}

function validateCoinbaseTransaction(tx, blockHeight, blockFees = 0n) {
  if (!tx || tx.type !== 'coinbase' || tx.coinbase !== true) {
    return { valid: false, error: 'NOT_COINBASE' };
  }

  if (tx.height !== Number(blockHeight)) {
    return { valid: false, error: 'HEIGHT_MISMATCH' };
  }

  if (!Array.isArray(tx.inputs) || tx.inputs.length !== 0) {
    return { valid: false, error: 'COINBASE_HAS_INPUTS' };
  }

  if (!Array.isArray(tx.outputs) || tx.outputs.length !== 1) {
    return { valid: false, error: 'INVALID_COINBASE_OUTPUTS' };
  }

  try {
    const reward = calculateBlockReward(Number(blockHeight));
    const fees = assertIntegerBigInt(blockFees, 'BLOCK_FEES');
    const expected = reward + fees;
    const actual = BigInt(tx.outputs[0].amount);

    if (actual !== expected) {
      return {
        valid: false,
        error: 'INVALID_COINBASE_AMOUNT',
        expected: expected.toString(),
        actual: actual.toString()
      };
    }

    return {
      valid: true,
      reward: reward.toString(),
      fees: fees.toString(),
      amount: actual.toString()
    };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

module.exports = {
  COINBASE_MATURITY,
  INITIAL_BLOCK_REWARD,
  calculateBlockReward,
  createCoinbaseTransaction,
  isCoinbaseMature,
  validateCoinbaseTransaction
};
