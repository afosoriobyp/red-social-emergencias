const CACHE = "emergiayuda-v3";
const CORE = ["/", "/manifest.webmanifest", "/icon.svg"];
const API_CACHE = "emergiayuda-api-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    /* mensaje simple */
  }
  const title = payload.title || "JuntosxRoldanillo";
  const options = {
    body: payload.body || "Hay una nueva alerta de emergencia.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: payload.url || "/", critical: !!payload.critical },
    vibrate: [200, 100, 200],
    requireInteraction: !!payload.critical,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.navigate(url).then(() => client.focus());
      }
      return clients.openWindow(url);
    }),
  );
});

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  try {
    const network = await fetch(request);
    if (network.ok) cache.put(request, network.clone());
    return network;
  } catch {
    if (cached) return cached;
    return new Response(JSON.stringify({ reports: [], total: 0, page: 1, limit: 20, hasMore: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  try {
    const network = await fetch(request);
    if (network.ok) cache.put(request, network.clone());
    return network;
  } catch {
    if (cached) return cached;
    return cache.match("/");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.protocol.startsWith("http")) return;

  if (request.method === "GET" && url.pathname.startsWith("/api/reports")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((network) => {
          if (url.origin === location.origin) {
            const copy = network.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return network;
        })
        .catch(() => caches.match("/"));
    }),
  );
});