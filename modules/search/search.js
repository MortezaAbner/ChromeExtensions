/* ============ نوار جستجوی هوشمند - آبنر v3 ============ */

const STORAGE_KEY = 'abner_search_engine';

const ENGINES = {
  google: {
    name: 'گوگل',
    url: 'https://www.google.com/search?q=',
    hasLens: true,
    hasVoice: true,
    lensUrl: 'https://lens.google.com/',
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>`
  },
  bing: {
    name: 'بینگ',
    url: 'https://www.bing.com/search?q=',
    hasLens: true,
    hasVoice: true,
    lensUrl: 'https://www.bing.com/images',
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#008373" d="M5 2l10.5 3.8v9.8l4.2-2.4-2.4-1.6V7.3l6 2.2v10.2l-9 5.1-8.5-4.8V2z"/>
    </svg>`
  },
  duckduckgo: {
    name: 'داک‌داک‌گو',
    url: 'https://duckduckgo.com/?q=',
    hasLens: false,
    hasVoice: true,
    logo: `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <circle cx="64" cy="64" r="64" fill="#DE5833"/>
      <path fill="#fff" d="M84.6 40.4c-2.6-1.5-5.8-2.4-9.2-2.4-3.4 0-6.6.9-9.2 2.4-4 2.3-6.4 6-6.4 10.1v.5c-1.8-1.2-4-1.9-6.4-1.9-6.4 0-11.6 5.2-11.6 11.6 0 3 1.2 5.8 3.1 7.9-1.9 2.1-3.1 4.9-3.1 7.9 0 6.4 5.2 11.6 11.6 11.6 2.4 0 4.6-.7 6.4-1.9v.5c0 4.1 2.4 7.8 6.4 10.1 2.6 1.5 5.8 2.4 9.2 2.4 3.4 0 6.6-.9 9.2-2.4 4-2.3 6.4-6 6.4-10.1V50.5c0-4.1-2.4-7.8-6.4-10.1z"/>
      <circle cx="56" cy="58" r="3" fill="#333"/>
      <circle cx="72" cy="58" r="3" fill="#333"/>
      <ellipse cx="64" cy="68" rx="4" ry="2.5" fill="#333"/>
    </svg>`
  },
  brave: {
    name: 'بریو',
    url: 'https://search.brave.com/search?q=',
    hasLens: false,
    hasVoice: false,
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FB542B" d="M12 2l3.5 3 4.5 1 1 4.5-2 4 2 4-4 2.5-3 2-3-2L7 19l-2-4 2-4-1-4.5 4.5-1z"/>
      <path fill="#fff" d="M9 11l3-1 3 1-1 3h-4z"/>
    </svg>`
  },
  yandex: {
    name: 'یاندکس',
    url: 'https://yandex.com/search/?text=',
    hasLens: true,
    hasVoice: true,
    lensUrl: 'https://yandex.com/images/',
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#FC3F1D"/>
      <path d="M13.5 6h-2v6c-1.5.5-2.5 2-2.5 3.5 0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5c0-.5-.1-.9-.3-1.3l1.3-3.2V6z" fill="#fff"/>
    </svg>`
  },
  yahoo: {
    name: 'یاهو',
    url: 'https://search.yahoo.com/search?p=',
    hasLens: false,
    hasVoice: false,
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#5F01D1"/>
      <path d="M6 7l4 6-1 4h2l1-4 4-6h-2l-3 4.5L9 7z" fill="#fff"/>
      <circle cx="17" cy="7.5" r="1.3" fill="#fff"/>
    </svg>`
  },
  perplexity: {
    name: 'پرپلکسیتی',
    url: 'https://www.perplexity.ai/search?q=',
    hasLens: false,
    hasVoice: false,
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#20808D" d="M12 3l8 4v10l-8 4-8-4V7z"/>
      <path fill="#fff" d="M12 8v8M8 10l4 2 4-2"/>
    </svg>`
  },
  /* ============ موتورهای جستجوی ایرانی ============ */
  zarebin: {
    name: 'ذره‌بین',
    url: 'https://zarebin.ir/search?q=',
    hasLens: false,
    hasVoice: true,
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" fill="none" stroke="#00A9E0" stroke-width="2.5"/>
      <line x1="17" y1="17" x2="22" y2="22" stroke="#00A9E0" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="11" cy="11" r="2" fill="#FF6B00"/>
    </svg>`
  },
  gerdoo: {
    name: 'گردو',
    url: 'https://gerdoo.me/search?q=',
    hasLens: false,
    hasVoice: false,
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#8B5A2B"/>
      <path d="M9 10c0-2 2-3 3-3s3 1 3 3-2 4-3 4-3-2-3-4z" fill="#D4A574"/>
      <path d="M10.5 9.5c.5-1 1.5-1.5 2-1.5" stroke="#6B3F1A" stroke-width="0.8" fill="none"/>
    </svg>`
  },
  shadbin: {
    name: 'شادبین',
    url: 'https://shadbin.ir/search?q=',
    hasLens: false,
    hasVoice: false,
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#FFD700"/>
      <path d="M8 14c0-3 2-5 4-5s4 2 4 5" stroke="#FF6B00" stroke-width="1.5" fill="none"/>
      <circle cx="10" cy="10" r="1" fill="#333"/>
      <circle cx="14" cy="10" r="1" fill="#333"/>
    </svg>`
  },
  parsast: {
    name: 'پارس‌است',
    url: 'https://parsast.ir/search?q=',
    hasLens: false,
    hasVoice: false,
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#1E88E5"/>
      <path d="M9 6v12l2-3h3c2 0 3-1 3-3s-1-3-3-3h-5z" fill="#fff"/>
    </svg>`
  },
  yooz: {
    name: 'یوز',
    url: 'https://yooz.ir/search?q=',
    hasLens: false,
    hasVoice: false,
    logo: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#00BCD4"/>
      <text x="12" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff" font-family="sans-serif">y</text>
    </svg>`
  }
};

let currentEngine = 'google';

function setEngine(id) {
  if (!ENGINES[id]) id = 'google';
  currentEngine = id;
  const e = ENGINES[id];

  const logoEl = document.getElementById('abEngineLogo');
  const textEl = document.getElementById('abEngineText');
  if (logoEl) logoEl.innerHTML = e.logo;
  if (textEl) textEl.textContent = `جستجو در ${e.name}`;

  const lensBtn = document.getElementById('abToolLens');
  const voiceBtn = document.getElementById('abToolVoice');
  if (lensBtn) lensBtn.style.display = e.hasLens ? '' : 'none';
  if (voiceBtn) voiceBtn.style.display = e.hasVoice ? '' : 'none';

  try { localStorage.setItem(STORAGE_KEY, id); } catch (_) {}
}

function searchNow(query) {
  if (!query) return;
  const url = ENGINES[currentEngine].url + encodeURIComponent(query);
  window.location.href = url;
}

function renderDropdown() {
  const dd = document.getElementById('abEngineDropdown');
  if (!dd) return;

  dd.innerHTML = Object.entries(ENGINES).map(([id, e]) => `
    <button type="button" class="ab-engine-item ${id === currentEngine ? 'active' : ''}" data-engine="${id}">
      <span class="ab-engine-item-logo">${e.logo}</span>
      <span class="ab-engine-item-name">${e.name}</span>
      ${id === currentEngine ? '<svg class="check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
    </button>
  `).join('');

  dd.querySelectorAll('[data-engine]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setEngine(btn.dataset.engine);
      renderDropdown();
      dd.classList.add('hidden');
    });
  });
}

function toggleDropdown() {
  const dd = document.getElementById('abEngineDropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) renderDropdown();
}

function voiceSearch() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('مرورگر شما از جستجوی صوتی پشتیبانی نمی‌کند'); return; }
  const rec = new SR();
  rec.lang = 'fa-IR';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => searchNow(e.results[0][0].transcript);
  rec.onerror = (e) => { if (e.error === 'not-allowed') alert('دسترسی به میکروفون رد شد'); };
  try { rec.start(); } catch (_) {}
}

export function initSearch() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ENGINES[saved]) currentEngine = saved;
  } catch (_) {}
  setEngine(currentEngine);

  // کلیک روی دکمه موتور → باز/بسته dropdown
  document.getElementById('abEngineBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleDropdown();
  });

  // کلیک روی ذره‌بین آبی → سرچ
  document.getElementById('abSearchSubmit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const q = document.getElementById('searchInput')?.value.trim();
    if (q) searchNow(q);
  });

  document.getElementById('abToolLens')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const eng = ENGINES[currentEngine];
    if (eng.lensUrl) window.location.href = eng.lensUrl;
  });

  document.getElementById('abToolVoice')?.addEventListener('click', (e) => {
    e.stopPropagation();
    voiceSearch();
  });

  // اینتر در input
  document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = e.target.value.trim();
      if (q) searchNow(q);
    }
  });

  // بستن dropdown با کلیک بیرون
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('abEngineDropdown');
    if (!dd || dd.classList.contains('hidden')) return;
    const wrap = document.getElementById('abSearchWrap');
    if (wrap && wrap.contains(e.target)) return;
    dd.classList.add('hidden');
  });
}