'use strict';

const crypto = require('crypto');
const {
  canonicalString,
  createKeyPair,
  publicKeyToAddress,
  signPayload,
  verifyPayload
} = require('./core-crypto');

function amount(v) {
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) throw new Error('UNSAFE_AMOUNT');
    return BigInt(v);
  }
  if (typeof v === 'string' && /^[0-9]+$/.test(v)) return BigInt(v);
  throw new Error('INVALID_AMOUNT');
}

function normalizePublicKey(publicKey) {
  if (!publicKey) throw new Error('MISSING_PUBLIC_KEY');

  if (publicKey.type === 'public' && typeof publicKey.export === 'function') {
    return publicKey;
  }

  if (Buffer.isBuffer(publicKey)) {
    return crypto.createPublicKey({
      key: publicKey,
      type: 'spki',
      format: 'der'
    });
  }

  if (typeof publicKey === 'string') {
    if (publicKey.includes('BEGIN PUBLIC KEY')) {
      return crypto.createPublicKey(publicKey);
    }

    return crypto.createPublicKey({
      key: Buffer.from(publicKey, 'base64'),
      type: 'spki',
      format: 'der'
    });
  }

  if (publicKey.key) {
    if (publicKey.format === 'pem') {
      return crypto.createPublicKey(publicKey);
    }

    return crypto.createPublicKey({
      key: Buffer.isBuffer(publicKey.key)
        ? publicKey.key
        : Buffer.from(publicKey.key, 'base64'),
      type: publicKey.type || 'spki',
      format: publicKey.format || 'der'
    });
  }

  throw new Error('INVALID_PUBLIC_KEY');
}

function publicKeyDer(publicKey) {
  return normalizePublicKey(publicKey).export({
    type: 'spki',
    format: 'der'
  });
}

function addressFromPublicKey(publicKey) {
  return publicKeyToAddress(normalizePublicKey(publicKey));
}

function outputKey(txId, index) {
  return `${txId}:${index}`;
}

class UTXOSet {
  constructor(initial = null) {
    this.map = new Map();

    if (initial instanceof Map) {
      for (const [k, v] of initial.entries()) {
        this.map.set(k, {
          ...v,
          amount: amount(v.amount).toString()
        });
      }
    } else if (Array.isArray(initial)) {
      for (const item of initial) {
        if (!item || !item.txId || !Number.isInteger(item.index)) {
          throw new Error('INVALID_UTXO');
        }

        this.map.set(
          outputKey(item.txId, item.index),
          {
            txId: item.txId,
            index: item.index,
            address: item.address,
            amount: amount(item.amount).toString(),
            createdAt: item.createdAt ?? 0,
            height: item.height ?? 0
          }
        );
      }
    } else if (initial && typeof initial === 'object') {
      for (const [k, v] of Object.entries(initial)) {
        this.map.set(k, {
          ...v,
          amount: amount(v.amount).toString()
        });
      }
    }
  }

  size() {
    return this.map.size;
  }

  has(txId, index) {
    return this.map.has(outputKey(txId, index));
  }

  get(txId, index) {
    const v = this.map.get(outputKey(txId, index));
    return v ? { ...v } : null;
  }

  createUTXO(txId, index, output, height = 0) {
    if (!txId || !Number.isInteger(index) || index < 0) {
      throw new Error('INVALID_UTXO_ID');
    }

    if (!output || typeof output.address !== 'string') {
      throw new Error('INVALID_UTXO_OUTPUT');
    }

    const value = amount(output.amount);

    if (value <= 0n) {
      throw new Error('INVALID_UTXO_AMOUNT');
    }

    const key = outputKey(txId, index);

    if (this.map.has(key)) {
      throw new Error('UTXO_ALREADY_EXISTS');
    }

    const item = {
      txId,
      index,
      address: output.address,
      amount: value.toString(),
      createdAt: output.createdAt ?? 0,
      height
    };

    this.map.set(key, item);
    return { ...item };
  }

  validateInput(input, publicKey) {
    if (!input || typeof input.txId !== 'string' ||
        !Number.isInteger(input.index) || input.index < 0) {
      return false;
    }

    const utxo = this.get(input.txId, input.index);
    if (!utxo) return false;

    try {
      const address = addressFromPublicKey(publicKey);
      return address === utxo.address;
    } catch (_) {
      return false;
    }
  }

  spendUTXO(txId, index, publicKey) {
    const key = outputKey(txId, index);
    const utxo = this.map.get(key);

    if (!utxo) {
      throw new Error('DOUBLE_SPEND');
    }

    if (publicKey && !this.validateInput({ txId, index }, publicKey)) {
      throw new Error('UTXO_OWNER_MISMATCH');
    }

    this.map.delete(key);
    return { ...utxo };
  }

  removeSpentUTXO(txId, index, publicKey) {
    return this.spendUTXO(txId, index, publicKey);
  }

  validateUTXO(txId, index) {
    const u = this.get(txId, index);

    if (!u) return false;

    try {
      const v = amount(u.amount);
      return (
        v > 0n &&
        typeof u.address === 'string' &&
        u.address.length > 0
      );
    } catch (_) {
      return false;
    }
  }

  toJSON() {
    return Array.from(this.map.values()).map(v => ({ ...v }));
  }

  clone() {
    return new UTXOSet(this.toJSON());
  }
}

function transactionId(tx) {
  const copy = JSON.parse(JSON.stringify(tx));
  delete copy.id;
  delete copy.txid;
  delete copy.signature;

  return crypto
    .createHash('sha256')
    .update(canonicalString(copy))
    .digest('hex');
}

function signingPayload(tx) {
  const copy = JSON.parse(JSON.stringify(tx));
  delete copy.id;
  delete copy.txid;
  delete copy.signature;
  return copy;
}

function createSignedTransaction({
  utxo,
  keyPair,
  inputs,
  outputs,
  fee = '0',
  nonce = 0,
  timestamp = Date.now()
}) {
  if (!(utxo instanceof UTXOSet)) {
    throw new Error('INVALID_UTXO_SET');
  }

  if (!keyPair || !keyPair.privateKey || !keyPair.publicKey) {
    throw new Error('INVALID_KEY_PAIR');
  }

  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('INVALID_INPUTS');
  }

  if (!Array.isArray(outputs) || outputs.length === 0) {
    throw new Error('INVALID_OUTPUTS');
  }

  const seen = new Set();
  let inputTotal = 0n;

  for (const input of inputs) {
    if (!input || typeof input.txId !== 'string' ||
        !Number.isInteger(input.index) || input.index < 0) {
      throw new Error('INVALID_UTXO_INPUT');
    }

    const key = outputKey(input.txId, input.index);

    if (seen.has(key)) {
      throw new Error('DOUBLE_SPEND');
    }

    seen.add(key);

    const existing = utxo.get(input.txId, input.index);

    if (!existing) {
      throw new Error('INVALID_UTXO_INPUT');
    }

    if (!utxo.validateInput(input, keyPair.publicKey)) {
      throw new Error('UTXO_OWNER_MISMATCH');
    }

    inputTotal += amount(existing.amount);
  }

  let outputTotal = 0n;

  for (const output of outputs) {
    if (!output || typeof output.address !== 'string') {
      throw new Error('INVALID_OUTPUT');
    }

    const v = amount(output.amount);

    if (v <= 0n) {
      throw new Error('INVALID_OUTPUT_AMOUNT');
    }

    outputTotal += v;
  }

  const feeAmount = amount(fee);

  if (feeAmount < 0n) {
    throw new Error('INVALID_FEE');
  }

  if (outputTotal + feeAmount > inputTotal) {
    throw new Error('INSUFFICIENT_INPUT_VALUE');
  }

  const tx = {
    inputs: inputs.map(x => ({
      txId: x.txId,
      index: x.index,
      sequence: x.sequence ?? 0
    })),
    outputs: outputs.map(x => ({
      address: x.address,
      amount: amount(x.amount).toString()
    })),
    fee: feeAmount.toString(),
    timestamp,
    nonce
  };

  const payload = signingPayload(tx);

  tx.publicKey = publicKeyDer(keyPair.publicKey).toString('base64');
  tx.signature = signPayload(payload, keyPair.privateKey);
  tx.id = transactionId(tx);

  return tx;
}

function verifySignedTransaction(tx) {
  try {
    if (!tx || !tx.publicKey || !tx.signature) return false;

    const publicKey = normalizePublicKey(tx.publicKey);
    const payload = signingPayload(tx);

    return verifyPayload(payload, tx.signature, publicKey);
  } catch (_) {
    return false;
  }
}

module.exports = {
  UTXOSet,
  createSignedTransaction,
  verifySignedTransaction,
  transactionId,
  amount
};
