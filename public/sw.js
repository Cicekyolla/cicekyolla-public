/* ============================================================================
 * ÇiçekYolla — Web Push Service Worker
 * ----------------------------------------------------------------------------
 * KAPSAM: YALNIZ push bildirimi. Bilerek 'fetch' handler'ı YOKTUR —
 *   böylece hiçbir sayfa/istek önbelleğe alınmaz, mevcut SEO/SSR davranışı
 *   ve checkout akışı bu dosyadan etkilenmez.
 * ========================================================================== */

self.addEventListener("install", () => {
  // Yeni sürüm hemen devreye girsin (eski SW beklemesin).
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "ÇiçekYolla";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    // Tıklama hedefi admin'de belirlenir; SW burada yalnız taşır.
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Zaten açık bir ÇiçekYolla sekmesi varsa onu kullan.
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            return client.focus().then((c) => c.navigate(target));
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});
