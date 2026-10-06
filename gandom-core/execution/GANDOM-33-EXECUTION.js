'use strict';

const crypto = require('crypto');

const LAW = 'MOTHER-2558';
const VERSION = '33.0.0';

const sections = [
  ['IDENTITY', 'هویت و برند GANDOM'],
  ['MAIN_FRAME', 'قاب اصلی و Navigation'],
  ['DASHBOARD', 'داشبورد'],
  ['NAVIGATION', 'رفت و برگشت'],
  ['CARDS', 'کارت‌های موضوعی'],
  ['ACCOUNT', 'حساب کاربری'],
  ['KYC', 'احراز هویت'],
  ['SECURITY', 'امنیت حساب'],
  ['WALLET', 'کیف پول'],
  ['DEPOSIT', 'واریز'],
  ['WITHDRAW', 'برداشت'],
  ['TRANSFER', 'انتقال داخلی'],
  ['LEDGER', 'دفتر مالی'],
  ['EXCHANGE', 'صرافی'],
  ['BUY', 'خرید'],
  ['SELL', 'فروش'],
  ['MARKET_CHART', 'نمودار بازار'],
  ['ORDER_STATE', 'وضعیت سفارش'],
  ['FEE', 'کارمزد'],
  ['GDM_ECONOMY', 'اقتصاد 24B GDM'],
  ['MARKET', 'بازار و قیمت'],
  ['P2P', 'P2P'],
  ['DHT', 'DHT و Network'],
  ['BLOCKCHAIN', 'Blockchain'],
  ['IPFS', 'IPFS و Data'],
  ['AI', 'AI Core'],
  ['COMMERCIAL', 'Commercial و Ads'],
  ['GLOBAL_USERS', 'کاربران جهانی'],
  ['SOCIAL', 'Social و Viral'],
  ['BACKUP', 'Backup و Restore'],
  ['MOBILE', 'Android و نصب موبایل'],
  ['UX', 'UX و Responsive'],
  ['FINAL_AUDIT', 'Integration و Final Audit']
];

const STATES = Object.freeze({
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  BLOCKED: 'BLOCKED'
});

const FINANCIAL_ACTIONS = new Set([
  'DEPOSIT',
  'WITHDRAW',
  'TRANSFER',
  'BUY',
  'SELL'
]);

function sectionList() {
  return sections.map(([id, title], index) => ({
    number: index + 1,
    id,
    title,
    status: 'NOT_VERIFIED'
  }));
}

function createExecution(action, payload = {}) {
  if (!action || typeof action !== 'string') {
    throw new TypeError('ACTION_REQUIRED');
  }

  const execution = {
    id: crypto.randomUUID(),
    law: LAW,
    version: VERSION,
    action,
    state: STATES.IDLE,
    createdAt: new Date().toISOString(),
    payload
  };

  if (FINANCIAL_ACTIONS.has(action)) {
    execution.requiresAuthentication = true;
    execution.requiresLedger = true;
    execution.aiMayAssist = true;
    execution.aiMayExecuteOwnerWithdrawal = false;
    execution.aiMayExecuteOwnerTransfer = false;
  }

  return execution;
}

function transition(execution, nextState, evidence = null) {
  if (!Object.values(STATES).includes(nextState)) {
    throw new Error('INVALID_STATE');
  }

  const allowed = {
    IDLE: ['LOADING', 'BLOCKED'],
    LOADING: ['SUCCESS', 'ERROR', 'BLOCKED'],
    SUCCESS: [],
    ERROR: [],
    BLOCKED: []
  };

  if (!allowed[execution.state].includes(nextState)) {
    throw new Error(
      `INVALID_TRANSITION:${execution.state}->${nextState}`
    );
  }

  execution.state = nextState;
  execution.evidence = evidence;
  execution.updatedAt = new Date().toISOString();

  return execution;
}

function walletTransferFlow() {
  return [
    'EXCHANGE',
    'TRANSFER',
    'AMOUNT',
    'DESTINATION_WALLET',
    'FEE',
    'REVIEW',
    'AUTHENTICATION',
    'CONFIRM',
    'LEDGER',
    'BALANCE_UPDATE',
    'HISTORY'
  ];
}

function ownerFinancialPolicy() {
  return {
    aiCanAssist: true,
    aiCanCreateRecommendations: true,
    aiCanCreateRevenueEvents: true,
    aiCanWithdrawOwnerFunds: false,
    aiCanTransferOwnerFunds: false,
    ownerAuthenticationRequired: true
  };
}

function verifyContract() {
  if (sections.length !== 33) {
    throw new Error(`SECTION_COUNT=${sections.length}`);
  }

  if (LAW !== 'MOTHER-2558') {
    throw new Error('LAW_REFERENCE_INVALID');
  }

  const flow = walletTransferFlow();

  const required = [
    'EXCHANGE',
    'TRANSFER',
    'AMOUNT',
    'DESTINATION_WALLET',
    'AUTHENTICATION',
    'LEDGER',
    'BALANCE_UPDATE'
  ];

  for (const item of required) {
    if (!flow.includes(item)) {
      throw new Error(`FLOW_MISSING:${item}`);
    }
  }

  const policy = ownerFinancialPolicy();

  if (policy.aiCanWithdrawOwnerFunds !== false) {
    throw new Error('AI_WITHDRAW_POLICY_INVALID');
  }

  if (policy.aiCanTransferOwnerFunds !== false) {
    throw new Error('AI_TRANSFER_POLICY_INVALID');
  }

  return true;
}

module.exports = {
  LAW,
  VERSION,
  STATES,
  sections,
  sectionList,
  createExecution,
  transition,
  walletTransferFlow,
  ownerFinancialPolicy,
  verifyContract
};

if (require.main === module) {
  verifyContract();

  console.log('LAW=' + LAW);
  console.log('VERSION=' + VERSION);
  console.log('SECTIONS=' + sections.length);
  console.log('WALLET_TRANSFER_FLOW=' + walletTransferFlow().join('>'));
  console.log('AI_OWNER_WITHDRAW=false');
  console.log('AI_OWNER_TRANSFER=false');
  console.log('GANDOM_33_EXECUTION_CONTRACT=PASS');
}
