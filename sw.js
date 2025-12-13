const CACHE_NAME = 'lira24-v4'; // تم رفع رقم الإصدار لضمان تحديث الكاش عند المستخدمين

const urlsToCache = [
  './index.html',
  './manifest.json',
  './assets/icon.png',
  // --- إضافة روابط الـ CDN لضمان العمل بدون إنترنت ---
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(error => {
            // هذا يسمح للـ Service Worker بالعمل حتى لو فشل تحميل بعض الروابط الخارجية مؤقتاً
            console.warn('Caching failed for some URLs (expected if network is unstable):', error);
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const request = event.request;

  // 1. استراتيجية Network-Only: لعمليات تسجيل الدخول وجلب البيانات الحية
  // يجب استثناء أي نطاق يستخدم لعمليات التحقق (Auth) أو جلب الأسعار اللحظية.
  if (
    url.hostname.includes('supabase.co') || 
    url.hostname.includes('currency_rates_api_host') || 
    url.hostname.includes('github.com') // **إصلاح مشكلة تسجيل الدخول عبر GitHub**
  ) {
    // اذهب للشبكة مباشرةً ولا تستخدم الكاش
    return event.respondWith(fetch(request));
  }
  
  // 2. استراتيجية Cache-First: للأصول الثابتة (الملفات المحلية ومكتبات الـ CDN)
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // إذا وجدنا الملف في الكاش نعيده، وإلا نجلبه من الإنترنت
        return response || fetch(request);
      })
      .catch(() => {
        // في حال فشل كل من الكاش والشبكة، أعد الملف الرئيسي (index.html) كصفحة احتياطية
        return caches.match('./index.html'); 
      })
  );
});

// تنظيف الكاش القديم عند تفعيل Service Worker جديد
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
