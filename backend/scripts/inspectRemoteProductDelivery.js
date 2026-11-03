// Independent, read-only database/UI evidence. Reuses ONLY sessions created by
// this run's actual UI login. Never creates or reconciles a provider payment.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { chromium } from "../../frontend/node_modules/@playwright/test/index.mjs";
import { parseArgs } from "./verifyProductDeliveryNeon.js";
import { reportRoot, connectionConfig, openClient } from "../tests/integration/productDeliveryNeonSupport.js";
import { snapshotOriginals } from "../tests/integration/productDeliveryRemoteSafety.js";
import { REMOTE_WEB } from "../tests/integration/productDeliveryRemoteServer.js";

export async function main(args = process.argv.slice(2)) {
  if (!args.length) return { status: "prepared-not-executed", databaseWrites: 0 };
  assert.equal(args[0], "--inspect"); assert.match(args[1], /^[a-f0-9-]{36}$/);
  parseArgs(["--run", ...args.slice(2)]);
  const manifestPath = resolve(reportRoot, args[1] + ".json");
  const envFile = new URL("../.env", import.meta.url); const originalEnv = await readFile(envFile);
  const config = connectionConfig(dotenv.parse(originalEnv).DATABASE_URL_ADMIN_DIRECT);
  const client = await openClient(config, "pgdel-remote-readonly-inspection");
  let browser;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SELECT 1"); // Fix the SQL snapshot before reading the ID manifest.
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.kind, "remote-checkout"); assert.equal(manifest.retainForAudit, true);
    assert.equal(manifest.runId, args[1]);
    const current = await snapshotOriginals(client, manifest, Object.keys(manifest.baseline));
    assert.deepEqual(current, manifest.baseline, "Preexisting records changed.");
    const states = [];
    for (const preference of manifest.preferences.filter((row) => row.scenario)) {
      const id = preference.orderId; assert.ok(manifest.rows.Orders.ids.includes(id));
      const { rows: [order] } = await client.query(`SELECT o.id,o."orderNumber",o.status,o.total,o."shippingTotal",
        p.id AS "paymentId",p.status AS "paymentStatus",p.amount,p."providerPaymentId",p."providerPreferenceId",
        f.id AS "fulfillmentId",f.method,f.status AS "fulfillmentStatus"
        FROM core."Orders" o JOIN core."Payments" p ON p."orderId"=o.id
        JOIN core."OrderFulfillments" f ON f."orderId"=o.id WHERE o.id=$1 AND o."userId"=$2`, [id, manifest.fixture.customerId]);
      assert.ok(order); assert.equal(order.providerPreferenceId, preference.id);
      const receipts = (await client.query('SELECT id,folio,status FROM core."Receipts" WHERE "orderId"=$1', [id])).rows;
      const reservations = (await client.query('SELECT id,status,quantity,"expiresAt" FROM core."InventoryReservations" WHERE "orderId"=$1', [id])).rows;
      const sales = (await client.query(`SELECT m.id,m.quantity,m."stockBefore",m."stockAfter" FROM core."InventoryMovements" m
        JOIN core."OrderItems" i ON i.id=m."orderItemId" WHERE i."orderId"=$1 AND m."movementType"='sale'`, [id])).rows;
      const events = (await client.query('SELECT id,sequence,"fromStatus","toStatus","createdAt" FROM core."FulfillmentEvents" WHERE "fulfillmentId"=$1 ORDER BY sequence', [order.fulfillmentId])).rows;
      const webhooks = (await client.query('SELECT id,"providerEventId","signatureValid","processingStatus","providerPaymentId" FROM core."PaymentWebhookEvents" WHERE "paymentId"=$1', [order.paymentId])).rows;
      if (order.paymentStatus !== "paid") { assert.equal(receipts.length, 0); assert.equal(sales.length, 0); assert.equal(order.fulfillmentStatus, "awaiting_payment"); }
      else { assert.equal(receipts.length, 1); assert.equal(sales.length, 1); assert.equal(order.fulfillmentStatus, "payment_confirmed"); }
      states.push({ scenario: preference.scenario, ...order, receipts, reservations, sales, events, webhooks });
    }
    const sessions = (await client.query(`SELECT s.token,u.id,u.email,u.role FROM core.sessions s JOIN core."Users" u ON u.id=s."userId"
      WHERE s.id=ANY($1::uuid[]) AND u.id=ANY($2::uuid[]) AND s.revoked=false AND s."expiresAt">now()`,
    [manifest.rows.sessions.ids, [manifest.fixture.customerId, manifest.fixture.adminId]])).rows;
    await client.query("COMMIT");
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const output = resolve(reportRoot, "remote-" + manifest.runId, "inspection-" + Date.now()); await mkdir(output, { recursive: true });
    for (const role of ["cliente", "administrador"]) {
      const login = sessions.find((row) => row.role === role); assert.ok(login, "An active synthetic login session is required for UI inspection.");
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.route("**/*", (route) => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
      await context.addInitScript(({ token, user }) => { globalThis.localStorage.setItem("token", token); globalThis.localStorage.setItem("user", JSON.stringify(user)); },
        { token: login.token, user: { id: login.id, email: login.email, rol: login.role, mustChangePassword: false } });
      const page = await context.newPage();
      for (const state of states) {
        if (role === "cliente") await page.goto(REMOTE_WEB + "/cliente/pedidos?orderId=" + state.id);
        else {
          await page.goto(REMOTE_WEB + "/admin/pedidos");
          await page.getByRole("row").filter({ hasText: state.orderNumber }).getByRole("button", { name: "Gestionar", exact: true }).click();
        }
        await page.getByRole("heading", { name: "Historial del pedido", exact: true }).waitFor();
        const last = await page.locator(".delivery-timeline li").last().innerText();
        assert.ok(last.includes(state.paymentStatus === "paid" ? "Pago confirmado" : "Pendiente de pago"));
        if (role === "administrador" && state.paymentStatus !== "paid") assert.equal(await page.getByLabel("Nuevo estado").count(), 0);
        await page.screenshot({ path: resolve(output, state.scenario + "-" + role + ".png"), fullPage: true });
        state.ui ||= {}; state.ui[role] = true;
      }
      await context.close();
    }
    const report = { checkedAt: new Date().toISOString(), runId: manifest.runId, readOnly: true, originalRecordsUnchanged: true,
      webhook: manifest.notificationUrl, scenarios: states, authenticNotifications: manifest.inbound.filter((row) => row.authenticAccepted).length,
      genuineSignatureReplays: manifest.replays.length };
    await writeFile(resolve(output, "results.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ report: resolve(output, "results.json"), readOnly: true, originalRecordsUnchanged: true,
      scenarios: states.map((row) => ({ scenario: row.scenario, paymentStatus: row.paymentStatus, total: row.total, shipping: row.shippingTotal,
        receipts: row.receipts.length, sales: row.sales.length, fulfillment: row.fulfillmentStatus, ui: row.ui })) }, null, 2));
    return report;
  } finally { await browser?.close(); await client.query("ROLLBACK").catch(() => {}); await client.end(); assert.deepEqual(await readFile(envFile), originalEnv); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) { console.error("Read-only inspection did not complete:", error.name, error.code || ""); process.exitCode = 1; }
}
