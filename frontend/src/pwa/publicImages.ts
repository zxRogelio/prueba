const pending = new Set<string>();

// The first page can download images before the freshly installed SW controls
// it. Request those public images once more after control, so they too receive
// Workbox's bounded runtime caching and expiry policy.
export async function cacheInitialPublicImage(src: string | undefined) {
  if (!src || !("serviceWorker" in navigator) || pending.has(src)) return;
  let url: URL;
  try { url = new URL(src); } catch { return; }
  if (url.hostname !== "res.cloudinary.com" || !url.pathname.includes("/image/upload/") || !/\/titanium\/(?:products|about)\//.test(url.pathname)) return;
  pending.add(src);
  try {
    const controlled = Boolean(navigator.serviceWorker.controller) || await new Promise<boolean>((resolve) => {
      const changed = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener("controllerchange", changed); resolve(true); };
      const timer = setTimeout(() => { navigator.serviceWorker.removeEventListener("controllerchange", changed); resolve(false); }, 15_000);
      navigator.serviceWorker.addEventListener("controllerchange", changed);
      if (navigator.serviceWorker.controller) changed();
    });
    if (controlled && navigator.onLine) {
      const cache = await caches.open("titanium-public-images-v1");
      if (!(await cache.match(src))) await fetch(src, { credentials: "omit", mode: "no-cors", signal: AbortSignal.timeout(8000) });
    }
  } catch { /* A failed image cache must never prevent rendering. */ }
  finally { pending.delete(src); }
}
