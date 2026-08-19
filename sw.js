/* Service worker: apka ma działać bez sieci, tak jak działała z dysku.
   Wszystkie ścieżki są relatywne, żeby zadziałało też pod adresem
   w podkatalogu (np. https://user.github.io/test/). */
/* Podmieniane na skrót commita przy wdrożeniu. Bez tego plik jest identyczny
   między wersjami, przeglądarka nie widzi nowego workera i nie ma czym
   powiadomić o aktualizacji. */
var BUILD = "__BUILD__";
var V = "makro-" + BUILD;
var SHELL = ["./", "index.html", "manifest.webmanifest", "icon.svg",
             "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
var FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", function (e) {
  /* Bez skipWaiting: nowa wersja czeka, aż użytkownik ją przyjmie. Podmiana
     w tle zostawiłaby na ekranie stary kod z nowym cache'em. */
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }));
});

/* Strona prosi o wejście nowej wersji, gdy użytkownik tapnie "Odśwież". */
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "skip") self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== V; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  /* Fonty z Google trzeba pobrać trybem cors — odpowiedź opaque nie da się
     zapisać w Cache API, a bez nich offline traci typografię. */
  if (FONTS.test(req.url)) {
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(new Request(req.url, { mode: "cors", credentials: "omit" }))
          .then(function (res) { if (res.ok) c.put(req, res.clone()); return res; })
          .catch(function () { return new Response("", { status: 504 }); });
      });
    }));
    return;
  }

  if (new URL(req.url).origin !== self.location.origin) return;

  /* Własne pliki: najpierw cache (natychmiastowy start offline),
     w tle odświeżenie na kolejne wejście. */
  e.respondWith(caches.open(V).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res.ok) c.put(req, res.clone());
        return res;
      }).catch(function () { return null; });
      return hit || net.then(function (r) { return r || c.match("index.html"); });
    });
  }));
});
