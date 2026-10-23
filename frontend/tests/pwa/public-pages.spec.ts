import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const pageCache = "titanium-public-pages-v1";
const paths = ["/", "/catalogue", "/suscripciones", "/about", "/terms", "/aviso-privacidad"];
const footerLinks = [
  ["Inicio", "/"], ["Catálogo", "/catalogue"], ["Membresías", "/suscripciones"],
  ["Acerca de nosotros", "/about"], ["Términos y condiciones", "/terms"], ["Aviso de privacidad", "/aviso-privacidad"],
];
const product = { id: "41", name: "Producto público guardado", price: 325, stock: 6, status: "Activo", productType: "Ropa", description: "Producto de la prueba de persistencia" };

async function fixtures(context: BrowserContext, products = false) {
  const state = { available: products };
  await context.route("https://t.contentsquare.net/**", (route) => route.abort());
  await context.route("https://www.google.com/**", (route) => route.abort());
  await context.route(/\/api\//, (route) => route.fulfill({
    status: state.available && new URL(route.request().url()).pathname.endsWith("/products") ? 200 : 503,
    json: [product], headers: { "Access-Control-Allow-Origin": "*" },
  }));
  return state;
}

async function ready(page: Page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => page.evaluate(async (name) => (await (await caches.open(name)).keys()).length, pageCache)).toBeGreaterThanOrEqual(paths.length);
}

async function cachePaths(page: Page) {
  return page.evaluate(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname).sort(), pageCache);
}

test("public routes are prepared without per-route downloads and visible through DevTools CacheStorage", async ({ page, context }) => {
  await fixtures(context);
  const routeRequests: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (paths.slice(1).includes(url.pathname) && url.port === "4173") routeRequests.push(url.pathname);
  });
  await page.goto("/");
  await ready(page);
  expect(routeRequests).toEqual([]);
  expect(await cachePaths(page)).toEqual([...paths].sort());
  const html = await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    return Promise.all((await cache.keys()).map(async (request) => (await cache.match(request))!.text()));
  }, pageCache);
  expect(new Set(html).size).toBe(1);
  expect(html[0]).toContain('<div id="root"></div>');
  // This is the actual Chrome DevTools Protocol backing Application > Cache
  // Storage, not a mocked Cache API. It exposes the six prepared navigation URLs.
  const cdp = await context.newCDPSession(page);
  const { caches: listed } = await cdp.send("CacheStorage.requestCacheNames", { securityOrigin: "http://localhost:4173" });
  const entry = listed.find((cache) => cache.cacheName === pageCache);
  expect(entry).toBeTruthy();
  const { cacheDataEntries } = await cdp.send("CacheStorage.requestEntries", { cacheId: entry!.cacheId, skipCount: 0, pageSize: 100 });
  expect(cacheDataEntries.map((item) => new URL(item.requestURL).pathname).sort()).toEqual([...paths].sort());
  await cdp.detach();
  await context.setOffline(true);
  for (const path of paths) {
    for (const reload of [false, true]) {
      if (reload) await page.reload(); else await page.goto(path);
      await expect(page.locator("main, section").first()).toBeVisible();
      await expect(page.locator(".smart-footer")).toBeVisible();
      await expect(page.getByRole("heading", { name: /404|página no encontrada/i })).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe(path);
    }
  }
});

for (const installed of [false, true]) {
  test(`Footer links navigate offline without full reloads (${installed ? "standalone emulated" : "browser"})`, async ({ page, context }) => {
    await fixtures(context);
    if (installed) await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
    await page.goto("/");
    await ready(page);
    if (installed) await page.getByRole("button", { name: "Ahora no", exact: true }).click();
    const marker = await page.evaluate(() => {
      const value = crypto.randomUUID();
      Object.assign(window, { footerNavigationMarker: value });
      return value;
    });
    await context.setOffline(true);
    for (const [label, path] of footerLinks) {
      const link = page.locator(".smart-footer").getByRole("link", { name: label, exact: true });
      await expect(link).toHaveAttribute("href", path);
      await link.click();
      await expect(page).toHaveURL(`http://localhost:4173${path}`);
      expect(await page.evaluate(() => Reflect.get(window, "footerNavigationMarker"))).toBe(marker);
    }
    const footer = page.locator(".smart-footer");
    await expect(footer.getByRole("link", { name: "Contacto", exact: true })).toHaveAttribute("href", "mailto:tsghuejutla@gmail.com");
    await expect(footer.locator(".footer-disclaimer a")).toHaveAttribute("href", "/terms");
    await expect(footer.getByLabel("Abrir Instagram de Titanium Sport Gym")).toHaveAttribute("href", "https://www.instagram.com/titanium_sport_gym");
    await expect(footer.getByLabel("Abrir Facebook de Titanium Sport Gym")).toHaveAttribute("href", "https://www.facebook.com/TitaniumSportGym");
    await expect(footer.locator('a[href="#"]')).toHaveCount(0);
    await page.screenshot({ path: `test-results/footer-${installed ? "standalone" : "browser"}-offline.png`, fullPage: true });
  });
}

test("public and error pages contain no dead links or development copy", async ({ page, context }) => {
  await fixtures(context, true);
  const allowed = new Set([...paths, "/login", "/register", "/payment", "/checkout", "/400", "/500", "/AboutPage", "/AboutePage"]);
  for (const path of [...paths, "/400", "/500", "/pagina-inexistente"]) {
    await page.goto(path);
    await expect(page.locator("main, section").first(), `Public content on ${path}`).toBeVisible();
    const broken = await page.locator("a[href]").evaluateAll((anchors, allowedPaths) => anchors.flatMap((anchor) => {
      const href = anchor.getAttribute("href") || "";
      if (!href || href === "#") return [href];
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return [];
      const path = url.pathname.replace(/\/$/, "") || "/";
      if (!allowedPaths.includes(path) && !/^\/catalogue\/[^/]+$/.test(path)) return [href];
      if (url.hash && url.pathname === location.pathname && !document.getElementById(decodeURIComponent(url.hash.slice(1)))) return [href];
      return [];
    }), [...allowed]);
    expect(broken, `Dead links on ${path}`).toEqual([]);
    await expect(page.locator("body")).not.toContainText(/Tomando tu referencia|todo el home|referencia que me mostraste|saliendo de tu admin|No vendes solo maquinas/);
  }
});

test("query strings and authenticated/private requests never become page-cache entries", async ({ page, context }) => {
  await fixtures(context);
  await page.goto("/");
  await ready(page);
  const sentinel = "private-test-marker";
  await page.goto(`/about?token=${sentinel}`);
  await page.evaluate(async (value) => {
    await fetch("/api/private-test", { headers: { Authorization: `Bearer ${value}` } });
    await fetch("/about", { headers: { Authorization: `Bearer ${value}` } });
  }, sentinel);
  const entries = await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    return Promise.all((await cache.keys()).map(async (request) => ({
      url: request.url, authorization: request.headers.get("authorization"), html: await (await cache.match(request))!.text(),
    })));
  }, pageCache);
  expect(entries).toHaveLength(paths.length);
  expect(entries.every((entry) => !new URL(entry.url).search && !entry.authorization && !entry.html.includes(sentinel))).toBe(true);
  expect(entries.some((entry) => /\/api\/|\/admin|\/cliente|\/login|\/payment/.test(entry.url))).toBe(false);
});

test("real SW update refreshes HTML aliases, removes old versions and preserves images/IndexedDB", async ({ page, context }) => {
  test.setTimeout(60_000);
  const state = await fixtures(context, true);
  const dist = fileURLToPath(new URL("../../dist/", import.meta.url));
  const worker = await readFile(resolve(dist, "sw.js"), "utf8");
  let version = "one";
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
      response.setHeader("Cache-Control", "no-store");
      if (pathname === "/sw.js") {
        response.setHeader("Content-Type", "application/javascript");
        // Two genuinely different workers and index.html revisions, served by
        // an HTTP server so browser SW update/install/activation are exercised.
        const modified = worker.replace(/\{[^{}]*["']url["']\s*:\s*["']index\.html["'][^{}]*\}/, (entry) => {
          const parsed = JSON.parse(entry);
          return JSON.stringify({ ...parsed, revision: `${parsed.revision}-${version}` });
        });
        if (modified === worker) throw new Error("Could not locate the injected index.html revision");
        response.end(modified);
        return;
      }
      const asset = pathname.startsWith("/assets/") || pathname.startsWith("/icons/") || pathname === "/manifest.webmanifest";
      const target = resolve(dist, asset ? `.${pathname}` : "index.html");
      if (!target.startsWith(`${resolve(dist)}${sep}`)) throw new Error("Invalid test asset path");
      const types: Record<string, string> = { ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".ico": "image/x-icon" };
      response.setHeader("Content-Type", types[extname(target)] || "application/octet-stream");
      const content = await readFile(target);
      response.end(asset ? content : `${content.toString("utf8")}<!-- public-shell-${version} -->`);
    } catch (error) {
      response.statusCode = 500;
      response.end(String(error));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server not listening");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto(origin);
    await ready(page);
    await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
    await page.goto(`${origin}/catalogue/41`);
    await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
    // The detail is a local-catalogue fallback; the unavailable detail endpoint
    // is intentionally not persisted as an API response.
    const snapshot = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("titanium-public-v1"); request.onsuccess = () => resolve(request.result); });
      const data = await new Promise((resolve) => { const request = db.transaction("resources").objectStore("resources").get("products"); request.onsuccess = () => resolve(request.result); });
      db.close();
      await (await caches.open("titanium-public-pages-v0")).put("/obsolete", new Response("old"));
      await (await caches.open("titanium-public-pages-v1")).put("/api/private-old", new Response("remove-me"));
      await (await caches.open("titanium-public-images-v1")).put("https://res.cloudinary.com/test/image/upload/titanium/products/keep.png", new Response("public-image"));
      return data;
    });
    expect(snapshot).toBeTruthy();
    state.available = false;
    version = "two";
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect(page.getByRole("button", { name: "Actualizar", exact: true })).toBeVisible();
    await Promise.all([
      page.waitForEvent("framenavigated", (frame) => frame === page.mainFrame()),
      page.getByRole("button", { name: "Actualizar", exact: true }).click(),
    ]);
    await ready(page);
    const result = await page.evaluate(async () => {
      const names = await caches.keys();
      const pages = await caches.open("titanium-public-pages-v1");
      const html = await Promise.all((await pages.keys()).map(async (request) => ({ url: request.url, body: await (await pages.match(request))!.text() })));
      const precache = await caches.open(names.find((name) => name.includes("precache"))!);
      const indexKeys = (await precache.keys()).filter((request) => new URL(request.url).pathname === "/index.html").map((request) => request.url);
      const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("titanium-public-v1"); request.onsuccess = () => resolve(request.result); });
      const data = await new Promise((resolve) => { const request = db.transaction("resources").objectStore("resources").get("products"); request.onsuccess = () => resolve(request.result); });
      db.close();
      return { names, html, indexKeys, data, image: await (await caches.open("titanium-public-images-v1")).match("https://res.cloudinary.com/test/image/upload/titanium/products/keep.png").then(Boolean) };
    });
    expect(result.names.filter((name) => name.startsWith("titanium-public-pages-"))).toEqual([pageCache]);
    expect(result.html.every((item) => item.body.includes("public-shell-two") && !item.body.includes("public-shell-one"))).toBe(true);
    expect(result.html.some((item) => item.url.endsWith("/catalogue/41"))).toBe(true);
    expect(result.html.some((item) => item.url.includes("/api/"))).toBe(false);
    expect(result.indexKeys).toHaveLength(1);
    expect(result.indexKeys[0]).toContain("-two");
    expect(result.data).toEqual(snapshot);
    expect(result.image).toBe(true);
    await context.setOffline(true);
    await page.goto(`${origin}/catalogue/41`);
    await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
