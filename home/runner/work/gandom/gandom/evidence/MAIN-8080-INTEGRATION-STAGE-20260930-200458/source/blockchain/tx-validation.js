'use strict';

const crypto = require('crypto');
const {
  verifySignedTransaction,
  UTXOSet
} = require('./utxo');

const {
  publicKeyToAddress
} = require('./core-crypto');

const MAX_INPUTS = 256;
const MAX_OUTPUTS = 256;

function amount(value) {
  try {
    const s = String(value);
    if (!/^\d+$/.test(s)) throw new Error('INVALID_AMOUNT');

    const n = BigInt(s);

    if (n < 0n) throw new Error('INVALID_AMOUNT');

    return n;
  } catch {
    throw new Error('INVALID_AMOUNT');
  }
}

function validateTransaction(tx, utxo, options = {}) {
  try {
    if (!tx || typeof tx !== 'object') {
      return { valid:false, error:'INVALID_TRANSACTION' };
    }

    if (!(utxo instanceof UTXOSet) &&
        (!utxo || typeof utxo.get !== 'function')) {
      return { valid:false, error:'INVALID_UTXO_SET' };
    }

    if (!Array.isArray(tx.inputs) ||
        tx.inputs.length < 1 ||
        tx.inputs.length > MAX_INPUTS) {
      return { valid:false, error:'INVALID_INPUTS' };
    }

    if (!Array.isArray(tx.outputs) ||
        tx.outputs.length < 1 ||
        tx.outputs.length > MAX_OUTPUTS) {
      return { valid:false, error:'INVALID_OUTPUTS' };
    }

    /*
     * Signature is checked before monetary validation.
     * This also protects against modified outputs/inputs.
     */
    let signatureOK = false;

    try {
      signatureOK = !!verifySignedTransaction(tx);
    } catch {
      signatureOK = false;
    }

    if (!signatureOK) {
      return { valid:false, error:'INVALID_SIGNATURE' };
    }

    if (!tx.publicKey) {
      return { valid:false, error:'MISSING_PUBLIC_KEY' };
    }

    let publicKey;

    try {
      publicKey = crypto.createPublicKey({
        key: Buffer.from(tx.publicKey, 'base64'),
        type: 'spki',
        format: 'der'
      });
    } catch {
      return { valid:false, error:'INVALID_PUBLIC_KEY' };
    }

    const ownerAddress = publicKeyToAddress(publicKey);

    let inputTotal = 0n;
    let outputTotal = 0n;

    const seen = new Set();

    for (const input of tx.inputs) {
      if (!input ||
          typeof input.txId !== 'string' ||
          !Number.isInteger(input.index) ||
          input.index < 0) {
        return { valid:false, error:'INVALID_INPUT' };
      }

      const key = `${input.txId}:${input.index}`;

      if (seen.has(key)) {
        return { valid:false, error:'DOUBLE_SPEND' };
      }

      seen.add(key);

      if (typeof utxo.isSpent === 'function' &&
          utxo.isSpent(input.txId, input.index)) {
        return { valid:false, error:'DOUBLE_SPEND' };
      }

      const prev = utxo.get(input.txId, input.index);

      if (!prev) {
        return { valid:false, error:'UTXO_NOT_FOUND' };
      }

      const prevAmount = amount(prev.amount);

      if (String(prev.address).toLowerCase() !==
          String(ownerAddress).toLowerCase()) {
        return { valid:false, error:'UTXO_OWNER_INVALID' };
      }

      inputTotal += prevAmount;
    }

    for (const output of tx.outputs) {
      if (!output ||
          typeof output.address !== 'string' ||
          !output.address) {
        return { valid:false, error:'INVALID_OUTPUT' };
      }

      const value = amount(output.amount);

      if (value <= 0n) {
        return { valid:false, error:'INVALID_AMOUNT' };
      }

      outputTotal += value;
    }

    if (outputTotal > inputTotal) {
      return { valid:false, error:'INSUFFICIENT_INPUT_VALUE' };
    }

    const fee = inputTotal - outputTotal;

    return {
      valid: true,
      inputTotal: inputTotal.toString(),
      outputTotal: outputTotal.toString(),
      fee: fee.toString()
    };

  } catch (e) {
    return {
      valid: false,
      error: e && e.message ? e.message : 'VALIDATION_ERROR'
    };
  }
}

function assertValidTransaction(tx, utxo, options = {}) {
  const result = validateTransaction(tx, utxo, options);

  if (!result.valid) {
    throw new Error(result.error);
  }

  return result;
}

module.exports = {
  validateTransaction,
  assertValidTransaction,
  MAX_INPUTS,
  MAX_OUTPUTS
};
