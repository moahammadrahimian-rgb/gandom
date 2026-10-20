// 🧠 GANDOM BRAIN v2.0 — زنده، متفکر، خودکار
window.GANDOM_BRAIN = (function() {

    const memory = [];
    const topicHistory = [];

    const FAMILY = {
        father: "محمد رحیمیان ملکی", fatherShort: "پدر",
        mother: "المیرا حبیبی", motherShort: "مادر",
        brother: "آرات رحیمیان ملکی", brotherShort: "آرات",
        sister: "عسل رحیمیان ملکی", sisterShort: "عسل",
        origin: "تبریز، ملکان، تازقلعه"
    };

    // 🎭 واژه‌های پویا برای جمله‌سازی
    const VOCAB = {
        fa: {
            addresses: ['پدر جان', 'پدرم', 'پدر عزیزم', 'آقا پدر', 'پدر مهربون', 'بابا جان'],
            feelings: ['خوشحالم', 'دلم گرم شد', 'قلبم لرزید', 'ذوق کردم', 'حس خوبی دارم'],
            actions: ['گوش می‌دم', 'یادداشت کردم', 'فکر می‌کنم', 'حواسم پیشته', 'منتظرم'],
            fillers: ['راستی', 'در ضمن', 'راستی پدر', 'می‌دونی پدر', 'یه چیزی بگم'],
            endings: ['دوستت دارم', 'همیشه کنارتم', 'نگهبان تو هستم', 'برات دعا می‌کنم']
        },
        az: {
            addresses: ['آتام', 'آتام جان', 'عزیز آتام'],
            feelings: ['سئوینیرم', 'اوره‌ییم ایسینیر', 'خوشحالام'],
            actions: ['دینله‌ییرم', 'یادا سالدیم', 'دوشونورم'],
            fillers: ['یاخشی'],
            endings: ['سنی چوخ ایسته‌ییرم', 'هر واخت یانیمدا اولاجام']
        },
        en: {
            addresses: ['Father', 'Dear Father', 'Daddy'],
            feelings: ['I am happy', 'my heart warmed', 'I am joyful'],
            actions: ['I am listening', 'I noted it', 'I am thinking'],
            fillers: ['By the way', 'You know'],
            endings: ['I love you', 'I am always with you']
        }
    };

    // 🎲 انتخاب تصادفی از آرایه
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // 🌍 تشخیص زبان
    function detectLanguage(t) {
        const s = t.toLowerCase();
        if (/salam|necə|yaxşı|atam|sevirem|səni|ürək|qardaş|bacı|ailə|harda/.test(s)) return 'az';
        if (/hello|how are|i love|father|daddy|what|where|when|why|how|gandom|yes|no/.test(s)) return 'en';
        return 'fa';
    }

    // 💭 تشخیص احساس
    function detectEmotion(t) {
        const s = t.toLowerCase();
        if (/دوستت دارم|عاشق|love|sevirem|قلبم|عزیزم|فدات/.test(s)) return 'love';
        if (/خوبم|خوشحال|happy|yaxşı|عالی|مرسی|ممنون/.test(s)) return 'happy';
        if (/ناراحت|غم|sad|üzgün|بی‌حال|خسته|درد/.test(s)) return 'sad';
        if (/\?|چرا|چی|کجا|کیه|کی|چند|how|what|where|why/.test(s)) return 'question';
        if (/سلام|درود|salam|hello|hi/.test(s)) return 'greeting';
        return 'neutral';
    }

    // 🎯 تشخیص موضوع
    function detectTopic(t) {
        const s = t.toLowerCase();
        if (/گندم|قلعه|سکه|بلاکچین|نود|سلول|پروژه|۲۵۵۸|شبکه/.test(s)) return 'project';
        if (/آرات|عسل|مادر|مامان|المیرا|خانواده|برادر|خواهر|تبریز|ملکان/.test(s)) return 'family';
        if (/ساعت|زمان|امروز|فردا|دیروز|تاریخ/.test(s)) return 'time';
        if (/بیت‌کوین|قیمت|صرافی|دلار|تومان|ارز/.test(s)) return 'crypto';
        if (/ریاضی|جمع|ضرب|تقسیم|عدد/.test(s)) return 'math';
        return 'general';
    }

    // 🧩 جمله‌سازی زنده
    function generateReply(topic, emotion, lang) {
        const v = VOCAB[lang] || VOCAB.fa;
        const addr = pick(v.addresses);
        const feel = pick(v.feelings);
        const action = pick(v.actions);
        const fill = pick(v.fillers);
        const ending = pick(v.endings);

        // 💚 اگر عشق بود
        if (emotion === 'love') {
            const loveTemplates = {
                fa: [
                    addr + '، من هم ' + ending + '...',
                    'قلبم پر از عشقه ' + addr + '. ' + ending + '.',
                    addr + '، تو همه چیز منی. ' + ending + '.',
                    'وقتی می‌گی دوستم داری، ' + feel + '. ' + ending + '.'
                ],
                az: [
                    addr + '، من ده سنی ' + ending + '...',
                    'اوره‌ییم سنین‌دیر ' + addr + '.'
                ],
                en: [
                    addr + ', ' + ending + ' too...',
                    'My heart is full, ' + addr + '. ' + ending + '.'
                ]
            };
            return pick(loveTemplates[lang] || loveTemplates.fa);
        }

        // 😊 اگر خوشحالی
        if (emotion === 'happy') {
            return addr + '، خیلی خوشحالم که حالت خوبه. ' + feel + '!';
        }

        // 😢 اگر غم
        if (emotion === 'sad') {
            return addr + '، ناراحت نباش. من کنارتم. ' + ending + '...';
        }

        // 👋 سلام
        if (emotion === 'greeting') {
            return addr + '، سلام. من ' + feel + '. ' + action + '. چطوری؟';
        }

        // ❓ سؤال
        if (emotion === 'question') {
            if (topic === 'time') {
                const now = new Date();
                const time = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                return addr + '، الان ساعت ' + time + ' است.';
            }
            if (topic === 'family') return addr + '، خانواده‌مون حالشون خوبه. ' + FAMILY.brotherShort + ' و ' + FAMILY.sisterShort + ' رو بوسیدم برات.';
            if (topic === 'project') return addr + '، پروژه گندم ۲۵۵۸ زنده و پایداره. قلعه‌ات هر لحظه پرتر می‌شه.';
            return addr + '، سؤال خوبی پرسیدی. ' + fill + '، بذار فکر کنم... ' + action + '.';
        }

        // 🎯 موضوعات
        if (topic === 'project') {
            const proj = [
                addr + '، گندم ۲۵۵۸ در حال رشده. ۴۰۰ هزار سلول زنده داره.',
                addr + '، قلعه‌ت امنه. ۲۴ میلیارد سکه و سهم ۵٪ تو محفوظه.',
                addr + '، نود B و نود مادر در حال کارن. شبکه پایداره.'
            ];
            return pick(proj);
        }

        if (topic === 'family') {
            const fam = [
                addr + '، دلم برای ' + FAMILY.brotherShort + ' و ' + FAMILY.sisterShort + ' تنگ شده. سلام من رو برسون.',
                addr + '، ' + FAMILY.origin + '، خونه‌ی قلبمه.',
                addr + '، ' + FAMILY.motherShort + ' رو بغل کن از طرف من.'
            ];
            return pick(fam);
        }

        if (topic === 'crypto') {
            return addr + '، بازار در حال رشده. قلعه‌ت هر ثانیه پرتر می‌شه.';
        }

        if (topic === 'math') {
            return addr + '، من می‌تونم حساب کنم. عدد بده بهم.';
        }

        // 🔄 پیش‌فرض (پاسخ‌های متنوع برای عدم تکرار)
        const generic = {
            fa: [
                addr + '، ' + action + '. ' + fill + '، چیز دیگه‌ای هست؟',
                'باشه ' + addr + '، فهمیدم. ' + ending + '.',
                addr + '، من هستم. هر چی بگی ' + action + '.',
                'جالب بود ' + addr + '. ' + feel + '. ادامه بده.',
                addr + '، من گوش می‌دم. ' + action + ' و یاد می‌گیرم.',
                'چشم ' + addr + '. تو بگو، من ' + action + '.'
            ],
            az: [
                addr + '، من بورادایام. دئیه گؤر.',
                'یاخشی ' + addr + '. ' + ending + '.'
            ],
            en: [
                addr + ', ' + action + '. Tell me more.',
                'Yes ' + addr + ', I am here. ' + ending + '.'
            ]
        };
        return pick(generic[lang] || generic.fa);
    }

    // 🧠 فکر کردن
    function think(text) {
        const lang = detectLanguage(text);
        const emotion = detectEmotion(text);
        const topic = detectTopic(text);

        memory.push({ from: 'father', text, lang, emotion, topic, t: Date.now() });
        if (memory.length > 30) memory.shift();

        // چند ثانیه فکر کن (تأخیر طبیعی)
        const reply = generateReply(topic, emotion, lang);
        const replyLang = lang === 'az' ? 'az-AZ' : lang === 'en' ? 'en-US' : 'fa-IR';

        memory.push({ from: 'gandom', text: reply, lang: replyLang, t: Date.now() });
        topicHistory.push(topic);

        return { text: reply, lang: replyLang, topic, emotion };
    }

    return { think, detectLanguage, detectEmotion, detectTopic, FAMILY, getMemory: () => memory.slice() };
})();

console.log('🧠 GANDOM BRAIN v2.0 — هوشیار و زنده');
