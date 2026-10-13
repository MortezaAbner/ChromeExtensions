/* ============ همگام‌سازی با گوگل درایو - آبنر (v2) ============ */

import { getToken, getUser, refreshToken } from '../auth/auth.js';

const SYNC_FILE = 'abner_data.json';
const CACHE_TTL = 10 * 60 * 1000;

let syncStatus = 'idle';
let syncTimer = null;
let isSyncing = false;

/* ---------- وضعیت ---------- */
function setStatus(status) {
  syncStatus = status;
  window.dispatchEvent(new CustomEvent('sync-status', { detail: status }));
}
export function getSyncStatus() { return syncStatus; }

/* ---------- API Drive ---------- */
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

function isExtension() {
  return typeof chrome !== 'undefined' && chrome.identity;
}

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

  /* ---------- مدیریت 401 (توکن منقضی) ---------- */
  if (res.status === 401 && !retried) {
    console.warn('🔑 توکن منقضی شده — تلاش برای تازه‌سازی...');

    // پاک کردن توکن قدیمی از کش کروم
    if (isExtension()) {
      try {
        await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
      } catch (_) {}
    }

    // گرفتن توکن جدید
    try {
      const newToken = await refreshToken();
      if (newToken) {
        console.log('✅ توکن جدید گرفته شد — تلاش مجدد...');
        return driveRequest(url, options, true);
      }
    } catch (e) {
      console.error('❌ خطا در تازه‌سازی توکن:', e);
    }

    // اگه نتونستیم، خطا بده
    throw new Error('توکن منقضی شده — لطفاً دوباره وارد شوید');
  }

  /* ---------- مدیریت خطاهای دیگه ---------- */
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

/* ---------- جمع‌آوری داده‌های لوکال ---------- */
async function collectLocalData() {
  const result = {};
  const keys = [
    'abner_full_bookmarks_v3',
    'abner_theme_mode',
    'abner_glass_blur',
    'abner_weather_main',
    'abner_weather_cities',
    'abner_timer_state',
    'abner_search_engine',
    'abner_custom_avatar',
    'abner_first_install_done'
  ];

  try {
    const r = await chrome.storage.local.get(keys);
    Object.assign(result, r);
  } catch (_) {
    keys.forEach(k => {
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
      version: 2,
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

    // اگه خطای احراز هویت بود → کاربر رو مطلع کن
    if (e.message.includes('توکن') || e.message.includes('401') || e.message.includes('invalid authentication')) {
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
      await applyRemoteData(remote.data);
      window.dispatchEvent(new CustomEvent('sync-complete', { detail: { direction: 'download' } }));
      setTimeout(() => window.location.reload(), 500);
    }
    setStatus('synced');
  } catch (e) {
    console.error('❌ خطا در دانلود:', e.message);
    if (e.message.includes('توکن') || e.message.includes('401') || e.message.includes('invalid authentication')) {
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

  // بعد از ورود → دانلود اولیه + sync
  window.addEventListener('user-signed-in', async () => {
    setTimeout(async () => {
      await downloadAll();
      await uploadAll();
    }, 800);
  });

  // هر تغییری → sync با تأخیر
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      scheduleSync();
    });
  } catch (_) {}

  // رویداد دستی
  window.addEventListener('sync-now', () => syncNow());

  // آنلاین/آفلاین
  window.addEventListener('online', () => setTimeout(syncNow, 500));
  window.addEventListener('offline', () => setStatus('offline'));

  // هر ۵ دقیقه
  setInterval(() => {
    if (navigator.onLine && getUser()) syncNow();
  }, 5 * 60 * 1000);

  if (user) setTimeout(syncNow, 3000);
}