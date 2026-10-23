/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute, type PrecacheEntry } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { publicNavigationAllowlist, publicPagePath, publicPagePaths } from "./pwa/publicPageRoutes";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry | string> };

const publicPagesPrefix = "titanium-public-pages-";
const publicPagesCache = `${publicPagesPrefix}v1`;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

async function appShell() {
  // Resolve the current build's revision, rather than an arbitrary index.html
  // left in another cache while two SW versions are installed.
  const shell = await matchPrecache("/index.html");
  if (!shell) throw new Error("El App Shell no está preparado");
  return shell;
}

function pageKey(path: string) {
  return new URL(path, self.location.origin).href;
}

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const shell = await appShell();
    const cache = await caches.open(publicPagesCache);
    const previous = await cache.keys();
    const paths = new Set<string>(publicPagePaths);
    // Retain visited public detail URLs, but refresh their HTML on every build.
    for (const request of previous) {
      const url = new URL(request.url);
      const path = publicPagePath(url);
      if (url.origin === self.location.origin && !url.search && path &&
          request.method === "GET" && !request.headers.has("authorization")) paths.add(path);
    }
    // Six small copies of the same precached HTML, with NO per-route downloads.
    // The JS, CSS, images and fonts remain in the single Workbox precache.
    await Promise.all([...paths].map((path) => cache.put(pageKey(path), shell.clone())));
    const expected = new Set([...paths].map(pageKey));
    await Promise.all(previous.filter((request) => !expected.has(request.url)).map((request) => cache.delete(request)));
    await Promise.all((await caches.keys())
      .filter((name) => name.startsWith(publicPagesPrefix) && name !== publicPagesCache)
      .map((name) => caches.delete(name)));
  })());
});

registerRoute(new NavigationRoute(async ({ request, url, event }) => {
  if (url.origin !== self.location.origin || request.headers.has("authorization")) return fetch(request);
  const path = publicPagePath(url);
  if (!path) return fetch(request);
  // Canonical pathname keys deliberately omit query strings and fragments.
  // Store only our bundled static shell, never a network document or API reply.
  const cache = await caches.open(publicPagesCache);
  const cached = await cache.match(pageKey(path));
  if (cached) return cached;
  const shell = await appShell();
  event.waitUntil(cache.put(pageKey(path), shell.clone()).catch(() => {}));
  return shell;
}, { allowlist: publicNavigationAllowlist }));

// Preserve the existing public Cloudinary policy, including the initial image
// download bridge in publicImages.ts. Private folders are never eligible.
registerRoute(({ request, url }) =>
  (request.destination === "image" || request.destination === "") &&
  !request.headers.has("authorization") && url.hostname === "res.cloudinary.com" &&
  url.pathname.includes("/image/upload/") && /\/titanium\/(?:products|about)\//.test(url.pathname),
new CacheFirst({
  cacheName: "titanium-public-images-v1",
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true }),
  ],
}));

// Keep the existing update prompt: activate a waiting version only on request.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});
clientsClaim();
