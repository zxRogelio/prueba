import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import pg from "pg";

// This module never imports application configuration or dotenv. There is no
// migration/write mode and no fallback to any application DATABASE_URL variable.
export const DELIVERY_MIGRATION = "20261102000100-create-product-delivery-system.js";
const deliveryTables = ["UserAddresses", "ShippingRates", "OrderFulfillments", "FulfillmentEvents"];
const oldTables = ["Users", "Orders", "OrderItems", "Payments", "MembershipPlans", "UserSubscriptions", "InventoryReservations"];

export function deliveryNeonFingerprint(target) {
  return createHash("sha256").update(JSON.stringify({ host: target.host.toLowerCase(), port: 5432,
    database: target.database, username: target.username, schema: "core" })).digest("hex");
}

const endpoint = (host) => host.toLowerCase().replace("-pooler.", ".");

export function validateDeliveryNeonTarget(target, value) {
  assert.equal(target?.environment, "test", "A dedicated test environment is required.");
  assert.match(target.projectId || "", /^[a-z][a-z0-9-]{2,100}$/, "Confirm the Neon project ID.");
  assert.match(target.neonBranchId || "", /^br-[a-z0-9-]+$/, "Confirm the Neon branch ID.");
  assert.equal(target.neonBranchName, "test/product-delivery-system", "Use the reviewed delivery test branch.");
  assert.equal(target.branchVerifiedInNeon, true, "Verify branch-to-endpoint mapping in Neon first.");
  assert.equal(target.deploymentIsolationVerified, true, "Confirm that deployed applications do not use this endpoint.");
  assert.match(target.host || "", /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/, "A direct Neon endpoint is required.");
  assert.ok(!target.host.includes("-pooler."), "Use the direct endpoint, not the pooler.");
  assert.equal(target.port, 5432, "The reviewed port must be 5432.");
  for (const field of ["database", "username"]) {
    assert.ok(typeof target[field] === "string" && target[field].length > 0 && target[field].length <= 63, "Confirm database and role.");
  }
  assert.ok(Array.isArray(target.productionHosts) && target.productionHosts.length > 0, "List protected production endpoints independently.");
  for (const host of target.productionHosts) {
    assert.match(host, /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/, "Protected endpoints must be valid Neon hosts.");
    assert.notEqual(endpoint(host), endpoint(target.host), "The test endpoint belongs to the protected production destination.");
  }
  assert.equal(target.expectedDatabaseId, deliveryNeonFingerprint(target), "Review the independent target fingerprint.");
  assert.ok(typeof value === "string" && value.length > 0, "Set DELIVERY_NEON_TEST_DATABASE_URL privately; application URLs are not used.");
  let url;
  try { url = new URL(value); } catch { throw new Error("The dedicated test URL is invalid."); }
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "A PostgreSQL test URL is required.");
  assert.equal(url.hostname, target.host, "The dedicated URL must match the reviewed endpoint.");
  assert.equal(Number(url.port || 5432), target.port, "The dedicated URL port differs.");
  assert.equal(decodeURIComponent(url.pathname.slice(1)), target.database, "The dedicated URL database differs.");
  assert.equal(decodeURIComponent(url.username), target.username, "The dedicated URL role differs.");
  assert.ok(url.password, "A separate test credential is required.");
  assert.equal(url.hash, "", "URL fragments are forbidden.");
  for (const [key, option] of url.searchParams) {
    assert.ok((key === "sslmode" && ["require", "verify-full"].includes(option)) ||
      (key === "channel_binding" && option === "require"), "URL overrides are forbidden; only secure TLS options are accepted.");
  }
  // Pass explicit fields instead of connectionString: URL sslmode must not
  // replace the stricter certificate verification below in node-postgres.
  return { host: target.host, port: target.port, database: target.database, user: target.username,
    password: decodeURIComponent(url.password), ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2", servername: target.host },
    options: "-c default_transaction_read_only=on", connectionTimeoutMillis: 10000,
    application_name: "titanium-delivery-neon-readonly" };
}

export async function preflightDeliveryNeon({ target, connectionString, clientFactory = (config) => new pg.Client(config) }) {
  const config = validateDeliveryNeonTarget(target, connectionString);
  const client = clientFactory(config);
  try {
    await client.connect();
    assert.equal(client.connection.stream.encrypted, true, "TLS is required.");
    assert.equal(client.connection.stream.authorized, true, "The server certificate must be verified.");
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '10s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    const { rows: [identity] } = await client.query(`SELECT current_database() AS database, current_user AS username,
      current_setting('transaction_read_only') AS readonly, current_setting('transaction_isolation') AS isolation,
      current_setting('server_version') AS version`);
    assert.equal(identity.database, target.database, "Unexpected database identity.");
    assert.equal(identity.username, target.username, "Unexpected role identity.");
    assert.equal(identity.readonly, "on", "The preflight must remain read-only.");
    const { rows: tables } = await client.query(`SELECT table_name FROM information_schema.tables
      WHERE table_schema='core' AND table_name=ANY($1::text[])`, [[...oldTables, ...deliveryTables, "SequelizeMeta"]]);
    const present = new Set(tables.map((row) => row.table_name));
    const { rows: columns } = await client.query(`SELECT table_name, column_name, data_type, column_default, is_nullable
      FROM information_schema.columns WHERE table_schema='core'
      AND (table_name=ANY($1::text[]) OR (table_name='Orders' AND column_name IN ('id','total','shippingTotal')))`, [deliveryTables]);
    const { rows: indexes } = await client.query(`SELECT tablename, indexname, indexdef FROM pg_indexes
      WHERE schemaname='core' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname`, [deliveryTables]);
    const { rows: constraints } = await client.query(`SELECT c.conname, c.contype, t.relname AS table_name,
      pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='core' AND t.relname=ANY($1::text[]) ORDER BY t.relname,c.conname`, [[...deliveryTables, "Orders"]]);
    const { rows: permissions } = await client.query(`SELECT n.nspname AS schema,
      has_schema_privilege(current_user,n.oid,'USAGE') AS usage,
      has_schema_privilege(current_user,n.oid,'CREATE') AS "canCreate"
      FROM pg_namespace n WHERE n.nspname='core'`);
    const { rows: owners } = await client.query(`SELECT c.relname AS table_name,
      pg_get_userbyid(c.relowner) AS owner, pg_has_role(current_user,c.relowner,'USAGE') AS inherits_owner
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='core' AND c.relname=ANY($1::text[])`, [["Orders", ...deliveryTables]]);
    const applied = present.has("SequelizeMeta")
      ? (await client.query('SELECT name FROM core."SequelizeMeta" ORDER BY name')).rows.map((row) => row.name) : [];
    const files = (await readdir(new URL("../migrations/", import.meta.url))).filter((file) => /^\d+-.+\.js$/.test(file)).sort();
    const shippingColumn = columns.find((column) => column.table_name === "Orders" && column.column_name === "shippingTotal");
    return { status: "read-only-preflight-completed", writes: 0, migrationsExecuted: 0,
      target: { projectId: target.projectId, neonBranchId: target.neonBranchId, neonBranchName: target.neonBranchName,
        host: target.host, database: target.database, username: target.username, databaseId: target.expectedDatabaseId },
      identity, permissions, owners, missingPrerequisiteTables: oldTables.filter((name) => !present.has(name)),
      deliveryTables: deliveryTables.filter((name) => present.has(name)), shippingColumn: shippingColumn || null,
      appliedMigrations: applied, pendingMigrations: files.filter((name) => !applied.includes(name)),
      deliveryMigrationRecorded: applied.includes(DELIVERY_MIGRATION), columns, indexes, constraints,
      warning: "SQL identity cannot prove Neon branch mapping or deployment isolation. This preflight does not execute migration or business tests." };
  } finally {
    try { await client.query("ROLLBACK"); } catch { /* No transaction if connection failed. */ }
    await client.end();
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 0 || (args.length === 1 && args[0] === "--plan")) {
    return { status: "prepared-not-executed", connection: "none", writes: 0,
      requires: ["verified isolated Neon branch", "independently reviewed target JSON", "DELIVERY_NEON_TEST_DATABASE_URL"],
      command: "node scripts/preflightProductDeliveryNeon.js --preflight --target PATH.local" };
  }
  assert.ok(args.length === 3 && args[0] === "--preflight" && args[1] === "--target" && args[2], "Only --plan or --preflight --target PATH.local are supported.");
  const target = JSON.parse(await readFile(args[2], "utf8"));
  return preflightDeliveryNeon({ target, connectionString: process.env.DELIVERY_NEON_TEST_DATABASE_URL });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await main(), null, 2)); }
  catch (error) {
    // Never print external errors, SQL, URL values, passwords or assertion diffs.
    console.error(JSON.stringify({ status: "not-completed", writes: 0,
      error: "Neon delivery preflight rejected or failed. Review the isolated target and secure connection privately.",
      code: /^[A-Z0-9_]{1,40}$/.test(error.code || "") ? error.code : null }));
    process.exitCode = 1;
  }
}
