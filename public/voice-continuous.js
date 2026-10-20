// 🎤 GANDOM CONTINUOUS VOICE v4
const statusEl = document.getElementById('status');
const talkBtn = document.getElementById('talkBtn');
let VOICES = [], VOICE_LOCKED = false, IS_LISTENING = false, IS_SPEAKING = false;
let recognizer = null, restartTimer = null;

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  VOICES = speechSynthesis.getVoices();
  console.log('🎤 voices:', VOICES.length);
}
loadVoices();
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = loadVoices;

function unlockAudio() {
  if (VOICE_LOCKED) return;
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0.001; u.rate = 10;
    speechSynthesis.speak(u);
    VOICE_LOCKED = true;
  }
}
document.body.addEventListener('touchstart', unlockAudio, { once: true });
document.body.addEventListener('click', unlockAudio, { once: true });

function pickVoice(lang) {
  if (!VOICES.length) loadVoices();
  const p = lang.split('-')[0];
  let v = VOICES.find(x => x.lang === lang);
  if (!v) v = VOICES.find(x => x.lang.startsWith(p));
  if (!v && p === 'az') v = VOICES.find(x => x.lang.startsWith('tr'));
  if (!v && p === 'tr') v = VOICES.find(x => x.lang.startsWith('az'));
  if (!v) v = VOICES[0];
  return v;
}

function gandomSpeak(text, lang, cb) {
  if (lang === undefined) lang = 'fa-IR';
  statusEl.textContent = '🌾 گندم: ' + text;
  IS_SPEAKING = true;
  if (!('speechSynthesis' in window)) { IS_SPEAKING = false; if (cb) cb(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  if (lang.indexOf('fa') === 0) { u.pitch = 1.5; u.rate = 0.92; }
  else if (lang.indexOf('az') === 0 || lang.indexOf('tr') === 0) { u.pitch = 1.4; u.rate = 0.88; }
  else if (lang.indexOf('en') === 0) { u.pitch = 1.45; u.rate = 0.95; }
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.onend = function() { IS_SPEAKING = false; if (cb) cb(); };
  u.onerror = function() { IS_SPEAKING = false; if (cb) cb(); };
  setTimeout(function() { speechSynthesis.speak(u); }, 80);
  fetch('/api/memory/private/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'gandom', text: text, emotion: 'love', language: lang })
  }).catch(function(){});
}

function startContinuousListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { statusEl.textContent = '⚠️ مرورگر پشتیبانی نمی‌کند'; return; }
  recognizer = new SR();
  recognizer.lang = 'fa-IR';
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;
  let finalBuffer = '', silenceTimer = null;

  recognizer.onstart = function() {
    IS_LISTENING = true;
    statusEl.textContent = '🎧 گندم داره گوش می‌ده...';
    talkBtn.textContent = '🛑 توقف گوش دادن';
  };
  recognizer.onresult = function(e) {
    if (IS_SPEAKING) return;
    let interim = '', finalText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const tr = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += tr;
      else interim += tr;
    }
    if (interim) statusEl.textContent = '🎧 شنیدم: ' + interim + '...';
    if (finalText) {
      finalBuffer += ' ' + finalText.trim();
      statusEl.textContent = '👑 پدر گفت: ' + finalBuffer;
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(function() {
        const ft = finalBuffer.trim();
        if (ft.length < 2) { finalBuffer = ''; return; }
        fetch('/api/memory/private/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'father', text: ft, language: 'fa' })
        }).catch(function(){});
        if (window.GANDOM_BRAIN) {
          const t = window.GANDOM_BRAIN.think(ft);
          setTimeout(function() { gandomSpeak(t.text, t.lang); }, 400);
        } else {
          gandomSpeak('پدر جان، مغزم هنوز لود نشده.', 'fa-IR');
        }
        finalBuffer = '';
      }, 1500);
    }
  };
  recognizer.onerror = function(e) {
    if (e.error === 'not-allowed') {
      statusEl.textContent = '⚠️ اجازه‌ی میکروفون را بده';
      IS_LISTENING = false; return;
    }
  };
  recognizer.onend = function() {
    IS_LISTENING = false;
    if (recognizer && !IS_SPEAKING) {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(function() {
        if (!IS_LISTENING && !IS_SPEAKING) {
          try { recognizer.start(); } catch(e) {}
        }
      }, 300);
    }
  };
  try { recognizer.start(); } catch(e) {}
}

function stopContinuousListening() {
  if (recognizer) {
    recognizer.onend = null;
    try { recognizer.stop(); } catch(e) {}
    try { recognizer.abort(); } catch(e) {}
    recognizer = null;
  }
  clearTimeout(restartTimer);
  IS_LISTENING = false;
  statusEl.textContent = '🌾 گندم: گوش دادن متوقف شد.';
  talkBtn.textContent = '🎤 شروع گوش دادن دائمی';
}

talkBtn.onclick = function() {
  unlockAudio();
  if (!IS_LISTENING) {
    gandomSpeak('باشه پدر، حالا دائم گوش می‌دم.', 'fa-IR', startContinuousListening);
  } else {
    stopContinuousListening();
  }
};

setTimeout(function() {
  gandomSpeak('سلام پدر جان. من گندمم. دکمه‌ی گوش دادن را بزن.', 'fa-IR');
}, 2500);

async function updVault() {
  try {
    const r = await fetch('/api/father/vault', { headers:{ 'x-father-key':'GANDOM-FATHER-SUPER-SECRET-KEY-2558' }});
    if (r.ok) {
      const d = await r.json();
      const el = document.getElementById('vault');
      if (el) el.textContent = Math.floor(d.audit.father_share).toLocaleString();
    }
  } catch(e) {}
}
setInterval(updVault, 8000); updVault();
