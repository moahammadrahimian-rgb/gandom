const crypto = require('crypto');

/*
 * GANDOM - Blockchain
 *
 * Features:
 * - Block structure
 * - SHA-256 hashing
 * - Proof of Work
 * - Genesis Block
 * - Transaction pool
 * - Chain validation
 * - Longest valid chain consensus
 * - Balance calculation
 *
 * No external packages required.
 */

/* =============================================================================
 * Block
 * ============================================================================= */

class Block {
  constructor(
    index,
    data,
    previousHash = '0'.repeat(64),
    timestamp = Date.now()
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          index: this.index,
          timestamp: this.timestamp,
          data: this.data,
          previousHash: this.previousHash,
          nonce: this.nonce
        })
      )
      .digest('hex');
  }

  mineBlock(difficulty = 4) {
    if (
      !Number.isInteger(difficulty) ||
      difficulty < 1 ||
      difficulty > 64
    ) {
      throw new Error(
        'INVALID_DIFFICULTY'
      );
    }

    const target =
      '0'.repeat(difficulty);

    do {
      this.nonce++;
      this.hash =
        this.calculateHash();
    } while (
      !this.hash.startsWith(target)
    );

    return this.hash;
  }
}

/* ==============================================================================
 * Blockchain
 * ============================================================================== */

class Blockchain {
  constructor(options = {}) {
    this.difficulty =
      Number.isInteger(options.difficulty)
        ? options.difficulty
        : 4;

    this.miningReward =
      typeof options.miningReward === 'number'
        ? options.miningReward
        : 0;

    this.pendingTransactions = [];

    this.chain = [
      this.createGenesisBlock()
    ];
  }

  createGenesisBlock() {
    const genesis =
      new Block(
        0,
        {
          type: 'genesis',
          message: 'GANDOM GENESIS BLOCK'
        },
        '0'.repeat(64),
        0
      );

    genesis.hash =
      genesis.calculateHash();

    return genesis;
  }

  getLatestBlock() {
    return this.chain[
      this.chain.length - 1
    ];
  }

  addBlock(newBlock) {
    let block;

    if (newBlock instanceof Block) {
      block = newBlock;

      block.index =
        this.chain.length;

      block.previousHash =
        this.getLatestBlock().hash;

      block.nonce = 0;
      block.hash =
        block.calculateHash();
    } else {
      block =
        new Block(
          this.chain.length,
          newBlock,
          this.getLatestBlock().hash
        );
    }

    block.mineBlock(
      this.difficulty
    );

    this.chain.push(block);

    return block;
  }

  isChainValid(chain = this.chain) {
    if (
      !Array.isArray(chain) ||
      chain.length === 0
    ) {
      return false;
    }

    const genesis = chain[0];

    if (
      genesis.index !== 0 ||
      genesis.previousHash !==
        '0'.repeat(64)
    ) {
      return false;
    }

    if (
      Blockchain.calculateBlockHash(
        genesis
      ) !== genesis.hash
    ) {
      return false;
    }

    for (
      let i = 1;
      i < chain.length;
      i++
    ) {
      const current =
        chain[i];

      const previous =
        chain[i - 1];

      if (
        current.index !== i
      ) {
        return false;
      }

      if (
        current.previousHash !==
        previous.hash
      ) {
        return false;
      }

      if (
        Blockchain.calculateBlockHash(
          current
        ) !== current.hash
      ) {
        return false;
      }

      if (
        !current.hash.startsWith(
          '0'.repeat(this.difficulty)
        )
      ) {
        return false;
      }
    }

    return true;
  }

  getChain() {
    return this.chain;
  }

  addTransaction(transaction) {
    if (
      transaction === null ||
      transaction === undefined
    ) {
      throw new Error(
        'INVALID_TRANSACTION'
      );
    }

    if (
      typeof transaction !== 'object'
    ) {
      throw new Error(
        'TRANSACTION_MUST_BE_OBJECT'
      );
    }

    const tx = {
      ...transaction
    };

    if (!tx.id) {
      tx.id =
        crypto
          .createHash('sha256')
          .update(
            JSON.stringify({
              ...tx,
              timestamp:
                tx.timestamp || Date.now()
            })
          )
          .digest('hex');
    }

    if (!tx.timestamp) {
      tx.timestamp =
        Date.now();
    }

    this.pendingTransactions.push(tx);

    return tx;
  }

  getPendingTransactions() {
    return [
      ...this.pendingTransactions
    ];
  }

  minePendingTransactions(minerAddress) {
    const transactions = [
      ...this.pendingTransactions
    ];

    if (
      this.miningReward > 0 &&
      minerAddress
    ) {
      transactions.push({
        type: 'mining_reward',
        from: null,
        to: minerAddress,
        amount: this.miningReward,
        timestamp: Date.now()
      });
    }

    const block =
      this.addBlock(
        transactions
      );

    this.pendingTransactions = [];

    return block;
  }

  getBalance(address) {
    if (
      typeof address !== 'string' ||
      address.length === 0
    ) {
      throw new Error(
        'INVALID_ADDRESS'
      );
    }

    let balance = 0;

    for (
      const block of this.chain
    ) {
      if (
        !Array.isArray(block.data)
      ) {
        continue;
      }

      for (
        const transaction of block.data
      ) {
        if (
          !transaction ||
          typeof transaction !== 'object'
        ) {
          continue;
        }

        const amount =
          Number(transaction.amount);

        if (
          !Number.isFinite(amount) ||
          amount < 0
        ) {
          continue;
        }

        if (
          transaction.from === address
        ) {
          balance -= amount;
        }

        if (
          transaction.to === address
        ) {
          balance += amount;
        }
      }
    }

    return balance;
  }

  replaceChain(newChain) {
    if (
      !Array.isArray(newChain)
    ) {
      return false;
    }

    if (
      newChain.length <=
      this.chain.length
    ) {
      return false;
    }

    if (
      !this.isChainValid(
        newChain
      )
    ) {
      return false;
    }

    this.chain =
      JSON.parse(
        JSON.stringify(newChain)
      );

    return true;
  }

  async resolveConflicts(peers) {
    let peerChains;

    if (
      typeof peers === 'function'
    ) {
      peerChains =
        await peers();
    } else {
      peerChains =
        peers;
    }

    if (
      !Array.isArray(peerChains)
    ) {
      return {
        replaced: false,
        reason: 'INVALID_PEERS',
        length:
          this.chain.length
      };
    }

    let longestChain =
      this.chain;

    for (
      const peer of peerChains
    ) {
      let candidate =
        peer;

      if (
        peer &&
        !Array.isArray(peer) &&
        Array.isArray(peer.chain)
      ) {
        candidate =
          peer.chain;
      }

      if (
        !Array.isArray(candidate)
      ) {
        continue;
      }

      if (
        candidate.length >
          longestChain.length &&
        this.isChainValid(candidate)
      ) {
        longestChain =
          candidate;
      }
    }

    const replaced =
      longestChain !== this.chain &&
      this.replaceChain(
        longestChain
      );

    return {
      replaced,
      length:
        this.chain.length
    };
  }

  toJSON() {
    return JSON.parse(
      JSON.stringify(
        this.chain
      )
    );
  }

  static fromChain(
    chain,
    options = {}
  ) {
    const blockchain =
      new Blockchain(
        options
      );

    if (
      !Array.isArray(chain) ||
      chain.length === 0
    ) {
      throw new Error(
        'INVALID_CHAIN'
      );
    }

    if (
      !blockchain.isChainValid(
        chain
      )
    ) {
      throw new Error(
        'INVALID_CHAIN'
      );
    }

    blockchain.chain =
      JSON.parse(
        JSON.stringify(chain)
      );

    return blockchain;
  }

  static calculateBlockHash(
    block
  ) {
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          index: block.index,
          timestamp: block.timestamp,
          data: block.data,
          previousHash:
            block.previousHash,
          nonce: block.nonce
        })
      )
      .digest('hex');
  }
}

module.exports = {
  Block,
  Blockchain
};