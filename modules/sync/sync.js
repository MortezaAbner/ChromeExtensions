/* ============ همگام‌سازی با گوگل درایو - آبنر (v3) ============ */

import { getToken, getUser, refreshToken } from '../auth/auth.js';

const SYNC_FILE = 'abner_data.json';

let syncStatus = 'idle';
let syncTimer = null;
let isSyncing = false;

/* ---------- وضعیت ---------- */
function setStatus(status) {
  syncStatus = status;
  window.dispatchEvent(new CustomEvent('sync-status', { detail: status }));
}
export function getSyncStatus() { return syncStatus; }

/* ---------- تشخیص حالت ---------- */
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

function isExtension() {
  return typeof chrome !== 'undefined' && chrome.identity;
}

/* ---------- درخواست با مدیریت 401 ---------- */
async function driveRequest(url, options = {}, retried = false) {
  let token = await getToken();
  if (!token) throw new Error('کاربر لاگین نیست');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (res.status === 401 && !retried) {
     console.log('%c🔑 توکن منقضی شده — تلاش برای تازه‌سازی...', 'color: #38bdf8;');

    if (isExtension()) {
      try {
        await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
      } catch (_) {}
    }

    try {
      const newToken = await refreshToken();
      if (newToken) {
        console.log('✅ توکن جدید گرفته شد — تلاش مجدد...');
        return driveRequest(url, options, true);
      }
    } catch (e) {
      console.error('❌ خطا در تازه‌سازی توکن:', e);
    }

    throw new Error('توکن منقضی شده — لطفاً دوباره وارد شوید');
  }

  if (!res.ok) {
    let errorMsg = `Drive API error: ${res.status}`;
    try {
      const errText = await res.text();
      const errJson = JSON.parse(errText);
      errorMsg += ` — ${errJson.error?.message || errText.slice(0, 100)}`;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res;
}

/* ---------- جستجو در AppData ---------- */
async function findFile(name) {
  const url = `${DRIVE_API}/files?spaces=appDataFolder&q=name='${name}'&fields=files(id,name,modifiedTime)`;
  const res = await driveRequest(url);
  const data = await res.json();
  return data.files?.[0] || null;
}

/* ---------- آپلود ---------- */
async function uploadFile(name, content, existingId) {
  const metadata = {
    name,
    parents: existingId ? undefined : ['appDataFolder']
  };

  const boundary = '----abner' + Date.now();
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    JSON.stringify(content) + `\r\n` +
    `--${boundary}--`;

  const url = existingId
    ? `${UPLOAD_API}/files/${existingId}?uploadType=multipart`
    : `${UPLOAD_API}/files?uploadType=multipart`;

  await driveRequest(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  });
}

/* ---------- دانلود ---------- */
async function downloadFile(id) {
  const url = `${DRIVE_API}/files/${id}?alt=media`;
  const res = await driveRequest(url);
  return res.json();
}

/* ---------- کلیدهای داده‌ای که سینک می‌شن ---------- */
const SYNC_KEYS = [
  'abner_tasks_v2',           // ✅ تسک و یادداشت
  'abner_full_bookmarks_v3',  // بوکمارک‌ها
  'abner_theme_mode',         // تم
  'abner_glass_blur',         // ماتی شیشه
  'abner_weather_main',       // شهر اصلی آب‌وهوا
  'abner_weather_cities',     // لیست شهرها
  'abner_timer_state',        // تایمر
  'abner_search_engine',      // موتور جستجوی انتخابی
  'abner_custom_avatar',      // عکس پروفایل سفارشی
];

/* ---------- جمع‌آوری داده‌های لوکال ---------- */
async function collectLocalData() {
  const result = {};

  try {
    const r = await chrome.storage.local.get(SYNC_KEYS);
    Object.assign(result, r);
  } catch (_) {
    SYNC_KEYS.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) result[k] = v;
    });
  }
  return result;
}

/* ---------- اعمال داده‌های دریافتی ---------- */
async function applyRemoteData(data) {
  try {
    await chrome.storage.local.set(data);
  } catch (_) {
    Object.entries(data).forEach(([k, v]) => {
      try {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      } catch (_) {}
    });
  }
}

/* ---------- آپلود همه ---------- */
async function uploadAll() {
  if (isSyncing) return;
  isSyncing = true;
  setStatus('syncing');

  try {
    const local = await collectLocalData();
    const user = getUser();
    if (!user) throw new Error('کاربر لاگین نیست');

    const payload = {
      version: 3,
      user: user.email,
      updatedAt: Date.now(),
      data: local
    };

    const existing = await findFile(SYNC_FILE);
    await uploadFile(SYNC_FILE, payload, existing?.id);

    setStatus('synced');
    window.dispatchEvent(new CustomEvent('sync-complete', { detail: { direction: 'upload' } }));
  } catch (e) {
    console.error('❌ خطا در آپلود:', e.message);
    if (e.message.includes('توکن') || e.message.includes('401')) {
      setStatus('auth-error');
    } else {
      setStatus('error');
    }
  } finally {
    isSyncing = false;
  }
}

/* ---------- دانلود همه ---------- */
async function downloadAll() {
  if (isSyncing) return;
  isSyncing = true;
  setStatus('syncing');

  try {
    const file = await findFile(SYNC_FILE);
    if (!file) {
      setStatus('idle');
      isSyncing = false;
      return;
    }

    const remote = await downloadFile(file.id);
    if (remote.data) {
      // 🆕 قبل از apply، لوکال رو هم بگیر و مقایسه کن
      const local = await collectLocalData();
      const remoteStr = JSON.stringify(remote.data);
      const localStr = JSON.stringify(local);

      // اگه داده یکسانه، نیازی به reload نیست
      if (remoteStr === localStr) {
        setStatus('synced');
        isSyncing = false;
        return;
      }

      await applyRemoteData(remote.data);
      window.dispatchEvent(new CustomEvent('sync-complete', { detail: { direction: 'download' } }));
      setTimeout(() => window.location.reload(), 500);
      return;
    }
    setStatus('synced');
  } catch (e) {
    console.error('❌ خطا در دانلود:', e.message);
    if (e.message.includes('توکن') || e.message.includes('401')) {
      setStatus('auth-error');
    } else {
      setStatus('error');
    }
  } finally {
    isSyncing = false;
  }
}

/* ---------- sync دستی ---------- */
export async function syncNow() {
  const user = getUser();
  if (!user) { setStatus('idle'); return; }
  if (!navigator.onLine) { setStatus('offline'); return; }
  await uploadAll();
}

/* ---------- زمان‌بندی ---------- */
function scheduleSync(delay = 2000) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, delay);
}

/* ---------- INIT ---------- */
export async function initSync() {
  const user = getUser();
  if (!user) setStatus('idle');

  /* بعد از ورود کاربر → دانلود اولیه + sync */
  window.addEventListener('user-signed-in', async () => {
    setTimeout(async () => {
      await downloadAll();
      await uploadAll();
    }, 800);
  });

  /* هر تغییر توی storage → sync با تأخیر */
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      // فقط اگه کلید مهمی تغییر کرد
      const important = Object.keys(changes).some(k => SYNC_KEYS.includes(k));
      if (important) scheduleSync();
    });
  } catch (_) {
    // PWA - از localStorage events استفاده کن
    window.addEventListener('storage', (e) => {
      if (SYNC_KEYS.includes(e.key)) scheduleSync();
    });
  }

  /* رویداد سفارشی برای سینک دستی */
  window.addEventListener('sync-now', () => syncNow());

  /* رویداد تسک تغییر کرد */
  window.addEventListener('tasks-updated', () => scheduleSync(1500));

  /* رویداد بوکمارک تغییر کرد */
  window.addEventListener('bookmarks-updated', () => scheduleSync(1500));

  /* آنلاین / آفلاین */
  window.addEventListener('online', () => setTimeout(syncNow, 500));
  window.addEventListener('offline', () => setStatus('offline'));

  /* هر ۵ دقیقه یه بار sync */
  setInterval(() => {
    if (navigator.onLine && getUser()) syncNow();
  }, 5 * 60 * 1000);

  /* اولین sync بعد از ۳ ثانیه */
    // 🆕 اگه کاربر لاگینه، اول از Drive دانلود کن، بعد آپلود
  if (user) {
    setTimeout(async () => {
      await downloadAll();     // ← این خط قبلاً نبود!
      await uploadAll();
    }, 3000);
  }
}