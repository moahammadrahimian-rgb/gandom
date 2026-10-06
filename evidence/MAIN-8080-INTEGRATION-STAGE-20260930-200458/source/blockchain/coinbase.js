'use strict';

const crypto = require('node:crypto');

/*
 * GANDOM BLOCKCHAIN V2
 * SECTION 8 — COINBASE
 *
 * Deterministic rules:
 * - Initial block reward = 50
 * - Halving interval = 210000 blocks
 * - Coinbase maturity = 100 blocks
 */

const INITIAL_BLOCK_REWARD = 50n;
const HALVING_INTERVAL = 210000;
const COINBASE_MATURITY = 100;

// Backward-compatible alias
const BLOCK_REWARD = INITIAL_BLOCK_REWARD;


/* ---------- Numeric safety ---------- */

function toBigIntAmount(value) {
  if (typeof value === 'bigint') {
    return value;
  }

  if (
    typeof value === 'number' &&
    Number.isSafeInteger(value)
  ) {
    return BigInt(value);
  }

  if (
    typeof value === 'string' &&
    /^\d+$/.test(value)
  ) {
    return BigInt(value);
  }

  throw new Error('INVALID_AMOUNT');
}


/* ---------- Deterministic serialization ---------- */

function canonicalize(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === 'bigint') {
    return `${value}n`;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === 'object') {
    const result = {};

    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalize(value[key]);
    }

    return result;
  }

  return value;
}


function canonicalString(value) {
  return JSON.stringify(
    canonicalize(value)
  );
}


/* ---------- Transaction ID ---------- */

function calculateTransactionId(tx) {
  const clean = {
    ...tx
  };

  delete clean.id;

  return crypto
    .createHash('sha256')
    .update(
      canonicalString(clean),
      'utf8'
    )
    .digest('hex');
}


/* ---------- Block reward ---------- */

function calculateBlockReward(height) {
  if (
    !Number.isInteger(height) ||
    height < 0
  ) {
    throw new Error(
      'INVALID_BLOCK_HEIGHT'
    );
  }

  const halvings =
    Math.floor(
      height / HALVING_INTERVAL
    );

  /*
   * Prevent unsafe huge shifts.
   * After enough halvings reward becomes zero.
   */
  if (halvings >= 63) {
    return 0n;
  }

  return (
    INITIAL_BLOCK_REWARD >>
    BigInt(halvings)
  );
}


/* Backward-compatible name */

function getBlockReward(height) {
  return calculateBlockReward(height);
}


/* ---------- Fee collection ---------- */

function collectFees(transactions = []) {
  if (!Array.isArray(transactions)) {
    throw new Error(
      'INVALID_TRANSACTIONS'
    );
  }

  let total = 0n;

  for (const tx of transactions) {
    const fee = toBigIntAmount(
      tx?.fee ??
      tx?.fees ??
      0
    );

    total += fee;
  }

  return total;
}


/* Backward-compatible alias */

function collectTransactionFees(transactions = []) {
  return collectFees(transactions);
}


/* ---------- Miner reward ---------- */

function calculateMinerReward(
  height,
  fees = 0n
) {
  const feeAmount =
    toBigIntAmount(fees);

  if (feeAmount < 0n) {
    throw new Error(
      'NEGATIVE_FEES'
    );
  }

  return (
    calculateBlockReward(height) +
    feeAmount
  );
}


function getMinerReward(
  height,
  fees = 0n
) {
  return calculateMinerReward(
    height,
    fees
  );
}


/* ---------- Coinbase transaction ---------- */

function createCoinbaseTransaction({
  height,
  minerAddress,
  fees = 0n,
  timestamp = 0,
  extraNonce = ''
}) {
  if (
    !Number.isInteger(height) ||
    height < 0
  ) {
    throw new Error(
      'INVALID_BLOCK_HEIGHT'
    );
  }

  if (!minerAddress) {
    throw new Error(
      'MINER_ADDRESS_REQUIRED'
    );
  }

  const feeAmount =
    toBigIntAmount(fees);

  if (feeAmount < 0n) {
    throw new Error(
      'NEGATIVE_FEES'
    );
  }

  const reward =
    calculateBlockReward(height);

  const totalReward =
    reward + feeAmount;

  const tx = {
    version: 1,

    coinbase: true,

    height,

    inputs: [
      {
        txId: null,
        outputIndex: -1,
        coinbase: true,
        extraNonce: String(extraNonce)
      }
    ],

    outputs: [
      {
        address: String(minerAddress),
        amount: totalReward.toString()
      }
    ],

    fee: feeAmount.toString(),

    reward: reward.toString(),

    timestamp,

    nonce: String(extraNonce)
  };

  tx.id =
    calculateTransactionId(tx);

  return tx;
}


/* ---------- Coinbase validation ---------- */

function validateCoinbaseTransaction(
  tx,
  height,
  fees = 0n
) {
  try {
    if (!tx) {
      return false;
    }

    if (tx.coinbase !== true) {
      return false;
    }

    if (tx.height !== height) {
      return false;
    }

    /*
     * Coinbase must have exactly
     * one special input.
     */
    if (
      !Array.isArray(tx.inputs) ||
      tx.inputs.length !== 1
    ) {
      return false;
    }

    const input =
      tx.inputs[0];

    if (
      input.txId !== null ||
      input.outputIndex !== -1 ||
      input.coinbase !== true
    ) {
      return false;
    }

    /*
     * Exactly one miner output.
     */
    if (
      !Array.isArray(tx.outputs) ||
      tx.outputs.length !== 1
    ) {
      return false;
    }

    const output =
      tx.outputs[0];

    if (!output.address) {
      return false;
    }

    const blockReward =
      calculateBlockReward(height);

    const feeAmount =
      toBigIntAmount(fees);

    const expectedTotal =
      blockReward + feeAmount;

    if (
      toBigIntAmount(tx.reward) !==
      blockReward
    ) {
      return false;
    }

    if (
      toBigIntAmount(tx.fee) !==
      feeAmount
    ) {
      return false;
    }

    if (
      toBigIntAmount(output.amount) !==
      expectedTotal
    ) {
      return false;
    }

    /*
     * Deterministic transaction ID.
     */
    if (
      tx.id !==
      calculateTransactionId(tx)
    ) {
      return false;
    }

    return true;

  } catch {
    return false;
  }
}


/* ---------- Coinbase maturity ---------- */

function isCoinbaseMature(
  coinbaseHeight,
  currentHeight,
  maturity = COINBASE_MATURITY
) {
  if (
    !Number.isInteger(coinbaseHeight) ||
    !Number.isInteger(currentHeight)
  ) {
    return false;
  }

  if (
    coinbaseHeight < 0 ||
    currentHeight < 0
  ) {
    return false;
  }

  return (
    currentHeight -
    coinbaseHeight
  ) >= maturity;
}


function canSpendCoinbase(
  coinbaseHeight,
  currentHeight,
  maturity = COINBASE_MATURITY
) {
  return isCoinbaseMature(
    coinbaseHeight,
    currentHeight,
    maturity
  );
}


/* ---------- Exports ---------- */

module.exports = {
  INITIAL_BLOCK_REWARD,
  BLOCK_REWARD,
  HALVING_INTERVAL,
  COINBASE_MATURITY,

  calculateBlockReward,
  getBlockReward,

  collectFees,
  collectTransactionFees,

  calculateMinerReward,
  getMinerReward,

  createCoinbaseTransaction,
  validateCoinbaseTransaction,

  isCoinbaseMature,
  canSpendCoinbase
};
