/* ============ ماژول آب‌وهوا - آبنر v5 ============ */

const CITIES_KEY = 'abner_weather_cities';
const MAIN_LOC_KEY = 'abner_weather_main';
const CACHE_KEY = 'abner_weather_main_cache';
const CACHE_TTL = 10 * 60 * 1000;

const FA_DAYS = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];

let cities = [];
let mainLoc = null;
let forecastLoc = null;
let modalMode = 'main';
let cachedData = {};

/* ---------- نگاشت کد آب‌وهوا ---------- */
function getWeatherInfo(code, isDay) {
  const map = {
    0:{t:'آسمان صاف',i:'sun'}, 1:{t:'تقریباً صاف',i:'sun-cloud'},
    2:{t:'نیمه ابری',i:'sun-cloud'}, 3:{t:'تمام ابری',i:'cloud'},
    45:{t:'مه‌آلود',i:'fog'}, 48:{t:'مه یخ‌زده',i:'fog'},
    51:{t:'نم‌نم باران',i:'drizzle'}, 53:{t:'باران سبک',i:'drizzle'},
    55:{t:'باران متوسط',i:'rain'}, 61:{t:'باران',i:'rain'},
    63:{t:'باران شدید',i:'rain'}, 65:{t:'باران خیلی شدید',i:'rain'},
    71:{t:'برف سبک',i:'snow'}, 73:{t:'برف',i:'snow'},
    75:{t:'برف شدید',i:'snow'}, 77:{t:'دانه‌های برف',i:'snow'},
    80:{t:'رگبار باران',i:'sun-rain'}, 81:{t:'رگبار شدید',i:'sun-rain'},
    82:{t:'رگبار سیل‌آسا',i:'sun-rain'},
    85:{t:'رگبار برف',i:'sun-snow'}, 86:{t:'رگبار برف شدید',i:'sun-snow'},
    95:{t:'رعد و برق',i:'sun-thunder'}, 96:{t:'رعد و برق با تگرگ',i:'sun-thunder'},
    99:{t:'رعد و برق شدید',i:'sun-thunder'},
  };
  const info = map[code] || {t:'نامشخص',i:'cloud'};
  let icon = info.i;
  if (!isDay) {
    if (icon === 'sun') icon = 'moon';
    else if (icon === 'sun-cloud') icon = 'moon-cloud';
    else if (icon === 'sun-rain') icon = 'moon-rain';
    else if (icon === 'sun-snow') icon = 'moon-snow';
    else if (icon === 'sun-thunder') icon = 'moon-thunder';
  }
  return { text: info.t, icon };
}

/* ---------- فاز واقعی ماه ---------- */
function getMoonPhase(date) {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const now = date.getTime() / 86400000;
  return (((now - knownNewMoon) % synodic) + synodic) % synodic / synodic;
}

function getMoonSVG(phase, size) {
  size = size || 64;
  const color = '#FCD34D';
  const dark = 'rgba(252,211,77,0.18)';
  const open = `<svg viewBox="0 0 ${size} ${size}" fill="none">`;
  const close = `</svg>`;
  const c = size / 2;
  const r = size * 0.22;

  // ماه نو
  if (phase < 0.03 || phase > 0.97) {
    return open + `<circle cx="${c}" cy="${c}" r="${r}" fill="${dark}" stroke="${color}" stroke-width="1.2"/>` + close;
  }
  // هلال افزاینده
  if (phase < 0.22) {
    return open + `<path d="M${c} ${c-r} a${r} ${r} 0 1 0 0 ${r*2} a${r*0.78} ${r} 0 0 1 0 ${-r*2}z" fill="${color}"/>` + close;
  }
  // نیمه اول
  if (phase < 0.28) {
    return open + `<path d="M${c} ${c-r} a${r} ${r} 0 1 0 0 ${r*2}z" fill="${color}"/>` + close;
  }
  // کوژ افزاینده
  if (phase < 0.47) {
    return open + `<circle cx="${c}" cy="${c}" r="${r}" fill="${color}"/><ellipse cx="${c - r*0.42}" cy="${c}" rx="${r*0.75}" ry="${r}" fill="${dark}"/>` + close;
  }
  // ماه کامل
  if (phase < 0.53) {
    return open + `<circle cx="${c}" cy="${c}" r="${r}" fill="${color}"/><circle cx="${c-4}" cy="${c-4}" r="2" fill="${dark}"/><circle cx="${c+4}" cy="${c-6}" r="1.5" fill="${dark}"/><circle cx="${c+3}" cy="${c+5}" r="2" fill="${dark}"/><circle cx="${c-5}" cy="${c+3}" r="1.3" fill="${dark}"/>` + close;
  }
  // کوژ کاهنده
  if (phase < 0.72) {
    return open + `<circle cx="${c}" cy="${c}" r="${r}" fill="${color}"/><ellipse cx="${c + r*0.42}" cy="${c}" rx="${r*0.75}" ry="${r}" fill="${dark}"/>` + close;
  }
  // نیمه دوم
  if (phase < 0.78) {
    return open + `<path d="M${c} ${c-r} a${r} ${r} 0 1 1 0 ${r*2}z" fill="${color}"/>` + close;
  }
  // هلال کاهنده
  return open + `<path d="M${c} ${c-r} a${r} ${r} 0 1 1 0 ${r*2} a${r*0.78} ${r} 0 0 0 0 ${-r*2}z" fill="${color}"/>` + close;
}

/* ---------- آیکون‌های آب‌وهوا ---------- */
function getWeatherSVG(type) {
  const sun = `<g class="wx-rays" stroke="#FFB300" stroke-width="2.5" stroke-linecap="round"><line x1="24" y1="4" x2="24" y2="9"/><line x1="6" y1="22" x2="11" y2="22"/><line x1="12" y1="10" x2="15" y2="13"/></g><circle cx="24" cy="22" r="9" fill="#FFCC33"/>`;
  const cloud = `<path class="wx-cloud-float" d="M22 44a10 10 0 0 1 1-20 13 13 0 0 1 23 4 9 9 0 0 1-2 16z" fill="#E8ECF1"/>`;
  const rainLines = `<g class="wx-rain" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round"><line x1="24" y1="48" x2="22" y2="56"/><line x1="34" y1="48" x2="32" y2="56"/><line x1="44" y1="48" x2="42" y2="56"/></g>`;
  const snowDots = `<g class="wx-snow" fill="#93C5FD"><circle cx="24" cy="50" r="2"/><circle cx="34" cy="50" r="2"/><circle cx="44" cy="50" r="2"/></g>`;
  const bolt = `<path class="wx-bolt" d="M34 40l-6 12h6l-3 10 10-14h-7l4-8z" fill="#FFCC33"/>`;

  const realMoon = getMoonSVG(getMoonPhase(new Date()), 64);
  const realMoonSmall = `<g transform="translate(8,-2) scale(0.7)">${getMoonSVG(getMoonPhase(new Date()), 64)}</g>`;

  const svgs = {
    sun: `<svg viewBox="0 0 64 64" fill="none"><g class="wx-rays" stroke="#FFB300" stroke-width="3" stroke-linecap="round"><line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/><line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/><line x1="13" y1="13" x2="19" y2="19"/><line x1="45" y1="45" x2="51" y2="51"/><line x1="13" y1="51" x2="19" y2="45"/><line x1="45" y1="19" x2="51" y2="13"/></g><circle cx="32" cy="32" r="13" fill="#FFCC33"/></svg>`,
    moon: `<svg viewBox="0 0 64 64" fill="none">${realMoon}</svg>`,
    'sun-cloud': `<svg viewBox="0 0 64 64" fill="none">${sun}${cloud}</svg>`,
    'moon-cloud': `<svg viewBox="0 0 64 64" fill="none">${realMoonSmall}${cloud}</svg>`,
    'sun-rain': `<svg viewBox="0 0 64 64" fill="none">${sun}${cloud}${rainLines}</svg>`,
    'moon-rain': `<svg viewBox="0 0 64 64" fill="none">${realMoonSmall}${cloud}${rainLines}</svg>`,
    'sun-snow': `<svg viewBox="0 0 64 64" fill="none">${sun}${cloud}${snowDots}</svg>`,
    'moon-snow': `<svg viewBox="0 0 64 64" fill="none">${realMoonSmall}${cloud}${snowDots}</svg>`,
    'sun-thunder': `<svg viewBox="0 0 64 64" fill="none">${sun}${cloud}${bolt}</svg>`,
    'moon-thunder': `<svg viewBox="0 0 64 64" fill="none">${realMoonSmall}${cloud}${bolt}</svg>`,
    cloud: `<svg viewBox="0 0 64 64" fill="none">${cloud}</svg>`,
    fog: `<svg viewBox="0 0 64 64" fill="none">${cloud}<g class="wx-fog-lines" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"><line x1="16" y1="52" x2="48" y2="52"/></g></svg>`,
    drizzle: `<svg viewBox="0 0 64 64" fill="none">${cloud}${rainLines}</svg>`,
    rain: `<svg viewBox="0 0 64 64" fill="none">${cloud}${rainLines}</svg>`,
    snow: `<svg viewBox="0 0 64 64" fill="none">${cloud}${snowDots}</svg>`,
    thunder: `<svg viewBox="0 0 64 64" fill="none">${cloud}${bolt}</svg>`,
  };
  return svgs[type] || svgs.cloud;
}

/* ---------- API ---------- */
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=6`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('خطا در دریافت');
  return res.json();
}

async function searchCity(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'fa,en' } });
  const data = JSON.parse(await res.text());
  if (!data.length) throw new Error('شهر پیدا نشد');
  return { lat: +data[0].lat, lon: +data[0].lon, name: data[0].display_name.split(',')[0] };
}

async function fetchByIP() {
  const res = await fetch('https://ipwho.is/');
  const d = JSON.parse(await res.text());
  if (!d.success || !d.latitude) throw new Error('IP نامشخص');
  return { lat: d.latitude, lon: d.longitude, name: d.city || d.country || 'موقعیت شما' };
}

async function fetchByGPS() {
  let permState = 'prompt';
  try { permState = (await navigator.permissions.query({ name: 'geolocation' })).state; } catch (_) {}
  if (permState === 'denied') { const e = new Error('دسترسی رد شد'); e.code = 'DENIED'; throw e; }
  if (!navigator.geolocation) { const e = new Error('GPS پشتیبانی نمی‌شود'); e.code = 'UNSUPPORTED'; throw e; }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let name = 'موقعیت من';
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=fa`);
          const j = JSON.parse(await r.text());
          name = j.address?.city || j.address?.town || j.address?.state || name;
        } catch (_) {}
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name });
      },
      (err) => {
        const e = new Error(err.code === 1 ? 'دسترسی رد شد' : err.code === 2 ? 'موقعیت در دسترس نیست' : 'زمان تمام شد');
        e.code = err.code === 1 ? 'DENIED' : err.code === 2 ? 'UNAVAILABLE' : 'TIMEOUT';
        reject(e);
      },
      { timeout: 30000, maximumAge: 60000, enableHighAccuracy: false }
    );
  });
}

/* ---------- ذخیره ---------- */
function persist() {
  try {
    localStorage.setItem(CITIES_KEY, JSON.stringify(cities));
    if (mainLoc) localStorage.setItem(MAIN_LOC_KEY, JSON.stringify(mainLoc));
  } catch (_) {}
}
function restore() {
  try {
    cities = JSON.parse(localStorage.getItem(CITIES_KEY) || '[]');
    mainLoc = JSON.parse(localStorage.getItem(MAIN_LOC_KEY) || 'null');
  } catch (_) { cities = []; mainLoc = null; }
}
function cityId(lat, lon) { return `${lat.toFixed(2)}_${lon.toFixed(2)}`; }
function addCity(loc) {
  const id = cityId(loc.lat, loc.lon);
  if (!cities.find(c => c.id === id)) cities.push({ id, name: loc.name, lat: loc.lat, lon: loc.lon });
  return id;
}

/* ---------- رندر کارت ---------- */
function renderCard(data, locName) {
  const c = data.current;
  const info = getWeatherInfo(c.weather_code, c.is_day === 1);
  const temp = Math.round(c.temperature_2m);
  const max = Math.round(data.daily.temperature_2m_max[0]);
  const min = Math.round(data.daily.temperature_2m_min[0]);

  const root = document.getElementById('weatherModule');
  if (!root) return;
  
  root.innerHTML = `
    <div class="weather-top">
      <div class="weather-temp-block"><div class="weather-temp">${temp}<sup>°</sup></div></div>
      <div class="weather-icon-block animate">${getWeatherSVG(info.icon)}</div>
    </div>
    <div class="weather-middle">
      <div class="weather-status"><span>${info.text}</span></div>
      <div class="weather-range">حداکثر ${max}° · حداقل ${min}°</div>
    </div>
    <div class="weather-actions">
      <button class="weather-btn" id="weatherLocBtn"><span class="pin-dot"></span><span class="loc-name">${locName}</span></button>
      <button class="weather-btn" id="weatherForecastBtn">پیش‌بینی
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
  `;

  document.getElementById('weatherLocBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    modalMode = 'main';
    openLocationModal();
  });
  document.getElementById('weatherForecastBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleForecast();
  });
}

/* ---------- رندر شهرها ---------- */
function renderCitiesBar() {
  const bar = document.getElementById('forecastCitiesBar');
  if (!bar) return;

  const list = cities.length ? cities : (mainLoc ? [mainLoc] : []);

  bar.innerHTML = list.map(c => `
    <button class="forecast-city-pill ${forecastLoc && forecastLoc.id === c.id ? 'active' : ''}" data-city-id="${c.id}">
      <span>${c.name}</span>
      ${list.length > 1 ? `<span class="city-del" data-del="${c.id}">×</span>` : ''}
    </button>
  `).join('') + `<button class="forecast-city-pill add-city" id="forecastAddCity">+ افزودن</button>`;

  bar.querySelectorAll('[data-city-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.dataset.del) return;
      forecastLoc = list.find(c => c.id === btn.dataset.cityId) || forecastLoc;
      renderCitiesBar();
      loadForecast();
    });
  });

  bar.querySelectorAll('[data-del]').forEach(x => {
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = x.dataset.del;
      cities = cities.filter(c => c.id !== id);
      if (forecastLoc && forecastLoc.id === id) forecastLoc = cities[0] || mainLoc;
      persist();
      renderCitiesBar();
      if (forecastLoc) loadForecast();
    });
  });

  document.getElementById('forecastAddCity')?.addEventListener('click', (e) => {
    e.stopPropagation();
    modalMode = 'add';
    openLocationModal();
  });
}

/* ---------- رندر پیش‌بینی ---------- */
function renderForecast(data) {
  const row = document.getElementById('forecastDaysRow');
  if (!row) return;

  const today = new Date();
  row.innerHTML = data.daily.time.slice(0, 6).map((_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const info = getWeatherInfo(data.daily.weather_code[i], true);
    const hi = Math.round(data.daily.temperature_2m_max[i]);
    const lo = Math.round(data.daily.temperature_2m_min[i]);
    return `
      <div class="forecast-day-card">
        <div class="forecast-day-name">${FA_DAYS[d.getDay()]}</div>
        <div class="forecast-day-icon animate">${getWeatherSVG(info.icon)}</div>
        <div class="forecast-temp-high">${hi}°</div>
        <div class="forecast-temp-low">${lo}°</div>
      </div>`;
  }).join('');
}

/* ---------- بارگذاری ---------- */
async function loadMain() {
  const root = document.getElementById('weatherModule');
  let showedCache = false;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const c = JSON.parse(cached);
      if (c.locId === mainLoc.id && Date.now() - c.t < 24 * 60 * 60 * 1000) {
        renderCard(c.data, mainLoc.name);
        showedCache = true;
      }
    }
  } catch (_) {}

  if (!showedCache && root) root.innerHTML = `<div class="weather-loading">در حال دریافت...</div>`;

  try {
    const data = await fetchWeather(mainLoc.lat, mainLoc.lon);
    cachedData[mainLoc.id] = { t: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), locId: mainLoc.id, data }));
    renderCard(data, mainLoc.name);
  } catch (e) {
    if (!showedCache && root) root.innerHTML = `<div class="weather-loading">⚠️ ${e.message}</div>`;
  }
}

async function loadForecast() {
  if (!forecastLoc) return;
  const row = document.getElementById('forecastDaysRow');
  if (row) row.innerHTML = `<div class="weather-loading" style="grid-column:1/-1;width:100%;">در حال دریافت...</div>`;
  try {
    const c = cachedData[forecastLoc.id];
    let data;
    if (c && Date.now() - c.t < CACHE_TTL) data = c.data;
    else { data = await fetchWeather(forecastLoc.lat, forecastLoc.lon); cachedData[forecastLoc.id] = { t: Date.now(), data }; }
    renderForecast(data);
  } catch (e) {
    if (row) row.innerHTML = `<div class="weather-loading" style="grid-column:1/-1;width:100%;">⚠️ ${e.message}</div>`;
  }
}

/* ---------- تاگل ---------- */
function toggleForecast() {
  const panel = document.getElementById('weatherForecastPanel');
  if (!panel) return;
  const willOpen = panel.classList.contains('hidden');
  ['weatherForecastPanel', 'prayerPanel', 'timerPanel'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  if (willOpen) {
    panel.classList.remove('hidden');
    renderCitiesBar();
    loadForecast();
  }
}

/* ---------- پاپ‌آپ ---------- */
function openLocationModal() { document.getElementById('weatherModalOverlay')?.classList.remove('hidden'); }
function closeLocationModal() { document.getElementById('weatherModalOverlay')?.classList.add('hidden'); }

async function applyLocation(loc) {
  const id = addCity(loc);
  const cityObj = { id, name: loc.name, lat: loc.lat, lon: loc.lon };

  if (modalMode === 'main') {
    mainLoc = cityObj;
    forecastLoc = cityObj;
    persist();
    closeLocationModal();
    await loadMain();
  } else {
    forecastLoc = cityObj;
    persist();
    closeLocationModal();
    document.getElementById('weatherForecastPanel')?.classList.remove('hidden');
    renderCitiesBar();
    loadForecast();
  }
}

function showPermissionHelp(code, msg) {
  const card = document.querySelector('#weatherModalOverlay .weather-modal');
  if (!card) return;
  card.querySelector('.wx-perm-help')?.remove();
  card.insertAdjacentHTML('beforeend', `
    <div class="wx-perm-help">
      <div class="wx-perm-title">⚠️ ${msg}</div>
      <div class="wx-perm-desc">${code === 'DENIED' ? 'روی قفل کنار آدرس مرورگر کلیک کن و اجازه‌ی موقعیت بده.' : 'دوباره تلاش کن یا از گزینه‌ی IP استفاده کن.'}</div>
      <button class="wx-perm-btn" id="wxPermRetry">تلاش دوباره</button>
    </div>`);
  document.getElementById('wxPermRetry')?.addEventListener('click', async () => {
    card.querySelector('.wx-perm-help')?.remove();
    try { await applyLocation(await fetchByGPS()); }
    catch (e) { showPermissionHelp(e.code || 'UNKNOWN', e.message); }
  });
}

function bindModalEvents() {
  const overlay = document.getElementById('weatherModalOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLocationModal(); });

  document.getElementById('wOptGPS')?.addEventListener('click', async () => {
    try { await applyLocation(await fetchByGPS()); }
    catch (e) { showPermissionHelp(e.code || 'UNKNOWN', e.message); }
  });
  document.getElementById('wOptIP')?.addEventListener('click', async () => {
    try { await applyLocation(await fetchByIP()); }
    catch (e) { showPermissionHelp(e.code || 'UNKNOWN', e.message); }
  });
  document.getElementById('wConfirmBtn')?.addEventListener('click', async () => {
    const q = document.getElementById('wCityInput')?.value.trim();
    if (!q) return;
    try { await applyLocation(await searchCity(q)); }
    catch (e) { alert('خطا: ' + e.message); }
  });
  document.getElementById('wCancelBtn')?.addEventListener('click', closeLocationModal);
  document.getElementById('wCityInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('wConfirmBtn')?.click();
  });
}

/* ---------- INIT ---------- */
export async function initWeather() {
  restore();
  bindModalEvents();

  if (!mainLoc) {
    mainLoc = { id: cityId(35.6892, 51.389), name: 'تهران', lat: 35.6892, lon: 51.389 };
    addCity(mainLoc);
    persist();
  }
  forecastLoc = mainLoc;
  await loadMain();
}

export function getWeatherMainLocation() { return mainLoc; }
export function getWeatherCities() { return cities; }