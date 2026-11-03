import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs, main } from "../scripts/verifyProductDeliveryNeon.js";
import { AUTHORIZED_DELIVERY_TARGET as target, connectionConfig, verifyConnection, cleanupFixtures } from "./integration/productDeliveryNeonSupport.js";

const url = `postgresql://${target.username}:fictional-test-only@${target.host}/${target.database}?sslmode=require`;
const flags = ["--use-authorized-env", "--confirm-database", target.databaseId, "--confirm-branch", target.branchId];

test("delivery real integration defaults to plan without reading credentials or connecting", async () => {
  const plan = await main([]); assert.equal(plan.writes, 0); assert.equal(plan.status, "prepared-not-executed");
});
test("delivery real integration requires both exact database and branch authorization", () => {
  assert.equal(parseArgs(["--run", ...flags]).mode, "run");
  for (const args of [["--run"], ["--run", ...flags.slice(1)], ["--run", ...flags.slice(0, -2)],
    ["--run", ...flags.map((value) => value === target.databaseId ? "0".repeat(64) : value)], ["--cleanup", "outside.json", ...flags]]) {
    assert.throws(() => parseArgs(args));
  }
});
test("delivery real integration rejects any URL for a different endpoint, role or database", () => {
  for (const changed of [undefined, url.replace(target.host, "ep-other.us-east-2.aws.neon.tech"),
    url.replace(target.username, "different_role"), url.replace("/neondb?", "/production?"), url + "&host=remote.invalid",
    url + "&sslmode=disable", url.replace(target.host, target.host.replace(".", "-pooler."))]) assert.throws(() => connectionConfig(changed));
});
test("delivery real integration enforces verified TLS without connection-string SSL overrides", () => {
  const config = connectionConfig(url);
  assert.equal(config.ssl.rejectUnauthorized, true); assert.equal(config.ssl.minVersion, "TLSv1.2");
  assert.equal(config.connectionString, undefined);
});
test("delivery real integration compares server branch and endpoint before allowing writes", async () => {
  const identity = { database: target.database, username: target.username, branch_id: target.branchId, endpoint_id: target.endpointId };
  const client = (values) => ({ connection: { stream: { encrypted: true, authorized: true, getProtocol: () => "TLSv1.3" } },
    query: async () => ({ rows: [values] }) });
  assert.equal((await verifyConnection(client(identity))).certificateVerified, true);
  for (const changed of [{ ...identity, branch_id: "br-other" }, { ...identity, endpoint_id: "ep-other" }, { ...identity, database: "other" }]) {
    await assert.rejects(() => verifyConnection(client(changed)));
  }
});
test("cleanup rejects manifests for another destination or unreviewed tables before SQL", async () => {
  let queries = 0;
  const client = { query: async () => { queries++; } };
  const base = { version: 1, databaseId: target.databaseId, branchId: target.branchId,
    runId: "7db6e8f1-c9de-4ae1-ae75-3872d537c099", createdAt: new Date().toISOString(), rows: {} };
  for (const changed of [{ ...base, databaseId: "wrong" }, { ...base, branchId: "br-other" },
    { ...base, rows: { Unreviewed: { type: "uuid", ids: [] } } }]) await assert.rejects(() => cleanupFixtures(client, changed));
  assert.equal(queries, 0);
});

test("scoped cleanup includes webhook fixtures and keeps the creation-date guard", async () => {
  const queries = [];
  const manifest = { version: 1, databaseId: target.databaseId, branchId: target.branchId,
    runId: "7db6e8f1-c9de-4ae1-ae75-3872d537c099", createdAt: new Date().toISOString(),
    rows: { PaymentWebhookEvents: { type: "uuid", ids: ["4b203ddb-c283-488e-a250-0e1594a0d12f"] } } };
  const remaining = await cleanupFixtures({ async query(sql, values) {
    queries.push({ sql, values }); return { rowCount: 0, rows: [{ count: "0" }] };
  } }, manifest);
  assert.equal(remaining, 0);
  const deletion = queries.find((entry) => entry.sql.startsWith("DELETE"));
  assert.match(deletion.sql, /"PaymentWebhookEvents".*id=ANY\(\$1::uuid\[\]\).*"createdAt">=\$2/);
  assert.deepEqual(deletion.values, [manifest.rows.PaymentWebhookEvents.ids, manifest.createdAt]);
});

test("cleanup rolls back before changing any record that predates its manifest", async () => {
  const queries = [];
  const manifest = { version: 1, databaseId: target.databaseId, branchId: target.branchId,
    runId: "7db6e8f1-c9de-4ae1-ae75-3872d537c099", createdAt: new Date().toISOString(),
    rows: { Users: { type: "uuid", ids: ["4b203ddb-c283-488e-a250-0e1594a0d12f"] } } };
  await assert.rejects(() => cleanupFixtures({ async query(sql) {
    queries.push(sql); return { rowCount: sql.startsWith("SELECT id") ? 1 : 0, rows: [] };
  } }, manifest), /predating this run/);
  assert.equal(queries.at(-1), "ROLLBACK");
  assert.ok(queries.every((sql) => !/^(DELETE|UPDATE|INSERT)/.test(sql)));
});
