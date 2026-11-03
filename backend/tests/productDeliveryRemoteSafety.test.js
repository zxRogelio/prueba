import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { WebhookSignatureValidator } from "mercadopago";
import { main, parseRemoteArgs } from "../scripts/serveRemoteProductDelivery.js";
import { remoteOrigin, assertTestSeller, assertOwnedRemotePayment, authenticateRemoteWebhook, snapshotOriginals } from "./integration/productDeliveryRemoteSafety.js";
import { AUTHORIZED_DELIVERY_TARGET as target, cleanupFixtures, resumeRemoteManifest } from "./integration/productDeliveryNeonSupport.js";
import { readLocalWebhookSecret } from "./integration/productDeliveryRemoteSecrets.js";

test("remote checkout defaults to an offline plan and explicitly preserves evidence", async () => {
  const plan = await main([]); assert.equal(plan.status, "prepared-not-executed");
  assert.match(plan.retention, /retain/); assert.equal(plan.publicRoutes.length, 3);
});
test("remote checkout requires exact branch authorization and an explicit temporary HTTPS origin", async () => {
  const flags = ["--use-authorized-env", "--confirm-database", target.databaseId, "--confirm-branch", target.branchId];
  assert.equal(parseRemoteArgs(["--serve", "--public-url", "https://synthetic-test.trycloudflare.com", ...flags]).mode, "serve");
  for (const args of [["--serve"], ["--run"], ["--serve", "--public-url", "https://synthetic-test.trycloudflare.com"],
    ["--serve", "--public-url", "https://synthetic-test.trycloudflare.com", ...flags.slice(0, -1), "br-production"]]) await assert.rejects(() => main(args));
});
test("remote checkout refuses production, HTTP, credentials, ports and URL overrides", () => {
  for (const url of ["http://synthetic-test.trycloudflare.com", "https://server-titanium.onrender.com", "https://localhost",
    "https://synthetic-test.trycloudflare.com:444", "https://user:secret@synthetic-test.trycloudflare.com", "https://synthetic-test.trycloudflare.com/path",
    "https://synthetic-test.trycloudflare.com?url=production", "https://synthetic-test.trycloudflare.com#fragment"]) assert.throws(() => remoteOrigin(url));
});

test("remote resume keeps exact branch authorization and requires a bounded run UUID", () => {
  const flags = ["--use-authorized-env", "--confirm-database", target.databaseId, "--confirm-branch", target.branchId];
  const runId = "7db6e8f1-c9de-4ae1-ae75-3872d537c099";
  const prefix = ["--serve", "--public-url", "https://synthetic-test.trycloudflare.com"];
  assert.equal(parseRemoteArgs([...prefix, "--resume-run", runId, "--use-local-webhook-secret", ...flags]).resumeRunId, runId);
  assert.throws(() => parseRemoteArgs([...prefix, "--use-local-webhook-secret", ...flags]));
  assert.throws(() => parseRemoteArgs([...prefix, "--resume-run", "../outside", ...flags]));
});
test("invalid resume IDs cannot read arbitrary evidence files", async () => {
  for (const value of [undefined, "../outside", "production.json", "000000000000000000000000000000000000"]) await assert.rejects(() => resumeRemoteManifest(value));
});
test("invalid local key IDs cannot read or decrypt arbitrary files", async () => {
  for (const value of [undefined, "../outside", "production.env", "000000000000000000000000000000000000"]) await assert.rejects(() => readLocalWebhookSecret(value));
});
test("remote checkout verifies test_user status and exact seller identity", () => {
  assertTestSeller({ id: 123, tags: ["test_user"] }, "123");
  assert.throws(() => assertTestSeller({ id: 123, tags: ["normal"] }, "123"));
  assert.throws(() => assertTestSeller({ id: 456, tags: ["test_user"] }, "123"));
});
test("remote provider payments cannot mutate another order, seller, mode or metadata", () => {
  const manifest = { rows: { Orders: { ids: ["order"] }, Payments: { ids: ["payment"] }, Users: { ids: ["user"] } } };
  const valid = { id: "123456", collector_id: 123, live_mode: true, external_reference: "order", metadata: { order_id: "order", payment_id: "payment", user_id: "user" } };
  assertOwnedRemotePayment(valid, manifest, "123", true);
  for (const change of [{ collector_id: 456 }, { live_mode: false }, { external_reference: "other" }, { metadata: {} }, { id: "not-numeric" }]) {
    assert.throws(() => assertOwnedRemotePayment({ ...valid, ...change }, manifest, "123", true));
  }
});
test("remote ingress validates the real SDK HMAC without trusting body-supplied payment IDs", () => {
  const secret = "unit-test-only-not-provider-secret", now = Date.now(), ts = String(now), id = "123456", request = "request-unit";
  const signature = createHmac("sha256", secret).update(`id:${id};request-id:${request};ts:${ts};`).digest("hex");
  const input = { headers: { "x-signature": `ts=${ts},v1=${signature}`, "x-request-id": request }, query: { "data.id": id }, secret, validator: WebhookSignatureValidator, now };
  assert.equal(authenticateRemoteWebhook(input), id);
  assert.throws(() => authenticateRemoteWebhook({ ...input, query: { "data.id": "999" } }));
  assert.throws(() => authenticateRemoteWebhook({ ...input, query: {} }));
});
test("remote ingress rejects expired, future and missing signatures before any SDK lookup", () => {
  let calls = 0; const now = Date.now();
  for (const headers of [{}, { "x-signature": "ts=invalid,v1=00", "x-request-id": "unit" },
    ...[-301000, 301000].map((offset) => ({ "x-signature": `ts=${now + offset},v1=00`, "x-request-id": "unit" }))]) {
    assert.throws(() => authenticateRemoteWebhook({ headers, query: { "data.id": "123" }, secret: "unit", validator: { validate() { calls++; } }, now }));
  }
  assert.equal(calls, 0);
});
test("generic fixture cleanup cannot delete any remote payment evidence", async () => {
  let calls = 0;
  for (const manifest of [{ kind: "remote-checkout" }, { retainForAudit: true }]) {
    await assert.rejects(() => cleanupFixtures({ query() { calls++; } }, manifest), /retained for audit/);
  }
  assert.equal(calls, 0);
});
test("preservation fingerprint includes all columns and excludes only bound synthetic IDs", async () => {
  const queries = [];
  const manifest = { rows: { Orders: { type: "uuid", ids: ["synthetic-only"] } } };
  await snapshotOriginals({ async query(sql, values) { queries.push({ sql, values }); return { rows: [{ count: 1, digest: "hash" }] }; } }, manifest, ["Orders", "AboutPages"]);
  assert.match(queries[0].sql, /id=ANY\(\$1::uuid\[\]\)/); assert.deepEqual(queries[0].values, [["synthetic-only"]]);
  assert.match(queries[0].sql, /md5\(to_jsonb\(t\)::text\)/); assert.doesNotMatch(queries[0].sql, /synthetic-only|-'shippingTotal'/);
  assert.doesNotMatch(queries[1].sql, /pickupSettings|WHERE/);
});
