/* ============ همگام‌سازی با گوگل درایو - آبنر ============ */

import { getToken, getUser } from '../auth/auth.js';

const SYNC_FILES = {
  tasks: 'abner_tasks.json',
  notes: 'abner_notes.json',
  bookmarks: 'abner_bookmarks.json',
  settings: 'abner_settings.json',
  weather: 'abner_weather.json',
};

const SYNC_KEYS = {
  tasks: ['abner_full_bookmarks_v3'],
  notes: [],
  bookmarks: ['abner_full_bookmarks_v3'],
  settings: ['abner_theme_mode', 'abner_glass_blur', 'abner_weather_main', 'abner_weather_cities', 'abner_timer_state'],
  weather: ['abner_weather_main', 'abner_weather_cities', 'abner_weather_main_cache'],
};

let syncStatus = 'idle';
let syncTimer = null;

/* ---------- وضعیت ---------- */
function setStatus(status) {
  syncStatus = status;
  window.dispatchEvent(new CustomEvent('sync-status', { detail: status }));
}

export function getSyncStatus() { return syncStatus; }

/* ---------- API Drive ---------- */
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

async function driveRequest(url, options = {}) {
  const token = await getToken();
  if (!token) throw new Error('کاربر لاگین نیست');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive API error: ${res.status} ${err}`);
  }
  return res;
}

/* ---------- جستجوی فایل در AppData ---------- */
async function findFile(name) {
  const url = `${DRIVE_API}/files?spaces=appDataFolder&q=name='${name}'&fields=files(id,name,modifiedTime)`;
  const res = await driveRequest(url);
  const data = await res.json();
  return data.files?.[0] || null;
}

/* ---------- آپلود فایل به AppData ---------- */
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

/* ---------- دانلود فایل از AppData ---------- */
async function downloadFile(id) {
  const url = `${DRIVE_API}/files/${id}?alt=media`;
  const res = await driveRequest(url);
  return res.json();
}

/* ---------- جمع‌آوری داده‌های لوکال ---------- */
async function collectLocalData() {
  const result = {};
  try {
    const keys = Object.values(SYNC_KEYS).flat();
    const r = await chrome.storage.local.get(keys);
    Object.assign(result, r);
  } catch (_) {
    // fallback به localStorage
    Object.values(SYNC_KEYS).flat().forEach(k => {
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
      try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (_) {}
    });
  }
}

/* ---------- آپلود همه‌چیز ---------- */
async function uploadAll() {
  setStatus('syncing');

  try {
    const local = await collectLocalData();
    const user = getUser();
    if (!user) throw new Error('کاربر لاگین نیست');

    // فایل اصلی شامل تمام داده‌ها
    const payload = {
      version: 1,
      user: user.email,
      updatedAt: Date.now(),
      data: local
    };

    const existing = await findFile(SYNC_FILES.tasks);
    await uploadFile(SYNC_FILES.tasks, payload, existing?.id);

    setStatus('synced');
    window.dispatchEvent(new CustomEvent('sync-complete', { detail: { direction: 'upload' } }));
  } catch (e) {
    console.error('خطا در آپلود:', e);
    setStatus('error');
  }
}

/* ---------- دانلود همه‌چیز ---------- */
async function downloadAll() {
  setStatus('syncing');

  try {
    const file = await findFile(SYNC_FILES.tasks);
    if (!file) {
      setStatus('idle');
      return;
    }

    const remote = await downloadFile(file.id);
    if (remote.data) {
      await applyRemoteData(remote.data);
      window.dispatchEvent(new CustomEvent('sync-complete', { detail: { direction: 'download' } }));
      // رفرش UI
      setTimeout(() => window.location.reload(), 500);
    }
    setStatus('synced');
  } catch (e) {
    console.error('خطا در دانلود:', e);
    setStatus('error');
  }
}

/* ---------- همگام‌سازی دوطرفه ---------- */
export async function syncNow() {
  const user = getUser();
  if (!user) {
    setStatus('idle');
    return;
  }

  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }

  try {
    await uploadAll();
    setStatus('idle');
  } catch (e) {
    console.error(e);
  }
}

/* ---------- همگام‌سازی خودکار ---------- */
function scheduleSync(delay = 2000) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, delay);
}

/* ---------- INIT ---------- */
export async function initSync() {
  const user = getUser();
  if (!user) {
    setStatus('idle');
  }

  // بعد از ورود کاربر، یه بار دانلود کن
  window.addEventListener('user-signed-in', async () => {
    setTimeout(async () => {
      await downloadAll();
      await syncNow();
    }, 800);
  });

  // هر تغییر توی حافظه → sync بعد از ۲ ثانیه
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      // اگه تغییر مربوط به sync نبود، زمان‌بندی کن
      scheduleSync();
    });
  } catch (_) {}

  // رویداد دستی
  window.addEventListener('sync-now', () => syncNow());

  // وقتی آنلاین شد، sync کن
  window.addEventListener('online', () => {
    setTimeout(syncNow, 500);
  });
  window.addEventListener('offline', () => setStatus('offline'));

  // هر ۵ دقیقه یه بار
  setInterval(() => {
    if (navigator.onLine && getUser()) {
      syncNow();
    }
  }, 5 * 60 * 1000);

  // اولین sync بعد از load
  if (user) {
    setTimeout(syncNow, 3000);
  }
}