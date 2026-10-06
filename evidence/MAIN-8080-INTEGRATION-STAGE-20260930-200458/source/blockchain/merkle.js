'use strict';

const { canonicalString, sha256 } = require('./core-crypto');

const ZERO_HASH = '0'.repeat(64);

function hashPair(left, right) {
  return sha256(
    Buffer.from(left + right, 'hex')
  );
}

function merkleRoot(transactions) {
  if (!Array.isArray(transactions)) {
    throw new Error('TRANSACTIONS_MUST_BE_ARRAY');
  }

  if (transactions.length === 0) {
    return ZERO_HASH;
  }

  let level = transactions.map(tx =>
    sha256(canonicalString(tx))
  );

  while (level.length > 1) {
    const next = [];

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || left;

      next.push(hashPair(left, right));
    }

    level = next;
  }

  return level[0];
}

function merkleProof(transactions, index) {
  if (!Array.isArray(transactions)) {
    throw new Error('TRANSACTIONS_MUST_BE_ARRAY');
  }

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= transactions.length
  ) {
    throw new Error('MERKLE_INDEX_INVALID');
  }

  let level = transactions.map(tx =>
    sha256(canonicalString(tx))
  );

  let position = index;
  const siblings = [];

  while (level.length > 1) {
    const rightSide = position % 2 === 1;
    const siblingIndex = rightSide
      ? position - 1
      : position + 1;

    siblings.push({
      hash: level[siblingIndex] || level[position],
      side: rightSide ? 'left' : 'right'
    });

    const next = [];

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || left;

      next.push(hashPair(left, right));
    }

    level = next;
    position = Math.floor(position / 2);
  }

  return {
    index,
    leaf: sha256(canonicalString(transactions[index])),
    siblings,
    root: level[0]
  };
}

function verifyMerkleProof(proof, expectedRoot) {
  if (!proof || !Array.isArray(proof.siblings)) {
    return false;
  }

  let current = proof.leaf;

  if (!/^[0-9a-f]{64}$/.test(current)) {
    return false;
  }

  for (const sibling of proof.siblings) {
    if (!sibling || !/^[0-9a-f]{64}$/.test(sibling.hash)) {
      return false;
    }

    if (sibling.side === 'left') {
      current = hashPair(sibling.hash, current);
    } else if (sibling.side === 'right') {
      current = hashPair(current, sibling.hash);
    } else {
      return false;
    }
  }

  return current === expectedRoot;
}

module.exports = {
  ZERO_HASH,
  hashPair,
  merkleRoot,
  merkleProof,
  verifyMerkleProof
};
