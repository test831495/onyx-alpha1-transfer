const CACHE_NAME = "onyx-nova-shell-v1";
const OFFLINE_HTML = "<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>ONYX NOVA | Offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#01050e;color:#e9f8ff;font:16px system-ui,sans-serif}main{max-width:26rem;padding:2rem;text-align:center;border:1px solid #15536a;border-radius:18px;background:#071321}button{padding:.65rem 1rem;border:1px solid #2c7898;border-radius:999px;background:#061522;color:#e9f8ff;font:inherit}</style><main><h1>ONYX NOVA</h1><p>Connection unavailable. No request was executed while offline.</p><button onclick=\"location.reload()\">Try again</button></main>";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put("/offline.html", new Response(OFFLINE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } }))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
});

const isSensitiveRequest = (url) => /(^|\/)(api|auth|\.netlify\/functions|speech|audio|microphone|media|stream|model|provider)(\/|$)/i.test(url.pathname);
const isPublicStaticAsset = (request, url) => !url.search && ["script", "style", "image", "font"].includes(request.destination) && /^\/(assets|icons|avatars|heroes|scenes)\//.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Network-only dynamic request: auth, private data, APIs, functions, voice, media, providers, models, streams, and writes are never cached.
  if (request.method !== "GET" || url.origin !== self.location.origin || isSensitiveRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  if (isPublicStaticAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })),
    );
  }
});
