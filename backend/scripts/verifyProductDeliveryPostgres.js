import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { up, down } from "../migrations/20261102000100-create-product-delivery-system.js";

// Deliberately does not import dotenv or application DB configuration.
export function validateLocalDeliveryTarget(value, args) {
  assert.deepEqual([...args].sort(), ["--allow-local-ddl", "--run"], "Use --run --allow-local-ddl for an empty local test database.");
  assert.ok(value, "Set DELIVERY_TEST_DATABASE_URL explicitly. Application DATABASE_URL variables are never used.");
  const target = new URL(value);
  assert.ok(["postgres:", "postgresql:"].includes(target.protocol), "PostgreSQL URL required.");
  assert.ok(["127.0.0.1", "[::1]"].includes(target.hostname), "Only literal loopback addresses are accepted. Remote databases are forbidden.");
  assert.equal(target.pathname, "/titanium_delivery_test", "Use a dedicated database named titanium_delivery_test.");
  assert.equal(target.search, "", "Connection-string query overrides are forbidden.");
  return target;
}

export async function verifyLocalDeliverySchema(value, args) {
  validateLocalDeliveryTarget(value, args);
  const client = new pg.Client({ connectionString: value, connectionTimeoutMillis: 5000, ssl: false });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '10s'");
    const baseline = await client.query("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core'");
    assert.equal(baseline.rowCount, 0, "The local test database must not contain a core schema. No existing schema will be modified.");
    await client.query(`CREATE SCHEMA core;
      CREATE TABLE core."Users" (id UUID PRIMARY KEY);
      CREATE TABLE core."Orders" (id UUID PRIMARY KEY, "userId" UUID, total DECIMAL(12,2));`);
    const userId = randomUUID(), orderId = randomUUID();
    await client.query('INSERT INTO core."Users" VALUES ($1)', [userId]);
    await client.query('INSERT INTO core."Orders" VALUES ($1,$2,200)', [orderId, userId]);
    const transaction = {};
    const sequelize = { query: (sql, options) => { assert.equal(options.transaction, transaction); return client.query(sql); } };
    await up({ sequelize, transaction });
    const legacy = (await client.query('SELECT total, "shippingTotal" FROM core."Orders" WHERE id=$1', [orderId])).rows[0];
    assert.equal(legacy.total, "200.00"); assert.equal(legacy.shippingTotal, "0.00");
    await client.query("SAVEPOINT empty_schema_rollback");
    await down({ sequelize, transaction });
    assert.equal((await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='OrderFulfillments'")).rowCount, 0);
    await client.query("ROLLBACK TO SAVEPOINT empty_schema_rollback");
    await client.query("SAVEPOINT shipping_total_guard");
    await client.query('UPDATE core."Orders" SET "shippingTotal"=1 WHERE id=$1', [orderId]);
    await assert.rejects(() => down({ sequelize, transaction }), (error) => error.code === "P0001");
    await client.query("ROLLBACK TO SAVEPOINT shipping_total_guard");
    async function expectDbError(sql, values, code) {
      await client.query("SAVEPOINT expected_error");
      let received;
      try { await client.query(sql, values); } catch (error) { received = error.code; }
      await client.query("ROLLBACK TO SAVEPOINT expected_error");
      assert.equal(received, code);
    }
    const addressInsert = `INSERT INTO core."UserAddresses" (id,"userId","recipientName",phone,"postalCode",state,municipality,neighborhood,street,"exteriorNumber","references","isDefault")
      VALUES ($1,$2,'Test','5555555555','01001','Test','Test','Test','Test','1','Test',true)`;
    await client.query(addressInsert, [randomUUID(), userId]);
    await expectDbError(addressInsert, [randomUUID(), userId], "23505");
    await expectDbError(`INSERT INTO core."ShippingRates" (id,name,"postalCodeFrom","postalCodeTo",amount) VALUES ($1,'Test','01999','01000',75)`, [randomUUID()], "23514");
    const fulfillmentId = randomUUID();
    await client.query(`INSERT INTO core."OrderFulfillments" (id,"orderId",method,"recipientName",phone,"pickupLocationSnapshot")
      VALUES ($1,$2,'pickup','Test','5555555555','{"address":"Test","phone":"5555555555"}')`, [fulfillmentId, orderId]);
    await expectDbError('UPDATE core."OrderFulfillments" SET status=\'shipped\' WHERE id=$1', [fulfillmentId], "23514");
    await expectDbError('UPDATE core."OrderFulfillments" SET "shippingCost"=75 WHERE id=$1', [fulfillmentId], "23514");
    await client.query(`INSERT INTO core."FulfillmentEvents" (id,"fulfillmentId","toStatus") VALUES ($1,$2,'awaiting_payment'),($3,$2,'payment_confirmed')`, [randomUUID(), fulfillmentId, randomUUID()]);
    const events = (await client.query('SELECT sequence FROM core."FulfillmentEvents" ORDER BY sequence')).rows;
    assert.equal(events.length, 2); assert.ok(BigInt(events[0].sequence) < BigInt(events[1].sequence));
    await client.query("SAVEPOINT rollback_guard");
    await assert.rejects(() => down({ sequelize, transaction }), (error) => error.code === "P0001");
    await client.query("ROLLBACK TO SAVEPOINT rollback_guard");
    return { ok: true, checks: ["additive migration", "legacy totals", "empty schema rollback", "shipping total rollback protection", "one default address", "coverage bounds", "pickup constraints", "event sequence", "rollback protection"], persistedWrites: 0 };
  } finally {
    try { await client.query("ROLLBACK"); }
    finally { await client.end(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (!args.length || (args.length === 1 && args[0] === "--plan")) {
      console.log({ status: "prepared-not-executed", target: "empty loopback titanium_delivery_test only", execution: "Pass --run --allow-local-ddl explicitly. All DDL and test rows are rolled back." });
    } else console.log(await verifyLocalDeliverySchema(process.env.DELIVERY_TEST_DATABASE_URL, args));
  }
  catch (error) {
    // SQL driver errors can contain credentials/connection details; do not print them.
    console.error(error.code === "ERR_ASSERTION" ? error.message : "Local PostgreSQL schema verification failed; inspect the dedicated local test instance.");
    process.exitCode = 1;
  }
}
