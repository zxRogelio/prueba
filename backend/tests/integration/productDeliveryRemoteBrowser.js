import assert from "node:assert/strict";
import { chromium } from "../../../frontend/node_modules/@playwright/test/index.mjs";

// Creates preferences through the real frontend. No card entry, buyer login or
// provider approval is automated. Those actions are handed to the human tester.
export async function prepareRemoteBrowser({ fixture, store, output, resume = false }) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const contexts = [];
  const pages = new Map();
  async function loggedIn(email, destination) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context);
    const page = await context.newPage();
    await page.goto(fixture.webOrigin + destination);
    await page.locator("#login-email").fill(email); await page.locator("#login-password").fill(fixture.password);
    await page.getByRole("button", { name: "Entrar a mi cuenta", exact: true }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"));
    return page;
  }
  try {
    const sharedCustomer = resume ? await loggedIn(fixture.customerEmail, "/cliente/pedidos") : null;
    if (sharedCustomer) for (const preference of store.manifest.preferences) pages.set(preference.orderId, sharedCustomer);
    const scenarios = [["A-pickup", "pickup"], ["B-delivery", "delivery"], ["C-not-approved", "pickup"]]
      .filter(([scenario]) => !store.manifest.preferences.some((preference) => preference.scenario === scenario));
    for (const [scenario, method] of scenarios) {
      const page = sharedCustomer || await loggedIn(fixture.customerEmail, "/checkout");
      await page.goto(fixture.webOrigin + "/catalogue");
      await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
      await page.getByRole("link", { name: "Proceder al pago", exact: true }).click();
      await page.getByLabel("Nombre del destinatario", { exact: true }).fill("PGDEL REMOTE Destinatario sintético");
      await page.getByLabel("Teléfono", { exact: true }).fill("5555555555");
      if (method === "delivery") {
        await page.getByRole("radio", { name: "Envío a domicilio", exact: true }).check();
        const address = { "Código postal": "00001", Estado: "Estado sintético", Municipio: "Municipio sintético", Colonia: "Colonia sintética",
          Calle: "PGDEL REMOTE Calle sintética", "Número exterior": "1", Referencias: "PRUEBA - no realizar envío físico" };
        for (const [label, value] of Object.entries(address)) await page.getByLabel(label, { exact: true }).fill(value);
      }
      await page.getByRole("button", { name: "CONSULTAR TOTAL Y ENVÍO", exact: true }).click();
      const confirmation = page.getByRole("checkbox", { name: /Confirmo el método de entrega/ });
      await confirmation.waitFor();
      const quoted = await confirmation.getAttribute("aria-label") || await confirmation.locator("..").innerText();
      assert.ok(quoted.includes(method === "delivery" ? "$175.00" : "$100.00"));
      await page.screenshot({ path: output + "/" + scenario + "-quote.png", fullPage: true });
      await confirmation.check();
      const preferenceResponse = page.waitForResponse((response) => response.url().endsWith("/checkout/products/mercadopago") && response.request().method() === "POST");
      await page.getByRole("button", { name: "PAGAR CON MERCADO PAGO", exact: true }).click({ noWaitAfter: true });
      const response = await preferenceResponse;
      // Chrome may discard the response body as location.assign navigates to
      // Mercado Pago. Use the actual SDK response already persisted server-side.
      assert.equal(response.status(), 201, "Remote preference API failed.");
      const evidence = store.manifest.preferences.at(-1);
      assert.ok(evidence); evidence.scenario = scenario; evidence.createdViaBrowser = true;
      await store.save();
      // This is an actual provider navigation. A login/captcha is recorded as
      // requiring human action, never counted as a completed purchase.
      await page.waitForURL((url) => /(^|\.)mercadopago\.com(?:\.mx)?$/.test(url.hostname), { timeout: 20000 }).catch(() => {});
      evidence.providerPageReached = /(^|\.)mercadopago\.com(?:\.mx)?$/.test(new URL(page.url()).hostname);
      evidence.humanPaymentRequired = true;
      await store.save(); pages.set(evidence.orderId, page);
      console.log("REMOTE PREFERENCE READY", scenario, evidence.orderId, evidence.total, evidence.checkoutUrl);
    }
    const adminPage = await loggedIn(fixture.adminEmail, "/admin/pedidos");
    await adminPage.goto(fixture.webOrigin + "/admin/pedidos");
    await adminPage.getByRole("heading", { name: "Gestión de pedidos y entregas", exact: true }).waitFor();
    await adminPage.screenshot({ path: output + "/admin-before-payments.png", fullPage: true });
    return { browser, adminPage, pages, close: () => browser.close() };
  } catch (error) {
    let index = 0;
    for (const context of contexts) for (const page of context.pages()) {
      await page.screenshot({ path: output + "/preparation-failure-" + index++ + ".png", fullPage: true }).catch(() => {});
    }
    await browser.close(); throw error;
  }
}
