/* ============================================================
   Service Worker - آبنر
   استراتژی: Network-First برای همه چیز
   (اول از شبکه بگیر، اگه نشد از کش)
============================================================ */

const CACHE_NAME = 'abner-v' + Date.now(); // هر بار نسخه جدید → کش قدیم پاک میشه

self.addEventListener('install', (event) => {
  self.skipWaiting(); // فوراً فعال شو
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // فقط درخواست‌های GET رو مدیریت کن
  if (event.request.method !== 'GET') return;

  // درخواست‌های API گوگل رو از کش نگیر
  const url = event.request.url;
  if (
    url.includes('googleapis.com') ||
    url.includes('google.com') ||
    url.includes('open-meteo.com') ||
    url.includes('nominatim') ||
    url.includes('aladhan') ||
    url.includes('ipwho.is') ||
    url.includes('gstatic.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // اگه جواب موفق بود، توی کش ذخیره کن
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // اگه شبکه نبود، از کش بده
        return caches.match(event.request);
      })
  );
});