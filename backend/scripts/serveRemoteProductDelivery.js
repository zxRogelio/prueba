import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { parseArgs as parseTarget } from "./verifyProductDeliveryNeon.js";
import { createManifest, resumeRemoteManifest, connectionConfig, openClient, reportRoot } from "../tests/integration/productDeliveryNeonSupport.js";
import { readLocalWebhookSecret } from "../tests/integration/productDeliveryRemoteSecrets.js";
import { remoteOrigin, snapshotOriginals } from "../tests/integration/productDeliveryRemoteSafety.js";
import { startRemoteServer, REMOTE_API, REMOTE_WEB } from "../tests/integration/productDeliveryRemoteServer.js";

export function parseRemoteArgs(args) {
  if (!args.length || (args.length === 1 && args[0] === "--plan")) return { mode: "plan" };
  assert.equal(args[0], "--serve"); assert.equal(args[1], "--public-url");
  const publicUrl = remoteOrigin(args[2]);
  let cursor = 3, resumeRunId = null, localWebhookSecret = false;
  if (args[cursor] === "--resume-run") { resumeRunId = args[cursor + 1]; assert.match(resumeRunId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/); cursor += 2; }
  if (args[cursor] === "--use-local-webhook-secret") { assert.ok(resumeRunId); localWebhookSecret = true; cursor++; }
  parseTarget(["--run", ...args.slice(cursor)]);
  return { mode: "serve", publicUrl, resumeRunId, localWebhookSecret };
}

export async function collectRemoteState(api, store) {
  const m = api.backend.models;
  return api.backend.sequelize.transaction({ isolationLevel: "REPEATABLE READ", readOnly: true }, async (transaction) => {
  await api.backend.sequelize.query("SET TRANSACTION READ ONLY", { transaction });
  const states = [];
  for (const preference of store.manifest.preferences) {
    const order = await m.Order.findByPk(preference.orderId, { transaction });
    const payment = await m.Payment.findOne({ where: { orderId: order.id }, transaction });
    const fulfillment = await m.OrderFulfillment.findOne({ where: { orderId: order.id }, transaction });
    const receipts = await m.Receipt.findAll({ where: { orderId: order.id }, attributes: ["id", "folio", "status"], transaction });
    const reservations = await m.InventoryReservation.findAll({ where: { orderId: order.id }, attributes: ["id", "status", "quantity", "expiresAt"], transaction });
    const events = await m.FulfillmentEvent.findAll({ where: { fulfillmentId: fulfillment.id }, order: [["sequence", "ASC"]],
      attributes: ["id", "sequence", "fromStatus", "toStatus", "createdAt"], transaction });
    const totals = await api.totals(order.id, transaction);
    if (payment.status === "paid") {
      assert.equal(order.status, "paid"); assert.equal(receipts.length, 1); assert.equal(totals.sales, 1);
      assert.equal(reservations.filter((row) => row.status === "consumed").length, 1);
      assert.equal(fulfillment.status, "payment_confirmed");
    } else {
      assert.equal(receipts.length, 0); assert.equal(totals.sales, 0); assert.equal(fulfillment.status, "awaiting_payment");
    }
    states.push({ scenario: preference.scenario, orderId: order.id, orderNumber: order.orderNumber, orderStatus: order.status,
      total: order.total, shippingTotal: order.shippingTotal,
      payment: { id: payment.id, status: payment.status, amount: payment.amount, providerPaymentId: payment.providerPaymentId, providerStatus: payment.providerStatus },
      fulfillment: { id: fulfillment.id, method: fulfillment.method, status: fulfillment.status },
      receipts: receipts.map((row) => row.toJSON()), reservations: reservations.map((row) => row.toJSON()),
      events: events.map((row) => row.toJSON()), inventory: totals });
  }
  store.manifest.databaseResults = states;
  await store.save(); return states;
  });
}

export async function main(args = process.argv.slice(2)) {
  const options = parseRemoteArgs(args);
  if (options.mode === "plan") return { status: "prepared-not-executed", provider: "real test-account Mercado Pago", publicRoutes: ["GET /health", "POST /api/webhooks/mercadopago", "GET /pago/resultado"], retention: "retain all remote test evidence" };
  const envPaths = [new URL("../.env", import.meta.url), new URL("../../frontend/.env", import.meta.url)];
  const originals = await Promise.all(envPaths.map((path) => readFile(path)));
  const env = dotenv.parse(originals[0]);
  if (options.localWebhookSecret) env.MERCADOPAGO_WEBHOOK_SECRET = await readLocalWebhookSecret(options.resumeRunId);
  const config = connectionConfig(env.DATABASE_URL_ADMIN_DIRECT);
  const client = await openClient(config, "pgdel-remote-coordinator");
  const store = options.resumeRunId ? await resumeRemoteManifest(options.resumeRunId) : await createManifest();
  if (options.resumeRunId) assert.equal(store.manifest.publicUrl, options.publicUrl, "Keep the original HTTPS URL for provider retries.");
  store.manifest.kind = "remote-checkout"; store.manifest.retainForAudit = true;
  store.manifest.status = "preparing-real-provider";
  let api, vite, ui, timer, stopRequested = false;
  const requestStop = () => { stopRequested = true; };
  process.once("SIGINT", requestStop); process.once("SIGTERM", requestStop);
  try {
    const migrations = (await client.query('SELECT name FROM core."SequelizeMeta" WHERE name=ANY($1::text[])', [
      ["20261102000100-create-product-delivery-system.js", "20261102000200-add-pickup-settings-to-about-pages.js"]])).rows;
    assert.equal(migrations.length, 2, "Apply reviewed test migrations first; this runner performs no DDL.");
    const baseline = await snapshotOriginals(client, store.manifest);
    if (store.manifest.baseline) assert.deepEqual(baseline, store.manifest.baseline);
    else store.manifest.baseline = baseline;
    if (options.localWebhookSecret) store.manifest.signingKeySource = "user-scoped encrypted local test key; .env unchanged";
    await store.save();
    api = await startRemoteServer({ config, store, env, publicUrl: options.publicUrl });
    const output = resolve(reportRoot, "remote-" + store.manifest.runId); await mkdir(output, { recursive: true });
    const frontendRoot = fileURLToPath(new URL("../../frontend/", import.meta.url));
    const { createServer } = await import("../../frontend/node_modules/vite/dist/node/index.js");
    vite = await createServer({ root: frontendRoot, configFile: resolve(frontendRoot, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 5188, strictPort: true }, define: { "import.meta.env.VITE_API_URL": JSON.stringify(REMOTE_API + "/api") },
      plugins: [{ name: "remote-test-banner", transformIndexHtml: () => [{ tag: "div", attrs: { style: "background:#facc15;padding:8px;color:#111;font-weight:bold;text-align:center" },
        children: "PRUEBAS · MERCADO PAGO REMOTO · CUENTAS Y PRODUCTOS SINTÉTICOS", injectTo: "body-prepend" }] }] });
    await vite.listen();
    // Verify real public TLS/HTTP reachability and that no admin/.env routes
    // are exposed. An invalid-signature probe is NOT a provider payment test.
    const health = await fetch(options.publicUrl + "/health", { redirect: "error", signal: AbortSignal.timeout(15000) });
    assert.equal(health.status, 200); assert.equal((await health.json()).runId, store.manifest.runId);
    for (const path of ["/api/admin/orders", "/.env", "/api/auth/login", "/__test/checkout"]) {
      assert.equal((await fetch(options.publicUrl + path, { redirect: "error", signal: AbortSignal.timeout(15000) })).status, 404);
    }
    const probe = await fetch(options.publicUrl + "/api/webhooks/mercadopago?data.id=0&type=payment", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}", signal: AbortSignal.timeout(15000) });
    assert.equal(probe.status, 401);
    store.manifest.httpsChecks = { publicHealth: 200, administrativePaths: 404, missingSignatureRejected: 401, tlsVerification: true };
    await store.save();
    const { prepareRemoteBrowser } = await import("../tests/integration/productDeliveryRemoteBrowser.js");
    if (options.resumeRunId) {
      for (const preference of store.manifest.preferences) {
        const statuses = await api.remoteStatuses(preference.orderId);
        preference.lastRemoteStatuses = statuses;
        if (preference.scenario === "C-not-approved" && statuses.some((payment) => payment.status === "approved")) {
          preference.originalScenario = preference.scenario; preference.scenario = "C-unexpected-approved";
        }
      }
      await store.save();
    }
    ui = await prepareRemoteBrowser({ fixture: api.fixture, store, output, resume: Boolean(options.resumeRunId) });
    store.manifest.status = "waiting-human-test-payments";
    store.manifest.browserOutput = output;
    store.manifest.manualDeadline = new Date(Date.now() + 90 * 60000).toISOString();
    await store.save();
    console.log(JSON.stringify({ status: store.manifest.status, report: store.path, webhook: store.manifest.notificationUrl,
      localFrontend: REMOTE_WEB, purchases: store.manifest.preferences.map((pref) => ({ scenario: pref.scenario, orderId: pref.orderId, total: pref.total, checkoutUrl: pref.checkoutUrl })) }, null, 2));
    const deadline = Date.now() + 90 * 60000;
    let last = "";
    while (!stopRequested && Date.now() < deadline) {
      if (await readFile(store.path + ".stop", "utf8").then(() => true, (error) => { if (error.code === "ENOENT") return false; throw error; })) break;
      const states = await collectRemoteState(api, store);
      const signature = JSON.stringify(states.map((row) => ({ scenario: row.scenario, status: row.payment.status, id: row.payment.providerPaymentId })));
      if (signature !== last) { console.log("REMOTE PAYMENT STATES", signature); last = signature; }
      const a = states.find((row) => row.scenario === "A-pickup"); const b = states.find((row) => row.scenario === "B-delivery");
      const c = states.find((row) => row.scenario === "C-not-approved");
      const extraApprovedSettled = store.manifest.preferences.filter((preference) => preference.scenario === "C-unexpected-approved")
        .every((preference) => states.find((row) => row.orderId === preference.orderId)?.payment.status === "paid");
      if (a?.payment.status === "paid" && b?.payment.status === "paid" && c?.payment.providerPaymentId && ["failed", "pending"].includes(c.payment.status) &&
          extraApprovedSettled && store.manifest.replays.length >= 1) {
        for (const row of states) {
          const page = ui.pages.get(row.orderId);
          await page.goto(REMOTE_WEB + "/cliente/pedidos?orderId=" + row.orderId);
          await page.getByRole("heading", { name: "Historial del pedido", exact: true }).waitFor();
          await page.screenshot({ path: output + "/" + row.scenario + "-client-result.png", fullPage: true });
          await ui.adminPage.goto(REMOTE_WEB + "/admin/pedidos");
          await ui.adminPage.getByRole("row").filter({ hasText: row.orderNumber }).getByRole("button", { name: "Gestionar", exact: true }).click();
          await ui.adminPage.getByRole("heading", { name: "Historial del pedido", exact: true }).waitFor();
          if (row.payment.status !== "paid") assert.equal(await ui.adminPage.getByLabel("Nuevo estado").count(), 0);
          await ui.adminPage.screenshot({ path: output + "/" + row.scenario + "-admin-result.png", fullPage: true });
        }
        store.manifest.browserResultsVerified = true; store.manifest.status = "passed-remote-payments"; await store.save(); break;
      }
      await new Promise((resolve) => { timer = setTimeout(resolve, 10000); });
    }
    if (store.manifest.status !== "passed-remote-payments") store.manifest.status = "manual-action-pending";
  } catch (error) {
    store.manifest.status = "not-completed";
    store.manifest.error = { name: error.name, code: error.original?.code || error.code || null,
      assertion: error.name === "AssertionError" ? String(error.message).split("\n")[0].slice(0, 200) : null };
    if (api) {
      const diagnostics = api.backend.checkout.getMercadoPagoErrorDiagnostics(error);
      diagnostics.message = diagnostics.message.split(api.fixture.password).join("[synthetic-password-redacted]");
      store.manifest.error.diagnostics = diagnostics;
    }
    console.error("Remote test preparation failed:", store.manifest.error); process.exitCode = 1;
  } finally {
    clearTimeout(timer); process.removeListener("SIGINT", requestStop); process.removeListener("SIGTERM", requestStop);
    await ui?.close(); await vite?.close();
    if (api) {
      const sessions = store.manifest.rows.sessions?.ids || [];
      if (sessions.length) await api.backend.models.Session.update({ revoked: true }, { where: { id: sessions } });
      await api.close();
    }
    try {
      if (store.manifest.baseline) {
        assert.deepEqual(await snapshotOriginals(client, store.manifest, Object.keys(store.manifest.baseline)), store.manifest.baseline);
        store.manifest.originalRecordsUnchanged = true;
      }
    } catch (error) { store.manifest.status = "failed-preservation"; store.manifest.originalRecordsUnchanged = false; store.manifest.preservationError = error.name; process.exitCode = 1; }
    store.manifest.completedAt = new Date().toISOString(); await store.save();
    await client.end();
    for (let i = 0; i < envPaths.length; i++) assert.deepEqual(await readFile(envPaths[i]), originals[i]);
  }
  return { status: store.manifest.status, report: store.path, originalRecordsUnchanged: store.manifest.originalRecordsUnchanged,
    retainedForAudit: true, payments: store.manifest.databaseResults?.map((row) => ({ scenario: row.scenario, paymentStatus: row.payment.status })) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await main(), null, 2)); }
  catch (error) { console.error("Remote runtime did not start:", error.name, error.code || ""); process.exitCode = 1; }
}
