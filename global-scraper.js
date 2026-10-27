const axios = require('axios');
const cheerio = require('cheerio');

console.log("🌍 [GLOBAL-SCRAPER] 360-Degree Fly-Brain with Proxy Activated.");

// تنظیمات پروکسی (اگر از VPN روی گوشی استفاده می‌کنی، این پورت را با پورت اپ خودت عوض کن)
const PROXY_CONFIG = {
    host: '127.0.0.1',
    port: 1080 // پورت پیش‌فرض SOCKS5 برای اپ‌های VPN. اگر HTTP است، proxy را در axios فعال کن.
};

async function huntGlobalProjects() {
    try {
        // مثال: جستجوی پروژه‌های پایتون در یک سایت خارجی
        const url = 'https://www.freelancer.com/jobs/python'; 
        
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            // proxy: PROXY_CONFIG // در صورت نیاز به پروکسی، این خط را آنکامنت کن
            timeout: 10000
        });

        const $ = cheerio.load(data);
        let jobs = [];

        $('.JobSearchCard-item').each((i, el) => {
            const title = $(el).find('.JobSearchCard-primary-heading-link').text().trim();
            const budget = $(el).find('.JobSearchCard-primary-price').text().trim();
            
            if (title && budget) {
                jobs.push({ title, budget });
            }
        });

        console.log(`✅ Found ${jobs.length} global projects.`);
        
        if (jobs.length > 0) {
            // تبدیل درآمد دلاری به GDM و واریز به حسابدار
            const estimatedProfit = 50000; // فرض کن ۵۰,۰۰۰ GDM
            console.log(`💰 [FLY-BRAIN] High-value global project found! Notifying Accountant...`);
            await axios.post('http://127.0.0.1:4000/api/accountant/profit', {
                amount: estimatedProfit,
                source: 'Global-Freelance-Bot'
            });
        }

    } catch (error) {
        console.log("⚠️ Network blocked or Proxy required:", error.message);
    }
}

// هر ۵ دقیقه یکبار سایت‌های خارجی رو اسکن کن
setInterval(huntGlobalProjects, 5 * 60 * 1000);
huntGlobalProjects();
