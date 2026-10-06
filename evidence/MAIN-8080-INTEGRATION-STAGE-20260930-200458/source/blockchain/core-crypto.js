'use strict';

const crypto = require('crypto');

function canonicalize(value) {
  if (typeof value === 'bigint') return `${value}n`;

  if (Buffer.isBuffer(value)) {
    return {
      type: 'Buffer',
      hex: value.toString('hex')
    };
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = canonicalize(value[key]);
  }

  return out;
}

function canonicalString(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(data) {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

function createKeyPair() {
  return crypto.generateKeyPairSync('ed25519');
}

function publicKeyToAddress(publicKey) {
  const der = publicKey.export({
    type: 'spki',
    format: 'der'
  });

  return sha256(der);
}

function signPayload(payload, privateKey) {
  return crypto
    .sign(
      null,
      Buffer.from(canonicalString(payload)),
      privateKey
    )
    .toString('base64');
}

function verifyPayload(payload, signature, publicKey) {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalString(payload)),
      publicKey,
      Buffer.from(signature, 'base64')
    );
  } catch {
    return false;
  }
}

module.exports = {
  canonicalize,
  canonicalString,
  sha256,
  createKeyPair,
  publicKeyToAddress,
  signPayload,
  verifyPayload
};
