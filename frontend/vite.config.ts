import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "prompt",
    injectRegister: null,
    includeAssets: ["icons/*.png"],
    manifest: {
      id: "/", name: "Titanium Sport Gym", short_name: "Titanium",
      description: "Entrena y consulta el catálogo público de Titanium Sport Gym.",
      lang: "es-MX", theme_color: "#b91c1c", background_color: "#10131a",
      display: "standalone", start_url: "/", scope: "/",
      icons: [
        { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    workbox: {
      // All chunks, including as-yet unvisited screens, local fonts and images.
      globPatterns: ["**/*.{html,js,css,woff,woff2,ttf,png,jpg,jpeg,svg,ico,webp,webmanifest}"],
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      navigateFallback: "/index.html",
      navigateFallbackAllowlist: [/^\/(?:\?.*)?$/, /^\/catalogue(?:\/[^/?]+)?\/?(?:\?.*)?$/, /^\/(?:suscripciones|about|AboutPage|AboutePage)\/?(?:\?.*)?$/],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      // No API, auth, payment or private response runtime caches.
      runtimeCaching: [{
        urlPattern: ({ request, url }) => (request.destination === "image" || request.destination === "") &&
          !request.headers.has("authorization") &&
          url.hostname === "res.cloudinary.com" && url.pathname.includes("/image/upload/") &&
          /\/titanium\/(?:products|about)\//.test(url.pathname),
        handler: "CacheFirst",
        options: {
          cacheName: "titanium-public-images-v1",
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true },
        },
      }],
    },
  })],
  server: {
    host: "localhost",
    port: 5173,
  },
});
