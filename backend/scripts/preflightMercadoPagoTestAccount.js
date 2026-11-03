// Read-only provider identity check. Never creates preferences or payments.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";

export async function main(args = process.argv.slice(2)) {
  if (!args.length) return { status: "not-executed", operation: "GET /users/me only" };
  assert.deepEqual(args, ["--check-test-seller", "--use-authorized-env"]);
  const path = new URL("../.env", import.meta.url);
  const original = await readFile(path);
  const env = dotenv.parse(original);
  assert.equal(env.MERCADOPAGO_RECONCILIATION_ENVIRONMENT, "test", "Test environment must be explicit.");
  assert.equal(env.MERCADOPAGO_RECONCILIATION_PAYMENT_MODE, "checkout_pro_test_account");
  assert.match(env.MERCADOPAGO_EXPECTED_SELLER_ID || "", /^\d+$/);
  assert.ok(env.MERCADOPAGO_ACCESS_TOKEN);
  const response = await fetch("https://api.mercadopago.com/users/me", {
    method: "GET", headers: { Authorization: "Bearer " + env.MERCADOPAGO_ACCESS_TOKEN },
    signal: AbortSignal.timeout(10000), redirect: "error",
  });
  let evidence = { checkedAt: new Date().toISOString(), operation: "GET /users/me", httpStatus: response.status,
    identityMatches: false, sellerIsTestAccount: false, preferencesCreated: 0, paymentsCreated: 0, remoteE2e: "not-executed" };
  if (response.ok) {
    const seller = await response.json();
    evidence = { ...evidence, identityMatches: String(seller.id) === env.MERCADOPAGO_EXPECTED_SELLER_ID,
      sellerIsTestAccount: Array.isArray(seller.tags) && seller.tags.includes("test_user") };
  }
  await mkdir(new URL("../storage/test-reports/", import.meta.url), { recursive: true });
  await writeFile(new URL("../storage/test-reports/mercadopago-test-seller.json", import.meta.url), JSON.stringify(evidence, null, 2));
  assert.deepEqual(await readFile(path), original);
  return evidence;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await main(), null, 2)); }
  catch (error) { console.error(JSON.stringify({ status: "not-completed", error: error.name, code: error.code || null, remoteE2e: "not-executed" })); process.exitCode = 1; }
}
