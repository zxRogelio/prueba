import assert from "node:assert/strict";

export function validatePrivacyPostgresTarget(value, allowDdl) {
  assert.equal(allowDdl, "true", "Explicitly authorize DDL for the disposable local ARCO database.");
  assert.ok(value, "ARCO_TEST_DATABASE_URL is required; application database settings are never used.");
  const target = new URL(value);
  assert.ok(["postgres:", "postgresql:"].includes(target.protocol));
  assert.ok(["127.0.0.1", "[::1]"].includes(target.hostname), "Only literal loopback addresses are allowed.");
  assert.equal(target.pathname, "/titanium_arco_test", "Use the dedicated ARCO test database.");
  assert.equal(target.search, "", "Connection overrides are forbidden.");
  assert.equal(target.hash, "", "URL fragments are forbidden.");
  return target;
}
