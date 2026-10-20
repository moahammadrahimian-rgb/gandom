'use strict';

const crypto = require('node:crypto');

const {
  canonicalString,
  sha256,
  createKeyPair,
  publicKeyToAddress
} = require('./core-crypto');


function toAmount(value) {
  if (typeof value === 'bigint') return value;

  if (
    typeof value === 'number' &&
    Number.isSafeInteger(value)
  ) {
    return BigInt(value);
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return BigInt(value);
  }

  throw new Error('INVALID_AMOUNT');
}


function normalizePublicKey(publicKey) {
  if (!publicKey) {
    throw new Error('PUBLIC_KEY_MISSING');
  }

  if (
    publicKey &&
    typeof publicKey.export === 'function' &&
    publicKey.type === 'public'
  ) {
    return publicKey;
  }

  if (Buffer.isBuffer(publicKey)) {
    return crypto.createPublicKey({
      key: publicKey,
      format: 'der',
      type: 'spki'
    });
  }

  if (typeof publicKey === 'string') {
    // PEM
    if (
      publicKey.includes('BEGIN PUBLIC KEY') ||
      publicKey.includes('BEGIN RSA PUBLIC KEY')
    ) {
      return crypto.createPublicKey(publicKey);
    }

    // Base64 encoded SPKI DER
    return crypto.createPublicKey({
      key: Buffer.from(publicKey, 'base64'),
      format: 'der',
      type: 'spki'
    });
  }

  throw new Error('INVALID_PUBLIC_KEY');
}


function normalizePrivateKey(privateKey) {
  if (!privateKey) {
    throw new Error('PRIVATE_KEY_MISSING');
  }

  if (
    privateKey &&
    typeof privateKey.export === 'function' &&
    privateKey.type === 'private'
  ) {
    return privateKey;
  }

  if (Buffer.isBuffer(privateKey)) {
    return crypto.createPrivateKey({
      key: privateKey,
      format: 'der',
      type: 'pkcs8'
    });
  }

  if (typeof privateKey === 'string') {
    return crypto.createPrivateKey(privateKey);
  }

  throw new Error('INVALID_PRIVATE_KEY');
}


/*
 * این تابع تنها منبع canonical payload است.
 *
 * SIGN:
 *   buildSigningPayload(tx)
 *
 * VERIFY:
 *   buildSigningPayload(tx)
 *
 * بنابراین ساختار payload در هر دو مرحله دقیقاً یکی است.
 */
function buildSigningPayload(tx) {
  if (!tx || typeof tx !== 'object') {
    throw new Error('INVALID_TRANSACTION');
  }

  return {
    version: tx.version ?? 1,

    inputs: Array.isArray(tx.inputs)
      ? tx.inputs.map(input => ({
          txId: input.txId ?? input.prevTxId ?? null,
          outputIndex:
            input.outputIndex ??
            input.vout ??
            input.index ??
            0,
          sequence: input.sequence ?? 0
        }))
      : [],

    outputs: Array.isArray(tx.outputs)
      ? tx.outputs.map(output => ({
          address: String(output.address ?? ''),
          amount: toAmount(output.amount).toString()
        }))
      : [],

    fee: toAmount(tx.fee ?? 0).toString(),

    timestamp: tx.timestamp ?? 0,

    nonce: tx.nonce ?? 0,

    sequence: tx.sequence ?? 0,

    // publicKey داخل payload است تا کلید امضاکننده
    // نیز بخشی از داده امضاشده باشد.
    publicKey: tx.publicKey ?? ''
  };
}


function canonicalSigningBytes(tx) {
  return Buffer.from(
    canonicalString(buildSigningPayload(tx)),
    'utf8'
  );
}


function signTransactionPayload(tx, privateKey) {
  const key = normalizePrivateKey(privateKey);
  const payload = canonicalSigningBytes(tx);

  const signature = crypto.sign(
    null,
    payload,
    key
  );

  return signature.toString('base64');
}


function verifyTransactionSignature(tx) {
  try {
    if (!tx || typeof tx !== 'object') {
      return false;
    }

    if (!tx.signature) {
      return false;
    }

    if (!tx.publicKey) {
      return false;
    }

    const publicKey = normalizePublicKey(tx.publicKey);

    const payload = canonicalSigningBytes(tx);

    const signature = Buffer.from(
      tx.signature,
      'base64'
    );

    return crypto.verify(
      null,
      payload,
      publicKey,
      signature
    );

  } catch (error) {
    return false;
  }
}


class UTXOSet {

  constructor(initial = []) {
    this.utxos = new Map();
    this.spent = new Set();

    if (initial instanceof Map) {
      for (const [key, value] of initial.entries()) {
        this.utxos.set(key, value);
      }
    } else if (Array.isArray(initial)) {
      for (const item of initial) {
        if (
          item &&
          item.txId !== undefined &&
          item.outputIndex !== undefined &&
          item.output
        ) {
          this.createUTXO(
            item.txId,
            item.outputIndex,
            item.output
          );
        }
      }
    }
  }


  _key(txId, outputIndex) {
    return `${String(txId)}:${Number(outputIndex)}`;
  }


  createUTXO(txId, outputIndex, output) {
    if (!txId) {
      throw new Error('INVALID_TX_ID');
    }

    if (!Number.isInteger(Number(outputIndex))) {
      throw new Error('INVALID_OUTPUT_INDEX');
    }

    if (!output || typeof output !== 'object') {
      throw new Error('INVALID_UTXO_OUTPUT');
    }

    const amount = toAmount(output.amount);

    if (amount <= 0n) {
      throw new Error('INVALID_UTXO_AMOUNT');
    }

    if (!output.address) {
      throw new Error('UTXO_OWNER_MISSING');
    }

    const key = this._key(txId, outputIndex);

    if (this.utxos.has(key)) {
      throw new Error('UTXO_ALREADY_EXISTS');
    }

    const stored = {
      txId: String(txId),
      outputIndex: Number(outputIndex),
      output: {
        address: String(output.address),
        amount: amount.toString()
      }
    };

    this.utxos.set(key, stored);

    return stored;
  }


  addUTXO(txId, outputIndex, output) {
    return this.createUTXO(
      txId,
      outputIndex,
      output
    );
  }


  getUTXO(inputOrTxId, outputIndex) {
    let txId;
    let index;

    if (
      inputOrTxId &&
      typeof inputOrTxId === 'object'
    ) {
      txId =
        inputOrTxId.txId ??
        inputOrTxId.prevTxId;

      index =
        inputOrTxId.outputIndex ??
        inputOrTxId.vout ??
        inputOrTxId.index;
    } else {
      txId = inputOrTxId;
      index = outputIndex;
    }

    return this.utxos.get(
      this._key(txId, index)
    ) || null;
  }


  hasUTXO(inputOrTxId, outputIndex) {
    return !!this.getUTXO(
      inputOrTxId,
      outputIndex
    );
  }


  validateInput(input, ownerOrPublicKey = null) {
    try {
      if (!input || typeof input !== 'object') {
        return false;
      }

      const utxo = this.getUTXO(input);

      if (!utxo) {
        return false;
      }

      const key = this._key(
        utxo.txId,
        utxo.outputIndex
      );

      if (this.spent.has(key)) {
        return false;
      }

      if (ownerOrPublicKey) {
        let ownerAddress;

        if (
          typeof ownerOrPublicKey === 'string' &&
          ownerOrPublicKey.length === 64 &&
          /^[0-9a-f]+$/i.test(ownerOrPublicKey)
        ) {
          ownerAddress = ownerOrPublicKey;
        } else {
          const publicKey =
            normalizePublicKey(ownerOrPublicKey);

          ownerAddress =
            publicKeyToAddress(publicKey);
        }

        if (
          ownerAddress !==
          utxo.output.address
        ) {
          return false;
        }
      }

      return true;

    } catch (error) {
      return false;
    }
  }


  validateUTXO(input, ownerOrPublicKey = null) {
    return this.validateInput(
      input,
      ownerOrPublicKey
    );
  }


  spendUTXO(input) {
    const utxo = this.getUTXO(input);

    if (!utxo) {
      throw new Error('DOUBLE_SPEND');
    }

    const key = this._key(
      utxo.txId,
      utxo.outputIndex
    );

    if (this.spent.has(key)) {
      throw new Error('DOUBLE_SPEND');
    }

    this.spent.add(key);
    this.utxos.delete(key);

    return utxo;
  }


  removeSpentUTXO(input) {
    return this.spendUTXO(input);
  }


  size() {
    return this.utxos.size;
  }


  getAll() {
    return Array.from(
      this.utxos.values()
    );
  }


  clone() {
    const copy = new UTXOSet();

    for (const [key, value] of this.utxos.entries()) {
      copy.utxos.set(
        key,
        JSON.parse(JSON.stringify(value))
      );
    }

    for (const key of this.spent) {
      copy.spent.add(key);
    }

    return copy;
  }


  /*
   * این همان متدی است که تست کاربر مستقیماً می‌خواهد:
   *
   * u.verifySignedTransaction(tx)
   */
  verifySignedTransaction(tx) {
    return verifyTransactionSignature(tx);
  }
}


/*
 * ساخت تراکنش امضاشده
 *
 * فرم اصلی:
 *
 * createSignedTransaction({
 *   utxo,
 *   inputs,
 *   outputs,
 *   privateKey,
 *   publicKey,
 *   fee,
 *   timestamp,
 *   nonce
 * })
 *
 * فرم positional قبلی نیز پشتیبانی می‌شود.
 */
function createSignedTransaction(...args) {

  let options;

  if (
    args.length === 1 &&
    args[0] &&
    typeof args[0] === 'object' &&
    !(
      args[0] instanceof UTXOSet
    )
  ) {
    options = args[0];
  } else {
    options = {
      utxo: args[0],
      inputs: args[1],
      outputs: args[2],
      privateKey: args[3],
      publicKey: args[4],
      ...(args[5] || {})
    };
  }

  const {
    utxo,
    inputs = [],
    outputs = [],
    privateKey,
    publicKey,
    fee = 0,
    timestamp = Date.now(),
    nonce = 0,
    sequence = 0
  } = options;

  if (!(utxo instanceof UTXOSet)) {
    throw new Error('INVALID_UTXO_SET');
  }

  const privateKeyObject =
    normalizePrivateKey(privateKey);

  const publicKeyObject =
    publicKey
      ? normalizePublicKey(publicKey)
      : crypto.createPublicKey(
          privateKeyObject
        );

  const signerAddress =
    publicKeyToAddress(
      publicKeyObject
    );

  const normalizedInputs =
    inputs.map(input => ({
      txId:
        String(
          input.txId ??
          input.prevTxId
        ),
      outputIndex:
        Number(
          input.outputIndex ??
          input.vout ??
          input.index
        ),
      sequence:
        input.sequence ?? 0
    }));

  let inputTotal = 0n;

  for (const input of normalizedInputs) {

    if (
      !utxo.validateInput(
        input,
        signerAddress
      )
    ) {
      throw new Error(
        'INVALID_UTXO_INPUT'
      );
    }

    const previous =
      utxo.getUTXO(input);

    inputTotal +=
      toAmount(
        previous.output.amount
      );
  }

  const normalizedOutputs =
    outputs.map(output => ({
      address:
        String(output.address),
      amount:
        toAmount(
          output.amount
        ).toString()
    }));

  let outputTotal = 0n;

  for (const output of normalizedOutputs) {
    if (!output.address) {
      throw new Error(
        'INVALID_OUTPUT_ADDRESS'
      );
    }

    const amount =
      toAmount(output.amount);

    if (amount <= 0n) {
      throw new Error(
        'INVALID_OUTPUT_AMOUNT'
      );
    }

    outputTotal += amount;
  }

  const feeAmount =
    toAmount(fee);

  if (
    outputTotal + feeAmount >
    inputTotal
  ) {
    throw new Error(
      'INSUFFICIENT_INPUT_VALUE'
    );
  }

  const publicKeyDer =
    publicKeyObject.export({
      type: 'spki',
      format: 'der'
    });

  /*
   * IMPORTANT:
   * tx قبل از signature ساخته می‌شود.
   * سپس دقیقاً همین tx به signTransactionPayload
   * داده می‌شود.
   *
   * verify نیز tx را بدون تغییر canonicalize می‌کند.
   */
  const tx = {
    version: 1,
    inputs: normalizedInputs,
    outputs: normalizedOutputs,
    fee: feeAmount.toString(),
    timestamp,
    nonce,
    sequence,
    publicKey:
      publicKeyDer.toString('base64')
  };

  tx.signature =
    signTransactionPayload(
      tx,
      privateKeyObject
    );

  tx.id =
    transactionId(tx);

  return tx;
}


function verifySignedTransaction(tx) {
  return verifyTransactionSignature(tx);
}


function transactionId(tx) {

  const clean = {
    version: tx.version ?? 1,
    inputs: tx.inputs ?? [],
    outputs: tx.outputs ?? [],
    fee: toAmount(
      tx.fee ?? 0
    ).toString(),
    timestamp: tx.timestamp ?? 0,
    nonce: tx.nonce ?? 0,
    sequence: tx.sequence ?? 0,
    publicKey: tx.publicKey ?? '',
    signature: tx.signature ?? ''
  };

  return sha256(
    canonicalString(clean)
  );
}


module.exports = {
  UTXOSet,
  createSignedTransaction,
  verifySignedTransaction,
  verifyTransactionSignature,
  transactionId,
  buildSigningPayload,
  canonicalSigningBytes,
  signTransactionPayload,
  createKeyPair
};
