const BOT_INFO = {
  name: 'GandomBot',
  username: '@GandomOfficialBot',
  token: 'YOUR_BOT_TOKEN_HERE'
};

function sendMessage(chatId, text) {
  console.log('Telegram to ' + chatId + ': ' + text);
  return { success: true, chatId: chatId, text: text, timestamp: Date.now() };
}

function broadcast(message, users) {
  console.log('Broadcasting to ' + users.length + ' users');
  users.forEach(user => sendMessage(user, message));
  return { sent: users.length, message: message };
}

function handleCommand(command, args, chatId) {
  const commands = {
    '/start': () => 'به گندم خوش آمدید!',
    '/price': () => 'قیمت گندم: 1.15 USDT',
    '/balance': () => 'موجودی شما: 1000 GDM',
    '/buy': () => 'برای خرید گندم، مقدار را وارد کنید',
    '/sell': () => 'برای فروش گندم، مقدار را وارد کنید',
    '/help': () => 'دستورات: /start /price /balance /buy /sell'
  };
  const response = commands[command] ? commands[command]() : 'دستور نامعتبر';
  sendMessage(chatId, response);
  return response;
}

console.log('==========================================');
console.log('GANDOM TELEGRAM BOT');
console.log('==========================================');
console.log('Bot: ' + BOT_INFO.name);
console.log('Username: ' + BOT_INFO.username);
console.log('');
console.log('--- Test Commands ---');
handleCommand('/start', [], 'user1');
handleCommand('/price', [], 'user1');
handleCommand('/balance', [], 'user1');
console.log('');
console.log('--- Broadcast Test ---');
broadcast('گندم آماده معامله است!', ['user1', 'user2', 'user3']);

module.exports = { sendMessage, broadcast, handleCommand };
