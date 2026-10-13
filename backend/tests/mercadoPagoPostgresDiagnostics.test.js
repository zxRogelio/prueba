import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { before, after, test } from "node:test";
import vm from "node:vm";
import { DataTypes, Sequelize } from "sequelize";
import { buildManifest, fixtureEmail, seedFixtures, validateManifest, SELECTIVE_CASES } from "./integration/mercadoPagoPostgresFixtures.js";
import { assertInjectedFailure, checkConfirmed, runScenarios } from "./integration/mercadoPagoPostgresScenarios.js";
import { AUTHORIZED_INTEGRATION_TARGET, assertAuthorizedIntegrationTarget, diagnoseIntegrationError, integrationAssert, safeError } from "./integration/mercadoPagoPostgresSupport.js";
import { finalizeIntegrationRun, verifyProtectedRecords, verifySavedRun } from "./integration/mercadoPagoPostgresRunVerification.js";
import { parseIntegrationArgs } from "../scripts/verifyMercadoPagoPostgresIntegration.js";

const databaseId = "0".repeat(64);
let sequelize, GroupMember;
before(async () => {
  // Definicion y validador Sequelize reales, sin importar config/.env ni conectar.
  sequelize = new Sequelize("offline", "offline", "offline", { dialect: "postgres", logging: false });
  sequelize.query = async () => { throw new Error("Offline model validation forbids PostgreSQL"); };
  const context = vm.createContext({});
  const module = new vm.SourceTextModule(await readFile(new URL("../models/SubscriptionGroupMember.js", import.meta.url), "utf8"), { context });
  await module.link((specifier) => new vm.SyntheticModule(specifier === "sequelize" ? ["DataTypes"] : ["sequelize"], function () {
    if (specifier === "sequelize") this.setExport("DataTypes", DataTypes);
    else { assert.equal(specifier, "../config/sequelize.js"); this.setExport("sequelize", sequelize); }
  }, { context }));
  await module.evaluate();
  GroupMember = module.namespace.SubscriptionGroupMember;
});
after(async () => { await sequelize?.close(); });

function member(email, scenario) {
  return GroupMember.build({ groupId: scenario.purchases[0].orderId, userId: scenario.userId,
    invitedEmail: email, role: "owner", status: "accepted", priceShare: 440 });
}
function legacyManifest() {
  const manifest = buildManifest(databaseId);
  manifest.version = 1;
  for (const scenario of manifest.scenarios) {
    scenario.userEmail = fixtureEmail(manifest.runId, scenario.userId, 1);
    scenario.memberEmail = fixtureEmail(manifest.runId, scenario.memberId, 1);
    for (const operator of scenario.operators) operator.email = fixtureEmail(manifest.runId, operator.userId, 1);
  }
  return manifest;
}
test("legacy group fixture reproduces the actual Sequelize isEmail error before receipt insertion", async () => {
  const manifest = legacyManifest();
  validateManifest(manifest, databaseId);
  const scenario = manifest.scenarios.at(-1);
  assert.equal(scenario.name, "group-receipt-rollback");
  assert.equal(scenario.userEmail.split("@")[0].length, 78);
  for (const email of [scenario.userEmail, scenario.memberEmail]) {
    await assert.rejects(member(email, scenario).validate(), (error) => {
      const diagnostic = safeError(error);
      assert.equal(diagnostic.name, "SequelizeValidationError");
      assert.equal(diagnostic.code, null);
      assert.deepEqual(diagnostic.validationErrors, [{ field: "invitedEmail", validator: "isEmail" }]);
      assert.ok(!JSON.stringify(diagnostic).includes(email));
      assert.throws(() => assertInjectedFailure({ ok: false, error: diagnostic }, "receipt"), (failure) => {
        const report = safeError(diagnoseIntegrationError(failure, "execution"));
        assert.equal(report.expected, "PGIT_INJECTED_FAILURE");
        assert.equal(report.actual, null);
        assert.equal(report.worker.name, "SequelizeValidationError");
        assert.equal(report.field, "injected_failure.code");
        assert.equal(report.location.file, "backend/tests/integration/mercadoPagoPostgresScenarios.js");
        assert.match(report.message, /earlier validation error/);
        return true;
      });
      return true;
    });
  }
});
test("v2 fixture emails are unique and accepted by the real owner/member validator", async () => {
  const manifest = buildManifest(databaseId);
  validateManifest(manifest, databaseId);
  assert.equal(manifest.version, 2);
  const emails = manifest.scenarios.flatMap((s) => [s.userEmail, s.memberEmail, ...s.operators.map((o) => o.email)]);
  assert.equal(new Set(emails).size, emails.length);
  assert.ok(emails.every((email) => email.split("@")[0].length === 54));
  const scenario = manifest.scenarios.at(-1);
  await member(scenario.userEmail, scenario).validate();
  await member(scenario.memberEmail, scenario).validate();
});
test("intentional receipt failure remains mandatory; a success or another error cannot pass", () => {
  assertInjectedFailure({ ok: false, error: { code: "PGIT_INJECTED_FAILURE" } }, "receipt");
  assert.throws(() => assertInjectedFailure({ ok: true }, "receipt"));
  assert.throws(() => assertInjectedFailure({ ok: false, error: { code: "23502" } }, "receipt"));
});
test("legacy manifests cannot create another set of invalid fixtures", async () => {
  await assert.rejects(seedFixtures({}, legacyManifest(), {}), /Legacy manifests can only be inspected or cleaned/);
});
test("group expectations still require one group, two members and no access before approval", () => {
  const scenario = buildManifest(databaseId).scenarios.at(-1);
  const fixture = scenario.purchases[0];
  const rows = {
    Payments: [{ id: fixture.paymentId, orderId: fixture.orderId, status: "paid", providerPaymentId: fixture.providerId }],
    Orders: [{ id: fixture.orderId, status: "paid" }], Receipts: [{ paymentId: fixture.paymentId, status: "issued" }],
    SubscriptionGroups: [{ id: "group", orderItemId: fixture.itemId, status: "pending_admin_approval" }],
    SubscriptionGroupMembers: [{ groupId: "group", invitedEmail: scenario.userEmail }, { groupId: "group", invitedEmail: scenario.memberEmail }],
    UserSubscriptions: [],
  };
  checkConfirmed(rows, fixture);
  rows.SubscriptionGroups[0].status = "pending_members";
  assert.throws(() => checkConfirmed(rows, fixture), (error) => {
    const diagnostic = safeError(error);
    assert.equal(diagnostic.field, "group.status");
    assert.equal(diagnostic.expected, "pending_admin_approval");
    assert.equal(diagnostic.actual, "pending_members");
    return true;
  });
  rows.SubscriptionGroups[0].status = "pending_admin_approval";
  const invited = rows.SubscriptionGroupMembers.pop();
  assert.throws(() => checkConfirmed(rows, fixture), (error) => safeError(error).actual === 1);
  rows.SubscriptionGroupMembers.push(invited);
  rows.UserSubscriptions.push({ groupId: "group" });
  assert.throws(() => checkConfirmed(rows, fixture), (error) => safeError(error).field === "group.subscriptions.count");
});
test("diagnostics redact unknown expected/actual values and worker fields", () => {
  const privateValue = "postgresql://PRIVATE_TOKEN:password@private.invalid/private";
  assert.throws(() => integrationAssert(false, "Safe assertion", "check", "execution", {
    expected: privateValue, actual: privateValue,
    worker: { name: "SequelizeValidationError", code: null, message: privateValue, sql: privateValue,
      validationErrors: [{ field: privateValue, validator: privateValue, value: privateValue }] },
  }), (error) => {
    assert.ok(!/PRIVATE_TOKEN|password|private.invalid|postgresql:/.test(JSON.stringify(safeError(error))));
    return true;
  });
});

const emptyProtectedFingerprint = createHash("sha256").update(JSON.stringify({
  orders: [], payments: [], subscriptions: [], receipts: [], groups: [], members: [],
})).digest("hex");
function offlineClient({ cleanupFailure = false, protectedFailure = false } = {}) {
  const commands = [];
  return { commands, async query(sql) {
    commands.push(sql);
    if (cleanupFailure && sql.startsWith('SELECT * FROM core."Users"')) throw Object.assign(new Error("PRIVATE_TOKEN"), { code: "XX000" });
    if (protectedFailure && sql.startsWith('SELECT * FROM core."Orders"')) throw new Error("PRIVATE_TOKEN");
    return { rows: [] };
  } };
}
test("protected records get a separate success report even after a scenario failure", async () => {
  const reports = [], client = offlineClient();
  const errors = await finalizeIntegrationRun({ client, seeded: false, protectedBefore: emptyProtectedFingerprint }, (value) => reports.push(value));
  assert.equal(errors.length, 0);
  assert.deepEqual(reports, [{ phase: "protected-records", status: "passed", protectedRecordsUnchanged: true }]);
  assert.ok(client.commands.every((sql) => /^(BEGIN.*READ ONLY|SELECT|COMMIT|ROLLBACK)/.test(sql)));
});
test("cleanup failure does not suppress the independent protected-record check", async () => {
  const reports = [], client = offlineClient({ cleanupFailure: true });
  const errors = await finalizeIntegrationRun({ client, manifest: buildManifest(databaseId), seeded: true,
    protectedBefore: emptyProtectedFingerprint }, (value) => reports.push(value));
  assert.equal(errors.length, 1);
  assert.equal(reports[0].phase, "cleanup");
  assert.equal(reports[0].status, "failed");
  assert.equal(reports[0].remainingFixtures, null);
  assert.equal(reports[1].protectedRecordsUnchanged, true);
  assert.ok(!JSON.stringify(reports).includes("PRIVATE_TOKEN"));
});
test("failed connection closure blocks deletion but still attempts a protected-record read", async () => {
  const reports = [], client = offlineClient();
  const errors = await finalizeIntegrationRun({ client, seeded: true,
    backend: { close: async () => { throw new Error("PRIVATE_TOKEN"); } },
    protectedBefore: emptyProtectedFingerprint }, (value) => reports.push(value));
  assert.equal(errors.length, 1);
  assert.equal(reports[0].status, "blocked");
  assert.equal(reports[1].protectedRecordsUnchanged, true);
  assert.ok(client.commands.every((sql) => !/^(DELETE|UPDATE|INSERT)/.test(sql)));
});
test("protected mismatch reports false; inability to read reports null", async () => {
  for (const readFailure of [false, true]) {
    const reports = [];
    await assert.rejects(verifyProtectedRecords(offlineClient({ protectedFailure: readFailure }), databaseId, (value) => reports.push(value)));
    assert.equal(reports[0].protectedRecordsUnchanged, readFailure ? null : false);
    assert.ok(!JSON.stringify(reports).includes("PRIVATE_TOKEN"));
  }
});
test("a protected-read failure does not replace the original scenario exception", async () => {
  const client = offlineClient();
  const query = client.query.bind(client);
  let protectedReads = 0;
  client.query = async (sql) => {
    if (sql.includes('"orderNumber"=$1 OR id=') && ++protectedReads === 2) throw new Error("PRIVATE_TOKEN");
    return query(sql);
  };
  const manifest = buildManifest(databaseId);
  manifest.scenarios[0].name = "unimplemented-offline-case"; // Falla antes de lanzar workers.
  const reports = [];
  await assert.rejects(runScenarios({ monitor: client, manifest }, (value) => reports.push(value)), /Unimplemented PostgreSQL scenario/);
  assert.equal(reports.at(-1).phase, "protected-records");
  assert.equal(reports.at(-1).protectedRecordsUnchanged, null);
  assert.ok(!JSON.stringify(reports).includes("PRIVATE_TOKEN"));
  assert.ok(client.commands.every((sql) => /^(BEGIN.*READ ONLY|SELECT|COMMIT|ROLLBACK)/.test(sql)));
});
test("verify-run supports legacy manifests and issues only read-only transactions and SELECT", async () => {
  const manifest = legacyManifest();
  manifest.protectedFingerprint = emptyProtectedFingerprint;
  const client = offlineClient();
  const result = await verifySavedRun(client, manifest, databaseId, () => {});
  assert.equal(result.writes, 0);
  assert.equal(result.remainingFixtures, 0);
  assert.equal(result.protectedRecordsUnchanged, true);
  assert.ok(client.commands.every((sql) => /^(BEGIN.*READ ONLY|SELECT|COMMIT|ROLLBACK)/.test(sql)));
});
test("verify-run requires target and refuses write authorization or other execution modes", () => {
  const args = ["--verify-run", "manifest.json", "--target", "target.local"];
  assert.equal(parseIntegrationArgs(args).mode, "verify-run");
  assert.throws(() => parseIntegrationArgs(["--verify-run", "manifest.json"]));
  for (const flags of [["--run"], ["--cleanup", "manifest.json"], ["--authorize-temporary-writes"], ["--confirm-database", databaseId]]) {
    assert.throws(() => parseIntegrationArgs([...args, ...flags]));
  }
});

for (const mode of ["verify-success", "verify-failure", "invalid-mode"]) {
  test(`PowerShell embedded Node dispatch: ${mode} cannot fall back to writes`, async () => {
    const launcher = await readFile(new URL("../scripts/runMercadoPagoPostgresIntegration.ps1", import.meta.url), "utf8");
    const source = launcher.match(/@'\r?\n([\s\S]*?)\r?\n'@/)?.[1];
    assert.ok(source);
    const manifestPath = "C:\\offline fixture\\manifest.json";
    const privateMarker = "OFFLINE_PRIVATE_CONNECTION";
    const target = { environment: "test", neonBranchId: "br-divine-butterfly-akvmjram",
      host: "ep-falling-wave-akf610u0.c-3.us-west-2.aws.neon.tech",
      expectedDatabaseId: "d0281b810c4974a825c124badbed2b848bb04f6b271cd814aace02580d361ea3" };
    const calls = [], output = [];
    const taskProcess = { argv: ["node", "-", ...(mode === "invalid-mode" ? ["--unknown"] : ["--verify-run", manifestPath])],
      env: { TITANIUM_PG_TEST_DATABASE_URL: privateMarker } };
    const context = vm.createContext({ process: taskProcess, console: {
      log: (...values) => output.push(values), error: (...values) => output.push(values),
    } });
    const exportsByModule = {
      "node:fs/promises": { readFile: async (path) => { assert.equal(path, "target.local"); return JSON.stringify(target); } },
      "node:perf_hooks": { performance: { now: () => 0 } },
      "./scripts/verifyMercadoPagoPostgresIntegration.js": { main: async (args) => {
        calls.push(Array.from(args));
        parseIntegrationArgs(Array.from(args));
        if (mode === "verify-failure") throw new Error(privateMarker);
      } },
      "./tests/integration/mercadoPagoPostgresSupport.js": { AUTHORIZED_INTEGRATION_TARGET, diagnoseIntegrationError, integrationAssert, safeError,
        assertAuthorizedIntegrationTarget: (value) => assertAuthorizedIntegrationTarget({ ...value, branchVerifiedInNeon: true }),
        validateTarget: (_target, url) => { assert.equal(url, privateMarker); } },
      "./tests/integration/mercadoPagoPostgresFixtures.js": { CASES: [], SELECTIVE_CASES }, // Read-only must not require or launch nine cases.
    };
    const module = new vm.SourceTextModule(source, { context });
    await module.link((specifier) => {
      const exports = exportsByModule[specifier];
      assert.ok(exports, `Unexpected launcher import: ${specifier}`);
      return new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
      }, { context });
    });
    await module.evaluate();
    assert.deepEqual(calls, mode === "invalid-mode" ? [] : [["--verify-run", manifestPath, "--target", "target.local"]]);
    assert.equal(taskProcess.exitCode, mode === "verify-success" ? undefined : 1);
    assert.equal(taskProcess.env.TITANIUM_PG_TEST_DATABASE_URL, undefined);
    assert.ok(!JSON.stringify(output).includes(privateMarker));
    assert.ok(!JSON.stringify(output).includes("--authorize-temporary-writes"));
  });
}
