import assert from "node:assert/strict";
import { quote } from "./productDeliveryNeonSupport.js";

export function remoteOrigin(value) {
  const url = new URL(value);
  assert.equal(url.protocol, "https:");
  assert.match(url.hostname, /^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/);
  assert.equal(url.port, ""); assert.equal(url.username, ""); assert.equal(url.password, "");
  assert.equal(url.pathname, "/"); assert.equal(url.search, ""); assert.equal(url.hash, "");
  return url.origin;
}

export function assertTestSeller(seller, expectedId) {
  assert.match(String(expectedId), /^\d+$/);
  assert.equal(String(seller?.id), String(expectedId), "Unexpected seller identity.");
  assert.ok(seller?.tags?.includes("test_user"), "Only a provider-verified test seller is allowed.");
}

export function assertOwnedRemotePayment(payment, manifest, sellerId, liveMode) {
  assert.match(String(payment?.id), /^\d+$/);
  assert.equal(String(payment.collector_id), String(sellerId), "Payment seller differs from verified test seller.");
  assert.equal(payment.live_mode, liveMode, "Unexpected provider payment mode.");
  const orderId = String(payment.external_reference || "");
  assert.ok(manifest.rows.Orders?.ids.includes(orderId), "Only this run's synthetic orders may be processed.");
  assert.equal(payment.metadata?.order_id, orderId);
  assert.ok(manifest.rows.Payments?.ids.includes(payment.metadata?.payment_id));
  assert.ok(manifest.rows.Users?.ids.includes(payment.metadata?.user_id));
}

export function authenticateRemoteWebhook({ headers, query, secret, validator, now = Date.now() }) {
  const xSignature = headers["x-signature"];
  const xRequestId = headers["x-request-id"];
  const dataId = query["data.id"];
  assert.equal(typeof xSignature, "string"); assert.equal(typeof xRequestId, "string");
  assert.equal(typeof dataId, "string"); assert.match(dataId, /^\d+$/);
  const timestamps = xSignature.split(",").map((part) => part.trim()).filter((part) => part.startsWith("ts="));
  assert.equal(timestamps.length, 1); assert.match(timestamps[0], /^ts=\d+$/);
  const raw = Number(timestamps[0].slice(3)); const ms = raw < 1e12 ? raw * 1000 : raw;
  assert.ok(Number.isFinite(ms) && Math.abs(now - ms) <= 300000, "Webhook timestamp outside tolerance.");
  validator.validate({ xSignature, xRequestId, dataId: dataId.toLowerCase(), secret });
  return dataId;
}

// Unlike the earlier migration snapshots, compare every column, including
// shippingTotal and pickupSettings. Only IDs inserted by this run are excluded.
export async function snapshotOriginals(client, manifest, names = null) {
  if (!names) names = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='core' ORDER BY tablename")).rows.map((row) => row.tablename);
  const result = {};
  for (const name of names) {
    const entry = manifest.rows[name];
    if (entry) assert.ok(["uuid", "integer"].includes(entry.type));
    const where = entry ? `WHERE NOT (id=ANY($1::${entry.type}[]))` : "";
    const { rows: [value] } = await client.query(`SELECT count(*)::int AS count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS digest
      FROM core.${quote(name)} t ${where}`, entry ? [entry.ids] : []);
    result[name] = value;
  }
  return result;
}
