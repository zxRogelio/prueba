import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const welcomeKey = "titanium:pwa-welcome";
const title = "Titanium Sport Gym";
const body = "¡Bienvenido a Titanium! Las notificaciones están activadas correctamente.";

// Windows' headless shell denies Notification.permission even when the
// permission service grants it. Use the full Chromium binary in headless mode.
test.use({ channel: "chromium" });

declare global {
  interface Window {
    __notificationTest: {
      requests: number;
      calls: { title: string; options: NotificationOptions }[];
    };
  }
}

async function isolateNetwork(context: BrowserContext) {
  await context.route("https://t.contentsquare.net/**", (route) => route.abort());
  await context.route(/\/api\//, (route) => route.fulfill({
    status: 503, json: {}, headers: { "Access-Control-Allow-Origin": "*" },
  }));
}

async function installedMode(page: Page, ios = false) {
  // Model installed mode only. Browser/OS installation itself is a manual test.
  await page.addInitScript((useIos) => {
    if (useIos) {
      Object.defineProperty(navigator, "standalone", { value: true });
    } else {
      const matchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const media = matchMedia(query);
        if (query === "(display-mode: standalone)") Object.defineProperty(media, "matches", { value: true });
        return media;
      };
    }
  }, ios);
}

async function controlledNotifications(page: Page, outcome: NotificationPermission = "granted", fails = false, initial: NotificationPermission = "default") {
  await page.addInitScript(({ result, fail, initialPermission }) => {
    let permission: NotificationPermission = initialPermission;
    window.__notificationTest = { requests: 0, calls: [] };
    Object.defineProperty(Notification, "permission", { get: () => permission });
    Object.defineProperty(Notification, "requestPermission", { value: async () => {
      window.__notificationTest.requests += 1;
      permission = result;
      return result;
    } });
    ServiceWorkerRegistration.prototype.showNotification = async function (notificationTitle, options = {}) {
      if (fail) throw new Error("Test: notification delivery unavailable");
      window.__notificationTest.calls.push({ title: notificationTitle, options });
    };
  }, { result: outcome, fail: fails, initialPermission: initial });
}

async function ready(page: Page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

const card = (page: Page) => page.getByRole("complementary", { name: "¡Bienvenido a Titanium!" });

test.beforeEach(async ({ context }) => { await isolateNetwork(context); });

test("normal browser visits never invite notifications or show the precache-ready notice", async ({ page }) => {
  await controlledNotifications(page);
  await page.goto("/");
  await ready(page);
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByText("Aplicación lista para abrirse sin conexión. Los datos dependen de lo guardado.")).toHaveCount(0);
  expect(await page.evaluate(() => window.__notificationTest)).toEqual({ requests: 0, calls: [] });
  expect(await page.evaluate((key) => localStorage.getItem(key), welcomeKey)).toBeNull();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Titanium Sport Gym", exact: true })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.__notificationTest.requests)).toBe(0);
});

test("first installed opening asks once, only requests permission on click and remembers success", async ({ page }) => {
  await installedMode(page);
  await controlledNotifications(page);
  await page.goto("/");
  await ready(page);
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByText("¿Deseas activar las notificaciones de Titanium Sport Gym?")).toBeVisible();
  expect(await page.evaluate(() => window.__notificationTest.requests)).toBe(0);
  await card(page).getByRole("button", { name: "Activar notificaciones" }).click();
  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.__notificationTest)).toEqual({
    requests: 1, calls: [{ title, options: { body, icon: "/icons/pwa-192.png", tag: "titanium-welcome" } }],
  });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).outcome, welcomeKey)).toBe("notified");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Titanium Sport Gym", exact: true })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.__notificationTest)).toEqual({ requests: 0, calls: [] });
});

test("iOS standalone shows the invitation; deferring persists without requesting permission", async ({ page }) => {
  await installedMode(page, true);
  await controlledNotifications(page);
  await page.goto("/");
  await expect(card(page)).toBeVisible();
  await card(page).getByRole("button", { name: "Ahora no" }).click();
  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.__notificationTest)).toEqual({ requests: 0, calls: [] });
  await page.getByRole("link", { name: "PRODUCTOS", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catalogo de productos" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Catalogo de productos" })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

for (const outcome of ["denied", "default"] as const) {
  test(`permission result ${outcome} is remembered without sending a notification`, async ({ page }) => {
    await installedMode(page);
    await controlledNotifications(page, outcome);
    await page.goto("/");
    await card(page).getByRole("button", { name: "Activar notificaciones" }).click();
    await expect(card(page).getByRole("status")).toContainText(outcome === "denied" ? "bloqueadas" : "No se activaron");
    expect(await page.evaluate(() => window.__notificationTest)).toEqual({ requests: 1, calls: [] });
    await page.getByRole("link", { name: "PRODUCTOS", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catalogo de productos" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Catalogo de productos" })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  });
}

test("blocked permissions are explained without invoking requestPermission", async ({ page }) => {
  await installedMode(page);
  await controlledNotifications(page, "granted", false, "denied");
  await page.goto("/");
  await expect(card(page).getByText(/Las notificaciones están bloqueadas/)).toBeVisible();
  await expect(card(page).getByRole("button", { name: "Activar notificaciones" })).toBeDisabled();
  await card(page).getByRole("button", { name: "Ahora no" }).click();
  expect(await page.evaluate(() => window.__notificationTest.requests)).toBe(0);
});

test("unsupported notifications do not block the installed application", async ({ page }) => {
  await installedMode(page);
  await page.addInitScript(() => Object.defineProperty(window, "Notification", { value: undefined }));
  await page.goto("/");
  await expect(card(page).getByText(/Este navegador no permite/)).toBeVisible();
  await expect(card(page).getByRole("button", { name: "Activar notificaciones" })).toBeDisabled();
  await card(page).getByRole("button", { name: "Ahora no" }).click();
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Titanium Sport Gym", exact: true })).toBeVisible();
});

test("notification delivery failure stays non-blocking and does not repeat after reload", async ({ page }) => {
  await installedMode(page);
  await controlledNotifications(page, "granted", true);
  await page.goto("/");
  await ready(page);
  await card(page).getByRole("button", { name: "Activar notificaciones" }).click();
  await expect(card(page).getByText(/El navegador no pudo activar/)).toBeVisible();
  await card(page).getByRole("button", { name: "Ahora no" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Titanium Sport Gym", exact: true })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

test("a previous attended welcome survives SW replacement", async ({ page }) => {
  await installedMode(page);
  await page.goto("/");
  await ready(page);
  await card(page).getByRole("button", { name: "Ahora no" }).click();
  const saved = await page.evaluate((key) => localStorage.getItem(key), welcomeKey);
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.unregister(); });
  await page.reload();
  await ready(page);
  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), welcomeKey)).toBe(saved);
});

test("installed welcome fits a mobile viewport and remains dismissible offline", async ({ page, context }) => {
  await installedMode(page);
  await controlledNotifications(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await ready(page);
  await context.setOffline(true);
  await page.reload();
  await expect(card(page)).toBeVisible();
  expect(await card(page).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
  })).toBe(true);
  await page.screenshot({ path: "test-results/welcome-mobile-offline.png" });
  await card(page).getByRole("button", { name: "Ahora no" }).click();
  await expect(card(page)).toHaveCount(0);
});

test("native Chromium permission and the existing SW deliver one persistent welcome notification", async ({ page, context }) => {
  await installedMode(page);
  // The browser grants permission for automation; no permission API or delivery
  // method is stubbed in this test. Visibility of an OS toast is still manual.
  await context.grantPermissions(["notifications"], { origin: "http://localhost:4173" });
  await page.goto("/");
  await ready(page);
  expect(await page.evaluate(() => Notification.permission)).toBe("granted");
  expect(await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications({ tag: "titanium-welcome" })).length)).toBe(0);
  await card(page).getByRole("button", { name: "Activar notificaciones" }).click();
  await expect(card(page)).toHaveCount(0);
  const notifications = () => page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications({ tag: "titanium-welcome" }))
    .map((notification) => ({ title: notification.title, body: notification.body, icon: notification.icon })));
  await expect.poll(notifications).toEqual([{ title, body, icon: "http://localhost:4173/icons/pwa-192.png" }]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Titanium Sport Gym", exact: true })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  expect(await notifications()).toHaveLength(1);
  await page.evaluate(async () => {
    for (const notification of await (await navigator.serviceWorker.ready).getNotifications({ tag: "titanium-welcome" })) notification.close();
  });
});
