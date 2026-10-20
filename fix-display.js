const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(FILE, 'utf8');

// بکاپ
fs.writeFileSync(FILE + '.backup-display', content);

// ─── اضافه کردن نمایش خودکار بخش‌ها ───
if (!content.includes('// SECTIONS-DISPLAY-FIX')) {
  const scriptEnd = content.lastIndexOf('</script>');
  const js = `

// ═══════ SECTIONS-DISPLAY-FIX ═══════
// این کد همه بخش‌ها رو مدیریت می‌کنه
(function() {
  const SECTIONS = ['blockchain', 'exchange', 'settings', 'wallet', 'market', 'p2p', 'ai', 'social', 'ads'];
  
  // تابع اصلی navigate رو override کن
  const originalNavigate = window.navigate;
  
  window.navigate = function(section) {
    console.log('📍 navigate:', section);
    
    // اگه تابع اصلی هست، صدا بزن
    if (typeof originalNavigate === 'function') {
      try { originalNavigate(section); } catch(e) {}
    }
    
    // مخفی کردن همه section های ماژولار
    SECTIONS.forEach(s => {
      const el = document.getElementById(s);
      if (el && el.classList.contains('card') && el.tagName === 'SECTION') {
        el.style.display = 'none';
      }
    });
    
    // اگه بخش بلاک‌چین یا صرافی خواسته شده، نمایش بده
    if (SECTIONS.includes(section)) {
      const target = document.getElementById(section);
      if (target) {
        target.style.display = 'block';
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // بروزرسانی داده‌ها
        setTimeout(() => {
          if (section === 'blockchain' && typeof refreshChain === 'function') {
            refreshChain();
          }
          if (section === 'exchange' && typeof refreshExchange === 'function') {
            refreshExchange();
          }
        }, 200);
      }
    }
  };
  
  // اتصال دکمه‌ها
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      document.querySelectorAll('[data-section]').forEach(btn => {
        // پاک کردن listener قدیمی و اضافه کردن جدید
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
          window.navigate(newBtn.dataset.section);
        });
      });
      console.log('✅ دکمه‌ها متصل شدند');
    }, 500);
  });
})();
`;
  content = content.substring(0, scriptEnd) + js + content.substring(scriptEnd);
  console.log('✅ Fix اضافه شد');
}

fs.writeFileSync(FILE, content);
console.log('✅ ذخیره شد');
console.log('📊 حجم:', (content.length / 1024).toFixed(1), 'KB');
