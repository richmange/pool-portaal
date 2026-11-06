// Eenvoudige service worker: app-onderdelen offline beschikbaar, data altijd eerst vers van het netwerk.
const CACHE = "pool-portaal-v14";
const SHELL = ["./", "index.html", "css/style.css", "js/app.js", "js/club.js", "js/model.js", "js/regels.js", "js/scorebord.js", "manifest.webmanifest", "img/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const fresh = url.pathname.includes("/data/");
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request).then((m) => m || (fresh ? Response.error() : caches.match("index.html"))))
  );
});
