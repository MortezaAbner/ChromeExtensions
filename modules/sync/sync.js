/* ============ همگام‌سازی با گوگل درایو - آبنر (v6) ============ */

import { getToken, getUser, refreshToken } from '../auth/auth.js';

const SYNC_FILE = 'abner_data.json';
const LOCAL_TS_KEY = 'abner_last_sync_ts';

let syncStatus = 'idle';
let syncTimer = null;
let isSyncing = false;

function setStatus(status) {
  syncStatus = status;
  window.dispatchEvent(new CustomEvent('sync-status', { detail: status }));
}
export function getSyncStatus() { return syncStatus; }

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

  if (res.status === 401 && !retried) {
    if (isExtension()) {
      try { await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r)); } catch (_) {}
    }
    try {
      const newToken = await refreshToken();
      if (newToken) return driveRequest(url, options, true);
    } catch (e) { console.error('❌ تازه‌سازی توکن:', e); }
    throw new Error('توکن منقضی شده');
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

async function findFile(name) {
  const url = `${DRIVE_API}/files?spaces=appDataFolder&q=name='${name}'&fields=files(id,name,modifiedTime)`;
  const res = await driveRequest(url);
  const data = await res.json();
  return data.files?.[0] || null;
}

async function uploadFile(name, content, existingId) {
  const metadata = { name, parents: existingId ? undefined : ['appDataFolder'] };
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

async function downloadFile(id) {
  const url = `${DRIVE_API}/files/${id}?alt=media`;
  const res = await driveRequest(url);
  return res.json();
}

const SYNC_KEYS = [
  'abner_tasks_v2',
  'abner_full_bookmarks_v3',
  'abner_theme_mode',
  'abner_glass_blur',
  'abner_weather_main',
  'abner_weather_cities',
  'abner_timer_state',
  'abner_search_engine',
  'abner_custom_avatar',
  'abner_sync_queue',
];

function collectLocalData() {
  const result = {};
  SYNC_KEYS.forEach(k => {
    try {
      const v = localStorage.getItem(k);
      if (v !== null) result[k] = v;
    } catch (_) {}
  });
  return result;
}

function applyRemoteData(data) {
  // 🆕 تشخیص تسک‌های حذف‌شده از دستگاه دیگه
  try {
    const oldTasksRaw = localStorage.getItem('abner_tasks_v2');
    const newTasksRaw = data.abner_tasks_v2;
    if (oldTasksRaw && newTasksRaw) {
      const oldTasks = (JSON.parse(oldTasksRaw).tasks || []);
      const newTasks = (JSON.parse(newTasksRaw).tasks || []);
      const newIds = new Set(newTasks.map(t => t.id));
      const removed = oldTasks.filter(t => !newIds.has(t.id) && (t.calendarEventId || t.tasksApiId));
      if (removed.length > 0) {
        console.log('🗑️ تسک‌های حذف‌شده از دستگاه دیگه:', removed.length);
        const key = 'abner_pending_deletes';
        let list = [];
        try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
        const listIds = new Set(list.map(t => t.id));
        removed.forEach(t => {
          if (!listIds.has(t.id)) {
            list.push({
              id: t.id,
              title: t.title || '',
              calendarEventId: t.calendarEventId || null,
              tasksApiId: t.tasksApiId || null,
              ts: Date.now(),
            });
          }
        });
        try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('خطا در تشخیص حذف‌شده‌ها:', e);
  }

  Object.entries(data).forEach(([k, v]) => {
    try {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    } catch (_) {}
  });
}

async function uploadAll() {
  if (isSyncing) return;
  isSyncing = true;
  setStatus('syncing');
  try {
    const local = collectLocalData();
    const user = getUser();
    if (!user) throw new Error('کاربر لاگین نیست');
    console.log('📤 آپلود به Drive:', Object.keys(local).length, 'کلید');
    const payload = { version: 6, user: user.email, updatedAt: Date.now(), data: local };
    const existing = await findFile(SYNC_FILE);
    await uploadFile(SYNC_FILE, payload, existing?.id);
    try { localStorage.setItem(LOCAL_TS_KEY, String(payload.updatedAt)); } catch (_) {}
    setStatus('synced');
    window.dispatchEvent(new CustomEvent('sync-complete', { detail: { direction: 'upload' } }));
  } catch (e) {
    console.error('❌ خطا در آپلود:', e.message);
    setStatus(e.message.includes('توکن') ? 'auth-error' : 'error');
  } finally {
    isSyncing = false;
  }
}

async function downloadAll() {
  if (isSyncing) return;
  isSyncing = true;
  setStatus('syncing');
  try {
    const file = await findFile(SYNC_FILE);
    if (!file) { setStatus('idle'); isSyncing = false; return; }
    const remote = await downloadFile(file.id);
    if (!remote || !remote.data) { setStatus('idle'); isSyncing = false; return; }

    const remoteTs = remote.updatedAt || 0;
    const localTs = parseInt(localStorage.getItem(LOCAL_TS_KEY) || '0', 10);

    console.log('📥 Drive ts:', remoteTs, '| Local ts:', localTs);

    if (remoteTs <= localTs) {
      console.log('✅ داده لوکال جدیدتره');
      setStatus('synced');
      isSyncing = false;
      return;
    }

    applyRemoteData(remote.data);
    try { localStorage.setItem(LOCAL_TS_KEY, String(remoteTs)); } catch (_) {}
    window.dispatchEvent(new CustomEvent('sync-complete', { detail: { direction: 'download' } }));

    // 🆕 به tasks.js بگو تسک‌های حذف‌شده رو پردازش کنه
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('abner-check-pending-deletes'));
    }, 500);

    setStatus('synced');
    setTimeout(() => window.location.reload(), 800);
  } catch (e) {
    console.error('❌ خطا در دانلود:', e.message);
    setStatus(e.message.includes('توکن') ? 'auth-error' : 'error');
  } finally {
    isSyncing = false;
  }
}

export async function syncNow() {
  const user = getUser();
  if (!user) { setStatus('idle'); return; }
  if (!navigator.onLine) { setStatus('offline'); return; }
  await downloadAll();
  await uploadAll();
}

function scheduleSync(delay = 2000) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(uploadAll, delay);
}

export async function initSync() {
  const user = getUser();
  if (!user) setStatus('idle');

  window.addEventListener('user-signed-in', async () => {
    setTimeout(async () => { await downloadAll(); await uploadAll(); }, 800);
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const important = Object.keys(changes).some(k => SYNC_KEYS.includes(k));
      if (important) scheduleSync();
    });
  } catch (_) {
    window.addEventListener('storage', (e) => {
      if (SYNC_KEYS.includes(e.key)) scheduleSync();
    });
  }

  window.addEventListener('sync-now', () => syncNow());
  window.addEventListener('tasks-updated', () => scheduleSync(1500));
  window.addEventListener('bookmarks-updated', () => scheduleSync(1500));
  window.addEventListener('online', () => setTimeout(syncNow, 500));
  window.addEventListener('offline', () => setStatus('offline'));

  setInterval(() => {
    if (navigator.onLine && getUser()) syncNow();
  }, 5 * 60 * 1000);

  if (user) {
    setTimeout(async () => {
      await downloadAll();
      setTimeout(uploadAll, 1000);
    }, 2000);
  }
}