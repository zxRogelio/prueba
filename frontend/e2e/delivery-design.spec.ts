import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type { ProductOrder, SavedAddress, PickupSettings, ShippingRate } from "../src/services/deliveryService";

const origin = "http://127.0.0.1:5198";
const at = "2026-11-02T14:30:00.000Z";
const address: SavedAddress = { id: "synthetic-address", recipientName: "Cliente de ejemplo", phone: "5550100000", street: "Calle de prueba", exteriorNumber: "10", interiorNumber: "",
  neighborhood: "Colonia de ejemplo", municipality: "Ciudad de México", state: "Ciudad de México", postalCode: "01000", references: "Acceso de prueba", isDefault: true };
const pickup: PickupSettings = { name: "Titanium Sport Gym", address: "Ubicación sintética · Calle de prueba 10", municipality: "Ciudad de México", state: "Ciudad de México",
  postalCode: "01000", phone: "5550100000", hours: "Lunes a viernes, 7:00 a 21:00", instructions: "Presenta el número de pedido en recepción.", enabled: true };
function order(method: "pickup" | "delivery", status: string, number: number): ProductOrder {
  return { id: `synthetic-order-${number}`, orderNumber: `TSG-2026-00${number}`, status: status === "awaiting_payment" ? "pending_payment" : "paid", createdAt: at,
    paidAt: status === "awaiting_payment" ? null : at, subtotal: "500.00", discountTotal: "0.00", taxTotal: "0.00", shippingTotal: method === "delivery" ? "75.00" : "0.00", total: method === "delivery" ? "575.00" : "500.00", currency: "MXN", customer: { email: "cliente@example.test" },
    items: [{ id: "synthetic-item", itemType: "product", itemNameSnapshot: "Playera de entrenamiento Titanium", quantity: 2, unitPrice: "250.00", discountAmount: "0.00", subtotal: "500.00" }], payments: [{ id: "synthetic-payment", status: status === "awaiting_payment" ? "pending" : "paid", amount: method === "delivery" ? "575.00" : "500.00", paidAt: status === "awaiting_payment" ? null : at }],
    fulfillment: { id: `synthetic-fulfillment-${number}`, method, status, recipientName: address.recipientName, phone: address.phone, addressSnapshot: method === "delivery" ? address : null, pickupLocationSnapshot: method === "pickup" ? pickup : null, shippingCost: method === "delivery" ? "75.00" : "0.00",
      carrier: status === "shipped" ? "Paquetería de ejemplo" : null, trackingNumber: status === "shipped" ? "TSG-SINTETICA-2026" : null,
      preparedAt: status === "shipped" ? at : null, packedAt: status === "shipped" ? at : null, shippedAt: status === "shipped" ? at : null,
      readyAt: null, pickedUpAt: null, deliveredAt: null, cancelledAt: null,
      allowedTransitions: status === "payment_confirmed" ? ["preparing", "incident", "cancelled"] : status === "packed" ? ["shipped", "incident"] : [],
      events: status === "awaiting_payment" ? [{ id: "synthetic-event-pending", fromStatus: null, toStatus: "awaiting_payment", createdAt: at, notes: null }]
        : ["awaiting_payment", "payment_confirmed", ...(status === "shipped" ? ["preparing", "packed", "shipped"] : [])].map((value, i) => ({ id: `synthetic-event-${i}`, fromStatus: null, toStatus: value, createdAt: at, notes: value === "shipped" ? "Tu pedido está en camino." : null })) },
  };
}

async function mockUi(page: Page, options: { admin?: boolean; empty?: boolean; error?: boolean; slow?: boolean } = {}) {
  const orders = [order("pickup", "payment_confirmed", 1), order("delivery", "shipped", 2), order("delivery", "awaiting_payment", 3), order("delivery", "packed", 4)];
  let addresses = [structuredClone(address)];
  const rates: ShippingRate[] = [{ id: "synthetic-rate", name: "Zona de ejemplo", postalCodeFrom: "01000", postalCodeTo: "01999", amount: "75.00", active: true }];
  const requests: Array<{ path: string; method: string; body: Record<string, unknown> | null }> = [];
  const errors: string[] = [];
  const resourceFailures: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    if (["script", "document"].includes(request.resourceType())) resourceFailures.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`);
  });
  await page.addInitScript(({ admin }) => {
    localStorage.setItem("user", JSON.stringify({ id: "synthetic-user", email: "cliente@example.test", rol: admin ? "administrador" : "cliente" }));
    localStorage.setItem("token", "design-only-not-a-real-token");
    localStorage.setItem("sidebarCollapsed", "true"); localStorage.setItem("clientSidebarCollapsed", "true");
    localStorage.setItem("titanium_cart_items", JSON.stringify([{ id: 101, name: "Playera Titanium", price: 250, quantity: 2, image: "/src/assets/LogoP.png" }]));
  }, { admin: !!options.admin });
  await page.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    // No provider, database, public API or other network destination may pass.
    if (url.origin !== origin) return route.abort("blockedbyclient");
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(4), method = request.method();
    const body = method === "GET" ? null : request.postDataJSON() as Record<string, unknown>;
    requests.push({ path, method, body });
    if (/mercadopago|payments|refund/i.test(path)) return route.fulfill({ status: 403, json: { error: "Payments are forbidden in visual tests." } });
    if (options.slow) await new Promise((resolve) => setTimeout(resolve, 700));
    if (options.error) return route.fulfill({ status: 503, json: { error: "No se pudo consultar la información. Intenta nuevamente." } });
    if (path === "/delivery/options") return route.fulfill({ json: { pickupLocation: pickup } });
    if (path === "/addresses/me" && method === "GET") return route.fulfill({ json: { addresses: options.empty ? [] : addresses } });
    if (path.startsWith("/addresses/me") && method !== "GET") {
      const id = path.split("/")[3] || "synthetic-new-address";
      if (method === "DELETE") { addresses = addresses.filter((item) => item.id !== id); return route.fulfill({ status: 204 }); }
      const saved = { ...body, id } as SavedAddress;
      addresses = [...addresses.filter((item) => item.id !== id), saved];
      return route.fulfill({ json: { address: saved } });
    }
    if (["/orders/me", "/admin/orders"].includes(path)) {
      const filtered = options.empty ? [] : orders.filter((item) => (!url.searchParams.get("deliveryMethod") || item.fulfillment?.method === url.searchParams.get("deliveryMethod")) && (!url.searchParams.get("fulfillmentStatus") || item.fulfillment?.status === url.searchParams.get("fulfillmentStatus")));
      return route.fulfill({ json: { orders: filtered, pagination: { page: 1, pages: 1, total: filtered.length } } });
    }
    if (path.startsWith("/orders/")) return route.fulfill({ json: { order: orders.find((item) => item.id === path.split("/")[2]) } });
    if (path.endsWith("/fulfillment") && method === "PATCH") {
      const selected = orders.find((item) => item.id === path.split("/")[3]);
      if (selected?.fulfillment) { selected.fulfillment.status = String(body?.status); selected.fulfillment.carrier = String(body?.carrier || ""); selected.fulfillment.trackingNumber = String(body?.trackingNumber || ""); selected.fulfillment.events.push({ id: "synthetic-updated-event", fromStatus: String(body?.expectedStatus), toStatus: String(body?.status), createdAt: at, notes: String(body?.notes || "") }); }
      return route.fulfill({ json: { ok: true } });
    }
    if (path === "/admin/pickup-settings") return route.fulfill({ json: { configured: true, settings: method === "PUT" ? body : pickup } });
    if (path.startsWith("/admin/shipping-rates")) return route.fulfill({ json: method === "GET" ? { rates } : { rate: body } });
    if (path === "/checkout/product-quote") {
      const fulfillment = body?.fulfillment as { method: string; address?: SavedAddress };
      const delivery = fulfillment.method === "delivery";
      return route.fulfill({ json: { subtotal: "500.00", discountTotal: "0.00", taxTotal: "0.00", shippingTotal: delivery ? "75.00" : "0.00", total: delivery ? "575.00" : "500.00", quoteToken: "synthetic-quote-only", expiresAt: new Date(Date.now() + 900000).toISOString(), items: [{ productId: 101, subtotal: "500.00" }], fulfillment: orders[0].fulfillment } });
    }
    return route.fulfill({ status: 404, json: { error: "Unknown synthetic route" } });
  });
  return { requests, errors, resourceFailures };
}

async function checkLayout(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth,
    controls: [...document.querySelectorAll<HTMLElement>(".delivery-page button, .delivery-page input, .delivery-page select, .delivery-checkout button, .delivery-checkout input, .delivery-checkout select")].filter((item) => item.getBoundingClientRect().width > 0 && (item.getBoundingClientRect().right > innerWidth + 1 || item.getBoundingClientRect().left < -1)).map((item) => item.outerHTML.slice(0, 140)) }));
  expect(overflow.document, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport);
  expect(overflow.controls, JSON.stringify(overflow)).toEqual([]);
}

for (const width of [1440, 1024, 768, 390, 320]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } });
    for (const screen of ["checkout-pickup", "checkout-delivery", "orders", "tracking", "addresses", "admin", "settings"] as const) {
      test(`${screen}: responsive and screenshot`, async ({ page }) => {
        const fixture = await mockUi(page, { admin: ["admin", "settings"].includes(screen) });
        const path = screen.startsWith("checkout") ? "/checkout" : screen === "addresses" ? "/cliente/direcciones" : ["admin", "settings"].includes(screen) ? "/admin/pedidos" : "/cliente/pedidos";
        await page.goto(path);
        try { await expect(page.locator(".delivery-hero, .delivery-checkout-heading")).toBeVisible(); }
        catch (error) { await test.info().attach("local-render-diagnostics", { body: JSON.stringify({ errors: fixture.errors, resourceFailures: fixture.resourceFailures }), contentType: "application/json" }); throw error; }
        if (screen === "checkout-delivery") await page.getByRole("radio", { name: /Envío a domicilio/ }).check();
        if (screen === "tracking") { await page.getByRole("button", { name: /Ver pedido y seguimiento TSG-2026-002/ }).click(); await expect(page.getByRole("heading", { name: "Seguimiento de entrega" })).toBeVisible(); }
        if (screen === "settings") { await page.getByText("Configuración de recogida en gimnasio", { exact: true }).click(); await page.getByText("Tarifas y cobertura de envíos", { exact: true }).click(); await expect(page.getByRole("button", { name: "Guardar tarifa", exact: true })).toBeVisible(); }
        await expect(page.locator(".delivery-loading")).toHaveCount(0);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await checkLayout(page);
        await mkdir("test-results/delivery-design/screenshots", { recursive: true });
        await page.screenshot({ path: `test-results/delivery-design/screenshots/${screen}-${width}.png`, fullPage: true, animations: "disabled" });
        expect(fixture.errors).toEqual([]);
      });
    }
  });
}

test("checkout quotes both methods, preserves the confirmation gate and sends no payments", async ({ page }) => {
  const fixture = await mockUi(page);
  await page.goto("/checkout");
  await page.getByLabel("Nombre del destinatario", { exact: true }).fill("Cliente de ejemplo");
  await page.getByLabel("Teléfono", { exact: true }).fill("5550100000");
  await page.getByRole("button", { name: "CONSULTAR TOTAL Y ENVÍO" }).click();
  await expect(page.getByRole("button", { name: "PAGAR CON MERCADO PAGO" })).toBeVisible();
  expect(await page.locator("form").evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
  await page.getByRole("checkbox", { name: /Confirmo el método/ }).check();
  expect(await page.locator("form").evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(true);
  await page.getByRole("radio", { name: /Envío a domicilio/ }).check();
  await expect(page.getByRole("button", { name: "CONSULTAR TOTAL Y ENVÍO" })).toBeVisible();
  await page.getByLabel("Dirección guardada").selectOption("synthetic-address");
  await page.getByRole("button", { name: "CONSULTAR TOTAL Y ENVÍO" }).click();
  await expect(page.locator(".delivery-confirmation > strong")).toHaveText("$575.00");
  expect(fixture.requests.filter((item) => item.path === "/checkout/product-quote")).toHaveLength(2);
  expect(fixture.requests.some((item) => item.path.includes("mercadopago"))).toBe(false);
});

test("addresses: edit, save, cancel deletion, then confirm deletion", async ({ page }) => {
  const fixture = await mockUi(page);
  await page.goto("/cliente/direcciones");
  await page.getByRole("button", { name: "Editar dirección de Cliente de ejemplo", exact: true }).click();
  await expect(page.getByLabel("Nombre del destinatario", { exact: true })).toBeFocused();
  await page.getByLabel("Número exterior", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Guardar dirección", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Dirección guardada correctamente.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Eliminar dirección de Cliente de ejemplo", exact: true }).click();
  expect(fixture.requests.some((item) => item.method === "DELETE")).toBe(false);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar dirección de Cliente de ejemplo", exact: true }).click();
  await expect(page.locator(".delivery-address-card")).toHaveCount(0);
  expect(fixture.requests.filter((item) => item.method === "DELETE")).toHaveLength(1);
});

test("admin filters use existing API parameters and pending orders expose no state form", async ({ page }) => {
  await mockUi(page, { admin: true });
  await page.goto("/admin/pedidos");
  await page.getByLabel("Método de entrega").selectOption("delivery");
  await page.getByLabel("Estado logístico").selectOption("awaiting_payment");
  await expect(page.locator(".delivery-orders-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Gestionar TSG-2026-003", exact: true }).click();
  await expect(page.getByText("No hay cambios logísticos disponibles para el estado actual.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar cambio de estado" })).toHaveCount(0);
  await expect(page.locator(".delivery-progress .is-complete")).toHaveCount(0);
});

test("admin: shipping carrier and tracking fields preserve PATCH and expectedStatus", async ({ page }) => {
  const fixture = await mockUi(page, { admin: true });
  await page.goto("/admin/pedidos");
  await page.getByRole("button", { name: "Gestionar TSG-2026-004", exact: true }).click();
  await page.getByLabel("Nuevo estado").selectOption("shipped");
  await page.getByLabel("Paquetería", { exact: true }).fill("Paquetería de ejemplo");
  await page.getByLabel("Número de guía", { exact: true }).fill("GUIA-SINTETICA-4");
  await page.getByRole("button", { name: "Confirmar cambio de estado" }).click();
  await expect.poll(() => fixture.requests.filter((item) => item.method === "PATCH")).toHaveLength(1);
  expect(fixture.requests.find((item) => item.method === "PATCH")?.body).toMatchObject({ status: "shipped", expectedStatus: "packed", carrier: "Paquetería de ejemplo", trackingNumber: "GUIA-SINTETICA-4" });
});

for (const mode of ["empty", "error", "slow"] as const) test(`orders: ${mode} feedback`, async ({ page }) => {
  await mockUi(page, { [mode]: true });
  await page.goto("/cliente/pedidos");
  if (mode === "empty") await expect(page.getByRole("heading", { name: "Tu próximo objetivo empieza aquí" })).toBeVisible();
  if (mode === "error") await expect(page.getByRole("alert")).toContainText("No se pudo consultar");
  if (mode === "slow") { await expect(page.getByRole("status")).toContainText("Consultando pedidos"); await expect(page.locator(".delivery-order-card")).toHaveCount(4); }
});

test("keyboard focus, associated labels and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockUi(page);
  await page.goto("/checkout");
  const radio = page.getByRole("radio", { name: /Recoger en gimnasio/ });
  await radio.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /Envío a domicilio/ })).toBeChecked();
  await page.getByLabel("Dirección guardada").selectOption("");
  const phone = page.getByLabel("Teléfono", { exact: true }); await phone.focus();
  expect(await phone.evaluate((input) => getComputedStyle(input).outlineStyle)).not.toBe("none");
  expect(await page.locator(".delivery-checkout button").first().evaluate((button) => getComputedStyle(button).transitionDuration)).toBe("0s");
  await expect(page.getByLabel("Código postal", { exact: true })).toHaveAttribute("pattern", "[0-9]{5}");
});

test("mobile navigation opens and closes without hiding delivery controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockUi(page, { admin: true });
  await page.goto("/admin/pedidos");
  await page.getByRole("button", { name: "Abrir o cerrar menu lateral", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cerrar menú lateral", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar menú lateral", exact: true }).click();
  await expect(page.locator("aside > div")).toBeHidden();
  await page.getByText("Configuración de recogida en gimnasio", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Guardar configuración de recogida" })).toBeVisible();
});

test("pickup settings and shipping rates preserve their existing write contracts", async ({ page }) => {
  const fixture = await mockUi(page, { admin: true });
  await page.goto("/admin/pedidos");
  await page.getByText("Configuración de recogida en gimnasio", { exact: true }).click();
  await page.getByLabel("Horarios de recogida", { exact: true }).fill("Lunes a viernes, 8:00 a 20:00");
  await page.getByRole("button", { name: "Guardar configuración de recogida", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Configuración de recogida guardada.");
  expect(fixture.requests.find((item) => item.method === "PUT")?.body?.hours).toBe("Lunes a viernes, 8:00 a 20:00");
  await page.getByText("Tarifas y cobertura de envíos", { exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Zona sintética");
  await page.getByLabel("Importe MXN", { exact: true }).fill("85.00");
  await page.getByLabel("CP inicial", { exact: true }).fill("02000");
  await page.getByLabel("CP final", { exact: true }).fill("02999");
  await page.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
  await expect(page.getByText("Tarifa guardada correctamente.", { exact: true })).toBeVisible();
  expect(fixture.requests.find((item) => item.method === "POST" && item.path === "/admin/shipping-rates")?.body).toMatchObject({ name: "Zona sintética", amount: "85.00", postalCodeFrom: "02000", postalCodeTo: "02999", active: true });
});

test("adding an address after editing clears the draft and creates without overwriting", async ({ page }) => {
  const fixture = await mockUi(page);
  await page.goto("/cliente/direcciones");
  await page.getByRole("button", { name: "Editar dirección de Cliente de ejemplo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Editar dirección", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agregar dirección", exact: true }).click();
  await expect(page.getByLabel("Nombre del destinatario", { exact: true })).toHaveValue("");
  for (const [name, value] of Object.entries(address)) {
    if (!["id", "isDefault"].includes(name)) await page.locator(`[name="${name}"]`).fill(String(value));
  }
  await page.getByRole("button", { name: "Guardar dirección", exact: true }).click();
  await expect(page.getByText("Dirección guardada correctamente.")).toBeVisible();
  expect(fixture.requests.filter((item) => item.path === "/addresses/me" && item.method === "POST")).toHaveLength(1);
  expect(fixture.requests.some((item) => item.method === "PUT")).toBe(false);
  await expect(page.locator(".delivery-address-card")).toHaveCount(2);
});

test("reopening the same order keeps client and admin details available", async ({ page, context }) => {
  let fixture = await mockUi(page);
  await page.goto("/cliente/pedidos");
  for (let index = 0; index < 2; index++) {
    await page.getByRole("button", { name: "Ver pedido y seguimiento TSG-2026-001", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Seguimiento de entrega", exact: true })).toBeVisible();
  }
  await expect.poll(() => fixture.requests.filter((item) => item.path === "/orders/synthetic-order-1").length).toBe(2);
  const admin = await context.newPage();
  fixture = await mockUi(admin, { admin: true });
  await admin.goto("/admin/pedidos");
  for (let index = 0; index < 2; index++) {
    await admin.getByRole("button", { name: "Gestionar TSG-2026-001", exact: true }).click();
    await expect(admin.getByRole("heading", { name: "Seguimiento de entrega", exact: true })).toBeVisible();
  }
  await expect.poll(() => fixture.requests.filter((item) => item.path === "/orders/synthetic-order-1").length).toBe(2);
});
