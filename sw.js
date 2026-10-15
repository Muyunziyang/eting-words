/* ===== Service Worker：离线缓存（壳 + 词库数据） ===== */
var CACHE = "eting-web-v1";
var SHELL = [
  "index.html", "manifest.webmanifest", "css/style.css",
  "js/store.js", "js/data.js", "js/speech.js", "js/theme.js", "js/pages.js", "js/app.js",
  "assets/icon.svg", "assets/icon-maskable.svg",
  "data/index.json",
  "data/libs/01.json", "data/libs/02.json", "data/libs/03.json", "data/libs/04.json",
  "data/libs/05.json", "data/libs/06.json", "data/libs/07.json", "data/libs/08.json",
  "data/libs/09.json", "data/libs/10.json", "data/libs/11.json", "data/libs/12.json",
  "data/libs/13.json", "data/libs/14.json", "data/libs/15.json", "data/libs/16.json",
  "data/libs/17.json", "data/libs/18.json"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  // 优先网络，失败回退缓存（保证离线可用）
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match("index.html"); });
    })
  );
});
