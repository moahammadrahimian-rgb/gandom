'use strict';

const crypto = require('crypto');

const LAW = '2558';
const PROVIDER_ID = process.env.GANDOM_PAYMENT_PROVIDER_ID || '';
const API_KEY = process.env.GANDOM_PAYMENT_API_KEY || '';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function providerConfigured() {
  return Boolean(
    PROVIDER_ID &&
    API_KEY &&
    PROVIDER_ID !== 'PROVIDER-TEST' &&
    API_KEY !== 'TEST'
  );
}

function assertConfigured() {
  if (!providerConfigured()) {
    throw new Error(
      'REAL_PAYMENT_PROVIDER_NOT_CONFIGURED'
    );
  }
}

function createPaymentIntent({ amount, currency, orderId }) {
  assertConfigured();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }

  if (!currency || !orderId) {
    throw new Error('INVALID_PAYMENT_REQUEST');
  }

  return {
    law: LAW,
    providerId: PROVIDER_ID,
    orderId,
    amount,
    currency,
    status: 'PENDING_PROVIDER_CONFIRMATION',
    requestHash: sha256(
      JSON.stringify({ amount, currency, orderId })
    )
  };
}

function verifyExternalPayment(payment) {
  assertConfigured();

  if (!payment || !payment.externalPaymentId) {
    throw new Error('EXTERNAL_PAYMENT_ID_REQUIRED');
  }

  if (payment.status !== 'PROVIDER_CONFIRMED') {
    throw new Error('PAYMENT_NOT_PROVIDER_CONFIRMED');
  }

  return {
    verified: true,
    providerId: PROVIDER_ID,
    externalPaymentId: payment.externalPaymentId,
    verificationHash: sha256(
      JSON.stringify(payment)
    )
  };
}

module.exports = {
  LAW,
  PROVIDER_ID,
  providerConfigured,
  createPaymentIntent,
  verifyExternalPayment,
  sha256
};
