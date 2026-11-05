import assert from "node:assert/strict";
import { test } from "node:test";
import { validatePrivacyPostgresTarget } from "./helpers/privacyPostgresTarget.js";

test("ARCO PostgreSQL permite solo base desechable local y autorización explícita", () => {
  const valid = "postgres://arco_test@127.0.0.1:55439/titanium_arco_test";
  assert.equal(validatePrivacyPostgresTarget(valid, "true").hostname, "127.0.0.1");
  for (const value of [undefined, "postgres://user:pass@production.neon.tech/titanium_arco_test",
    "postgres://user@localhost/titanium_arco_test", valid.replace("titanium_arco_test", "production"),
    `${valid}?host=production.neon.tech`, `${valid}#override`]) {
    assert.throws(() => validatePrivacyPostgresTarget(value, "true"));
  }
  assert.throws(() => validatePrivacyPostgresTarget(valid, undefined));
});
