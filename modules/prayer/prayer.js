/* ============ ماژول اوقات شرعی - آبنر ============ */

const CACHE_KEY = 'abner_prayer_cache';
const CACHE_TTL = 30 * 60 * 1000;

let currentData = null;

/* ---------- خواندن موقعیت از آب‌وهوا ---------- */
function getWeatherLocation() {
  try {
    const loc = JSON.parse(localStorage.getItem('abner_weather_main') || 'null');
    if (loc && loc.lat) return loc;
  } catch (_) {}
  return { lat: 35.6892, lon: 51.389, name: 'تهران', id: '35.69_51.39' };
}

/* ---------- دریافت اوقات شرعی ---------- */
async function fetchPrayerTimes(lat, lon, dateStr) {
  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lon}&method=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('خطا در دریافت اوقات شرعی');
  const json = await res.json();
  if (!json.data || !json.data.timings) throw new Error('پاسخ نامعتبر');
  return json.data;
}

/* ---------- تبدیل زمان به دقیقه ---------- */
function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function nowMin() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/* ---------- رندر ---------- */
function renderTimes(data, locName) {
  const grid = document.getElementById('prayerTimesGrid');
  if (!grid) return;

  const t = data.timings;
  const items = [
    { key: 'Fajr',    label: 'اذان صبح',    icon: '🌙' },
    { key: 'Sunrise', label: 'طلوع آفتاب',  icon: '🌅' },
    { key: 'Dhuhr',   label: 'اذان ظهر',    icon: '☀️' },
    { key: 'Sunset',  label: 'غروب آفتاب',  icon: '🌇' },
    { key: 'Maghrib', label: 'اذان مغرب',   icon: '🌆' },
    { key: 'Isha',    label: 'اذان عشا',    icon: '🌃' },
  ];

  const nm = nowMin();
  let nextKey = null;
  for (const it of items) {
    if (timeToMin(t[it.key].split(' ')[0]) > nm) { nextKey = it.key; break; }
  }

  grid.innerHTML = items.map(it => {
    const time = t[it.key].split(' ')[0];
    const isNext = nextKey === it.key;
    return `
      <div class="prayer-item ${isNext ? 'next' : ''}">
        <span class="prayer-ico">${it.icon}</span>
        <span class="prayer-lbl">${it.label}</span>
        <span class="prayer-time">${time}</span>
      </div>
    `;
  }).join('');
}

/* ---------- رسم خورشید و ماه روی قوس ---------- */
function renderSky(data) {
  const sun = document.getElementById('prayerSun');
  const moon = document.getElementById('prayerMoon');
  const label = document.getElementById('prayerSkyLabel');
  if (!sun || !moon || !label) return;

  const sunrise = timeToMin(data.timings.Sunrise.split(' ')[0]);
  const sunset = timeToMin(data.timings.Sunset.split(' ')[0]);
  const nm = nowMin();

  // قوس: x از 0 تا 400, y از 115 (پایین) تا 20 (بالا)
  function pointOnArc(progress) {
    // progress: 0..1
    const x = progress * 400;
    // پارابولا: y = 115 - 95*(1 - (2*p - 1)^2)
    const y = 115 - 95 * (1 - Math.pow(2 * progress - 1, 2));
    return { x, y };
  }

  if (nm >= sunrise && nm <= sunset) {
    const progress = (nm - sunrise) / (sunset - sunrise);
    const p = pointOnArc(progress);
    sun.setAttribute('cx', p.x);
    sun.setAttribute('cy', p.y);
    sun.setAttribute('opacity', '1');
    moon.setAttribute('opacity', '0');
    label.textContent = '☀️ روز — تا غروب ' + data.timings.Sunset.split(' ')[0];
  } else {
    // شب
    let nightProgress;
    if (nm > sunset) {
      // از غروب تا نیمه‌شب تا طلوع فردا — تخمینی
      nightProgress = (nm - sunset) / (1440 - sunset + sunrise);
    } else {
      nightProgress = (1440 - sunset + nm) / (1440 - sunset + sunrise);
    }
    const p = pointOnArc(nightProgress);
    moon.setAttribute('cx', p.x);
    moon.setAttribute('cy', p.y);
    moon.setAttribute('opacity', '1');
    sun.setAttribute('opacity', '0');
    label.textContent = '🌙 شب — طلوع ' + data.timings.Sunrise.split(' ')[0];
  }
}

/* ---------- بارگذاری ---------- */
async function loadPrayer() {
  const loc = getWeatherLocation();
  const grid = document.getElementById('prayerTimesGrid');
  if (grid) grid.innerHTML = `<div class="weather-loading" style="grid-column:1/-1;width:100%;">در حال دریافت...</div>`;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,'0')}-${String(today.getMonth()+1).padStart(2,'0')}-${today.getFullYear()}`;

  try {
    // کش
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const c = JSON.parse(cached);
      if (c.locId === loc.id && c.date === dateStr && Date.now() - c.t < CACHE_TTL) {
        renderTimes(c.data, loc.name);
        renderSky(c.data);
        return;
      }
    }

    const data = await fetchPrayerTimes(loc.lat, loc.lon, dateStr);
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      t: Date.now(),
      locId: loc.id,
      date: dateStr,
      data,
    }));
    renderTimes(data, loc.name);
    renderSky(data);
  } catch (e) {
    if (grid) grid.innerHTML = `<div class="weather-loading" style="grid-column:1/-1;width:100%;">⚠️ ${e.message}</div>`;
  }
}

/* ---------- تاگل ---------- */
function togglePrayer() {
  const panel = document.getElementById('prayerPanel');
  if (!panel) return;
  const willOpen = panel.classList.contains('hidden');
  closeAllPanels();
  if (willOpen) {
    panel.classList.remove('hidden');
    loadPrayer();
  }
}

function closeAllPanels() {
  ['weatherForecastPanel', 'prayerPanel', 'timerPanel'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
  window.dispatchEvent(new CustomEvent('panel-closed'));
}

/* ---------- INIT ---------- */
export function initPrayer() {
  document.getElementById('btnPrayer')?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePrayer();
  });

  // هر ۳۰ ثانیه موقعیت رو چک کنه (اگه عوض شده، رفرش)
  setInterval(() => {
    const panel = document.getElementById('prayerPanel');
    if (panel && !panel.classList.contains('hidden')) loadPrayer();
  }, 30 * 1000);
}