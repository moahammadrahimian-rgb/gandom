const fs = require('fs');
const path = require('path');

const LOCATIONS_FILE = path.join(__dirname, 'locations.json');

const IRAN_PROVINCES = {
  'تهران': ['تهران', 'اسلامشهر', 'شهریار', 'ورامین', 'پاکدشت', 'قرچک', 'پردیس', 'رباط‌کریم', 'پیشوا', 'بهارستان', 'ملارد', 'قدس', 'فیروزکوه', 'دماوند'],
  'اصفهان': ['اصفهان', 'کاشان', 'خمینی‌شهر', 'نجف‌آباد', 'شهرضا', 'شاهین‌شهر', 'فولادشهر', 'زرین‌شهر', 'آران و بیدگل', 'گلپایگان', 'خوانسار', 'سمیرم', 'فریدن'],
  'فارس': ['شیراز', 'مرودشت', 'کازرون', 'جهرم', 'فسا', 'داراب', 'لار', 'آباده', 'نی‌ریز', 'اقلید', 'سپیدان', 'ممسنی'],
  'خراسان رضوی': ['مشهد', 'نیشابور', 'سبزوار', 'تربت حیدریه', 'قوچان', 'کاشمر', 'تربت جام', 'چناران', 'خواف', 'گناباد'],
  'آذربایجان شرقی': ['تبریز', 'مراغه', 'مرند', 'اهر', 'بناب', 'میانه', 'سراب', 'شبستر', 'آذرشهر', 'اسکو'],
  'آذربایجان غربی': ['ارومیه', 'خوی', 'میاندوآب', 'مهاباد', 'بوکان', 'سلماس', 'نقده', 'پیرانشهر', 'ماکو'],
  'خوزستان': ['اهواز', 'آبادان', 'خرمشهر', 'دزفول', 'اندیمشک', 'بهبهان', 'ماهشهر', 'شوش', 'شوشتر', 'ایذه'],
  'گیلان': ['رشت', 'انزلی', 'لاهیجان', 'آستارا', 'تالش', 'رودسر', 'فومن', 'صومعه‌سرا', 'آستانه اشرفیه'],
  'مازندران': ['ساری', 'بابل', 'آمل', 'قائم‌شهر', 'بهشهر', 'چالوس', 'نوشهر', 'تنکابن', 'رامسر', 'نور'],
  'کرمان': ['کرمان', 'رفسنجان', 'سیرجان', 'بم', 'جیرفت', 'زرند', 'کهنوج', 'بردسیر', 'شهربابک'],
  'سیستان و بلوچستان': ['زاهدان', 'زابل', 'چابهار', 'ایرانشهر', 'سراوان', 'خاش', 'کنارک'],
  'کرمانشاه': ['کرمانشاه', 'اسلام‌آباد غرب', 'هرسین', 'سنقر', 'پاوه', 'جوانرود', 'کنگاور'],
  'گلستان': ['گرگان', 'گنبد کاووس', 'علی‌آباد', 'آق‌قلا', 'بندر ترکمن', 'کردکوی', 'مینودشت'],
  'هرمزگان': ['بندرعباس', 'قشم', 'کیش', 'میناب', 'بندر لنگه', 'بستک', 'رودان'],
  'لرستان': ['خرم‌آباد', 'بروجرد', 'دورود', 'الیگودرز', 'کوهدشت', 'نورآباد'],
  'همدان': ['همدان', 'ملایر', 'نهاوند', 'تویسرکان', 'اسدآباد', 'بهار', 'کبودرآهنگ'],
  'مرکزی': ['اراک', 'ساوه', 'خمین', 'محلات', 'دلیجان', 'تفرش', 'شازند'],
  'قزوین': ['قزوین', 'الوند', 'تاکستان', 'آبیک', 'بوئین‌زهرا', 'محمدیه'],
  'قم': ['قم'],
  'یزد': ['یزد', 'میبد', 'اردکان', 'بافق', 'مهریز', 'تفت', 'ابرکوه'],
  'اردبیل': ['اردبیل', 'پارس‌آباد', 'مشکین‌شهر', 'خلخال', 'گرمی', 'بیله‌سوار'],
  'بوشهر': ['بوشهر', 'برازجان', 'گناوه', 'دیلم', 'کنگان', 'دیر'],
  'زنجان': ['زنجان', 'ابهر', 'خرمدره', 'قیدار', 'صائین‌قلعه'],
  'سمنان': ['سمنان', 'شاهرود', 'گرمسار', 'دامغان', 'مهدی‌شهر'],
  'کردستان': ['سنندج', 'سقز', 'مریوان', 'بانه', 'قروه', 'بیجار'],
  'چهارمحال و بختیاری': ['شهرکرد', 'بروجن', 'فارسان', 'لردگان', 'سامان'],
  'خراسان جنوبی': ['بیرجند', 'قائن', 'فردوس', 'نهبندان', 'طبس'],
  'خراسان شمالی': ['بجنورد', 'شیروان', 'اسفراین', 'آشخانه', 'گرمه'],
  'ایلام': ['ایلام', 'دهلران', 'آبدانان', 'ایوان', 'مهران'],
  'کهگیلویه و بویراحمد': ['یاسوج', 'دوگنبدان', 'دهدشت', 'سی‌سخت'],
  'البرز': ['کرج', 'فردیس', 'نظرآباد', 'هشتگرد', 'اشتهارد', 'طالقان']
};

const WORLD_COUNTRIES = {
  'ایران': { priority: 1, cities: Object.values(IRAN_PROVINCES).flat() },
  'ترکیه': { priority: 2, cities: ['استانبول', 'آنکارا', 'ازمیر', 'آنتالیا', 'بورسا'] },
  'عراق': { priority: 2, cities: ['بغداد', 'اربیل', 'بصره', 'موصل', 'نجف'] },
  'امارات': { priority: 2, cities: ['دبی', 'ابوظبی', 'شارجه', 'عجمان'] },
  'عربستان': { priority: 3, cities: ['ریاض', 'جده', 'مکه', 'مدینه'] },
  'قطر': { priority: 3, cities: ['دوحه'] },
  'کویت': { priority: 3, cities: ['کویت'] },
  'عمان': { priority: 3, cities: ['مسقط', 'صلاله'] },
  'آلمان': { priority: 4, cities: ['برلین', 'مونیخ', 'هامبورگ', 'فرانکفورت'] },
  'انگلستان': { priority: 4, cities: ['لندن', 'منچستر', 'بیرمنگام'] },
  'آمریکا': { priority: 4, cities: ['نیویورک', 'لس‌آنجلس', 'شیکاگو', 'هیوستون'] },
  'چین': { priority: 4, cities: ['پکن', 'شانگهای', 'شنژن'] },
  'ژاپن': { priority: 4, cities: ['توکیو', 'اوساکا'] },
  'روسیه': { priority: 4, cities: ['مسکو', 'سن‌پترزبورگ'] },
  'هند': { priority: 4, cities: ['دهلی', 'بمبئی', 'بنگلور'] }
};

function loadLocations() {
  if (!fs.existsSync(LOCATIONS_FILE)) return { iran: IRAN_PROVINCES, world: WORLD_COUNTRIES };
  return JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf8'));
}

function saveLocations(locations) {
  fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(locations, null, 2));
}

function getIranCities() {
  return Object.values(IRAN_PROVINCES).flat();
}

function getIranStats() {
  const provinces = Object.keys(IRAN_PROVINCES);
  const cities = getIranCities();
  return {
    provinces: provinces.length,
    cities: cities.length
  };
}

function getWorldStats() {
  const countries = Object.keys(WORLD_COUNTRIES);
  let cities = 0;
  countries.forEach(c => cities += WORLD_COUNTRIES[c].cities.length);
  return {
    countries: countries.length,
    cities: cities
  };
}

function searchLocation(query) {
  query = query.toLowerCase();
  const results = [];
  
  Object.entries(IRAN_PROVINCES).forEach(([province, cities]) => {
    cities.forEach(city => {
      if (city.includes(query) || province.includes(query)) {
        results.push({ country: 'ایران', province: province, city: city });
      }
    });
  });
  
  Object.entries(WORLD_COUNTRIES).forEach(([country, data]) => {
    data.cities.forEach(city => {
      if (city.toLowerCase().includes(query) || country.toLowerCase().includes(query)) {
        results.push({ country: country, province: null, city: city });
      }
    });
  });
  
  return results;
}

console.log('==========================================');
console.log('GANDOM LOCATIONS SYSTEM');
console.log('==========================================');
console.log('');

const iranStats = getIranStats();
console.log('--- IRAN (Priority 1) ---');
console.log('Provinces: ' + iranStats.provinces);
console.log('Cities:    ' + iranStats.cities);
console.log('');

const worldStats = getWorldStats();
console.log('--- WORLD ---');
console.log('Countries: ' + worldStats.countries);
console.log('Cities:    ' + worldStats.cities);
console.log('');

console.log('--- Search Test: "تهران" ---');
const results = searchLocation('تهران');
results.slice(0, 5).forEach(r => {
  console.log('  ' + r.country + ' | ' + (r.province || '-') + ' | ' + r.city);
});

module.exports = { 
  IRAN_PROVINCES, 
  WORLD_COUNTRIES, 
  getIranCities, 
  getIranStats, 
  getWorldStats, 
  searchLocation 
};
