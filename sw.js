// sw.js — Service Worker（離線可用）
const CACHE_NAME = 'fitness-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './charts.js',
  './manifest.json',
];

// 安裝時快取所有檔案
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 啟動時清除舊快取
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 請求時先找快取，沒有才去網路抓
self.addEventListener('fetch', (e) => {
  // Chart.js CDN 不快取（讓它用網路）
  if (e.request.url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
