import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(process.env.DELIVERY_BROWSER_FIXTURE!, "utf8")) as {
  apiOrigin: string; webOrigin: string; customerEmail: string; adminEmail: string; password: string;
  productName: string; productId: number; planName: string; planId: string; nonce: string;
};
let customer: Page, admin: Page, customerContext: BrowserContext, adminContext: BrowserContext;
const orders: Record<string, { id: string; orderNumber: string }> = {};

async function api(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async ({ origin, path, method, body }) => {
    const response = await fetch(origin + "/api" + path, { method, headers: { "content-type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { origin: fixture.apiOrigin, path, method, body });
}
async function login(page: Page, email: string, destination: string) {
  await page.goto(destination);
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(fixture.password);
  await page.getByRole("button", { name: "Entrar a mi cuenta", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto(destination);
}
async function cart() {
  await customer.goto("/catalogue");
  await expect(customer.getByText(fixture.productName, { exact: true }).first()).toBeVisible();
  await customer.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  await expect(customer.getByRole("heading", { name: "Tu carrito", exact: true })).toBeVisible();
  await customer.getByRole("button", { name: "Cerrar carrito", exact: true }).click();
  await customer.goto("/checkout");
  await expect(customer.getByRole("heading", { name: "PREPARA TU COMPRA." })).toBeVisible();
  await customer.getByLabel("Nombre del destinatario", { exact: true }).fill("PGDEL Destinatario sintético");
  await customer.getByLabel("Teléfono", { exact: true }).fill("5555555555");
}
async function checkout(name: string, approved: boolean) {
  await customer.getByRole("checkbox", { name: /Confirmo el método de entrega/ }).check();
  await customer.getByRole("button", { name: "PAGAR CON MERCADO PAGO", exact: true }).click();
  await expect(customer).toHaveURL(/127\.0\.0\.1:5510\/__test\/checkout\//);
  await expect(customer.getByRole("heading", { name: "PROVEEDOR SIMULADO", exact: true })).toBeVisible();
  await expect(customer.getByText("Total de preferencia:", { exact: false })).toContainText(name === "delivery" ? "$175.00" : "$100.00");
  const id = new URL(customer.url()).pathname.split("/").at(-1)!;
  await customer.getByRole("button", { name: approved ? "Simular pago aprobado" : "Simular pago rechazado", exact: true }).click();
  await expect(customer.getByRole("heading", { name: approved ? "Pago aprobado" : "Pago rechazado", exact: true })).toBeVisible();
  const result = await api(customer, "/orders/" + id);
  expect(result.status).toBe(200);
  orders[name] = { id, orderNumber: result.body.order.orderNumber };
}
async function openAdmin(name: string) {
  await admin.goto("/admin/pedidos");
  await admin.getByRole("row").filter({ hasText: orders[name].orderNumber }).getByRole("button", { name: /^Gestionar / }).click();
  await expect(admin.getByRole("heading", { name: "Historial del pedido", exact: true })).toBeVisible();
}
async function advance(status: string) {
  await admin.getByLabel("Nuevo estado").selectOption(status);
  if (status === "shipped") {
    await admin.getByLabel("Paquetería", { exact: true }).fill("PGDEL Paquetería sintética");
    await admin.getByLabel("Número de guía", { exact: true }).fill("PGDEL-GUIA-SINTETICA");
  }
  await admin.getByLabel("Observaciones (visibles para el cliente)", { exact: true }).fill("PRUEBA AUTOMATIZADA: " + status);
  const response = admin.waitForResponse((r) => r.request().method() === "PATCH" && r.url().includes("/fulfillment"));
  await admin.getByRole("button", { name: "Confirmar cambio de estado", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(admin.locator(".delivery-timeline li").last()).toContainText("PRUEBA AUTOMATIZADA: " + status);
}

test.describe.serial("Entrega con Chrome + PostgreSQL real; proveedor explícitamente simulado", () => {
  test.beforeAll(async ({ browser }) => {
    customerContext = await browser.newContext(); adminContext = await browser.newContext();
    for (const context of [customerContext, adminContext]) await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) || ["data:", "blob:"].includes(url.protocol) ? route.continue() : route.abort("blockedbyclient");
    });
    customer = await customerContext.newPage(); admin = await adminContext.newPage();
  });
  test.afterAll(async () => { await customerContext?.close(); await adminContext?.close(); });

  test("01 administrador inicia sesión y configura todos los datos de recogida", async () => {
    await login(admin, fixture.adminEmail, "/admin/pedidos");
    await admin.getByText("Configuración de recogida en gimnasio", { exact: true }).click();
    const inputs: Record<string, string> = { "Nombre del gimnasio": "PGDEL GIMNASIO SINTÉTICO", "Dirección física completa": "PRUEBA Calle sintética 1",
      Municipio: "Municipio sintético", Estado: "Estado sintético", "Código postal del gimnasio": "00001", "Teléfono de contacto": "5555555555",
      "Horarios de recogida": "PRUEBA lunes a viernes 10:00–18:00", "Instrucciones para recoger": "PRUEBA: presentar identificador sintético del pedido" };
    for (const [label, value] of Object.entries(inputs)) await admin.getByLabel(label, { exact: true }).fill(value);
    await admin.getByRole("button", { name: "Guardar configuración de recogida", exact: true }).click();
    await expect(admin.getByRole("status")).toContainText("Configuración de recogida guardada.");
    await admin.screenshot({ path: test.info().outputPath("admin-pickup-settings.png"), fullPage: true });
  });
  test("02 administrador crea, edita, desactiva y reactiva una tarifa postal", async () => {
    const rates = admin.locator("details").filter({ has: admin.getByText("Tarifas y cobertura de envíos", { exact: true }) });
    await rates.locator("summary").click();
    await rates.getByLabel("Nombre", { exact: true }).fill("PGDEL Zona sintética");
    await rates.getByLabel("Importe MXN", { exact: true }).fill("60.00");
    await rates.getByLabel("CP inicial", { exact: true }).fill("00001");
    await rates.getByLabel("CP final", { exact: true }).fill("00001");
    await rates.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
    const row = rates.getByRole("row").filter({ hasText: "PGDEL Zona sintética" });
    await expect(row).toContainText("60.00");
    await row.getByRole("button", { name: "Editar", exact: true }).click();
    await rates.getByLabel("Importe MXN", { exact: true }).fill("75.00");
    await rates.getByRole("checkbox", { name: "Activa", exact: true }).uncheck();
    await rates.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
    await expect(row).toContainText("Inactiva");
    await login(customer, fixture.customerEmail, "/checkout");
    const address = { recipientName: "PGDEL", phone: "5555555555", postalCode: "00001", state: "PRUEBA", municipality: "PRUEBA", neighborhood: "PRUEBA", street: "PRUEBA", exteriorNumber: "1", references: "PRUEBA" };
    expect((await api(customer, "/checkout/product-quote", "POST", { items: [{ productId: fixture.productId, quantity: 1 }], fulfillment: { method: "delivery", address } })).status).toBe(422);
    await row.getByRole("button", { name: "Editar", exact: true }).click();
    await rates.getByRole("checkbox", { name: "Activa", exact: true }).check();
    await rates.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
    await expect(row).toContainText("Activa"); await expect(row).toContainText("75.00");
    expect((await api(customer, "/admin/shipping-rates")).status).toBe(403);
  });
  test("03 cliente compra recogida gratuita y webhook duplicado conserva pago único", async () => {
    await cart();
    await expect(customer.getByText("PGDEL GIMNASIO SINTÉTICO", { exact: true })).toBeVisible();
    await expect(customer.getByText(/PRUEBA lunes a viernes/)).toBeVisible();
    await expect(customer.getByLabel("Calle", { exact: true })).toHaveCount(0);
    await customer.getByRole("button", { name: "CONSULTAR TOTAL Y ENVÍO", exact: true }).click();
    await expect(customer.getByRole("checkbox", { name: /envío de \$0.00 y el total de \$100.00/ })).toBeVisible();
    await checkout("pickup", true);
    const replay = await customer.request.post(fixture.apiOrigin + "/__test/replay/" + orders.pickup.id, { headers: { "x-fixture-nonce": fixture.nonce } });
    expect(replay.status()).toBe(200); expect((await replay.json()).duplicate).toBe(true);
  });
  test("04 administrador prepara y confirma recogida; cliente ve el historial", async () => {
    await openAdmin("pickup"); await advance("preparing"); await advance("ready_for_pickup"); await advance("picked_up");
    await customer.goto("/cliente/pedidos?orderId=" + orders.pickup.id);
    await expect(customer.locator(".delivery-timeline li").last()).toContainText("Recogido");
    await expect(customer.getByText("PRUEBA: presentar identificador sintético del pedido", { exact: false }).first()).toBeVisible();
    await customer.screenshot({ path: test.info().outputPath("client-pickup-history.png"), fullPage: true });
  });
  test("05 cliente valida dirección, cobertura, envío de 75 y total de 175 antes de pagar", async () => {
    await cart(); await customer.getByRole("radio", { name: "Envío a domicilio", exact: true }).check();
    const values: Record<string, string> = { "Código postal": "99999", Estado: "Estado sintético", Municipio: "Municipio sintético", Colonia: "Colonia sintética", Calle: "PGDEL Calle sintética", "Número exterior": "1", Referencias: "PRUEBA no entregar físicamente" };
    for (const [label, value] of Object.entries(values)) await customer.getByLabel(label, { exact: true }).fill(value);
    await customer.getByRole("button", { name: "CONSULTAR TOTAL Y ENVÍO", exact: true }).click();
    await expect(customer.getByRole("alert")).toContainText(/cobertura/i);
    await expect(customer.getByRole("button", { name: "PAGAR CON MERCADO PAGO", exact: true })).toHaveCount(0);
    await customer.getByLabel("Código postal", { exact: true }).fill("00001");
    await customer.getByRole("checkbox", { name: "Guardar dirección para futuras compras", exact: true }).check();
    await customer.getByRole("button", { name: "CONSULTAR TOTAL Y ENVÍO", exact: true }).click();
    await expect(customer.getByRole("checkbox", { name: /envío de \$75.00 y el total de \$175.00/ })).toBeVisible();
    await customer.screenshot({ path: test.info().outputPath("delivery-quote.png"), fullPage: true });
    await checkout("delivery", true);
    expect((await api(customer, "/addresses/me")).body.addresses).toHaveLength(1);
  });
  test("06 administrador registra guía y entrega; cliente observa seguimiento actualizado", async () => {
    await openAdmin("delivery"); await advance("preparing"); await advance("packed");
    await admin.getByLabel("Nuevo estado").selectOption("shipped");
    await admin.getByRole("button", { name: "Confirmar cambio de estado", exact: true }).click();
    expect(await admin.getByLabel("Número de guía", { exact: true }).evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true);
    await advance("shipped");
    await customer.goto("/cliente/pedidos?orderId=" + orders.delivery.id);
    await expect(customer.getByText("PGDEL-GUIA-SINTETICA", { exact: true })).toBeVisible();
    await advance("delivered"); await customer.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(customer.locator(".delivery-timeline li").last()).toContainText("Entregado");
    await customer.screenshot({ path: test.info().outputPath("client-delivered-history.png"), fullPage: true });
  });
  test("07 pago rechazado no permite preparar ni crea seguimiento pagado", async () => {
    await cart(); await customer.getByRole("button", { name: "CONSULTAR TOTAL Y ENVÍO", exact: true }).click();
    await checkout("rejected", false); await openAdmin("rejected");
    await expect(admin.getByLabel("Nuevo estado")).toHaveCount(0);
    const result = await api(admin, "/admin/orders/" + orders.rejected.id + "/fulfillment", "PATCH", { status: "preparing", expectedStatus: "awaiting_payment" });
    expect(result.status).toBe(409);
  });
  test("08 membresía continúa a checkout sin pedir dirección ni entrega", async () => {
    await customer.goto("/payment?membershipPlanId=" + fixture.planId);
    await expect(customer.getByText(fixture.planName, { exact: true }).first()).toBeVisible();
    await expect(customer.locator('input[name="postalCode"],input[name="street"],input[name="deliveryMethod"]')).toHaveCount(0);
    const response = customer.waitForResponse((r) => r.url().endsWith("/checkout/mercadopago") && r.request().method() === "POST");
    await customer.getByRole("button", { name: /^PAGAR \$300\.00$/ }).click();
    const request = (await response).request().postDataJSON(); expect(request.fulfillment).toBeUndefined();
    await expect(customer.getByRole("heading", { name: "PROVEEDOR SIMULADO", exact: true })).toBeVisible();
    await expect(customer.getByText("Total de preferencia:", { exact: false })).toContainText("300.00");
  });
});
