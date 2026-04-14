// sw.js — Service Worker
// 策略：Network First（有網路就抓最新，離線才用快取）
const CACHE_NAME = 'fitness-v6';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './charts.js',
  './manifest.json',
];

// 安裝時快取基本檔案（給離線用）
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 啟動時清除舊版快取
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network First：有網路就抓最新版，失敗才用快取
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // 抓到新的，同時更新快取
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => {
        // 離線，用快取
        return caches.match(e.request);
      })
  );
});
