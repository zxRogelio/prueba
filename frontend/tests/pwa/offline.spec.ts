import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Deterministic, explicitly controlled public API fixtures. These exercise real
// Chromium, IndexedDB and the built SW; they do not claim a live API was tested.
const imageUrl = "https://res.cloudinary.com/titanium-test/image/upload/v1/titanium/products/test.png";
const image = readFileSync(new URL("../../public/icons/pwa-192.png", import.meta.url));
const products = [
  { id: "1", name: "Proteína Titanium", price: 550, stock: 10, status: "Activo", productType: "Suplementación", description: "Proteína para entrenamiento", imageUrl },
  { id: "2", name: "Playera Titanium", price: 250, stock: 5, status: "Activo", productType: "Ropa", description: "Playera deportiva", imageUrl },
];
const plan = { id: "plan-1", name: "Mensual Titanium", slug: "mensual", type: "individual", durationDays: 30, price: 499, minPeople: 1, maxPeople: 1, benefits: ["Acceso al gimnasio"], isActive: true, sortOrder: 1 };
const waitingMessage = "Sin conexión. Esperando conexión para cargar el contenido";

async function fixtures(context: BrowserContext, available = true) {
  const state = { available, price: 550, latencyMs: 0, requests: [] as { path: string; authorization?: string; cookie?: string }[] };
  await context.route("https://t.contentsquare.net/**", (route) => route.abort());
  await context.route("https://www.google.com/**", (route) => route.abort());
  await context.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: image, headers: { "Access-Control-Allow-Origin": "*" } }));
  await context.route(/\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    state.requests.push({ path, authorization: request.headers().authorization, cookie: request.headers().cookie });
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
    if (request.method() === "OPTIONS") { await route.fulfill({ status: 204, headers }); return; }
    if (state.latencyMs) await new Promise((resolve) => setTimeout(resolve, state.latencyMs));
    if (!state.available) { await route.fulfill({ status: 503, json: { error: "Test: API unavailable" }, headers }); return; }
    const currentProducts = products.map((product) => product.id === "1" ? { ...product, price: state.price } : product);
    const detail = path.match(/\/products\/(\d+)$/);
    const body = path.endsWith("/memberships/plans") ? { plans: [plan] }
      : path.endsWith("/about") ? { id: "about-1", slug: "main", heroTitle: "Acerca de Nosotros" }
      : path.endsWith("/recommendations") ? [currentProducts[1]]
      : detail ? currentProducts.find((product) => product.id === detail[1])
      : path.endsWith("/products") ? currentProducts : {};
    await route.fulfill({ status: body ? 200 : 404, json: body ?? {}, headers });
  });
  return state;
}

async function ready(page: Page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some((key) => key.includes("precache")))).toBe(true);
}

async function shell(page: Page) {
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator("header nav").first()).toBeVisible();
  await expect.poll(() => page.locator("header img, footer img").evaluateAll((images) => images.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

async function persistentSkeletons(page: Page, count = 1) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const grids = page.getByLabel("Esperando conexión para cargar el contenido", { exact: true });
  await expect(grids).toHaveCount(count);
  await expect(page.getByText(waitingMessage, { exact: true })).toHaveCount(count);
  await expect(page.locator(".pwa-skeleton-grid.unavailable")).toHaveCount(0);
  // Observe a real CSS animation surviving well beyond the former 250 ms
  // cutoff. Infinite iteration ensures it has no CSS expiration either.
  const skeleton = grids.first().locator(".pwa-skeleton").first();
  expect(await skeleton.evaluate((node) => getComputedStyle(node).animationIterationCount)).toBe("infinite");
  await expect.poll(() => skeleton.evaluate((node) => Number(node.getAnimations()[0]?.currentTime ?? 0))).toBeGreaterThan(1100);
  await expect(grids).toHaveCount(count);
}

test("A/F: home reload, assets, fonts and public routes work after initial precache", async ({ page, context }) => {
  await fixtures(context, false);
  await page.goto("/");
  await ready(page);
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Titanium Sport Gym", short_name: "Titanium", display: "standalone", start_url: "/", theme_color: "#b91c1c" });
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(["192x192", "512x512"]);
  const cached = await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys()).find((key) => key.includes("precache"))!);
    return (await cache.keys()).map((request) => request.url);
  });
  expect(cached.some((url) => url.includes("index.html"))).toBe(true);
  for (const extension of [".js", ".css", ".woff2", ".jpg", ".png", ".ico"]) expect(cached.some((url) => url.includes(extension))).toBe(true);
  expect(cached.some((url) => url.includes("/api/"))).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await shell(page);
  await expect(page.getByRole("heading", { name: "Titanium Sport Gym", exact: true })).toBeVisible();
  await page.evaluate(async () => { await document.fonts.load('400 16px "Manrope"'); await document.fonts.load('400 16px "Poppins"'); });
  expect(await page.evaluate(() => document.fonts.check('400 16px "Manrope"') && document.fonts.check('400 16px "Poppins"'))).toBe(true);
  const backgrounds = await page.evaluate(async () => {
    const nodes = Array.from(document.querySelectorAll('[class*="home-hero__slide"]'));
    return Promise.all(nodes.map((node) => new Promise<boolean>((resolve) => {
      const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(false);
      img.src = getComputedStyle(node).backgroundImage.slice(5, -2);
    })));
  });
  expect(backgrounds.length).toBe(3);
  expect(backgrounds.every(Boolean)).toBe(true);
  for (const route of ["/suscripciones", "/about", "/AboutPage", "/AboutePage", "/about?ref=pwa"]) {
    await page.goto(route);
    await shell(page);
    await expect(page.getByText(waitingMessage).first()).toBeVisible();
  }
  await page.screenshot({ path: "test-results/about-offline.png", fullPage: true });
});

test("B/D: first catalogue and detail visits offline keep animated skeletons while awaiting connection", async ({ page, context }) => {
  await fixtures(context, false);
  await page.goto("/");
  await ready(page);
  await context.setOffline(true);
  await page.goto("/catalogue", { waitUntil: "domcontentloaded" });
  await persistentSkeletons(page);
  await shell(page);
  await expect(page.getByRole("heading", { name: "Catalogo de productos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/catalogue-offline-empty.png", fullPage: true });
  await page.goto("/catalogue/999");
  await persistentSkeletons(page);
  await shell(page);
});

test("C: saved catalogue, text search, viewed and unvisited saved product details work offline", async ({ page, context }) => {
  await fixtures(context);
  await page.goto("/catalogue");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toBeVisible();
  // Wait for Workbox's actual runtime image cache, not the browser HTTP cache.
  await expect.poll(() => page.evaluate(async () => (await caches.open("titanium-public-images-v1")).match("https://res.cloudinary.com/titanium-test/image/upload/v1/titanium/products/test.png").then(Boolean))).toBe(true);
  await page.goto("/catalogue/1");
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.goto("/catalogue");
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toBeVisible();
  await expect(page.getByText(/Mostrando contenido guardado/)).toBeVisible();
  await expect(page.locator(".pwa-skeleton-grid")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Buscar productos" }).fill("Playera");
  await expect(page.getByRole("heading", { name: "Playera Titanium", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Agregar al carrito", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Buscar por voz" })).toBeDisabled();
  await expect.poll(() => page.locator('main img[alt="Playera Titanium"]').evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
  for (const [id, name] of [["1", "Proteína Titanium"], ["2", "Playera Titanium"]]) {
    await page.goto(`/catalogue/${id}`);
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.locator(".pwa-skeleton-grid.detail")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Agregar al carrito", exact: true })).toBeDisabled();
    await shell(page);
  }
});

test("E: reconnect refreshes public data automatically and retry fetches new prices", async ({ page, context }) => {
  const state = await fixtures(context, false);
  await page.goto("/");
  await ready(page);
  await context.setOffline(true);
  await page.goto("/catalogue");
  await persistentSkeletons(page);
  state.available = true;
  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toBeVisible();
  await expect(page.locator(".pwa-skeleton-grid")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Agregar al carrito", exact: true }).first()).toBeEnabled();
  state.price = 575;
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("$575.00", { exact: false })).toBeVisible();
  // A backend failure with cached data preserves it and exposes manual retry.
  state.available = false;
  await page.reload();
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  state.available = true; state.price = 590;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("$590.00", { exact: false })).toBeVisible();
});

test("public persistence excludes credentials and private cache entries; plans recover offline", async ({ page, context }) => {
  const state = await fixtures(context);
  await page.addInitScript(() => localStorage.setItem("token", "test-sensitive-token"));
  await page.goto("/suscripciones");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Mensual Titanium", exact: true })).toBeVisible();
  await expect(page.locator(".pwa-skeleton-grid")).toHaveCount(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mensual Titanium", exact: true })).toBeVisible();
  await expect(page.locator(".pwa-skeleton-grid")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Comenzar Ahora" })).toHaveAttribute("aria-disabled", "true");
  expect(state.requests.filter((request) => request.path.endsWith("/memberships/plans")).every((request) => !request.authorization && !request.cookie)).toBe(true);
  const snapshot = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("titanium-public-v1"); request.onsuccess = () => resolve(request.result); });
    const values = await new Promise<unknown[]>((resolve) => { const request = db.transaction("resources").objectStore("resources").getAll(); request.onsuccess = () => resolve(request.result); });
    db.close(); return JSON.stringify(values);
  });
  expect(snapshot).not.toContain("test-sensitive-token");
  const urls = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).map((request) => request.url)))).flat());
  expect(urls.some((url) => /\/api\/|\/payment|\/admin|\/cliente/.test(url))).toBe(false);
});

test("online loading is bounded on an unresponsive API and respects reduced motion", async ({ page, context }) => {
  await fixtures(context, false);
  await context.route(/\/api\/products$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    await route.fulfill({ status: 503 }).catch(() => {});
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/catalogue");
  await expect(page.locator('.pwa-skeleton-grid[aria-busy="true"]')).toBeVisible();
  expect(await page.locator(".pwa-skeleton").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await expect(page.getByText(/No pudimos contactar al servidor/)).toBeVisible();
  await expect(page.locator('.pwa-skeleton-grid[aria-busy="true"]')).toHaveCount(0);
});

test("mobile public shell and skeleton fit the viewport", async ({ page, context }) => {
  await fixtures(context, false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await ready(page);
  await context.setOffline(true);
  await page.goto("/catalogue");
  await expect(page.getByText(waitingMessage)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await page.screenshot({ path: "test-results/catalogue-mobile-offline.png", fullPage: true });
});

test("voice integration handles es-MX transcript, cancel, permissions and unmount (controlled recognizer)", async ({ page, context }) => {
  await fixtures(context);
  await page.addInitScript(() => {
    class TestRecognition {
      lang = ""; continuous = true; interimResults = true;
      onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        window.addEventListener("test:speech-result", () => { this.onresult?.({ results: [[{ transcript: "Playera" }]] }); this.onend?.(); });
        window.addEventListener("test:speech-error", () => { this.onerror?.({ error: "not-allowed" }); this.onend?.(); });
      }
      start() { document.documentElement.dataset.speechLang = this.lang; }
      abort() {
        document.documentElement.dataset.speechAborted = "true";
        document.documentElement.dataset.speechCleaned = String(this.onresult === null && this.onerror === null && this.onend === null);
        this.onend?.();
      }
    }
    Object.defineProperty(window, "SpeechRecognition", { value: TestRecognition, configurable: true });
  });
  await page.goto("/catalogue");
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Buscar por voz" }).click();
  await expect(page.getByRole("button", { name: "Cancelar escucha" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator("html").getAttribute("data-speech-lang")).toBe("es-MX");
  await page.evaluate(() => window.dispatchEvent(new Event("test:speech-result")));
  await expect(page.getByRole("textbox", { name: "Buscar productos" })).toHaveValue("Playera");
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Buscar por voz" }).click();
  await page.getByRole("button", { name: "Cancelar escucha" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-speech-aborted", "true");
  await page.getByRole("button", { name: "Buscar por voz" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("test:speech-error")));
  await expect(page.getByText(/Permiso de micrófono denegado/)).toBeVisible();
  await page.getByRole("button", { name: "Buscar por voz" }).click();
  await page.getByRole("link", { name: "SUSCRIPCIONES", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-speech-cleaned", "true");
});

test("unsupported voice recognition leaves text search available", async ({ page, context }) => {
  await fixtures(context);
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
  });
  await page.goto("/catalogue");
  await expect(page.getByRole("button", { name: "Buscar por voz" })).toBeDisabled();
  await expect(page.getByText("Tu navegador no admite búsqueda por voz. Puedes escribir.")).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar productos" }).fill("Playera");
  await expect(page.getByRole("heading", { name: "Playera Titanium", exact: true })).toBeVisible();
});

test("manifest icons decode at the requested sizes and Chromium finds no installability errors", async ({ page, context }) => {
  await fixtures(context);
  await page.goto("/");
  await ready(page);
  const sizes = await page.evaluate(async () => {
    const manifest = await (await fetch("/manifest.webmanifest")).json();
    return Promise.all(manifest.icons.map(async (icon: { src: string }) => {
      const image = new Image(); image.src = icon.src; await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }));
  });
  expect(sizes).toEqual([[192, 192], [512, 512]]);
  const cdp = await context.newCDPSession(page);
  await expect.poll(async () => (await cdp.send("Page.getInstallabilityErrors")).installabilityErrors).toEqual([]);
  await cdp.detach();
});

test("unavailable IndexedDB leaves online content usable and offline skeletons waiting for connection", async ({ page, context }) => {
  await fixtures(context);
  await page.addInitScript(() => Object.defineProperty(window, "indexedDB", { get() { throw new Error("Test: storage denied"); } }));
  await page.goto("/catalogue");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await persistentSkeletons(page);
});

test("partial saved gym information retains local informational text and images offline", async ({ page, context }) => {
  await fixtures(context);
  await page.goto("/about");
  await ready(page);
  await expect(page.getByText("Cargando contenido público…", { exact: true })).toHaveCount(0);
  await expect(page.locator(".pwa-resource-notice")).toHaveCount(0);
  await expect(page.getByText(/En Titanium Sport Gym, hemos creado un espacio/)).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Mostrando contenido guardado/)).toBeVisible();
  await expect(page.getByText(/En Titanium Sport Gym, hemos creado un espacio/)).toBeVisible();
  await expect(page.getByText(/Mapa no disponible sin conexión/)).toBeVisible();
  await shell(page);
});

for (const scenario of [
  { route: "/catalogue/1", grids: 1, heading: "Proteína Titanium" },
  { route: "/suscripciones", grids: 1, heading: "Mensual Titanium" },
  { route: "/", grids: 2, heading: "Proteína Titanium" },
]) {
  test(`${scenario.route}: offline skeletons persist until real data arrives after reconnection`, async ({ page, context }) => {
    const state = await fixtures(context, false);
    await page.goto("/");
    await ready(page);
    await context.setOffline(true);
    await page.goto(scenario.route);
    await persistentSkeletons(page, scenario.grids);
    await shell(page);
    if (scenario.route === "/") {
      await expect(page.getByRole("heading", { name: "Titanium Sport Gym", exact: true })).toBeVisible();
      expect(await page.locator("main img").count()).toBeGreaterThan(0);
    }
    state.available = true;
    state.latencyMs = 1500;
    await context.setOffline(false);
    // Restoring the connection alone is insufficient: keep the skeleton while
    // the real network request is still waiting for its controlled response.
    await expect(page.getByText(waitingMessage, { exact: true })).toHaveCount(0);
    await expect(page.locator('.pwa-skeleton-grid[aria-busy="true"]').first()).toBeVisible();
    await expect(page.getByRole("heading", { name: scenario.heading, exact: true })).toBeVisible();
    await expect(page.locator('.pwa-skeleton-grid[aria-busy="true"]')).toHaveCount(0);
    if (scenario.route === "/") await expect(page.getByRole("heading", { name: "Mensual Titanium", exact: true })).toBeVisible();
  });
}

test("offline waiting respects reduced motion without replacing the skeleton", async ({ page, context }) => {
  await fixtures(context, false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await ready(page);
  await context.setOffline(true);
  await page.goto("/catalogue");
  const grid = page.getByLabel("Esperando conexión para cargar el contenido", { exact: true });
  await expect(grid).toBeVisible();
  // Run beyond the previous cutoff, even when there is no animation clock to
  // observe. A real offline event and real IndexedDB lookup still happen.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1200)));
  await expect(grid).toBeVisible();
  expect(await grid.locator(".pwa-skeleton").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await expect(page.locator(".pwa-skeleton-grid.unavailable")).toHaveCount(0);
  await expect(page.getByText(waitingMessage)).toBeVisible();
});

test("reconnecting to a failing backend stops loading and offers retry without a saved snapshot", async ({ page, context }) => {
  const state = await fixtures(context, false);
  await page.goto("/");
  await ready(page);
  await context.setOffline(true);
  await page.goto("/catalogue");
  await persistentSkeletons(page);
  await context.setOffline(false);
  await expect(page.getByText(/No pudimos contactar al servidor/)).toBeVisible();
  await expect(page.locator('.pwa-skeleton-grid[aria-busy="true"]')).toHaveCount(0);
  state.available = true;
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Proteína Titanium", exact: true })).toBeVisible();
  await expect(page.locator(".pwa-skeleton-grid")).toHaveCount(0);
});

test("a saved empty catalogue is usable offline without waiting skeletons", async ({ page, context }) => {
  await fixtures(context);
  await context.route(/\/api\/products$/, (route) => route.fulfill({ status: 200, json: [], headers: { "Access-Control-Allow-Origin": "*" } }));
  await page.goto("/catalogue");
  await ready(page);
  await expect(page.getByRole("heading", { name: "No encontramos coincidencias", exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Mostrando contenido guardado/)).toBeVisible();
  await expect(page.getByText(waitingMessage)).toHaveCount(0);
  await expect(page.locator(".pwa-skeleton-grid")).toHaveCount(0);
});
