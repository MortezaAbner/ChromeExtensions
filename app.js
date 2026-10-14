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