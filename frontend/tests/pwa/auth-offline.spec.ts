import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const notice = "Necesitas conexión a internet para realizar esta operación";
const email = "offline-auth-sentinel@example.test";
const password = "Offline-Sentinel-42!";
const responseMarker = "auth-response-must-not-be-cached";
const forms = [
  { path: "/login", title: "Iniciar Sesion", button: "Entrar a mi cuenta", email: "#login-email", password: "#login-password" },
  { path: "/register", title: "Crear Cuenta", button: "Crear Cuenta", email: "#register-email", password: "#register-password" },
  { path: "/forgot-password", title: "Recuperar Contraseña", button: "Enviar código", email: "#email", password: null },
] as const;

async function prepare(page: Page, context: BrowserContext) {
  const posts: { path: string; body: unknown }[] = [];
  context.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname.includes("/auth/")) {
      posts.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
    }
  });
  await context.route("https://t.contentsquare.net/**", (route) => route.abort());
  await context.route("https://www.google.com/**", (route) => route.abort());
  // Controlled failures exercise the existing online handlers without logging
  // into an account, creating users, or sending real recovery messages.
  await context.route(/\/api\//, (route) => route.fulfill({
    status: 400, json: { message: responseMarker }, headers: { "Access-Control-Allow-Origin": "*" },
  }));
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open("titanium-public-pages-v1");
    return (await Promise.all(["/login", "/register", "/forgot-password"].map((path) => cache.match(path)))).every(Boolean);
  })).toBe(true);
  return posts;
}

async function assertNoSensitivePersistence(page: Page) {
  const violations = await page.evaluate(async (markers) => {
    const found: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        const body = await response!.text();
        if (request.method !== "GET" || request.headers.has("authorization") || /\/api\//.test(request.url) ||
            markers.some((marker) => `${request.url}${body}`.includes(marker))) found.push(`${name}: ${request.url}`);
      }
    }
    if ((await indexedDB.databases()).some((database) => database.name === "titanium-public-v1")) {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("titanium-public-v1");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const snapshots = await new Promise<unknown[]>((resolve, reject) => {
          const request = database.transaction("resources").objectStore("resources").getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        if (markers.some((marker) => JSON.stringify(snapshots).includes(marker))) found.push("public IndexedDB");
      } finally { database.close(); }
    }
    return found;
  }, [email, password, responseMarker]);
  expect(violations).toEqual([]);
}

for (const form of forms) {
  test(`${form.path}: first visit and reload offline, no auth requests or replay, explicit online retry`, async ({ page, context }) => {
    const posts = await prepare(page, context);
    await context.setOffline(true);
    // Neither the form nor its route was visited during preparation.
    await page.goto(form.path);
    for (const reload of [false, true]) {
      if (reload) await page.reload();
      await expect(page.getByRole("heading", { name: form.title, exact: true })).toBeVisible();
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.locator(".smart-footer")).toBeVisible();
      await expect(page.getByText(notice, { exact: true })).toBeVisible();
      await expect(page.locator(form.email)).toBeVisible();
      await expect(page.getByRole("button", { name: form.button, exact: true })).toBeDisabled();
      await expect(page.locator(".auth-image-section")).toBeVisible();
      // Decode the actual CSS background while offline, not just its CSS URL.
      expect(await page.locator(".auth-image-section").evaluate(async (element) => {
        const background = getComputedStyle(element).backgroundImage;
        const url = /^url\(["']?(.*?)["']?\)$/.exec(background)?.[1];
        if (!url) return false;
        const image = new Image();
        image.src = url;
        await image.decode();
        return image.naturalWidth > 0;
      })).toBe(true);
    }
    if (form.path === "/login") await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeDisabled();
    await page.locator(form.email).fill(email);
    if (form.password) await page.locator(form.password).fill(password);
    if (form.path === "/register") {
      await page.locator("#register-confirm-password").fill(password);
      await page.getByRole("checkbox").check();
    }
    // Also exercise the handler guard when submission bypasses disabled buttons.
    await page.locator("form.auth-form").evaluate((element) => (element as HTMLFormElement).requestSubmit());
    await page.waitForTimeout(300);
    expect(posts).toEqual([]);
    await assertNoSensitivePersistence(page);
    await context.setOffline(false);
    await expect(page.getByText(notice, { exact: true })).toHaveCount(0);
    const submit = page.getByRole("button", { name: form.button, exact: true });
    await expect(submit).toBeEnabled();
    await page.waitForTimeout(300);
    expect(posts).toEqual([]); // reconnection never replays credentials
    const dialogs: string[] = [];
    page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.accept(); });
    await submit.click();
    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0]).toEqual({
      path: `/api/auth${form.path === "/forgot-password" ? "/forgot-password" : form.path}`,
      body: form.path === "/forgot-password" ? { email } :
        { email, password, ...(form.path === "/register" ? { role: "cliente" } : {}) },
    });
    if (form.path === "/forgot-password") {
      await expect.poll(() => dialogs).toEqual(["Ocurrió un error al procesar la solicitud, intenta de nuevo."]);
    } else {
      await expect(page.locator(".auth-error")).toContainText(form.path === "/login" ? "Correo o contrasena incorrectos." : responseMarker);
    }
    await assertNoSensitivePersistence(page);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText(notice, { exact: true })).toBeVisible();
    await expect(page.locator(form.email)).toHaveValue("");
    if (form.password) await expect(page.locator(form.password)).toHaveValue("");
    expect(posts).toHaveLength(1);
  });
}

for (const installed of [false, true]) {
  test(`auth links navigate offline (${installed ? "standalone emulated" : "browser"})`, async ({ page, context }) => {
    if (installed) await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
    await prepare(page, context);
    if (installed) await page.getByRole("button", { name: "Ahora no", exact: true }).click();
    await context.setOffline(true);
    await page.goto("/login?next=%2Fcatalogue");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Iniciar Sesion", exact: true })).toBeVisible();
    const marker = await page.evaluate(() => { Object.assign(window, { authNavigationMarker: "same-document" }); return "same-document"; });
    await page.getByRole("link", { name: "Registrate aqui", exact: true }).click();
    await expect(page).toHaveURL(/\/register$/);
    await page.getByRole("link", { name: "Inicia sesion aqui", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("link", { name: "Recuperar Contraseña", exact: true }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByText(notice, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => Reflect.get(window, "authNavigationMarker"))).toBe(marker);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Recuperar Contraseña", exact: true })).toBeVisible();
    await assertNoSensitivePersistence(page);
  });
}
