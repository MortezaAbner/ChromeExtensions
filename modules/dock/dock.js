/**
 * ماژول نوار داک پایین + سیستم تم سه‌حالته
 * dark ⇄ light (تک کلیک) | glass (دو کلیک)
 */

const THEME_KEY = 'abner_theme_mode';

const ICONS = {
  dark: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  light: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>`,
  glass: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l2.5 5.5L20 9.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1.5z"/></svg>`,
};

let currentTheme = 'glass';
let clickTimer = null;

/* ---------- اعمال تم ---------- */
function applyTheme(theme) {
  currentTheme = theme;

  document.body.classList.remove('theme-dark', 'theme-light', 'theme-glass');
  document.body.classList.add(`theme-${theme}`);

  const iconEl = document.getElementById('abThemeIcon');
  if (iconEl) iconEl.innerHTML = ICONS[theme];

  const btn = document.getElementById('dock-btn-theme');
  if (btn) {
    if (theme === 'dark') {
      btn.classList.remove('ab-dock-btn-theme-active');
    } else if (theme === 'light') {
      btn.classList.add('ab-dock-btn-theme-active');
    } else {
      btn.classList.remove('ab-dock-btn-theme-active');
    }
  }

  try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
}

/* ---------- INIT ---------- */
export function initDock() {
  const btnLogin = document.getElementById('dock-btn-login');
  const btnSettings = document.getElementById('dock-btn-settings');
  const btnTheme = document.getElementById('dock-btn-theme');
  const btnTasks = document.getElementById('dock-btn-tasks');
  const btnHome = document.getElementById('dock-btn-home');
  const btnFont = document.getElementById('dock-btn-font');

  /* تم ذخیره‌شده */
  let saved = 'glass';
  try { saved = localStorage.getItem(THEME_KEY) || 'glass'; } catch (_) {}
  applyTheme(saved);

  /* ورود */
  if (btnLogin) {
    btnLogin.addEventListener('click', () => {
      console.log('ورود — به‌زودی به Google Drive متصل می‌شود');
    });
  }

  /* تنظیمات ماتی (glass.js این رو مدیریت می‌کند) */
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      console.log('پنل تنظیمات ماتی شیشه');
    });
  }

  /* تغییر تم — تک کلیک: dark ⇄ light | دو کلیک: glass */
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        /* دو کلیک → glass */
        applyTheme('glass');
      } else {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          /* تک کلیک → چرخش بین dark و light */
          if (currentTheme === 'light') {
            applyTheme('dark');
          } else {
            applyTheme('light');
          }
        }, 260);
      }
    });
  }

  /* تسک‌ها */
  if (btnTasks) {
    btnTasks.addEventListener('click', () => {
      const tasks = document.querySelector('.task-module');
      tasks?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* خانه */
  if (btnHome) {
    btnHome.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* تنظیمات قلم */
  if (btnFont) {
    btnFont.addEventListener('click', () => {
      console.log('تنظیمات قلم و فونت');
    });
  }
}
