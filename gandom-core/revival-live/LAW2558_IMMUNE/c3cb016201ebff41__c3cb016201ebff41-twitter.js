const BOT_INFO = {
  name: 'GandomToken',
  username: '@GandomToken',
  apiKey: 'YOUR_API_KEY_HERE'
};

function postTweet(text, hashtags) {
  hashtags = hashtags || ['#Gandom', '#GDM', '#Crypto'];
  const fullTweet = text + ' ' + hashtags.join(' ');
  console.log('Tweet posted: ' + fullTweet);
  return { success: true, text: fullTweet, timestamp: Date.now() };
}

function generateTweet(type, data) {
  const templates = {
    price: 'قیمت گندم: ' + (data.price || '1.15') + ' USDT | تغییر: +15% #Gandom',
    news: 'خبر مهم: ' + (data.news || 'گندم آماده معامله است'),
    airdrop: 'ایردراپ گندم! 1000 GDM رایگان برای کاربران جدید',
    listing: 'گندم در صرافی لیست شد! #GDM'
  };
  return templates[type] || templates.news;
}

function schedulePost(type, delayMinutes) {
  console.log('Scheduled ' + type + ' tweet in ' + delayMinutes + ' minutes');
  return { type: type, scheduledFor: Date.now() + (delayMinutes * 60000) };
}

console.log('==========================================');
console.log('GANDOM TWITTER BOT');
console.log('==========================================');
console.log('Account: ' + BOT_INFO.username);
console.log('');
console.log('--- Test Tweets ---');
postTweet(generateTweet('price', { price: '1.15' }));
postTweet(generateTweet('airdrop', {}));
postTweet(generateTweet('listing', {}));
console.log('');
console.log('--- Scheduled Posts ---');
schedulePost('price', 60);
schedulePost('news', 120);

module.exports = { postTweet, generateTweet, schedulePost };
