const fs = require('fs');
const path = require('path');

const CHAT_LOG = path.join(__dirname, 'chat-log.json');

const RESPONSES = {
  greeting: [
    'Hello! Welcome to Gandom',
    'Hi! How can I help you?',
    'Welcome! What is your question?'
  ],
  price: [
    'Current GDM price: 1.15 USDT',
    'GDM is trading at 1.15 USD',
    'Live price: 1.15 USDT (+15%)'
  ],
  buy: [
    'To buy GDM, go to DEX',
    'Enter the amount of GDM you want to buy',
    'Buy GDM through decentralized exchange'
  ],
  sell: [
    'To sell GDM, go to DEX',
    'Enter the amount of GDM you want to sell',
    'Sell GDM through decentralized exchange'
  ],
  wallet: [
    'Your wallet: 1,200,000,000 GDM',
    'Balance: 1.2 billion GDM',
    'Go to Wallet section to see your balance'
  ],
  kyc: [
    'Go to KYC section for verification',
    'KYC requires national ID and phone number',
    'Enter your national ID and phone to verify'
  ],
  airdrop: [
    'Airdrop is active! Get 1000 GDM free',
    'Register to receive airdrop',
    '1000 GDM free for new users'
  ],
  help: [
    'Commands: /price /buy /sell /wallet /kyc /airdrop /help',
    'Available commands: /price /buy /sell /wallet /kyc /airdrop'
  ],
  unknown: [
    'Sorry, I did not understand. Please try again.',
    'Command not recognized. Type /help.',
    'Type /help for assistance.'
  ]
};

function loadChatLog() {
  if (!fs.existsSync(CHAT_LOG)) return [];
  return JSON.parse(fs.readFileSync(CHAT_LOG, 'utf8'));
}

function saveChatLog(log) {
  fs.writeFileSync(CHAT_LOG, JSON.stringify(log, null, 2));
}

function detectIntent(message) {
  const lower = message.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('salam')) return 'greeting';
  if (lower.includes('/price') || lower.includes('price')) return 'price';
  if (lower.includes('/buy') || lower.includes('buy')) return 'buy';
  if (lower.includes('/sell') || lower.includes('sell')) return 'sell';
  if (lower.includes('/wallet') || lower.includes('wallet')) return 'wallet';
  if (lower.includes('/kyc') || lower.includes('kyc')) return 'kyc';
  if (lower.includes('/airdrop') || lower.includes('airdrop')) return 'airdrop';
  if (lower.includes('/help') || lower.includes('help')) return 'help';
  return 'unknown';
}

function getResponse(intent) {
  const responses = RESPONSES[intent] || RESPONSES.unknown;
  return responses[Math.floor(Math.random() * responses.length)];
}

function chat(userId, message) {
  const intent = detectIntent(message);
  const response = getResponse(intent);
  const log = loadChatLog();
  log.push({
    userId: userId,
    message: message,
    intent: intent,
    response: response,
    timestamp: Date.now()
  });
  saveChatLog(log);
  return { intent: intent, response: response };
}

console.log('==========================================');
console.log('GANDOM AI CHATBOT');
console.log('==========================================');
console.log('');

const testMessages = [
  'Hello',
  'What is GDM price?',
  'How to buy GDM?',
  'My wallet balance?',
  'How to do KYC?',
  'What is airdrop?',
  '/help',
  'random question'
];

testMessages.forEach(msg => {
  console.log('User: ' + msg);
  const result = chat('user1', msg);
  console.log('Bot:  ' + result.response);
  console.log('');
});

module.exports = { chat, detectIntent, getResponse };
