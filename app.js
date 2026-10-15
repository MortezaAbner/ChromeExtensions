import { initBookmarks } from './modules/bookmarks/bookmarks.js';
import { initGlass } from './modules/glass/glass.js';
import { initWeather } from './modules/weather/weather.js';
import { initClock } from './modules/clock/clock.js';
import { initPrayer } from './modules/prayer/prayer.js';
import { initTimer } from './modules/timer/timer.js';
import { initSearch } from './modules/search/search.js';
import { initDock } from './modules/dock/dock.js';
import { initCalendar, initConverter } from './modules/calendar/calendar.js';
import { initAuth } from './modules/auth/auth.js';
import { initSync } from './modules/sync/sync.js';
import { initTasks } from './modules/tasks/tasks.js';
import { initNotes } from './modules/notes/notes.js';

/* ============================================================
   🆕 Pull-to-Refresh برای PWA (موبایل و تبلت)
============================================================ */
(function initPullToRefresh() {
  // فقط توی حالت standalone (PWA نصب‌شده) و روی تاچ فعال بشه
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (!isStandalone || !isTouch) return;

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  let indicator = null;
  const THRESHOLD = 80;   // چقدر بکشه که رفرش بشه
  const MAX_PULL = 120;   // حداکثر کشش

  function createIndicator() {
    if (indicator) return;
    indicator = document.createElement('div');
    indicator.id = 'abnerPtrIndicator';
    indicator.innerHTML = `
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
      </svg>
    `;
    indicator.style.cssText = `
      position: fixed;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(59, 130, 246, 0.95);
      color: #fff;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      z-index: 99999999;
      transition: transform 0.15s ease, opacity 0.2s ease;
      opacity: 0;
      pointer-events: none;
      backdrop-filter: blur(10px);
    `;
    document.body.appendChild(indicator);
  }

  document.addEventListener('touchstart', (e) => {
    // فقط اگه صفحه در بالاترین نقطه باشه
    if (window.scrollY > 0) return;
    // اگه لمس روی input یا textarea بود، فعال نشه
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    startY = e.touches[0].clientY;
    isPulling = false;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (window.scrollY > 0) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0 && !isPulling) {
      isPulling = true;
      createIndicator();
    }
    if (!isPulling) return;

    const pull = Math.min(diff * 0.5, MAX_PULL);
    if (indicator) {
      indicator.style.transition = 'none';
      indicator.style.transform = `translateX(-50%) translateY(${pull + 30}px)`;
      indicator.style.opacity = '1';
      // اگه از حد رد شد، رنگ عوض کن
      if (pull >= THRESHOLD / 2) {
        indicator.style.background = 'rgba(34, 197, 94, 0.95)';
        indicator.style.transform = `translateX(-50%) translateY(${pull + 30}px) rotate(180deg)`;
      } else {
        indicator.style.background = 'rgba(59, 130, 246, 0.95)';
        indicator.style.transform = `translateX(-50%) translateY(${pull + 30}px) rotate(0deg)`;
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!isPulling) return;
    const diff = currentY - startY;
    const pull = Math.min(diff * 0.5, MAX_PULL);

    if (indicator) {
      if (pull >= THRESHOLD / 2) {
        // رفرش
        indicator.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        indicator.style.transform = 'translateX(-50%) translateY(90px)';
        indicator.style.opacity = '0';
        setTimeout(() => window.location.reload(), 200);
      } else {
        // برگرد به جای اول
        indicator.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        indicator.style.transform = 'translateX(-50%) translateY(0)';
        indicator.style.opacity = '0';
      }
    }
    isPulling = false;
  });

  document.addEventListener('touchcancel', () => {
    if (indicator) {
      indicator.style.transform = 'translateX(-50%) translateY(0)';
      indicator.style.opacity = '0';
    }
    isPulling = false;
  });
})();

document.addEventListener('DOMContentLoaded', async () => {
  // ---------- ماژول‌های اصلی ----------
  initGlass();
  initBookmarks();
  initWeather();
  initClock();
  initPrayer();
  initTimer();
  initSearch();
  initDock();
  initCalendar();
  initConverter();
  initTasks();           // ✅ ماژول جدید تسک و یادداشت
  initNotes();  // 🆕

  // ---------- احراز هویت و سینک ----------
  await initAuth();
  await initSync();

  // ---------- بستن پنل‌های کشویی با کلیک بیرون ----------
  document.addEventListener('click', (e) => {
    const panels = ['weatherForecastPanel', 'prayerPanel', 'timerPanel'];
    const triggers = {
      weatherForecastPanel: 'weatherForecastBtn',
      prayerPanel: 'btnPrayer',
      timerPanel: 'btnTimer',
    };
    panels.forEach(id => {
      const panel = document.getElementById(id);
      if (!panel || panel.classList.contains('hidden')) return;
      if (panel.contains(e.target)) return;
      const trig = document.getElementById(triggers[id]);
      if (trig && (trig === e.target || trig.contains(e.target))) return;
      panel.classList.add('hidden');
    });
  });
});

/* ============================================================
   🆕 ثبت Service Worker (فقط توی وب‌اپ، نه افزونه کروم)
============================================================ */
if (!(typeof chrome !== 'undefined' && chrome.extension)) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('✅ Service Worker ثبت شد:', reg.scope);
          // هر بار چک کن نسخه جدید هست یا نه
          reg.update();
        })
        .catch(err => console.warn('❌ خطا در ثبت SW:', err));
    });
  }
}