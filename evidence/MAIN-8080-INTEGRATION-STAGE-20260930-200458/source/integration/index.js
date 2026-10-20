const path = require('path');

const { IPFSStore } = require('../ipfs');
const { Blockchain } = require('../blockchain');
const Security = require('../security');
const {
  TorSimulator,
  realTorInfo
} = require('../tor');

/*
 * GANDOM - Integration Layer
 *
 * اتصال:
 * 1. P2P      -> توسط index.js اصلی
 * 2. DHT      -> توسط index.js اصلی
 * 3. IPFS
 * 4. Blockchain
 * 5. Security
 * 6. Tor
 *
 * این فایل هسته P2P/DHT را تغییر نمی‌دهد.
 */

class GandomCore {
  constructor(options = {}) {
    this.ipfs = new IPFSStore(
      options.ipfsDir ||
      path.join(__dirname, '..', 'ipfs', 'store')
    );

    this.blockchain =
      new Blockchain({
        difficulty:
          Number.isInteger(options.difficulty)
            ? options.difficulty
            : 3,

        miningReward:
          typeof options.miningReward === 'number'
            ? options.miningReward
            : 0
      });

    this.security = Security;

    this.tor =
      new TorSimulator(
        options.tor || {}
      );

    this.modules = {
      p2p: 'index.js',
      dht: 'dht',
      ipfs: this.ipfs,
      blockchain: this.blockchain,
      security: this.security,
      tor: this.tor
    };
  }

  /*
   * وضعیت تمام ماژول‌های متصل
   */
  status() {
    return {
      project: 'GANDOM',
      integration: true,

      p2p: {
        loaded: true,
        module: 'index.js'
      },

      dht: {
        loaded: true,
        module: 'dht'
      },

      ipfs: {
        loaded:
          this.ipfs instanceof IPFSStore
      },

      blockchain: {
        loaded:
          this.blockchain instanceof Blockchain,
        chainLength:
          this.blockchain.getChain().length,
        valid:
          this.blockchain.isChainValid()
      },

      security: {
        loaded:
          typeof this.security.sha256 === 'function' &&
          typeof this.security.encryptAES === 'function' &&
          typeof this.security.generateRSAKeyPair === 'function'
      },

      tor: {
        loaded:
          this.tor instanceof TorSimulator,
        mode:
          this.tor.status().mode
      }
    };
  }

  /*
   * ذخیره داده در IPFS
   */
  store(data) {
    const buffer =
      Buffer.isBuffer(data)
        ? data
        : Buffer.from(String(data));

    return this.ipfs.putBuffer(buffer);
  }

  /*
   * دریافت داده از IPFS
   */
  retrieve(cid) {
    return this.ipfs.getBuffer(cid);
  }

  /*
   * ثبت CID در Blockchain
   */
  recordFile(
    cid,
    owner,
    metadata = {}
  ) {
    if (!cid) {
      throw new Error('CID_REQUIRED');
    }

    return this.blockchain.addTransaction({
      type: 'ipfs_file',
      cid,
      owner: owner || null,
      metadata
    });
  }

  /*
   * استخراج تراکنش‌ها
   */
  mine(minerAddress) {
    return this.blockchain
      .minePendingTransactions(
        minerAddress
      );
  }

  /*
   * رمزنگاری داده
   */
  encrypt(data, key) {
    return this.security.encryptAES(
      data,
      key
    );
  }

  /*
   * رمزگشایی داده
   */
  decrypt(payload, key) {
    return this.security.decryptAES(
      payload,
      key
    );
  }

  /*
   * ساخت کلید AES
   */
  generateAESKey() {
    return this.security.generateAESKey();
  }

  /*
   * ساخت کلید RSA
   */
  generateRSAKeys() {
    return this.security.generateRSAKeyPair();
  }

  /*
   * امضای داده
   */
  sign(data, privateKey) {
    return this.security.sign(
      data,
      privateKey
    );
  }

  /*
   * بررسی امضا
   */
  verify(
    data,
    signature,
    publicKey
  ) {
    return this.security.verify(
      data,
      signature,
      publicKey
    );
  }

  /*
   * مسیر Tor Simulator
   */
  route(data) {
    return this.tor.send(data);
  }

  /*
   * اطلاعات Tor واقعی
   */
  realTor() {
    return realTorInfo();
  }

  /*
   * سناریوی یکپارچه:
   *
   * data
   *   ↓
   * SHA-256
   *   ↓
   * AES
   *   ↓
   * IPFS
   *   ↓
   * Blockchain
   *   ↓
   * Tor
   */
  process(data, owner = 'GANDOM') {
    const original =
      Buffer.isBuffer(data)
        ? data
        : Buffer.from(String(data));

    const hash =
      this.security.sha256(
        original
      );

    const aesKey =
      this.security.generateAESKey();

    const encrypted =
      this.security.encryptAES(
        original,
        aesKey
      );

    const stored =
      this.ipfs.putBuffer(
        Buffer.from(
          JSON.stringify(
            encrypted
          )
        )
      );

    const transaction =
      this.blockchain.addTransaction({
        type: 'gandom_data',
        owner,
        hash,
        cid: stored.cid,
        size: original.length
      });

    const route =
      this.tor.send(
        JSON.stringify({
          cid: stored.cid,
          hash
        })
      );

    return {
      success: true,
      hash,
      cid: stored.cid,
      size: original.length,
      chunks: stored.chunks,
      transactionId:
        transaction.id,
      routeId:
        route.routeId,
      hopCount:
        route.hopCount
    };
  }
}

module.exports = {
  GandomCore
};
