import { initBookmarks } from './modules/bookmarks/bookmarks.js';
import { initGlass } from './modules/glass/glass.js';
import { initWeather } from './modules/weather/weather.js';
import { initClock } from './modules/clock/clock.js';
import { initPrayer } from './modules/prayer/prayer.js';
import { initTimer } from './modules/timer/timer.js';
import { initSearch } from './modules/search/search.js';

document.addEventListener('DOMContentLoaded', () => {
  initGlass();
  initBookmarks();
  initWeather();
  initClock();
  initPrayer();
  initTimer();
  initSearch();

  // بستن همه‌ی پنل‌ها با کلیک بیرون
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
