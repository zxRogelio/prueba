import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import * as crypto from "node:crypto";

// Solo carga la politica. No carga .env, el servicio de reconciliacion ni Sequelize.
// Cualquier intento de consultar modelos, autenticar o escribir hace fallar la prueba.
async function fixture(overrides = {}) {
  const forbidden = () => { throw new Error("External operation forbidden in policy tests"); };
  const sequelize = {
    config: { host: "test.invalid", port: 5432, database: "isolated", username: "test_only" },
    options: {}, query: forbidden, transaction: forbidden,
  };
  const databaseId = crypto.createHash("sha256").update(JSON.stringify({
    ...sequelize.config, schema: "core",
  })).digest("hex");
  const env = {
    MERCADOPAGO_EXPECTED_SELLER_ID: "3558098908",
    MERCADOPAGO_EXPECTED_LIVE_MODE: "false",
    MERCADOPAGO_RECONCILIATION_ENVIRONMENT: "test",
    MERCADOPAGO_RECONCILIATION_DATABASE_ID: databaseId,
    ...overrides,
  };
  const context = vm.createContext({ process: { env } });
  const source = await readFile(new URL("../services/mercadoPagoReconciliationAuthorization.js", import.meta.url), "utf8");
  const module = new vm.SourceTextModule(source, { context });
  await module.link((specifier) => {
    const exports = {
      "node:crypto": crypto,
      jsonwebtoken: { default: { verify: forbidden } },
      "../config/sequelize.js": { sequelize },
      "../models/index.js": {
        Session: { findOne: forbidden }, User: { findByPk: forbidden },
      },
    }[specifier];
    if (!exports) throw new Error(`Unexpected dependency: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return { env, sequelize, databaseId, ...Object.fromEntries(
    Object.keys(module.namespace).map((name) => [name, module.namespace[name]])
  ) };
}

const profiles = [
  { name: "sandbox", environment: "test", liveMode: false, tags: ["normal"] },
  { name: "checkout_pro_test_account", environment: "test", liveMode: true, tags: ["normal", "test_user"] },
  { name: "production", environment: "production", liveMode: true, tags: ["normal", "user_info_verified"] },
];
function profileEnv(profile) {
  return {
    MERCADOPAGO_RECONCILIATION_PAYMENT_MODE: profile.name,
    MERCADOPAGO_RECONCILIATION_ENVIRONMENT: profile.environment,
    MERCADOPAGO_EXPECTED_LIVE_MODE: String(profile.liveMode),
  };
}
function check(f, profile, { seller = {}, payment = {} } = {}) {
  f.assertReconciliationProviderEnvironment({
    policy: f.getReconciliationPolicy(),
    seller: { id: 3558098908, tags: profile.tags, ...seller },
    providerPayment: { collector_id: 3558098908, live_mode: profile.liveMode, ...payment },
  });
}

for (const profile of profiles) {
  test(`${profile.name}: accepts the exact mode and authenticated seller identity`, async () => {
    const f = await fixture(profileEnv(profile));
    assert.equal(f.getReconciliationPolicy().paymentMode, profile.name);
    check(f, profile);
  });
  for (const liveMode of [!profile.liveMode, undefined, null, String(profile.liveMode), 1, 0]) {
    test(`${profile.name}: rejects live_mode ${JSON.stringify(liveMode)}`, async () => {
      const f = await fixture(profileEnv(profile));
      assert.throws(() => check(f, profile, { payment: { live_mode: liveMode } }), { statusCode: 409 });
    });
  }
  for (const mismatch of [
    { seller: { id: 123 } },
    { payment: { collector_id: 123 } },
    { seller: { id: 123 }, payment: { collector_id: 123 } },
    { seller: { id: null } },
    { payment: { collector_id: null } },
  ]) {
    test(`${profile.name}: rejects seller mismatch ${JSON.stringify(mismatch)}`, async () => {
      const f = await fixture(profileEnv(profile));
      assert.throws(() => check(f, profile, mismatch), { statusCode: 409 });
    });
  }
  test(`${profile.name}: rejects an unauthorized database before provider validation`, async () => {
    const f = await fixture(profileEnv(profile));
    f.sequelize.config.host = "other.invalid";
    assert.throws(() => f.getReconciliationPolicy(), { statusCode: 403 });
  });
  test(`${profile.name}: rejects a contradictory configured environment`, async () => {
    const f = await fixture(profileEnv(profile));
    f.env.MERCADOPAGO_RECONCILIATION_ENVIRONMENT = profile.environment === "test" ? "production" : "test";
    assert.throws(() => f.getReconciliationPolicy(), { statusCode: 403 });
  });
  test(`${profile.name}: rejects a contradictory configured live mode`, async () => {
    const f = await fixture(profileEnv(profile));
    f.env.MERCADOPAGO_EXPECTED_LIVE_MODE = String(!profile.liveMode);
    assert.throws(() => f.getReconciliationPolicy(), { statusCode: 403 });
  });
}

for (const tags of [undefined, null, "test_user", [], ["normal"], ["TEST_USER"], ["test_user", null]]) {
  test(`test-account exception: rejects missing or invalid test proof ${JSON.stringify(tags)}`, async () => {
    const profile = profiles[1];
    const f = await fixture(profileEnv(profile));
    assert.throws(() => check(f, profile, { seller: { tags } }), { statusCode: 409 });
  });
}
for (const tags of [undefined, null, "normal", [], ["normal", "test_user"], ["normal", null], [""]]) {
  test(`production: rejects test or unverifiable accounts ${JSON.stringify(tags)}`, async () => {
    const profile = profiles[2];
    const f = await fixture(profileEnv(profile));
    assert.throws(() => check(f, profile, { seller: { tags } }), { statusCode: 409 });
  });
}
for (const mode of ["", "true", "test", "__proto__", "constructor"]) {
  test(`rejects unknown policy mode ${JSON.stringify(mode)}`, async () => {
    const f = await fixture({ MERCADOPAGO_RECONCILIATION_PAYMENT_MODE: mode });
    assert.throws(() => f.getReconciliationPolicy(), { statusCode: 403 });
  });
}
test("legacy test policy defaults to sandbox and never infers the exception", async () => {
  const f = await fixture();
  check(f, profiles[0]);
  f.env.MERCADOPAGO_EXPECTED_LIVE_MODE = "true";
  assert.throws(() => f.getReconciliationPolicy(), { statusCode: 403 });
});
test("legacy production policy requires a non-test authenticated account", async () => {
  const f = await fixture({
    MERCADOPAGO_RECONCILIATION_ENVIRONMENT: "production", MERCADOPAGO_EXPECTED_LIVE_MODE: "true",
  });
  check(f, profiles[2]);
  assert.throws(() => check(f, profiles[1]), { statusCode: 409 });
});
test("test-account policy does not infer proof from a token prefix or nickname", async () => {
  const f = await fixture({ ...profileEnv(profiles[1]), MERCADOPAGO_ACCESS_TOKEN: "APP_USR-isolated-fixture" });
  assert.throws(() => check(f, profiles[1], {
    seller: { tags: ["normal"], nickname: "TESTUSER", email: "test_user@testuser.com" },
  }), { statusCode: 409 });
});
test("missing policy and replicas remain forbidden", async () => {
  const f = await fixture();
  delete f.env.MERCADOPAGO_EXPECTED_SELLER_ID;
  assert.throws(() => f.getReconciliationPolicy(), { statusCode: 503 });
  f.env.MERCADOPAGO_EXPECTED_SELLER_ID = "3558098908";
  f.sequelize.options.replication = {};
  assert.throws(() => f.getReconciliationPolicy(), { statusCode: 503 });
});
