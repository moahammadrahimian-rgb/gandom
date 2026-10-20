const BOT_INFO = {
  tiktok: { username: '@gandom_official' },
  instagram: { username: '@gandom_official' }
};

function postTikTok(videoPath, caption) {
  console.log('TikTok video posted:');
  console.log('  Video: ' + videoPath);
  console.log('  Caption: ' + caption);
  return { platform: 'tiktok', success: true };
}

function postInstagram(imagePath, caption, hashtags) {
  hashtags = hashtags || ['#gandom', '#gdm', '#crypto', '#blockchain'];
  console.log('Instagram post published:');
  console.log('  Image: ' + imagePath);
  console.log('  Caption: ' + caption);
  console.log('  Hashtags: ' + hashtags.join(' '));
  return { platform: 'instagram', success: true };
}

function generateContent(type) {
  const contents = {
    intro: {
      caption: 'با گندم آشنا شوید! ارز دیجیتال ایرانی با 24 میلیارد سکه',
      hashtags: ['#gandom', '#crypto', '#iran']
    },
    price: {
      caption: 'قیمت گندم امروز: 1.15 USDT | +15% رشد',
      hashtags: ['#gdm', '#cryptopump']
    },
    airdrop: {
      caption: '1000 گندم رایگان! فقط کافیه ثبت‌نام کنی',
      hashtags: ['#airdrop', '#gandom']
    },
    tutorial: {
      caption: 'آموزش خرید گندم در 3 مرحله ساده',
      hashtags: ['#tutorial', '#gdm']
    }
  };
  return contents[type] || contents.intro;
}

function crossPost(type) {
  const content = generateContent(type);
  console.log('Cross-posting: ' + type);
  postTikTok('video_' + type + '.mp4', content.caption);
  postInstagram('image_' + type + '.jpg', content.caption, content.hashtags);
  console.log('');
}

console.log('==========================================');
console.log('GANDOM SOCIAL MEDIA BOT');
console.log('==========================================');
console.log('TikTok: ' + BOT_INFO.tiktok.username);
console.log('Instagram: ' + BOT_INFO.instagram.username);
console.log('');
console.log('--- Cross-Posting Tests ---');
crossPost('intro');
crossPost('price');
crossPost('airdrop');

module.exports = { postTikTok, postInstagram, generateContent, crossPost };
