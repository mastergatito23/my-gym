const CACHE = "my-gym-2.1.1";
const ASSETS = ["./", "./index.html", "./app.css", "./app.js", "./manifest.json"];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async path => {
      try { const response = await fetch(path, { cache: "reload" }); if (response.ok) await cache.put(path, response); } catch {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const isAppAsset = ["document", "script", "style"].includes(request.destination) || /\.(html|css|js)$/.test(url.pathname);
  if (isAppAsset) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: "no-store" });
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        return (await caches.match(request)) || (await caches.match("./index.html")) || Response.error();
      }
    })());
  } else {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try { return await fetch(request); } catch { return Response.error(); }
    })());
  }
});