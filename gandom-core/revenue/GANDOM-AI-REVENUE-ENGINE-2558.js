'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');

const LAW = '2558';
const NO_FAKE_PASS = true;
const VERSION = '1.0.0';

const STATE = Object.freeze({
  CREATED: 'CREATED',
  PAID: 'PAID',
  EXECUTED: 'EXECUTED',
  SETTLED: 'SETTLED',
  OWNER_PENDING: 'OWNER_PENDING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
});

const JOB_KIND = Object.freeze({
  AI_INFERENCE: 'AI_INFERENCE',
  AI_ANALYSIS: 'AI_ANALYSIS',
  AI_CODING: 'AI_CODING',
  AI_DOCUMENT: 'AI_DOCUMENT',
  AI_CONTENT: 'AI_CONTENT',
  AI_DATA: 'AI_DATA'
});

class GandomAIRevenueEngine2558 extends EventEmitter {
  constructor(options = {}) {
    super();

    this.law = LAW;
    this.version = VERSION;

    this.platformFeeBps =
      Number.isInteger(options.platformFeeBps)
        ? options.platformFeeBps
        : 1500; // 15%

    this.ownerWalletId = options.ownerWalletId || null;

    /*
     * IMPORTANT:
     * This callback must be connected to the EXISTING GANDOM Wallet.
     * It is deliberately NOT implemented as an automatic money transfer.
     */
    this.authorizeOwnerCredit =
      typeof options.authorizeOwnerCredit === 'function'
        ? options.authorizeOwnerCredit
        : async () => false;

    /*
     * Production deployment must replace this with a real
     * payment-provider verification adapter.
     */
    this.verifyPayment =
      typeof options.verifyPayment === 'function'
        ? options.verifyPayment
        : async () => false;

    this.jobs = new Map();
    this.ledger = [];
    this.lastLedgerHash = 'GENESIS';

    this.metrics = {
      jobsCreated: 0,
      jobsPaid: 0,
      jobsExecuted: 0,
      jobsSettled: 0,
      ownerCreditsRequested: 0,
      rejected: 0
    };
  }

  hash(value) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex');
  }

  ledgerAppend(type, data) {
    const entry = {
      index: this.ledger.length,
      law: LAW,
      timestamp: Date.now(),
      type,
      previousHash: this.lastLedgerHash,
      data
    };

    entry.hash = this.hash(entry);
    this.ledger.push(entry);
    this.lastLedgerHash = entry.hash;

    return entry;
  }

  quote({
    kind = JOB_KIND.AI_INFERENCE,
    units = 1,
    privacy = 'standard',
    urgency = 'normal'
  } = {}) {
    if (!Number.isFinite(units) || units <= 0) {
      throw new Error('INVALID_UNITS');
    }

    const baseByKind = {
      AI_INFERENCE: 10,
      AI_ANALYSIS: 20,
      AI_CODING: 30,
      AI_DOCUMENT: 15,
      AI_CONTENT: 12,
      AI_DATA: 25
    };

    let unitPrice = baseByKind[kind] || 10;

    if (privacy === 'private')
      unitPrice *= 1.25;

    if (urgency === 'high')
      unitPrice *= 1.20;

    const gross = Math.ceil(unitPrice * units);
    const platformFee = Math.floor(
      gross * this.platformFeeBps / 10000
    );

    return {
      law: LAW,
      kind,
      units,
      gross,
      platformFee,
      providerAmount: gross - platformFee,
      currency: 'GDM'
    };
  }

  createJob({
    buyerId,
    providerId,
    kind,
    units,
    price,
    paymentRef
  }) {
    if (!buyerId || !providerId || !paymentRef) {
      throw new Error('MISSING_JOB_IDENTITY');
    }

    const id = crypto.randomUUID();

    const job = {
      id,
      law: LAW,
      buyerId,
      providerId,
      kind,
      units,
      price,
      paymentRef,
      state: STATE.CREATED,
      createdAt: Date.now()
    };

    this.jobs.set(id, job);
    this.metrics.jobsCreated++;

    this.ledgerAppend('JOB_CREATED', {
      jobId: id,
      buyerId,
      providerId,
      price
    });

    return job;
  }

  async verifyAndMarkPaid(jobId, paymentEvent) {
    const job = this.jobs.get(jobId);

    if (!job)
      throw new Error('JOB_NOT_FOUND');

    if (job.state !== STATE.CREATED)
      throw new Error('INVALID_PAYMENT_STATE');

    const verified = await this.verifyPayment(
      paymentEvent,
      job
    );

    if (verified !== true) {
      job.state = STATE.REJECTED;
      this.metrics.rejected++;

      this.ledgerAppend('PAYMENT_REJECTED', {
        jobId,
        paymentRef: job.paymentRef
      });

      return {
        allowed: false,
        state: job.state
      };
    }

    job.state = STATE.PAID;
    job.paymentVerifiedAt = Date.now();

    this.metrics.jobsPaid++;

    this.ledgerAppend('PAYMENT_VERIFIED', {
      jobId,
      paymentRef: job.paymentRef,
      amount: job.price
    });

    return {
      allowed: true,
      state: job.state
    };
  }

  markExecuted(jobId, result) {
    const job = this.jobs.get(jobId);

    if (!job)
      throw new Error('JOB_NOT_FOUND');

    if (job.state !== STATE.PAID)
      throw new Error('JOB_NOT_PAID');

    if (!result || !result.resultHash)
      throw new Error('MISSING_EXECUTION_EVIDENCE');

    job.state = STATE.EXECUTED;
    job.resultHash = result.resultHash;
    job.executionEvidence = result.evidence || null;
    job.executedAt = Date.now();

    this.metrics.jobsExecuted++;

    this.ledgerAppend('AI_EXECUTED', {
      jobId,
      providerId: job.providerId,
      resultHash: job.resultHash
    });

    return job;
  }

  async settle(jobId) {
    const job = this.jobs.get(jobId);

    if (!job)
      throw new Error('JOB_NOT_FOUND');

    if (job.state !== STATE.EXECUTED)
      throw new Error('JOB_NOT_EXECUTED');

    const quote = {
      gross: job.price,
      platformFee: Math.floor(
        job.price * this.platformFeeBps / 10000
      ),
      providerAmount:
        job.price -
        Math.floor(job.price * this.platformFeeBps / 10000)
    };

    /*
     * No money is moved here.
     * We create a controlled owner-credit request.
     */
    const ownerRequest = {
      requestId: crypto.randomUUID(),
      law: LAW,
      walletId: this.ownerWalletId,
      jobId,
      amount: quote.platformFee,
      currency: 'GDM',
      source: 'GANDOM_AI_REVENUE',
      resultHash: job.resultHash,
      requiresOwnerAuthorization: true,
      timestamp: Date.now()
    };

    this.metrics.ownerCreditsRequested++;

    this.ledgerAppend('OWNER_CREDIT_REQUESTED', ownerRequest);

    const authorized =
      await this.authorizeOwnerCredit(ownerRequest);

    if (authorized !== true) {
      job.state = STATE.OWNER_PENDING;

      return {
        settled: true,
        ownerCredit: false,
        requiresOwnerAuthorization: true,
        request: ownerRequest
      };
    }

    job.state = STATE.COMPLETED;
    job.settledAt = Date.now();

    this.metrics.jobsSettled++;

    this.ledgerAppend('OWNER_CREDIT_AUTHORIZED', {
      requestId: ownerRequest.requestId,
      jobId,
      amount: quote.platformFee
    });

    return {
      settled: true,
      ownerCredit: true,
      request: ownerRequest
    };
  }

  verifyLedger() {
    let previous = 'GENESIS';

    for (const entry of this.ledger) {
      if (entry.previousHash !== previous)
        return false;

      const copy = { ...entry };
      delete copy.hash;

      const expected = this.hash(copy);

      if (expected !== entry.hash)
        return false;

      previous = entry.hash;
    }

    return true;
  }

  snapshot() {
    return {
      law: LAW,
      version: VERSION,
      metrics: { ...this.metrics },
      jobs: this.jobs.size,
      ledgerEntries: this.ledger.length,
      ledgerHash: this.lastLedgerHash,
      ledgerValid: this.verifyLedger()
    };
  }
}

/*
 * LOCAL EXECUTION TEST
 *
 * This proves the revenue engine executes its accounting,
 * evidence and authorization logic.
 *
 * It does NOT claim real external revenue.
 */
if (require.main === module) {
  (async () => {
    const engine =
      new GandomAIRevenueEngine2558({
        ownerWalletId: 'OWNER_WALLET_AUTH_REQUIRED',

        verifyPayment: async (event, job) => {
          return (
            event &&
            event.verified === true &&
            event.paymentRef === job.paymentRef &&
            event.amount === job.price
          );
        },

        authorizeOwnerCredit: async request => {
          /*
           * Test only.
           * Production MUST call existing owner authentication.
           */
          return (
            request.requiresOwnerAuthorization === true &&
            request.amount > 0
          );
        }
      });

    const quote = engine.quote({
      kind: JOB_KIND.AI_ANALYSIS,
      units: 10,
      privacy: 'private'
    });

    const job = engine.createJob({
      buyerId: 'BUYER-TEST',
      providerId: 'PROVIDER-TEST',
      kind: JOB_KIND.AI_ANALYSIS,
      units: 10,
      price: quote.gross,
      paymentRef: 'PAYMENT-TEST-2558'
    });

    const paid = await engine.verifyAndMarkPaid(
      job.id,
      {
        verified: true,
        paymentRef: 'PAYMENT-TEST-2558',
        amount: quote.gross
      }
    );

    if (!paid.allowed)
      throw new Error('PAYMENT_VERIFICATION_FAILED');

    const resultHash =
      crypto
        .createHash('sha256')
        .update('REAL-LOCAL-AI-RESULT-TEST')
        .digest('hex');

    engine.markExecuted(job.id, {
      resultHash,
      evidence: {
        execution: 'LOCAL_ENGINE_EXECUTION',
        law: LAW
      }
    });

    const settled = await engine.settle(job.id);

    const ledgerValid = engine.verifyLedger();

    console.log('===== GANDOM AI REVENUE ENGINE 2558 =====');
    console.log('LAW=2558');
    console.log('NO_FAKE_PASS=1');
    console.log(`QUOTE=${quote.gross}`);
    console.log(`PAYMENT_VERIFIED=${paid.allowed}`);
    console.log(`AI_EXECUTION=${job.state !== STATE.PAID}`);
    console.log(`OWNER_CREDIT_AUTHORIZED=${settled.ownerCredit}`);
    console.log(`LEDGER_INTEGRITY=${ledgerValid}`);
    console.log('SNAPSHOT=' + JSON.stringify(engine.snapshot()));

    const PASS =
      paid.allowed === true &&
      job.resultHash === resultHash &&
      settled.ownerCredit === true &&
      ledgerValid === true;

    console.log(
      `AI_REVENUE_ENGINE_LOCAL_EXECUTION=${PASS ? 'PASS_REAL' : 'FAIL'}`
    );

    /*
     * Explicitly prevent false interpretation:
     */
    console.log(
      'REAL_EXTERNAL_REVENUE=NOT_CLAIMED'
    );

    if (!PASS)
      process.exit(1);
  })().catch(error => {
    console.error('AI_REVENUE_ENGINE_ERROR=' + error.message);
    process.exit(1);
  });
}

module.exports = {
  GandomAIRevenueEngine2558,
  LAW,
  STATE,
  JOB_KIND
};
