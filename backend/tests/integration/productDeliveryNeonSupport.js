import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import * as crypto from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import pg from "pg";
import * as SequelizeModule from "sequelize";
import jwt from "jsonwebtoken";
import * as mercadoPago from "mercadopago";

// Authorized by the user specifically for the .env branch named pagos-test.
// SQL identity was independently read before preparing any write operation.
export const AUTHORIZED_DELIVERY_TARGET = Object.freeze({ branchName: "pagos-test", branchId: "br-lively-math-akwgzcsr",
  endpointId: "ep-long-snow-akwnltba", host: "ep-long-snow-akwnltba.c-3.us-west-2.aws.neon.tech", port: 5432,
  database: "neondb", username: "neondb_owner", databaseId: "b9f1e49df2b08b5b3b98ac926fbd12073a8782b668d5ff0240c6f489b6716323" });
export const MIGRATION = "20261102000100-create-product-delivery-system.js";
export const TABLES = ["UserAddresses", "ShippingRates", "OrderFulfillments", "FulfillmentEvents"];
export const reportRoot = fileURLToPath(new URL("../../storage/test-reports/product-delivery-neon/", import.meta.url));
export const quote = (value) => '"' + String(value).replaceAll('"', '""') + '"';

export function connectionConfig(value) {
  assert.ok(value, "A separately authorized test connection is required.");
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid test connection."); }
  const target = AUTHORIZED_DELIVERY_TARGET;
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.equal(url.hostname, target.host, "Unauthorized host.");
  assert.equal(Number(url.port || 5432), target.port, "Unauthorized port.");
  assert.equal(decodeURIComponent(url.pathname.slice(1)), target.database, "Unauthorized database.");
  assert.equal(decodeURIComponent(url.username), target.username, "Unauthorized role.");
  assert.ok(url.password); assert.equal(url.hash, "");
  for (const [key, option] of url.searchParams) {
    assert.ok((key === "sslmode" && ["require", "verify-full"].includes(option)) ||
      (key === "channel_binding" && option === "require"), "Unsafe URL override.");
  }
  const databaseId = createHash("sha256").update(JSON.stringify({ host: url.hostname, port: target.port,
    database: target.database, username: target.username, schema: "core" })).digest("hex");
  assert.equal(databaseId, target.databaseId);
  return { host: target.host, port: target.port, database: target.database, user: target.username,
    password: decodeURIComponent(url.password), ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2", servername: target.host },
    connectionTimeoutMillis: 10000, statement_timeout: 25000, lock_timeout: 15000, idle_in_transaction_session_timeout: 45000 };
}

export async function verifyConnection(client) {
  assert.equal(client.connection.stream.encrypted, true, "TLS required.");
  assert.equal(client.connection.stream.authorized, true, "Verified certificate required.");
  const { rows: [identity] } = await client.query(`SELECT current_database() AS database,current_user AS username,
    current_setting('neon.branch_id',true) AS branch_id,current_setting('neon.endpoint_id',true) AS endpoint_id,
    current_setting('server_version') AS version`);
  const target = AUTHORIZED_DELIVERY_TARGET;
  assert.equal(identity.database, target.database); assert.equal(identity.username, target.username);
  assert.equal(identity.branch_id, target.branchId, "Neon branch differs from the authorized test branch.");
  assert.equal(identity.endpoint_id, target.endpointId, "Neon endpoint differs from the authorized test endpoint.");
  return { ...identity, tls: client.connection.stream.getProtocol(), certificateVerified: true };
}

export async function openClient(config, name) {
  const client = new pg.Client({ ...config, application_name: name });
  try { await client.connect(); await verifyConnection(client); return client; }
  catch (error) { await client.end().catch(() => {}); throw error; }
}

export async function snapshotExisting(client, names = null) {
  if (!names) names = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='core' ORDER BY tablename")).rows
    .map((row) => row.tablename).filter((name) => !TABLES.includes(name));
  const result = {};
  for (const name of names) {
    // Hashes only; no personal or financial row content is logged or persisted.
    const expression = name === "Orders" ? "to_jsonb(t)-'shippingTotal'"
      : name === "AboutPages" ? "to_jsonb(t)-'pickupSettings'" : "to_jsonb(t)";
    const where = name === "SequelizeMeta" ? "WHERE name <> $1" : "";
    const { rows: [value] } = await client.query(`SELECT count(*)::int AS count,
      md5(coalesce(string_agg(md5((${expression})::text),'' ORDER BY md5((${expression})::text)),'')) AS digest
      FROM core.${quote(name)} t ${where}`, name === "SequelizeMeta" ? [MIGRATION] : []);
    result[name] = value;
  }
  return result;
}

export async function createManifest() {
  const runId = randomUUID();
  const manifest = { version: 1, runId, databaseId: AUTHORIZED_DELIVERY_TARGET.databaseId,
    branchId: AUTHORIZED_DELIVERY_TARGET.branchId, createdAt: new Date().toISOString(), rows: {}, checks: [], status: "prepared" };
  const path = resolve(reportRoot, runId + ".json");
  await mkdir(dirname(path), { recursive: true });
  return openManifestStore(manifest, path);
}

export async function resumeRemoteManifest(runId) {
  assert.match(runId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  const path = resolve(reportRoot, runId + ".json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  assert.equal(manifest.runId, runId); assert.equal(manifest.version, 1);
  assert.equal(manifest.kind, "remote-checkout"); assert.equal(manifest.retainForAudit, true);
  assert.equal(manifest.databaseId, AUTHORIZED_DELIVERY_TARGET.databaseId);
  assert.equal(manifest.branchId, AUTHORIZED_DELIVERY_TARGET.branchId);
  assert.ok(manifest.baseline && manifest.fixture);
  return openManifestStore(manifest, path);
}

async function openManifestStore(manifest, path) {
  let queue = Promise.resolve();
  const save = () => {
    queue = queue.then(async () => { await writeFile(path + ".tmp", JSON.stringify(manifest, null, 2)); await rename(path + ".tmp", path); });
    return queue;
  };
  await save();
  const record = async (model, instance) => {
    const table = model.getTableName(); assert.equal(table.schema, "core");
    const key = model.primaryKeyAttribute; assert.equal(key, "id", "Only explicit primary-key cleanup is supported.");
    const id = instance.get(key); assert.ok(id !== undefined && id !== null);
    const type = model.rawAttributes[key].type.key === "UUID" ? "uuid" : "integer";
    manifest.rows[table.tableName] ||= { type, ids: [] };
    if (!manifest.rows[table.tableName].ids.includes(id)) manifest.rows[table.tableName].ids.push(id);
    await save(); // Persist identifiers BEFORE INSERT so interruption is recoverable.
  };
  return { manifest, path, save, record };
}

export async function loadBackend(config, manifestStore, label, secrets, options = {}) {
  const sequelize = new SequelizeModule.Sequelize(config.database, config.user, config.password, {
    host: config.host, port: config.port, dialect: "postgres", logging: false,
    pool: { max: 3, min: 0, idle: 10000, acquire: 30000 },
    dialectOptions: { ...config, application_name: label },
  });
  sequelize.addHook("afterConnect", (client) => verifyConnection(client));
  const env = { JWT_SECRET: secrets.jwt, MERCADOPAGO_ACCESS_TOKEN: "TEST-PGDEL-NOT-A-CREDENTIAL",
    MERCADOPAGO_WEBHOOK_SECRET: secrets.webhook, FRONTEND_URL: "http://localhost:5173", BACKEND_PUBLIC_URL: "https://backend.example.test",
    ...options.env };
  const context = vm.createContext({ process: { env }, console, Date, Buffer, URL, setTimeout, clearTimeout });
  const forbidden = class { constructor() { throw new Error("External Mercado Pago calls are forbidden in this test."); } };
  const external = { "node:crypto": crypto, crypto, sequelize: SequelizeModule, jsonwebtoken: { default: jwt },
    mercadopago: { ...mercadoPago, MercadoPagoConfig: forbidden, Payment: forbidden, Preference: forbidden, PaymentRefund: forbidden },
    ...options.external };
  const base = new URL("../../", import.meta.url);
  const cache = new Map();
  function synthetic(key, values) {
    if (!cache.has(key)) cache.set(key, new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    }, { context, identifier: key }));
    return cache.get(key);
  }
  const internal = { "config/sequelize.js": { sequelize, sequelizeAdminDirect: sequelize, sequelizeImporter: sequelize, sequelizeReports: sequelize },
    // Keep commercial OrderNumberCounters completely untouched. All models,
    // queries, transactions and business services otherwise use PostgreSQL.
    "utils/orderNumber.js": { generateOrderNumber: async () => "PGDEL-" + randomUUID().replaceAll("-", "").slice(0, 24) },
    ...options.internal };
  async function moduleFor(url) {
    const key = url.href.slice(base.href.length);
    if (internal[key]) return synthetic(key, internal[key]);
    if (!cache.has(url.href)) cache.set(url.href, new vm.SourceTextModule(await readFile(url, "utf8"), { context, identifier: url.href }));
    return cache.get(url.href);
  }
  const linker = (specifier, parent) => {
    if (external[specifier]) return synthetic(specifier, external[specifier]);
    assert.ok(specifier.startsWith("."), "Unexpected external dependency: " + specifier);
    return moduleFor(new URL(specifier, parent.identifier));
  };
  async function load(path) {
    const module = await moduleFor(new URL(path, base));
    if (module.status === "unlinked") await module.link(linker);
    if (module.status === "linked") await module.evaluate();
    return module.namespace;
  }
  const models = await load("models/index.js");
  const isOurs = (value) => Object.values(manifestStore.manifest.rows).some((entry) => entry.ids.includes(value));
  function scoped(where) {
    const ids = [];
    const collect = (value) => {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object" && !(value instanceof Date)) Reflect.ownKeys(value).forEach((key) => collect(value[key]));
      else if ((typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value)) || (typeof value === "number" && isOurs(value))) ids.push(value);
    };
    collect(where);
    assert.ok(ids.length > 0 && ids.every(isOurs), "An update attempted to target non-fixture records.");
  }
  for (const model of Object.values(models)) {
    if (!model?.addHook) continue;
    model.addHook("beforeCreate", (row) => manifestStore.record(model, row));
    model.addHook("beforeBulkCreate", (rows) => Promise.all(rows.map((row) => manifestStore.record(model, row))));
    model.addHook("beforeUpdate", (row) => assert.ok(isOurs(row.id), "Existing records cannot be updated by this harness."));
    model.addHook("beforeDestroy", (row) => assert.ok(isOurs(row.id), "Existing records cannot be deleted by this harness."));
    model.addHook("beforeBulkUpdate", (options) => scoped(options.where));
    model.addHook("beforeBulkDestroy", (options) => scoped(options.where));
  }
  return { sequelize, models, load, env,
    checkout: await load("services/mercadoPagoCheckoutService.js"),
    fulfillment: await load("services/fulfillmentService.js"),
    addresses: await load("services/addressService.js"), shipping: await load("services/shippingService.js"),
    orders: await load("services/orderService.js"), payments: await load("services/paymentService.js"),
    close: () => sequelize.close() };
}

export async function cleanupFixtures(client, manifest) {
  assert.ok(manifest.kind !== "remote-checkout" && !manifest.retainForAudit,
    "Remote payment evidence is retained for audit and cannot be deleted by fixture cleanup.");
  assert.equal(manifest.version, 1);
  assert.equal(manifest.databaseId, AUTHORIZED_DELIVERY_TARGET.databaseId);
  assert.equal(manifest.branchId, AUTHORIZED_DELIVERY_TARGET.branchId);
  assert.match(manifest.runId, /^[a-f0-9-]{36}$/);
  assert.ok(Number.isFinite(Date.parse(manifest.createdAt)), "A manifest creation timestamp is required.");
  const allowed = ["PaymentWebhookEvents", "FulfillmentEvents", "OrderFulfillments", "PaymentRefundItems", "PaymentRefunds", "Receipts",
    "InventoryMovements", "InventoryReservations", "SubscriptionEvents", "SubscriptionHistories", "SubscriptionGroupMembers",
    "UserSubscriptions", "SubscriptionGroups", "Payments", "OrderDiscounts", "OrderItems", "Orders", "PromotionProducts", "Promotions",
    "CartItems", "Carts", "UserAddresses", "sessions", "ProductPriceHistories", "Products", "Brands", "Categories", "MembershipPlans", "Users", "ShippingRates", "AboutPages"];
  for (const name of Object.keys(manifest.rows)) assert.ok(allowed.includes(name), "Unreviewed fixture table in manifest.");
  for (const entry of Object.values(manifest.rows)) {
    assert.ok(["uuid", "integer"].includes(entry.type));
    assert.ok(entry.ids.every((id) => entry.type === "uuid" ? /^[a-f0-9-]{36}$/i.test(id) : Number.isSafeInteger(id)));
  }
  await client.query("BEGIN");
  try {
    for (const [name, entry] of Object.entries(manifest.rows)) {
      const old = await client.query(`SELECT id FROM core.${quote(name)} WHERE id=ANY($1::${entry.type}[]) AND "createdAt" < $2::timestamptz`, [entry.ids, manifest.createdAt]);
      assert.equal(old.rowCount, 0, "Cleanup cannot touch records predating this run.");
    }
    const payments = manifest.rows.Payments;
    if (payments?.ids.length) await client.query('UPDATE core."Payments" SET "subscriptionId"=NULL,"groupId"=NULL WHERE id=ANY($1::uuid[]) AND "createdAt">=$2::timestamptz', [payments.ids, manifest.createdAt]);
    for (const name of allowed) {
      const entry = manifest.rows[name]; if (!entry?.ids.length) continue;
      await client.query(`DELETE FROM core.${quote(name)} WHERE id=ANY($1::${entry.type}[]) AND "createdAt">=$2::timestamptz`, [entry.ids, manifest.createdAt]);
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  let remaining = 0;
  for (const [name, entry] of Object.entries(manifest.rows)) {
    remaining += Number((await client.query(`SELECT count(*) FROM core.${quote(name)} WHERE id=ANY($1::${entry.type}[])`, [entry.ids])).rows[0].count);
  }
  assert.equal(remaining, 0, "Fixture cleanup was incomplete.");
  return remaining;
}

export async function observeRace({ config, labels, table, id, operations }) {
  assert.ok(["Users", "Orders"].includes(table));
  const gate = await openClient(config, "pgdel-gate");
  const monitor = await openClient(config, "pgdel-lock-monitor");
  let tasks;
  let observed;
  try {
    await gate.query("BEGIN");
    await gate.query(`SELECT id FROM core.${quote(table)} WHERE id=$1 FOR UPDATE`, [id]);
    tasks = operations.map((operation) => operation());
    // Attach a handler immediately, before polling the server's lock evidence.
    const settled = Promise.allSettled(tasks);
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const { rows } = await monitor.query(`SELECT pid,application_name FROM pg_stat_activity
        WHERE application_name=ANY($1::text[]) AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0`, [labels]);
      if (new Set(rows.map((row) => row.application_name)).size === 2) { observed = rows; break; }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await gate.query("COMMIT");
    const results = await settled;
    assert.ok(observed && new Set(observed.map((row) => row.pid)).size >= 2, "Two independent PostgreSQL PIDs must be observed blocked before release.");
    return { results, blockedPids: observed.map((row) => row.pid) };
  } finally {
    await gate.query("ROLLBACK").catch(() => {});
    if (tasks) await Promise.allSettled(tasks);
    await gate.end(); await monitor.end();
  }
}
