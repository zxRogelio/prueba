import assert from "node:assert/strict";

// No production configuration, dotenv, remote hosts, or URL overrides.
export function validateAccessPostgresTarget(value, allowDdl) {
  assert.equal(allowDdl, "true", "Set ACCESS_TEST_ALLOW_LOCAL_DDL=true for the disposable local QR test database.");
  assert.ok(value, "Set ACCESS_TEST_DATABASE_URL explicitly; application database settings are never used.");
  const target = new URL(value);
  assert.ok(["postgres:", "postgresql:"].includes(target.protocol), "A PostgreSQL URL is required.");
  assert.ok(["127.0.0.1", "[::1]"].includes(target.hostname), "Only literal loopback addresses are allowed.");
  assert.equal(target.pathname, "/titanium_access_test", "Use the dedicated titanium_access_test database.");
  assert.equal(target.search, "", "Connection overrides are forbidden.");
  assert.equal(target.hash, "", "URL fragments are forbidden.");
  return target;
}
