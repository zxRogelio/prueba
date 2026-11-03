import assert from "node:assert/strict";
import test from "node:test";
import { testSeedPassword } from "../utils/testSeedPassword.js";

test("interactive seed accounts require a privately supplied password", () => {
  assert.throws(() => testSeedPassword("SEED_TEST_PASSWORD", { env: {} }));
  const value = "fictional-unit-test-only-value";
  assert.equal(testSeedPassword("SEED_TEST_PASSWORD", { env: { SEED_TEST_PASSWORD: value } }), value);
});

test("unattended regression seeds receive a new random password for each run", () => {
  const first = testSeedPassword("REGRESSION_TEST_PASSWORD", { required: false, env: {} });
  const second = testSeedPassword("REGRESSION_TEST_PASSWORD", { required: false, env: {} });
  assert.equal(first.length, 43); assert.notEqual(first, second);
});

test("seed password validation respects bcrypt byte limits without disclosing values", () => {
  for (const value of ["short-value", "x".repeat(73), "é".repeat(40)]) {
    assert.throws(() => testSeedPassword("SEED_TEST_PASSWORD", { env: { SEED_TEST_PASSWORD: value } }), (error) => !error.message.includes(value));
  }
});
