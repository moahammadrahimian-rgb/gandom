const crypto = require('crypto');
class AdvancedBlockchain {
  constructor(options = {}) {
    this.options=options||{}; this.chain=[]; this.mempool=new Map();

    this.chain = [];
    this.mempool = new Map();

    this.difficulty = Number(options.difficulty ?? this.difficulty ?? 2);
    if (!Number.isInteger(this.difficulty) || this.difficulty < 0 || this.difficulty > 20) {
      this.difficulty = 2;
    }

    this._createLiveGenesis();
  }

  static canonical(value) {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return '[' + value.map(v => AdvancedBlockchain.canonical(v)).join(',') + ']';
    }

    return '{' +
      Object.keys(value)
        .filter(k => value[k] !== undefined)
        .sort()
        .map(k =>
          JSON.stringify(k) + ':' +
          AdvancedBlockchain.canonical(value[k])
        )
        .join(',') +
      '}';
  }

  static sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  transactionId(tx) {
    const clean = { ...tx };
    delete clean.id;
    delete clean.txId;
    delete clean.hash;
    delete clean.transactionId;

    return AdvancedBlockchain.sha256(
      AdvancedBlockchain.canonical(clean)
    );
  }

  validateTransaction(tx) {
    if (!tx || typeof tx !== 'object') return false;

    if (tx.coinbase === true) {
      return true;
    }

    if (!Array.isArray(tx.inputs) || !Array.isArray(tx.outputs)) {
      return false;
    }

    if (tx.inputs.length === 0 || tx.outputs.length === 0) {
      return false;
    }

    let inputValue = 0;
    let outputValue = 0;

    for (const input of tx.inputs) {
      if (!input || typeof input !== 'object') return false;
      if (typeof input.prevTxId !== 'string' || !input.prevTxId) return false;
      if (!Number.isSafeInteger(input.index) || input.index < 0) return false;
      if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return false;

      inputValue += input.amount;
    }

    for (const output of tx.outputs) {
      if (!output || typeof output !== 'object') return false;
      if (typeof output.address !== 'string' || !output.address) return false;
      if (!Number.isSafeInteger(output.amount) || output.amount <= 0) return false;

      outputValue += output.amount;
    }

    return inputValue >= outputValue;
  }

  normalizeTransaction(tx) {
    if (!this.validateTransaction(tx)) {
      throw new Error('INVALID_TRANSACTION');
    }

    const clean = JSON.parse(JSON.stringify(tx));
    delete clean.id;
    delete clean.txId;
    delete clean.hash;
    delete clean.transactionId;

    const id = this.transactionId(clean);

    return {
      ...clean,
      id
    };
  }

  addToMempool(tx) {
    const normalized = this.normalizeTransaction(tx);
    const id = normalized.id;

    if (this.mempool.has(id)) {
      throw new Error('DUPLICATE_TRANSACTION');
    }

    for (const existing of this.mempool.values()) {
      const a = new Set(
        (existing.inputs || []).map(i => `${i.prevTxId}:${i.index}`)
      );

      for (const input of normalized.inputs || []) {
        if (a.has(`${input.prevTxId}:${input.index}`)) {
          throw new Error('CONFLICTING_INPUT');
        }
      }
    }

    this.mempool.set(id, normalized);
    return normalized.id;
  }

  getMempool() {
    return Array.from(this.mempool.values());
  }

  merkleRoot(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return AdvancedBlockchain.sha256('');
    }

    let level = transactions.map(tx => {
      const id = tx.id || this.transactionId(tx);
      return String(id);
    });

    while (level.length > 1) {
      const next = [];

      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] ?? left;

        next.push(
          AdvancedBlockchain.sha256(left + right)
        );
      }

      level = next;
    }

    return level[0];
  }

  blockHeader(block) {
    return {
      index: block.index,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      merkleRoot: block.merkleRoot,
      difficulty: block.difficulty,
      nonce: block.nonce
    };
  }

  blockHash(block) {
    return AdvancedBlockchain.sha256(
      AdvancedBlockchain.canonical(
        this.blockHeader(block)
      )
    );
  }

  targetForDifficulty(difficulty) {
    const TWO256 = 1n << 256n;

    if (difficulty <= 0) {
      return TWO256 - 1n;
    }

    return (TWO256 - 1n) >> BigInt(difficulty);
  }

  powValid(block) {
    const target = this.targetForDifficulty(block.difficulty);
    const value = BigInt('0x' + block.hash);

    return value < target;
  }

  createLiveBlock(transactions, index, previousHash) {
  if (index === undefined || index === null) {
    index = this.chain.length;
  }

  if (previousHash === undefined || previousHash === null) {
    const previous = this.chain[index - 1];
    previousHash = previous ? previous.hash : '0'.repeat(64);
  }
  if (index === undefined || index === null) {
    index = this.chain.length;
  }

  if (previousHash === undefined || previousHash === null) {
    const previous = this.chain[index - 1];
    previousHash = previous ? previous.hash : '0'.repeat(64);
  }
  if (index === undefined || index === null) {
    index = this.chain.length;
  }

  if (previousHash === undefined || previousHash === null) {
    const previous = this.chain[index - 1];
    previousHash = previous ? previous.hash : '0'.repeat(64);
  }
    if (index === undefined || index === null) {
      index = this.chain.length;
    }

    if (previousHash === undefined || previousHash === null) {
      const previous = this.chain[index - 1];
      previousHash = previous ? previous.hash : '0'.repeat(64);
    }
    const normalized = transactions.map(tx =>
      this.normalizeTransaction(tx)
    );

    const block = {
      index,
      previousHash,
      timestamp: Date.now(),
      transactions: normalized,
      merkleRoot: this.merkleRoot(normalized),
      nonce: 0,
      difficulty: this.difficulty
    };

    while (true) {
      block.hash = this.blockHash(block);

      if (this.powValid(block)) {
        return block;
      }

      block.nonce++;

      if (block.nonce > 100000000) {
        throw new Error('POW_SEARCH_LIMIT');
      }
    }
  }

  _createLiveGenesis() {
    const genesisTx = {
      coinbase: true,
      outputs: [
        {
          address: 'GANDOM-GENESIS',
          amount: 0
        }
      ]
    };

    const tx = {
      ...genesisTx,
      id: this.transactionId(genesisTx)
    };

    const block = {
      index: 0,
      previousHash: '0'.repeat(64),
      timestamp: 0,
      transactions: [tx],
      merkleRoot: this.merkleRoot([tx]),
      nonce: 0,
      difficulty: 0
    };

    block.hash = this.blockHash(block);

    this.chain.push(block);
  }

  validateBlock(block) {
  if (!block || typeof block !== "object") return false;

  if (!Number.isInteger(Number(block.index)) || Number(block.index) < 0) {
    return false;
  }

  if (typeof block.hash !== "string" || block.hash.length !== 64) {
    return false;
  }

  if (typeof block.previousHash !== "string") {
    return false;
  }

  if (!Array.isArray(block.transactions)) {
    return false;
  }

  const difficulty = Number(block.difficulty);

  if (!Number.isInteger(difficulty) ||
      difficulty < 0 ||
      difficulty > 256) {
    return false;
  }

  const txIds = new Set();

  for (const tx of block.transactions) {
    if (typeof this.validateTransaction === "function") {
      if (!this.validateTransaction(tx)) {
        return false;
      }
    }

    const id = tx && (
      tx.id ??
      tx.txId ??
      tx.hash ??
      tx.transactionId
    );

    if (id === undefined || id === null || String(id).length === 0) {
      return false;
    }

    const key = String(id);

    if (txIds.has(key)) {
      return false;
    }

    txIds.add(key);
  }

  const previous =
    block.index > 0 &&
    Array.isArray(this.chain)
      ? this.chain[block.index - 1]
      : null;

  if (block.index > 0) {
    if (!previous || typeof previous.hash !== "string") {
      return false;
    }

    if (block.previousHash !== previous.hash) {
      return false;
    }
  }

  if (block.index > 0 && Array.isArray(this.chain)) {
    for (let i = 0; i < this.chain.length; i++) {
      const existing = this.chain[i];

      if (!existing || !Array.isArray(existing.transactions)) {
        continue;
      }

      for (const tx of existing.transactions) {
        const id = tx && (
          tx.id ??
          tx.txId ??
          tx.hash ??
          tx.transactionId
        );

        if (id !== undefined &&
            id !== null &&
            txIds.has(String(id))) {
          return false;
        }
      }
    }
  }

  if (block.merkleRoot !== undefined &&
      typeof this.merkleRoot === "function") {
    const calculatedMerkle = this.merkleRoot(block.transactions);

    if (calculatedMerkle !== block.merkleRoot) {
      return false;
    }
  }

  if (typeof this.blockHash === "function") {
    const calculatedHash = this.blockHash(block);

    if (calculatedHash !== block.hash) {
      return false;
    }
  }

  if (typeof this.powValid === "function") {
    if (!this.powValid(block)) {
      return false;
    }
  }

  return true;
}

  minePendingTransactions() {
    const transactions = this.getMempool();

    if (transactions.length === 0) {
      throw new Error('MEMPOOL_EMPTY');
    }

    const previous = this.chain[this.chain.length - 1];

    const block = this.createLiveBlock(
      transactions,
      previous.index + 1,
      previous.hash
    );

    if (!this.validateBlock(block, previous)) {
      throw new Error('MINED_BLOCK_INVALID');
    }

    this.chain.push(block);

    for (const tx of transactions) {
      this.mempool.delete(tx.id);
    }

    return block;
  }

  addBlock(block) {
    const previous = this.chain[this.chain.length - 1];

    if (!this.validateBlock(block, previous)) {
      throw new Error('INVALID_BLOCK');
    }

    if (this.chain.some(b => b.hash === block.hash)) {
      throw new Error('DUPLICATE_BLOCK');
    }

    this.chain.push(block);

    for (const tx of block.transactions) {
      this.mempool.delete(tx.id);
    }

    return block;
  }

  getConfirmations(txHash) {
    if (!txHash || typeof txHash !== 'string') {
      return 0;
    }

    const currentLength = Array.isArray(this.chain) ? this.chain.length : 0;
    if (currentLength === 0) {
      return 0;
    }

    let blockIndex = -1;

    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];

      if (!block || !Array.isArray(block.transactions)) {
        continue;
      }

      for (const tx of block.transactions) {
        const id = tx.id ?? tx.txId ?? tx.hash ?? tx.transactionId;

        if (id === txHash) {
          blockIndex = i;
          break;
        }
      }

      if (blockIndex >= 0) {
        break;
      }
    }

    if (blockIndex < 0) {
      return 0;
    }

    const confirmations = currentLength - blockIndex;

    return Number.isFinite(confirmations) && confirmations >= 0
      ? confirmations
      : 0;
  }


  createGenesisBlock() {
    if (this.chain.length > 0) {
      return this.chain[0];
    }
    const genesis = {
      index: 0,
      previousHash: "0".repeat(64),
      timestamp: 0,
      transactions: [],
      nonce: 0,
      difficulty: this.difficulty || 2,
      merkleRoot: "0".repeat(64)
    };
    genesis.hash = this.blockHash(genesis);
    this.chain.push(genesis);
    return genesis;
  }

  isChainValid() {
    if (!Array.isArray(this.chain)) return false;
    for (let i = 0; i < this.chain.length; i++) {
      const b = this.chain[i];
      if (!b || typeof b.hash !== "string") return false;
      if (i > 0) {
        const prev = this.chain[i-1];
        if (b.previousHash !== prev.hash) return false;
      }
    }
    return true;
  }

  calculateChainWork(chain) {
    const source = Array.isArray(chain) ? chain : this.chain;
    if (!Array.isArray(source)) return 0n;

    let total = 0n;

    for (const block of source) {
      if (!block || typeof block !== 'object') continue;

      const difficulty = Number(block.difficulty);

      if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 256) {
        continue;
      }

      const target = (2n ** 256n) >> BigInt(difficulty);

      if (target > 0n) {
        total += (2n ** 256n) / target;
      }
    }

    return total;
  }

  getChain() {
    return this.chain;
  }

  getStatus() {
    return {
      chainLength: this.chain.length,
      mempoolSize: this.mempool.size,
      difficulty: this.difficulty,
      tip: this.chain[this.chain.length - 1]?.hash || null
    };
  }
}

module.exports={AdvancedBlockchain};
