// Service worker : permet à l'app de s'ouvrir même sans réseau.
// À chaque modification des fichiers, change le numéro de version
// pour que les téléphones récupèrent la nouvelle version.
var CACHE = "roue-libre-v1";
var CORE = [
  "./",
  "index.html",
  "css/style.css",
  "js/config.js",
  "js/store.js",
  "js/app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Réseau d'abord (toujours la dernière version), cache en secours hors ligne.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req); })
  );
});
