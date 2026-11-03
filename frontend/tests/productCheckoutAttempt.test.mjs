import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutAttemptSignature } from "../src/utils/productCheckoutAttempt.ts";

const quote = (digest, iat = 1) => `header.${Buffer.from(JSON.stringify({ digest, iat, exp: iat + 900 })).toString("base64url")}.signature-${iat}`;
const fingerprint = "a".repeat(64);

test("renewing an unchanged quote preserves the checkout attempt", async () => {
  assert.equal(await checkoutAttemptSignature("account", "cart/address", quote(fingerprint)),
    await checkoutAttemptSignature("account", "cart/address", quote(fingerprint, 30)));
});

test("a changed price or rate creates a distinct attempt", async () => {
  assert.notEqual(await checkoutAttemptSignature("account", "cart/address", quote(fingerprint)),
    await checkoutAttemptSignature("account", "cart/address", quote("b".repeat(64))));
});

test("changing cart, delivery or account creates a distinct attempt", async () => {
  const original = await checkoutAttemptSignature("account", "cart/address", quote(fingerprint));
  assert.notEqual(original, await checkoutAttemptSignature("other-account", "cart/address", quote(fingerprint)));
  assert.notEqual(original, await checkoutAttemptSignature("account", "different-cart/address", quote(fingerprint)));
});

test("the persisted signature contains only a hash", async () => {
  const value = await checkoutAttemptSignature("secret-account-token", "recipient/phone/address", quote(fingerprint));
  assert.match(value, /^[a-f0-9]{64}$/);
});

test("malformed quote identities are rejected before creating an attempt", async () => {
  for (const token of ["", "invalid", "header.invalid.signature", quote(undefined), quote("invalid")]) {
    await assert.rejects(() => checkoutAttemptSignature("account", "cart/address", token), /cotización/);
  }
});
