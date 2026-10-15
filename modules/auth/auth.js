/* ============ احراز هویت گوگل - آبنر (v3) ============ */

const AUTH_KEY = 'abner_auth_user';
const FIRST_INSTALL_KEY = 'abner_first_install_done';
const WEB_CLIENT_ID = '407987287050-3nif6vm5ckv1srs7ok4fh1180vg5pr5g.apps.googleusercontent.com';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar.events'
];

let currentUser = null;
let currentToken = null;
let gisLoaded = false;
let webTokenClient = null;

function isExtension() {
  return typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getAuthToken;
}

/* ---------- افزونه کروم ---------- */
async function signInExtension() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!token) { reject(new Error('توکن دریافت نشد')); return; }
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          chrome.identity.removeCachedAuthToken({ token });
          reject(new Error('توکن نامعتبر'));
          return;
        }
        const info = await res.json();
        resolve({
          token,
          email: info.email || '',
          name: info.name || '',
          picture: info.picture || '',
          id: info.id || '',
        });
      } catch (e) { reject(e); }
    });
  });
}

/* ---------- PWA ---------- */
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (gisLoaded && window.google?.accounts) { resolve(); return; }
    if (window.google?.accounts) { gisLoaded = true; resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { gisLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('خطا در بارگذاری GIS'));
    document.head.appendChild(script);
  });
}

async function signInWebPWA() {
  await loadGIS();
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('GIS آماده نیست'));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: WEB_CLIENT_ID,
      scope: SCOPES.join(' '),
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        const token = response.access_token;
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const info = await res.json();
          resolve({
            token,
            email: info.email || '',
            name: info.name || '',
            picture: info.picture || '',
            id: info.id || '',
          });
        } catch (e) { reject(e); }
      },
    });
    webTokenClient = client;
    client.requestAccessToken();
  });
}

/* ---------- Refresh Token ---------- */
export async function refreshToken() {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (!chrome.runtime.lastError && token) {
          currentToken = token;
          if (currentUser) { currentUser.token = token; saveUser(currentUser); }
          resolve(token);
          return;
        }
        chrome.identity.getAuthToken({ interactive: true }, (newToken) => {
          if (chrome.runtime.lastError || !newToken) { resolve(null); return; }
          currentToken = newToken;
          if (currentUser) { currentUser.token = newToken; saveUser(currentUser); }
          resolve(newToken);
        });
      });
    });
  }

  if (!window.google?.accounts?.oauth2) return null;

  return new Promise((resolve) => {
    try {
      const tempClient = window.google.accounts.oauth2.initTokenClient({
        client_id: WEB_CLIENT_ID,
        scope: SCOPES.join(' '),
        callback: (response) => {
          if (response.error || !response.access_token) {
            resolve(null);
            return;
          }
          const newToken = response.access_token;
          currentToken = newToken;
          if (currentUser) { currentUser.token = newToken; saveUser(currentUser); }
          resolve(newToken);
        },
      });
      tempClient.requestAccessToken({ prompt: '' });
    } catch (_) { resolve(null); }
  });
}

/* ---------- ورود / خروج ---------- */
export async function signIn() {
  try {
    let user;
    if (isExtension()) user = await signInExtension();
    else user = await signInWebPWA();

    currentUser = user;
    currentToken = user.token;
    await saveUser(user);
    window.dispatchEvent(new CustomEvent('user-signed-in', { detail: user }));
    return user;
  } catch (e) {
    console.error('خطا در ورود:', e);
    throw e;
  }
}

export async function signOut() {
  if (isExtension()) {
    try {
      if (currentToken) {
        await new Promise(r => chrome.identity.removeCachedAuthToken({ token: currentToken }, r));
      }
      if (chrome.identity.clearAllCachedAuthTokens) {
        await new Promise(r => chrome.identity.clearAllCachedAuthTokens(r));
      }
    } catch (e) { console.warn('خطا در پاک کردن کش:', e); }
  } else {
    try {
      if (currentToken && window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(currentToken, () => {});
      }
    } catch (_) {}
    webTokenClient = null;
  }

  currentUser = null;
  currentToken = null;

  try { await chrome.storage.local.remove(AUTH_KEY); } catch (_) {}
  try { localStorage.removeItem(AUTH_KEY); } catch (_) {}

  window.dispatchEvent(new CustomEvent('user-signed-out'));
}

async function saveUser(user) {
  try { await chrome.storage.local.set({ [AUTH_KEY]: user }); } catch (_) {}
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(user)); } catch (_) {}
}

export async function loadUser() {
  try {
    const r = await chrome.storage.local.get([AUTH_KEY]);
    currentUser = r[AUTH_KEY] || null;
    if (currentUser) {
      currentToken = currentUser.token || null;
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser)); } catch (_) {}
      return currentUser;
    }
  } catch (_) {}

  try {
    const raw = localStorage.getItem(AUTH_KEY);
    currentUser = raw ? JSON.parse(raw) : null;
    currentToken = currentUser?.token || null;
    return currentUser;
  } catch (_) { return null; }
}

export async function getToken() {
  if (currentToken) return currentToken;
  const u = await loadUser();
  return u?.token || null;
}

export function getUser() {
  if (currentUser) return currentUser;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      currentUser = JSON.parse(raw);
      currentToken = currentUser?.token || null;
    }
  } catch (_) {}
  return currentUser;
}

export function showLoginPopup() {
  document.getElementById('abLoginOverlay')?.classList.remove('hidden');
}
export function hideLoginPopup() {
  document.getElementById('abLoginOverlay')?.classList.add('hidden');
}

async function isFirstInstall() {
  try {
    const r = await chrome.storage.local.get([FIRST_INSTALL_KEY]);
    return !r[FIRST_INSTALL_KEY];
  } catch (_) {
    return !localStorage.getItem(FIRST_INSTALL_KEY);
  }
}
async function markFirstInstallDone() {
  try { await chrome.storage.local.set({ [FIRST_INSTALL_KEY]: true }); } catch (_) {}
  try { localStorage.setItem(FIRST_INSTALL_KEY, 'true'); } catch (_) {}
}

export async function initAuth() {
  const user = await loadUser();
  updateDockButton(user);

  document.getElementById('dock-btn-login')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const u = getUser();
    if (u) showAccountMenu();
    else showLoginPopup();
  });

  const googleBtn = document.getElementById('abGoogleSignInBtn');
  if (googleBtn) {
    const origHTML = googleBtn.innerHTML;
    googleBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      googleBtn.disabled = true;
      googleBtn.innerHTML = '<span>در حال ورود...</span>';
      try {
        const u = await signIn();
        hideLoginPopup();
        await markFirstInstallDone();
        updateDockButton(u);
      } catch (err) {
        alert('خطا در ورود: ' + err.message);
      } finally {
        googleBtn.disabled = false;
        googleBtn.innerHTML = origHTML;
      }
    });
  }

  document.getElementById('abLoginClose')?.addEventListener('click', () => {
    hideLoginPopup();
    markFirstInstallDone();
  });
  document.getElementById('abLoginSkip')?.addEventListener('click', () => {
    hideLoginPopup();
    markFirstInstallDone();
  });
  document.getElementById('abLoginOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'abLoginOverlay') {
      hideLoginPopup();
      markFirstInstallDone();
    }
  });

  if (!user && await isFirstInstall()) {
    setTimeout(() => showLoginPopup(), 800);
  }

  window.addEventListener('user-signed-in', (e) => updateDockButton(e.detail));
  window.addEventListener('user-signed-out', () => updateDockButton(null));
}

function updateDockButton(user) {
  const btn = document.getElementById('dock-btn-login');
  if (!btn) return;

  if (user) {
    btn.classList.add('ab-dock-btn-logged-in');
    btn.title = user.email;
    const customAvatar = localStorage.getItem('abner_custom_avatar');
    const avatarSrc = customAvatar || user.picture || '';
    const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
    if (avatarSrc) {
      btn.innerHTML = `<img src="${avatarSrc}" alt="" class="ab-user-avatar-img" onerror="this.parentNode.innerHTML='<span class=\\'ab-user-initial\\'>${initial}</span>'">`;
    } else {
      btn.innerHTML = `<span class="ab-user-initial">${initial}</span>`;
    }
  } else {
    btn.classList.remove('ab-dock-btn-logged-in');
    btn.title = 'ورود';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
      </svg>
    `;
  }
}

function showAccountMenu() {
  if (!currentUser) return;
  const existing = document.getElementById('abAccountMenu');
  if (existing) { existing.remove(); return; }

  const btn = document.getElementById('dock-btn-login');
  const rect = btn.getBoundingClientRect();
  const customAvatar = localStorage.getItem('abner_custom_avatar');
  const avatarSrc = customAvatar || currentUser.picture || '';
  const initial = (currentUser.name || currentUser.email || '?').charAt(0).toUpperCase();

  const menu = document.createElement('div');
  menu.className = 'ab-account-menu';
  menu.id = 'abAccountMenu';
  menu.innerHTML = `
    <div class="ab-account-header">
      <div class="ab-account-avatar">
        ${avatarSrc ? `<img src="${avatarSrc}" alt="" class="ab-account-avatar-img">` : `<span>${initial}</span>`}
      </div>
      <div class="ab-account-info">
        <div class="ab-account-name">${currentUser.name || 'کاربر'}</div>
        <div class="ab-account-email">${currentUser.email}</div>
      </div>
    </div>
    <div class="ab-account-divider"></div>
    <button class="ab-account-item" id="abChangeAvatar">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      تغییر عکس پروفایل
    </button>
    <button class="ab-account-item" id="abResetAvatar">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      بازگشت به عکس گوگل
    </button>
    <div class="ab-account-divider"></div>
    <button class="ab-account-item" id="abSyncNow">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      همگام‌سازی الان
    </button>
    <button class="ab-account-item ab-account-danger" id="abSignOut">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      خروج از حساب
    </button>
  `;
  menu.style.position = 'fixed';
  menu.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
  menu.style.left = rect.left + 'px';
  menu.style.zIndex = '999999';
  document.body.appendChild(menu);

  document.getElementById('abChangeAvatar')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { alert('حجم عکس باید کمتر از ۲ مگابایت باشد'); return; }
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          localStorage.setItem('abner_custom_avatar', re.target.result);
          menu.remove();
          updateDockButton(currentUser);
        } catch (_) { alert('خطا در ذخیره عکس'); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });

  document.getElementById('abResetAvatar')?.addEventListener('click', () => {
    localStorage.removeItem('abner_custom_avatar');
    menu.remove();
    updateDockButton(currentUser);
  });

  document.getElementById('abSyncNow')?.addEventListener('click', () => {
    menu.remove();
    window.dispatchEvent(new CustomEvent('sync-now'));
  });

  document.getElementById('abSignOut')?.addEventListener('click', async () => {
    menu.remove();
    await signOut();
    setTimeout(() => window.location.reload(), 300);
  });

  setTimeout(() => {
    document.addEventListener('click', function closeMenu(ev) {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 50);
}