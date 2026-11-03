import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { parseArgs } from "./verifyProductDeliveryNeon.js";
import { connectionConfig, openClient, snapshotExisting, createManifest, cleanupFixtures, reportRoot } from "../tests/integration/productDeliveryNeonSupport.js";
import { startBrowserServer, API_ORIGIN, WEB_ORIGIN } from "../tests/integration/productDeliveryBrowserServer.js";

const pickupMigration = "20261102000200-add-pickup-settings-to-about-pages.js";
const frontendRoot = fileURLToPath(new URL("../../frontend/", import.meta.url));

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.mode === "plan") return { status: "prepared-not-executed", browser: "isolated Chrome", provider: "explicit simulation; no remote Mercado Pago requests" };
  assert.equal(options.mode, "run", "Use verify:delivery-neon --cleanup for scoped fixture recovery.");
  const envPaths = [new URL("../.env", import.meta.url), new URL("../../frontend/.env", import.meta.url)];
  const originalEnvs = await Promise.all(envPaths.map((path) => readFile(path)));
  const config = connectionConfig(dotenv.parse(originalEnvs[0]).DATABASE_URL_ADMIN_DIRECT);
  const client = await openClient(config, "pgdel-browser-coordinator");
  let store, api, vite, temporary;
  try {
    store = await createManifest();
    store.manifest.kind = "browser";
    const before = await snapshotExisting(client, ["AboutPages"]);
    const existing = (await client.query('SELECT name FROM core."SequelizeMeta" WHERE name=$1', [pickupMigration])).rowCount > 0;
    if (!existing) {
      assert.equal((await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='AboutPages' AND column_name='pickupSettings'")).rowCount, 0);
      const migration = await import(new URL("../migrations/" + pickupMigration, import.meta.url));
      await client.query("BEGIN");
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('titanium-delivery-migration'))");
        await client.query("SET LOCAL lock_timeout='5s'");
        const transaction = {};
        const sequelize = { query: (sql, context) => { assert.equal(context.transaction, transaction); return client.query(sql); } };
        await migration.up({ sequelize, transaction });
        await migration.down({ sequelize, transaction });
        await migration.up({ sequelize, transaction });
        await client.query('INSERT INTO core."SequelizeMeta" (name) VALUES ($1)', [pickupMigration]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    }
    assert.deepEqual(await snapshotExisting(client, ["AboutPages"]), before);
    store.manifest.pickupMigration = existing ? "already applied" : "up/down/up and atomic registration passed";
    store.manifest.baseline = await snapshotExisting(client); await store.save();
    api = await startBrowserServer(config, store);
    const { createServer } = await import("../../frontend/node_modules/vite/dist/node/index.js");
    vite = await createServer({ root: frontendRoot, configFile: resolve(frontendRoot, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 5178, strictPort: true },
      define: { "import.meta.env.VITE_API_URL": JSON.stringify(API_ORIGIN + "/api") },
      plugins: [{ name: "delivery-fixture-banner", transformIndexHtml: () => [{ tag: "div", attrs: { id: "delivery-fixture-banner",
        style: "background:#facc15;color:#111;padding:6px;text-align:center;font-weight:bold;position:relative;z-index:99999" },
        children: "PRUEBAS AUTOMATIZADAS · DATOS SINTÉTICOS · PROVEEDOR SIMULADO", injectTo: "body-prepend" }] }] });
    await vite.listen();
    temporary = await mkdtemp(join(tmpdir(), "titanium-browser-"));
    const fixturePath = join(temporary, "fixture.json");
    await writeFile(fixturePath, JSON.stringify(api.fixture));
    const output = resolve(reportRoot, "browser-" + store.manifest.runId);
    await mkdir(output, { recursive: true });
    store.manifest.browserReport = output; await store.save();
    console.log("Local browser verification ready:", WEB_ORIGIN, "report:", output);
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [resolvePath("node_modules/@playwright/test/cli.js"), "test", "--config=playwright.delivery.config.ts"], {
        cwd: frontendRoot, stdio: "inherit", env: { ...process.env, DELIVERY_BROWSER_FIXTURE: fixturePath, DELIVERY_BROWSER_OUTPUT: output } });
      child.once("error", reject); child.once("exit", resolve);
    });
    const result = JSON.parse(await readFile(join(output, "results.json"), "utf8"));
    store.manifest.browserStats = result.stats;
    assert.equal(code, 0, "Browser scenarios failed; inspect local HTML report.");
    assert.equal(result.stats.skipped, 0, "Skipped browser cases are not successes.");
    const m = api.backend.models;
    const orders = await m.Order.findAll();
    const paid = orders.filter((order) => order.status === "paid");
    assert.equal(paid.length, 2);
    assert.equal(await m.Receipt.count({ where: { orderId: paid.map((order) => order.id) } }), 2);
    for (const order of paid) {
      const items = await m.OrderItem.findAll({ where: { orderId: order.id } });
      assert.equal(await m.InventoryMovement.count({ where: { orderItemId: items.map((item) => item.id), movementType: "sale" } }), 1);
    }
    assert.equal((await m.Product.findByPk(api.product.id)).stock, 98);
    assert.equal(api.preferences.size, 4);
    const membershipOrder = await m.OrderItem.findOne({ where: { membershipPlanId: api.plan.id } });
    assert.ok(membershipOrder);
    assert.equal(await m.OrderFulfillment.count({ where: { orderId: membershipOrder.orderId } }), 0);
    const migration = await import(new URL("../migrations/" + pickupMigration, import.meta.url));
    await client.query("BEGIN");
    let rollbackCode;
    try {
      const transaction = {};
      await migration.down({ sequelize: { query: (sql, options) => { assert.equal(options.transaction, transaction); return client.query(sql); } }, transaction });
    } catch (error) { rollbackCode = error.code; }
    finally { await client.query("ROLLBACK"); }
    assert.equal(rollbackCode, "P0001", "Configured pickup settings must block a destructive rollback.");
    store.manifest.postBrowserChecks = { paidOrders: 2, receipts: 2, outgoingMovements: 2, finalStock: 98, preferences: 4, membershipFulfillments: 0, pickupRollbackProtection: true };
    store.manifest.status = "passed";
  } catch (error) {
    if (store) { store.manifest.status = "failed"; store.manifest.error = { name: error.name, code: error.original?.code || error.code || null,
      message: error.name === "AssertionError" ? error.message.split("\n")[0].slice(0, 200) : "Browser harness did not complete; no credentials logged." }; }
    console.error("Browser verification failed:", error.name, error.original?.code || error.code || "", error.name === "AssertionError" ? error.message : "See scoped manifest.");
    process.exitCode = 1;
  } finally {
    await vite?.close(); await api?.close();
    if (store) {
      try {
        store.manifest.remainingFixtures = await cleanupFixtures(client, store.manifest);
        if (store.manifest.baseline) assert.deepEqual(await snapshotExisting(client, Object.keys(store.manifest.baseline)), store.manifest.baseline);
        store.manifest.existingRecordsUnchanged = true;
      } catch (error) { store.manifest.status = "failed"; store.manifest.cleanupError = { name: error.name, code: error.code || null }; process.exitCode = 1; }
      store.manifest.completedAt = new Date().toISOString(); await store.save();
    }
    await client.end();
    if (temporary) { assert.ok(resolve(temporary).startsWith(resolve(tmpdir()) + sep)); await rm(temporary, { recursive: true, force: true }); }
    for (let i = 0; i < envPaths.length; i++) assert.deepEqual(await readFile(envPaths[i]), originalEnvs[i], "Existing .env files must remain unchanged.");
  }
  return { status: store?.manifest.status, report: store?.path, browserStats: store?.manifest.browserStats,
    remainingFixtures: store?.manifest.remainingFixtures, existingRecordsUnchanged: store?.manifest.existingRecordsUnchanged, error: store?.manifest.error || store?.manifest.cleanupError };
}
function resolvePath(path) { return resolve(frontendRoot, path); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await main(), null, 2)); }
  catch (error) { console.error("Browser verification could not start:", error.name, error.code || ""); process.exitCode = 1; }
}
