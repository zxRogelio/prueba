import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import {
  assertWriteAuthorization, databaseId, diagnoseIntegrationError, PROTECTED_IDS, PROTECTED_PROVIDER_ID, safeError, validateTarget,
} from "./integration/mercadoPagoPostgresSupport.js";
import { buildManifest, CASES, validateManifest } from "./integration/mercadoPagoPostgresFixtures.js";
import { main, parseIntegrationArgs } from "../scripts/verifyMercadoPagoPostgresIntegration.js";
import { locksReachGate } from "./integration/mercadoPagoPostgresScenarios.js";

function target() {
  const value = { environment: "test", neonBranchId: "br-isolated-fixture", branchVerifiedInNeon: true,
    host: "ep-isolated.us-east-2.aws.neon.tech", port: 5432, database: "isolated", username: "test_only" };
  return { ...value, expectedDatabaseId: databaseId(value) };
}
const url = "postgresql://test_only:fictional-password@ep-isolated.us-east-2.aws.neon.tech/isolated?sslmode=require";

test("default mode is plan and contains no write authorization", () => {
  const options = parseIntegrationArgs([]);
  assert.equal(options.mode, "plan"); assert.equal(options.authorizeTemporaryWrites, false);
});
test("plan executes without loading target, credentials, .env or a PostgreSQL connection", async () => {
  const output = [];
  const original = console.log;
  try { console.log = (value) => output.push(JSON.parse(value)); await main(["--plan"]); }
  finally { console.log = original; }
  assert.equal(output[0].connection, "none"); assert.equal(output[0].writes, 0);
  assert.equal(output[0].scenarios.length, CASES.length);
});
test("missing --target reports the exact assertion and source without opening PostgreSQL", async (context) => {
  const connect = context.mock.method(pg.Client.prototype, "connect", async () => { throw new Error("Offline test forbids PostgreSQL"); });
  await assert.rejects(main(["--preflight"]), (error) => {
    const diagnostic = safeError(error);
    assert.equal(diagnostic.name, "AssertionError");
    assert.equal(diagnostic.code, "ERR_ASSERTION");
    assert.equal(diagnostic.stage, "arguments");
    assert.equal(diagnostic.field, "--target");
    assert.match(diagnostic.message, /supply --target/);
    assert.equal(diagnostic.location.file, "backend/scripts/verifyMercadoPagoPostgresIntegration.js");
    assert.ok(Number.isInteger(diagnostic.location.line) && diagnostic.location.line > 0);
    return true;
  });
  assert.equal(connect.mock.callCount(), 0);
});
test("target JSON errors identify the stage without printing file contents or connecting", async (context) => {
  const connect = context.mock.method(pg.Client.prototype, "connect", async () => { throw new Error("Offline test forbids PostgreSQL"); });
  const directory = await mkdtemp(join(tmpdir(), "pgit-diagnostic-"));
  const path = join(directory, "target.local");
  try {
    await writeFile(path, 'SECRET_TOKEN_MUST_NOT_APPEAR {"password":"private"}');
    await assert.rejects(main(["--preflight", "--target", path]), (error) => {
      const diagnostic = safeError(error);
      assert.equal(diagnostic.stage, "target_json");
      assert.match(diagnostic.message, /valid JSON/);
      assert.equal(diagnostic.location.file, "backend/scripts/verifyMercadoPagoPostgresIntegration.js");
      assert.ok(!/SECRET_TOKEN_MUST_NOT_APPEAR|password|private|pgit-diagnostic-/.test(JSON.stringify(diagnostic)));
      return true;
    });
    assert.equal(connect.mock.callCount(), 0);
  } finally { await unlink(path); await rmdir(directory); }
});
test("missing target files have a safe actionable diagnosis without leaking the supplied path", async (context) => {
  const connect = context.mock.method(pg.Client.prototype, "connect", async () => { throw new Error("Offline test forbids PostgreSQL"); });
  await assert.rejects(main(["--preflight", "--target", "SECRET_TOKEN_MUST_NOT_APPEAR/nonexistent.local"]), (error) => {
    const diagnostic = safeError(error);
    assert.equal(diagnostic.stage, "target_file");
    assert.equal(diagnostic.code, "ENOENT");
    assert.match(diagnostic.message, /exists and is readable/);
    assert.ok(!JSON.stringify(diagnostic).includes("SECRET_TOKEN_MUST_NOT_APPEAR"));
    return true;
  });
  assert.equal(connect.mock.callCount(), 0);
});
for (const args of [["--apply"], ["--run"], ["--cleanup", "fixture.json"], ["--run", "--preflight", "--target", "target.local"],
  ["--preflight", "--target", "target.local", "--authorize-temporary-writes"], ["--plan", "--confirm-database", "wrong"]]) {
  test(`rejects unsafe or ambiguous arguments ${JSON.stringify(args)}`, () => assert.throws(() => parseIntegrationArgs(args)));
}
test("write and cleanup modes both require an explicit flag and exact destination", () => {
  const config = validateTarget(target(), url);
  for (const mode of ["run", "cleanup"]) {
    assert.throws(() => assertWriteAuthorization({ mode, authorizeTemporaryWrites: false, confirmDatabase: config.databaseId }, config));
    assert.throws(() => assertWriteAuthorization({ mode, authorizeTemporaryWrites: true, confirmDatabase: "0".repeat(64) }, config));
    assertWriteAuthorization({ mode, authorizeTemporaryWrites: true, confirmDatabase: config.databaseId }, config);
  }
});
test("dedicated test target is accepted; missing URL never falls back to the application .env", () => {
  assert.equal(validateTarget(target(), url).databaseId, target().expectedDatabaseId);
  assert.throws(() => validateTarget(target(), undefined));
});
test("missing dedicated URL explicitly diagnoses that .env and DATABASE_URL_RUNTIME are not used", () => {
  assert.throws(() => validateTarget(target(), undefined), (error) => {
    const diagnostic = safeError(error);
    assert.equal(diagnostic.field, "TITANIUM_PG_TEST_DATABASE_URL");
    assert.equal(diagnostic.stage, "target_validation");
    assert.match(diagnostic.message, /does not load .env or use DATABASE_URL_RUNTIME/);
    assert.equal(diagnostic.location.file, "backend/tests/integration/mercadoPagoPostgresSupport.js");
    return true;
  });
});
test("stale fingerprints are diagnosed without printing the expected or actual fingerprint", () => {
  const changed = { ...target(), expectedDatabaseId: "0".repeat(64) };
  assert.throws(() => validateTarget(changed, url), (error) => {
    const diagnostic = safeError(error);
    assert.equal(diagnostic.field, "expectedDatabaseId");
    assert.match(diagnostic.message, /fingerprint is inconsistent/);
    assert.ok(!JSON.stringify(diagnostic).includes(changed.expectedDatabaseId));
    assert.ok(!JSON.stringify(diagnostic).includes(databaseId(changed)));
    return true;
  });
});
for (const [replacement, field] of [
  [url.replace("ep-isolated.", "ep-other."), "host"],
  [url.replace("/isolated?", "/another_database?"), "database"],
  [url.replace("test_only:", "PRIVATE_TOKEN:"), "username"],
]) {
  test(`URL ${field} mismatches have a precise safe cause and source`, () => {
    assert.throws(() => validateTarget(target(), replacement), (error) => {
      const diagnostic = safeError(error);
      assert.equal(diagnostic.field, `TITANIUM_PG_TEST_DATABASE_URL.${field}`);
      assert.equal(diagnostic.location.file, "backend/tests/integration/mercadoPagoPostgresSupport.js");
      assert.ok(!/PRIVATE_TOKEN|fictional-password|postgresql:\/\//.test(JSON.stringify(diagnostic)));
      return true;
    });
  });
}
test("invalid target shapes and URL encoding fail closed with safe field diagnostics", () => {
  for (const value of [null, [], "private"]) {
    assert.throws(() => validateTarget(value, url), (error) => safeError(error).field === "target");
  }
  assert.throws(() => validateTarget(target(), url.replace("fictional-password", "%ZZPRIVATE_TOKEN")), (error) => {
    const diagnostic = safeError(error);
    assert.match(diagnostic.message, /percent encoding/);
    assert.ok(!JSON.stringify(diagnostic).includes("PRIVATE_TOKEN"));
    return true;
  });
});
for (const change of [
  { environment: "production" }, { branchVerifiedInNeon: false }, { neonBranchId: "production" },
  { expectedDatabaseId: "0".repeat(64) }, { host: "ep-other.us-east-2.aws.neon.tech" },
  { username: "another_role" }, { database: "another_database" }, { port: 5433 },
]) {
  test(`rejects unverified or contradictory target ${JSON.stringify(change)}`, () => {
    assert.throws(() => validateTarget({ ...target(), ...change }, url));
  });
}
test("pooler endpoints cannot masquerade as stable independent PostgreSQL sessions", () => {
  const value = { ...target(), host: "ep-isolated-pooler.us-east-2.aws.neon.tech" };
  value.expectedDatabaseId = databaseId(value);
  assert.throws(() => validateTarget(value, url.replace("ep-isolated.", "ep-isolated-pooler.")));
});
for (const suffix of ["&host=production.invalid", "&options=-csearch_path=public", "&sslcert=private.pem"]) {
  test(`rejects routing/TLS overrides ${suffix.split("=")[0]}`, () => assert.throws(() => validateTarget(target(), url + suffix)));
}
test("example target is intentionally inoperable without an independent review", async () => {
  const value = JSON.parse(await readFile(new URL("./integration/mercadoPagoPostgres.target.example.json", import.meta.url), "utf8"));
  assert.throws(() => validateTarget(value, url));
});
test("manifest scopes nine write scenarios and contains no real operation or secrets", () => {
  const manifest = buildManifest(target().expectedDatabaseId);
  validateManifest(manifest, manifest.databaseId);
  assert.ok(CASES.every((scenario) => scenario.temporaryWrites));
  assert.ok(manifest.scenarios.every((scenario) => scenario.purchases.every((purchase) => purchase.providerId !== PROTECTED_PROVIDER_ID)));
  assert.ok(!/password|token|connectionString|postgresql:\/\//i.test(JSON.stringify(manifest)));
});
test("protected real IDs and order number cannot be substituted into fixture manifest", () => {
  for (const id of PROTECTED_IDS) {
    const manifest = buildManifest(target().expectedDatabaseId);
    manifest.scenarios[0].purchases[0].paymentId = id;
    assert.throws(() => validateManifest(manifest, manifest.databaseId));
  }
  const manifest = buildManifest(target().expectedDatabaseId);
  manifest.scenarios[0].purchases[0].orderNumber = "ORD-2026-000259";
  assert.throws(() => validateManifest(manifest, manifest.databaseId));
});
test("protected provider ID, wrong database and repeated UUIDs cannot be used for recovery", () => {
  const manifest = buildManifest(target().expectedDatabaseId);
  assert.throws(() => validateManifest(manifest, "0".repeat(64)));
  manifest.scenarios[0].purchases[0].providerId = PROTECTED_PROVIDER_ID;
  assert.throws(() => validateManifest(manifest, manifest.databaseId));
  const duplicate = buildManifest(target().expectedDatabaseId);
  duplicate.scenarios[0].baselineIds[1] = duplicate.scenarios[0].baselineIds[0];
  assert.throws(() => validateManifest(duplicate, duplicate.databaseId));
  const sameOperation = buildManifest(target().expectedDatabaseId);
  sameOperation.scenarios[0].purchases[1].providerId = sameOperation.scenarios[0].purchases[0].providerId;
  assert.throws(() => validateManifest(sameOperation, sameOperation.databaseId));
});
test("sanitized errors never expose message, query, URL, JWT or parameters", () => {
  const error = Object.assign(new Error("postgresql://secret plus JWT"), {
    sql: "INSERT secret", parameters: ["operator-token"], cause: { code: "PGIT_INJECTED_FAILURE", message: "private" }, statusCode: 500,
  });
  assert.deepEqual(safeError(error), { name: "Error", code: "PGIT_INJECTED_FAILURE", statusCode: 500 });
});
test("untrusted messages, diagnostic properties and stack frames cannot supply public diagnostics", () => {
  const error = Object.assign(new Error("postgresql://PRIVATE_TOKEN:password@private.invalid/private"), {
    integrationDiagnostic: { message: "PRIVATE_TOKEN" },
    stack: "Error: PRIVATE_TOKEN\n    at attacker (https://PRIVATE_TOKEN.invalid/fake.js:1:2)",
  });
  const diagnostic = safeError(diagnoseIntegrationError(error, "database_connection"));
  assert.match(diagnostic.message, /Cannot connect/);
  assert.equal(diagnostic.location, null);
  assert.ok(!/PRIVATE_TOKEN|password|private.invalid|https:/.test(JSON.stringify(diagnostic)));
});
test("concurrency evidence accepts two independent waiters rooted at the gate", () => {
  assert.equal(locksReachGate([
    { pid: 11, wait_event_type: "Lock", blockers: [99] },
    { pid: 12, wait_event_type: "Lock", blockers: [99] },
  ], [11, 12], 99), true);
});
test("concurrency evidence accepts PostgreSQL tuple/advisory lock wait queues", () => {
  assert.equal(locksReachGate([
    { pid: 11, wait_event_type: "Lock", blockers: [99] },
    { pid: 12, wait_event_type: "Lock", blockers: [11] },
  ], [11, 12], 99), true);
});
test("concurrency evidence rejects serial, unrelated, cyclic and missing waiters", () => {
  for (const rows of [
    [{ pid: 11, wait_event_type: "Lock", blockers: [99] }],
    [{ pid: 11, wait_event_type: "Lock", blockers: [99] }, { pid: 12, wait_event_type: null, blockers: [] }],
    [{ pid: 11, wait_event_type: "Lock", blockers: [99] }, { pid: 12, wait_event_type: "Lock", blockers: [55] }],
    [{ pid: 11, wait_event_type: "Lock", blockers: [12] }, { pid: 12, wait_event_type: "Lock", blockers: [11] }],
  ]) assert.equal(locksReachGate(rows, [11, 12], 99), false);
});
