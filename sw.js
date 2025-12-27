const CACHE_NAME = 'lira24-v11-auto-ref'; // تم رفع الإصدار لتحديث الكاش تلقائياً

// الملفات المحلية الأساسية فقط (بدونها لا يعمل التطبيق offline)
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

// 1. مرحلة التثبيت (Install)
self.addEventListener('install', (event) => {
  // تخطي الانتظار لتفعيل التحديث فوراً
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache - Storing core assets...');
        // نستخدم addAll للملفات الأساسية فقط
        return cache.addAll(CORE_ASSETS);
      })
      .catch((error) => {
        console.error('Core assets precaching failed:', error);
      })
  );
});

// 2. مرحلة التفعيل (Activate) - تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // جعل الـ Service Worker يتحكم في الصفحة فوراً
  return self.clients.claim();
});

// 3. استراتيجية الجلب (Fetch) - Stale-While-Revalidate
// هذا يسمح بظهور المحتوى المخزن فوراً (سرعة)، ويقوم بتحديثه في الخلفية (حداثة البيانات).
self.addEventListener('fetch', (event) => {
  // تجاهل الطلبات التي ليست http/https
  if (!event.request.url.startsWith('http')) return;
  // استبعاد طلبات Supabase من الكاش لضمان تحديث البيانات تلقائياً
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {

      const fetchPromise = fetch(event.request).then((networkResponse) => {

        // التحقق من صحة الاستجابة قبل التخزين (لجميع الملفات بما فيها الخارجية والجديدة)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' || networkResponse.type === 'cors') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // في حالة فشل الاتصال بالشبكة (أثناء عدم الاتصال)، يتم استخدام cachedResponse إن وجد.
      });

      // إرجاع النسخة المخزنة فوراً إذا وجدت، وإلا ننتظر نتيجة الشبكة
      return cachedResponse || fetchPromise;
    })
  );
});
