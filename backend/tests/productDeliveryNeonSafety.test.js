import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { deliveryNeonFingerprint, validateDeliveryNeonTarget, preflightDeliveryNeon, main } from "../scripts/preflightProductDeliveryNeon.js";

const url = "postgresql://delivery_test:fictional-only@ep-delivery-isolated.us-east-2.aws.neon.tech/delivery_test?sslmode=require";
const target = () => {
  const value = { environment: "test", projectId: "fictional-project-123", neonBranchId: "br-delivery-isolated",
    neonBranchName: "test/product-delivery-system", branchVerifiedInNeon: true, deploymentIsolationVerified: true,
    productionHosts: ["ep-production-protected.us-east-2.aws.neon.tech"],
    host: "ep-delivery-isolated.us-east-2.aws.neon.tech", port: 5432, database: "delivery_test", username: "delivery_test" };
  return { ...value, expectedDatabaseId: deliveryNeonFingerprint(value) };
};

test("Neon delivery plan never connects or reads application .env", async () => {
  const plan = await main([]);
  assert.equal(plan.connection, "none"); assert.equal(plan.writes, 0);
});

test("the example cannot authorize a database connection", async () => {
  const example = JSON.parse(await readFile(new URL("./integration/productDeliveryNeon.target.example.json", import.meta.url), "utf8"));
  assert.throws(() => validateDeliveryNeonTarget(example, url));
});

test("explicit test URL uses verified TLS and default read-only sessions", () => {
  const config = validateDeliveryNeonTarget(target(), url);
  assert.equal(config.ssl.rejectUnauthorized, true); assert.equal(config.ssl.minVersion, "TLSv1.2");
  assert.equal(config.options, "-c default_transaction_read_only=on");
  assert.equal(config.connectionString, undefined);
});

for (const [name, change] of [
  ["production", { environment: "production" }], ["unverified branch", { branchVerifiedInNeon: false }],
  ["unverified deployments", { deploymentIsolationVerified: false }], ["branch name", { neonBranchName: "production" }],
  ["branch ID", { neonBranchId: "production" }], ["fingerprint", { expectedDatabaseId: "0".repeat(64) }],
  ["pooler", { host: "ep-delivery-isolated-pooler.us-east-2.aws.neon.tech" }],
  ["production host", { productionHosts: ["ep-delivery-isolated.us-east-2.aws.neon.tech"] }],
  ["production pooler alias", { productionHosts: ["ep-delivery-isolated-pooler.us-east-2.aws.neon.tech"] }],
]) {
  test(`Neon delivery rejects ${name} before constructing a client`, async () => {
    let calls = 0;
    await assert.rejects(() => preflightDeliveryNeon({ target: { ...target(), ...change }, connectionString: url,
      clientFactory() { calls++; throw new Error("No network allowed"); } }));
    assert.equal(calls, 0);
  });
}

test("missing credentials and connection overrides cannot fall back to application settings", () => {
  for (const value of [undefined, "", url.replace("ep-delivery-isolated", "ep-production-protected"),
    url.replace("/delivery_test?", "/production?"), url + "&host=remote.invalid", url + "&sslmode=disable", url + "&sslrootcert=unsafe", url + "#override"]) {
    assert.throws(() => validateDeliveryNeonTarget(target(), value));
  }
});

test("migration and write flags are not supported", async () => {
  for (const args of [["--run"], ["--apply"], ["--preflight"], ["--preflight", "--target", "unused.local", "--run"]]) {
    await assert.rejects(() => main(args));
  }
});

test("read-only SQL inspects existing metadata without creating SequelizeMeta", async () => {
  const queries = [];
  let ended = false;
  const client = {
    connection: { stream: { encrypted: true, authorized: true } },
    async connect() {}, async end() { ended = true; },
    async query(sql) {
      queries.push(sql);
      if (/current_database/.test(sql)) return { rows: [{ database: "delivery_test", username: "delivery_test", readonly: "on", isolation: "read committed", version: "fixture" }] };
      return { rows: [] };
    },
  };
  const result = await preflightDeliveryNeon({ target: target(), connectionString: url, clientFactory: () => client });
  assert.equal(result.writes, 0); assert.equal(result.migrationsExecuted, 0);
  assert.equal(result.deliveryMigrationRecorded, false); assert.ok(result.pendingMigrations.includes("20261102000100-create-product-delivery-system.js"));
  assert.equal(ended, true);
  assert.equal(queries[0], "BEGIN READ ONLY"); assert.equal(queries.at(-1), "ROLLBACK");
  for (const sql of queries) assert.match(sql.trim(), /^(?:SELECT\b|BEGIN READ ONLY$|SET LOCAL\b|ROLLBACK$)/i);
});

test("unverified TLS and server identity failures close the connection", async () => {
  for (const authorized of [false, true]) {
    let ended = false;
    await assert.rejects(() => preflightDeliveryNeon({ target: target(), connectionString: url, clientFactory: () => ({
      connection: { stream: { encrypted: true, authorized } }, async connect() {}, async end() { ended = true; },
      async query(sql) { return /current_database/.test(sql) ? { rows: [{ database: "wrong-database" }] } : { rows: [] }; },
    }) }));
    assert.equal(ended, true);
  }
});
