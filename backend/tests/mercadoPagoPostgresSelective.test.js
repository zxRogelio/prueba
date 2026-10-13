import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import pg from "pg";
import { main, parseIntegrationArgs } from "../scripts/verifyMercadoPagoPostgresIntegration.js";
import { addDays, ownedRows, buildManifest, seedFixtures, validateManifest, cleanupFixtures, UNIQUE_FIXTURE_NAME, SELECTIVE_CASES, CASES } from "./integration/mercadoPagoPostgresFixtures.js";
import { runUniqueConstraintProbes } from "./integration/mercadoPagoPostgresScenarios.js";
import { verifySavedRun } from "./integration/mercadoPagoPostgresRunVerification.js";
import { AUTHORIZED_INTEGRATION_TARGET, assertAuthorizedIntegrationTarget, assertWriteAuthorization,
  diagnoseIntegrationError, integrationAssert, safeError, PROTECTED_IDS, PROTECTED_ORDER_NUMBER, PROTECTED_PROVIDER_ID, quoteIdentifier } from "./integration/mercadoPagoPostgresSupport.js";

// Solo verifica el control del arnes con clientes/modelos locales. No acredita indices reales.
const approved = AUTHORIZED_INTEGRATION_TARGET;
const selectiveManifest = () => buildManifest(approved.expectedDatabaseId, { selective: true });
const tables = ["Users", "sessions", "MembershipPlans", "Orders", "OrderItems", "Payments", "Receipts",
  "UserSubscriptions", "SubscriptionGroups", "SubscriptionGroupMembers", "SubscriptionHistories", "SubscriptionEvents", "PaymentWebhookEvents"];
const keys = [
  ["Payments", ["provider", "providerPaymentId"]], ["Receipts", ["paymentId"]],
  ["UserSubscriptions", ["orderItemId"]], ["SubscriptionGroups", ["orderItemId"]],
  ["SubscriptionGroupMembers", ["groupId", "invitedEmail"]],
];

test("selective plan reports only the group case without connecting or loading .env", async (context) => {
  const connect = context.mock.method(pg.Client.prototype, "connect", async () => { throw new Error("Offline: PostgreSQL forbidden"); });
  const reports = [];
  const original = console.log;
  console.log = (value) => reports.push(JSON.parse(value));
  try { await main(["--plan", "--selective"]); }
  finally { console.log = original; }
  assert.equal(connect.mock.callCount(), 0);
  assert.deepEqual(reports[0].scenarios.map((scenario) => scenario.name), ["group-receipt-rollback"]);
  assert.equal(reports[0].writes, 0);
});
test("selective is explicit, never a fallback, and cannot alter read-only/recovery modes", () => {
  assert.equal(parseIntegrationArgs(["--run", "--selective", "--target", "target.local"]).selective, true);
  assert.equal(parseIntegrationArgs(["--run", "--target", "target.local"]).selective, false);
  for (const args of [["--preflight"], ["--verify-run", "manifest"], ["--cleanup", "manifest"]]) {
    assert.throws(() => parseIntegrationArgs([...args, "--selective", "--target", "target.local"]));
  }
  assert.throws(() => parseIntegrationArgs(["--run", "--scenario", "unknown", "--target", "target.local"]));
});
test("selective writes still require authorization and the exact destination fingerprint", () => {
  const options = parseIntegrationArgs(["--run", "--selective", "--target", "target.local"]);
  const config = { databaseId: approved.expectedDatabaseId };
  assert.throws(() => assertWriteAuthorization(options, config));
  assert.throws(() => assertWriteAuthorization({ ...options, authorizeTemporaryWrites: true, confirmDatabase: "0".repeat(64) }, config));
  assertWriteAuthorization({ ...options, authorizeTemporaryWrites: true, confirmDatabase: config.databaseId }, config);
});
for (const change of [{ environment: "production" }, { neonBranchId: "br-pagos-test" },
  { host: approved.host.replace("-akf610u0", "-pooler") }, { expectedDatabaseId: "0".repeat(64) }, { branchVerifiedInNeon: false }]) {
  test(`selective target rejects unauthorized ${Object.keys(change)[0]}`, () => {
    assert.throws(() => assertAuthorizedIntegrationTarget({ ...approved, branchVerifiedInNeon: true, ...change }));
  });
}
test("v3 selective manifest contains exactly group and minimal unique-check support", () => {
  const manifest = selectiveManifest();
  validateManifest(manifest, manifest.databaseId);
  assert.equal(manifest.version, 3);
  assert.deepEqual(manifest.scenarios.map((scenario) => scenario.name), ["group-receipt-rollback", UNIQUE_FIXTURE_NAME]);
  assert.equal(manifest.scenarios.flatMap((scenario) => scenario.purchases).length, 3);
  assert.ok(manifest.scenarios.every((scenario) => scenario.operators.length === 0 && scenario.baselinePlanId === null && scenario.baselineIds.length === 0));
  assert.equal(manifest.scenarios[1].memberId, null);
  assert.ok(!/password|token|connectionString|postgresql:\/\//i.test(JSON.stringify(manifest)));
  assert.throws(() => buildManifest("0".repeat(64), { selective: true }));
});
test("selective recovery rejects expanded, ambiguous or contaminated manifests", () => {
  for (const corrupt of [
    (manifest) => { manifest.scope = "full"; },
    (manifest) => { manifest.scenarios.reverse(); },
    (manifest) => { manifest.scenarios.push(buildManifest(manifest.databaseId).scenarios[0]); },
    (manifest) => { manifest.scenarios[0].operators.push({}); },
    (manifest) => { manifest.scenarios[0].baselinePlanId = randomUUID(); },
    (manifest) => { manifest.scenarios[1].memberId = randomUUID(); },
    (manifest) => { manifest.scenarios[0].purchases[0].providerId = "183880156306"; },
    (manifest) => { manifest.scenarios[0].purchases[0].orderNumber = "ORD-2026-000259"; },
    (manifest) => { manifest.scenarios[0].purchases[0].paymentId = "d09a4b5c-1f30-4e5c-9349-d6540fe70d1b"; },
  ]) {
    const manifest = selectiveManifest();
    corrupt(manifest);
    assert.throws(() => validateManifest(manifest, manifest.databaseId));
  }
});

async function seededRows() {
  const manifest = selectiveManifest();
  const rows = Object.fromEntries(tables.map((table) => [table, []]));
  const transaction = {};
  const models = {};
  for (const [model, table] of [["User", "Users"], ["Session", "sessions"], ["MembershipPlan", "MembershipPlans"],
    ["Order", "Orders"], ["OrderItem", "OrderItems"], ["Payment", "Payments"], ["UserSubscription", "UserSubscriptions"]]) {
    models[model] = { create: async (row, options) => { assert.equal(options.transaction, transaction); rows[table].push(structuredClone(row)); } };
  }
  const tokens = await seedFixtures({ models, sequelize: { transaction: async (body) => body(transaction) } }, manifest, {});
  return { manifest, rows, tokens };
}
test("selective seed creates only three users/plans/orders/items/payments and no sessions/baselines", async () => {
  const { rows, tokens } = await seededRows();
  for (const table of ["Users", "MembershipPlans", "Orders", "OrderItems", "Payments"]) assert.equal(rows[table].length, 3);
  for (const table of tables.filter((table) => !["Users", "MembershipPlans", "Orders", "OrderItems", "Payments"].includes(table))) assert.equal(rows[table].length, 0);
  assert.equal(tokens.size, 0);
});

async function confirmedContext({ failureTable, code = "23505", wrongIndex = false, persistentChange = false } = {}) {
  const { manifest, rows } = await seededRows();
  const groupFixture = manifest.scenarios[0].purchases[0];
  const [paid, unused] = manifest.scenarios[1].purchases;
  const groupId = randomUUID(), subscriptionId = randomUUID();
  for (const purchase of [paid, groupFixture]) {
    Object.assign(rows.Payments.find((row) => row.id === purchase.paymentId), { status: "paid", providerPaymentId: purchase.providerId });
    rows.Orders.find((row) => row.id === purchase.orderId).status = "paid";
    rows.Receipts.push({ id: randomUUID(), paymentId: purchase.paymentId, status: "issued" });
  }
  rows.UserSubscriptions.push({ id: subscriptionId, userId: paid.userId, planId: paid.planId,
    orderItemId: paid.itemId, paymentId: paid.paymentId, startsAt: "2026-01-01", endsAt: "2026-01-30", status: "active" });
  rows.SubscriptionHistories.push({ id: randomUUID(), userId: paid.userId, subscriptionId });
  rows.SubscriptionGroups.push({ id: groupId, ownerUserId: groupFixture.userId, orderItemId: groupFixture.itemId, status: "pending_admin_approval" });
  for (const [userId, invitedEmail] of [[manifest.scenarios[0].userId, manifest.scenarios[0].userEmail], [manifest.scenarios[0].memberId, manifest.scenarios[0].memberEmail]]) {
    rows.SubscriptionGroupMembers.push({ id: randomUUID(), userId, invitedEmail, groupId });
  }
  const indexes = keys.map(([table_name, columns]) => ({ table_name, columns, is_unique: true, is_valid: true, name: `offline_${table_name}` }));
  const commands = [];
  const monitor = { async query(sql, params) {
    commands.push({ sql, params });
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
    const table = /core\."([^"]+)"/.exec(sql)?.[1];
    if (sql.startsWith("INSERT")) {
      if (persistentChange) rows.Payments[0].status = "pending";
      if (table === failureTable && code === "success") return { rows: [], rowCount: 1 };
      throw Object.assign(new Error("PRIVATE_PROVIDER_PASSWORD"), {
        code: table === failureTable ? code : "23505",
        constraint: table === failureTable && wrongIndex ? "PRIVATE_OTHER_INDEX" : `offline_${table}`,
      });
    }
    assert.ok(sql.startsWith("SELECT * FROM core."), "Only bounded snapshot reads are expected");
    return { rows: structuredClone(rows[table]) };
  } };
  return { context: { manifest, monitor, preflight: { indexes } }, inputs: { paid, unused, groupFixture }, rows, commands };
}
test("five unique probes check exact index/SQLSTATE, isolate transactions and retain snapshot", async () => {
  const { context, inputs, commands } = await confirmedContext();
  const reports = [];
  await runUniqueConstraintProbes(context, inputs, (value) => reports.push(value));
  assert.deepEqual(reports.filter((value) => value.phase === "unique-constraint" && value.status === "passed").map((value) => value.table), keys.map(([table]) => table));
  assert.equal(reports.at(-1).uniqueChecksPassed, 5);
  assert.equal(commands.filter(({ sql }) => sql.startsWith("INSERT")).length, 5);
  assert.equal(commands.filter(({ sql }) => sql === "BEGIN").length, 5);
  assert.equal(commands.filter(({ sql }) => sql === "ROLLBACK").length, 5);
  const paymentProbe = commands.find(({ sql }) => sql.startsWith('INSERT INTO core."Payments"'));
  const replacement = JSON.parse(paymentProbe.params[1]);
  assert.equal(replacement.orderId, inputs.unused.orderId);
  assert.notEqual(replacement.id, inputs.paid.paymentId);
  assert.equal(replacement.subscriptionId, null);
});
for (const failure of [{ code: "23503" }, { code: "success" }, { code: "23505", wrongIndex: true }]) {
  test(`unique probes stop and roll back on ${JSON.stringify(failure)}`, async () => {
    const { context, inputs, commands } = await confirmedContext({ failureTable: "Receipts", ...failure });
    const reports = [];
    await assert.rejects(runUniqueConstraintProbes(context, inputs, (value) => reports.push(value)), (error) => {
      assert.ok(!/PRIVATE_PROVIDER_PASSWORD|PRIVATE_OTHER_INDEX/.test(JSON.stringify(safeError(error))));
      return true;
    });
    assert.equal(commands.filter(({ sql }) => sql.startsWith("INSERT")).length, 2);
    assert.equal(commands.filter(({ sql }) => sql === "ROLLBACK").length, 2);
    assert.equal(reports.at(-1).status, "failed");
    assert.equal(reports.at(-1).table, "Receipts");
    assert.ok(!reports.some((value) => value.scenario === "real-unique-constraints" && value.status === "passed"));
  });
}
test("probes reject unowned fixtures, invalid index and non-pending support before unsafe INSERT", async () => {
  for (const mutation of [
    ({ inputs }) => { inputs.paid = { ...inputs.paid }; },
    ({ context }) => { context.preflight.indexes[0].is_valid = false; },
    ({ rows, inputs }) => { rows.Payments.find((row) => row.id === inputs.unused.paymentId).status = "paid"; },
  ]) {
    const data = await confirmedContext(); mutation(data);
    await assert.rejects(runUniqueConstraintProbes(data.context, data.inputs, () => {}));
    assert.equal(data.commands.filter(({ sql }) => sql.startsWith("INSERT")).length, 0);
  }
});
test("successful rejection codes cannot hide snapshot changes after rollback", async () => {
  const { context, inputs } = await confirmedContext({ persistentChange: true });
  await assert.rejects(runUniqueConstraintProbes(context, inputs, () => {}), /probes must roll back/);
});

test("selective cleanup uses only manifest IDs and leaves zero fixture rows", async () => {
  const { manifest, rows } = await seededRows();
  const commands = [];
  const client = { async query(sql, params) {
    commands.push({ sql, params });
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
    if (sql.includes("FROM pg_constraint")) return { rows: [] };
    const table = /core\."([^"]+)"/.exec(sql)?.[1];
    if (sql.startsWith("SELECT *")) return { rows: structuredClone(rows[table]) };
    if (sql.startsWith("UPDATE")) { assert.deepEqual(params[0], rows.Payments.map((row) => row.id)); return { rows: [] }; }
    assert.ok(sql.startsWith("DELETE FROM core.") && sql.includes("WHERE id=ANY($1::uuid[])"));
    assert.deepEqual(params[0], rows[table].map((row) => row.id));
    rows[table] = []; return { rows: [] };
  } };
  const result = await cleanupFixtures(client, manifest);
  assert.equal(Object.values(result.removed).reduce((sum, count) => sum + count, 0), 15);
  assert.ok(Object.values(rows).every((table) => table.length === 0));
  assert.ok(commands.every(({ sql }) => !/TRUNCATE|CASCADE/.test(sql)));
  assert.equal(commands.at(-1).sql, "COMMIT");
});
test("selective manifest can be verified later without writes or re-seeding", async () => {
  const manifest = selectiveManifest();
  manifest.protectedFingerprint = createHash("sha256").update(JSON.stringify({ orders: [], payments: [], subscriptions: [], receipts: [], groups: [], members: [] })).digest("hex");
  const commands = [];
  const client = { query: async (sql) => { commands.push(sql); return { rows: [] }; } };
  const result = await verifySavedRun(client, manifest, approved.expectedDatabaseId, () => {});
  assert.equal(result.writes, 0); assert.equal(result.remainingFixtures, 0); assert.equal(result.protectedRecordsUnchanged, true);
  assert.ok(commands.every((sql) => /^(BEGIN.*READ ONLY|SELECT|COMMIT|ROLLBACK)/.test(sql)));
});

for (const failure of [null, "group", "support"]) {
  test(`actual selective orchestration runs only owned group/unique jobs: failure=${failure}`, async () => {
    const { manifest, rows } = await seededRows();
    const jobs = [], reports = [], commands = [];
    let pid = 10;
    const monitor = { async query(sql) {
      commands.push(sql);
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
      const table = /core\."([^"]+)"/.exec(sql)?.[1];
      if (sql.startsWith("INSERT")) throw Object.assign(new Error("PRIVATE_TOKEN"), { code: "23505", constraint: `offline_${table}` });
      assert.ok(sql.startsWith("SELECT * FROM core."));
      return { rows: structuredClone(rows[table]) };
    } };
    const query = monitor.query.bind(monitor);
    monitor.query = async (sql, params) => {
      if (sql.includes('"orderNumber"=$1 OR id=') || sql.includes('OR "providerPaymentId"=$2') ||
          (sql.startsWith("SELECT") && Array.isArray(params?.[0]) && params[0].length === 0)) {
        commands.push(sql); return { rows: [] };
      }
      return query(sql, params);
    };
    const confirm = (fixture) => {
      if (rows.Payments.find((row) => row.id === fixture.paymentId).status === "paid") return;
      Object.assign(rows.Payments.find((row) => row.id === fixture.paymentId), { status: "paid", providerPaymentId: fixture.providerId });
      rows.Orders.find((row) => row.id === fixture.orderId).status = "paid";
      rows.Receipts.push({ id: randomUUID(), paymentId: fixture.paymentId, status: "issued" });
      if (fixture.group) {
        const groupId = randomUUID();
        rows.SubscriptionGroups.push({ id: groupId, ownerUserId: fixture.userId, orderItemId: fixture.itemId, status: "pending_admin_approval" });
        for (const [userId, invitedEmail] of [[manifest.scenarios[0].userId, manifest.scenarios[0].userEmail], [manifest.scenarios[0].memberId, manifest.scenarios[0].memberEmail]]) {
          rows.SubscriptionGroupMembers.push({ id: randomUUID(), userId, invitedEmail, groupId });
        }
      } else {
        const subscriptionId = randomUUID();
        rows.UserSubscriptions.push({ id: subscriptionId, userId: fixture.userId, planId: fixture.planId, orderItemId: fixture.itemId,
          paymentId: fixture.paymentId, startsAt: "2026-01-01", endsAt: "2026-01-30", status: "active" });
        rows.SubscriptionHistories.push({ id: randomUUID(), userId: fixture.userId, subscriptionId });
      }
    };
    const fork = () => {
      const child = new EventEmitter(); child.exitCode = null; child.signalCode = null;
      child.kill = () => { if (child.exitCode === null) { child.exitCode = 0; child.emit("exit", 0); } };
      child.send = (message) => queueMicrotask(() => {
        if (message.type === "initialize") { child.emit("message", { type: "ready", pid: ++pid }); return; }
        const job = message.job; jobs.push(job);
        const injected = Boolean(job.failAt);
        if (job.action === "webhook") rows.PaymentWebhookEvents.push({ id: randomUUID(), providerPaymentId: job.fixture.providerId, processingStatus: injected ? "failed" : "processed" });
        const rejected = injected || failure === "support" && job.action === "confirm";
        if (!rejected) confirm(job.fixture);
        child.emit("message", { type: "completed", ok: !rejected,
          error: rejected ? { code: injected && failure !== "group" ? "PGIT_INJECTED_FAILURE" : "23502" } : undefined });
        child.kill();
      });
      return child;
    };
    const context = vm.createContext({ process: { env: {} }, setTimeout, clearTimeout, URL });
    const exportsByModule = {
      "node:assert/strict": { default: assert }, "node:child_process": { fork },
      "node:crypto": { createHash, randomUUID }, "node:url": { fileURLToPath },
      "node:timers/promises": { setTimeout: async () => { throw new Error("Unselected concurrent scenario invoked"); } },
      "./mercadoPagoPostgresFixtures.js": { addDays, ownedRows, UNIQUE_FIXTURE_NAME },
      "./mercadoPagoPostgresSupport.js": { diagnoseIntegrationError, integrationAssert,
        openClient: async () => { throw new Error("Offline orchestration forbids connections"); },
        PROTECTED_IDS, PROTECTED_ORDER_NUMBER, PROTECTED_PROVIDER_ID, quoteIdentifier, safeError },
    };
    const module = new vm.SourceTextModule(await readFile(new URL("./integration/mercadoPagoPostgresScenarios.js", import.meta.url), "utf8"), {
      context, identifier: new URL("./integration/mercadoPagoPostgresScenarios.js", import.meta.url).href,
      initializeImportMeta: (meta) => { meta.url = new URL("./integration/mercadoPagoPostgresScenarios.js", import.meta.url).href; } });
    await module.link((specifier) => {
      const exports = exportsByModule[specifier]; assert.ok(exports);
      return new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
      }, { context });
    });
    await module.evaluate();
    const run = () => module.namespace.runScenarios({ manifest, monitor, config: { target: {}, url: new URL("postgresql://offline.invalid/offline") }, secrets: {}, operatorTokens: new Map(),
      preflight: { indexes: keys.map(([table_name, columns]) => ({ table_name, columns, is_unique: true, is_valid: true, name: `offline_${table_name}` })) } }, (value) => reports.push(value));
    if (failure) await assert.rejects(run()); else await run();
    assert.deepEqual(jobs.map((job) => job.action), failure === "group" ? ["webhook"] : ["webhook", "webhook", "webhook", "confirm"]);
    assert.ok(jobs.every((job) => manifest.scenarios.flatMap((scenario) => scenario.purchases).some((fixture) => fixture === job.fixture)));
    assert.equal(jobs[0].failAt, "receipt");
    assert.equal(commands.filter((sql) => sql.startsWith("INSERT")).length, failure ? 0 : 5);
    assert.deepEqual(reports.filter((report) => report.status === "passed" && report.scenario).map((report) => report.scenario),
      failure === "group" ? [] : failure === "support" ? ["group-receipt-rollback"] : ["group-receipt-rollback", "real-unique-constraints"]);
  });
}

for (const modeArgs of [[], ["--run"], ["--selective"], ["--authorize-temporary-writes"],
  ["--run", "--authorize-temporary-writes", "unexpected"], ["--verify-run", ""],
  ["--run", "--authorize-temporary-writes"], ["--verify-run", "offline-manifest.json"]]) {
  test(`embedded launcher requires an explicit authorized mode: ${JSON.stringify(modeArgs)}`, async () => {
    const source = (await readFile(new URL("../scripts/runMercadoPagoPostgresIntegration.ps1", import.meta.url), "utf8")).match(/@'\r?\n([\s\S]*?)\r?\n'@/)[1];
    const output = [], calls = [];
    let reads = 0;
    const taskProcess = { argv: ["node", "-", ...modeArgs], env: { TITANIUM_PG_TEST_DATABASE_URL: "OFFLINE_PRIVATE" } };
    const taskConsole = { log: (...args) => output.push(args), error: (...args) => output.push(args) };
    const context = vm.createContext({ process: taskProcess, console: taskConsole });
    const exportsByModule = {
      "node:fs/promises": { readFile: async () => { reads++; return JSON.stringify({ ...approved, branchVerifiedInNeon: true }); } },
      "node:perf_hooks": { performance: { now: () => 1 } },
      "./tests/integration/mercadoPagoPostgresSupport.js": { AUTHORIZED_INTEGRATION_TARGET, assertAuthorizedIntegrationTarget, diagnoseIntegrationError, integrationAssert, safeError,
        validateTarget: (_target, url) => assert.equal(url, "OFFLINE_PRIVATE") },
      "./tests/integration/mercadoPagoPostgresFixtures.js": { CASES, SELECTIVE_CASES },
      "./scripts/verifyMercadoPagoPostgresIntegration.js": { main: async (args) => {
        calls.push(Array.from(args));
        const options = parseIntegrationArgs(Array.from(args));
        if (options.mode === "verify-run") {
          assert.equal(options.authorizeTemporaryWrites, false);
          return;
        }
        assertWriteAuthorization(options, { databaseId: approved.expectedDatabaseId });
        const report = (value) => taskConsole.log(JSON.stringify(value));
        for (const { name } of CASES) {
          report({ scenario: name, status: "running" });
          report({ scenario: name, status: "passed" });
        }
        for (const [table] of keys) report({ phase: "unique-constraint", table, status: "passed", expectedSqlstate: "23505" });
        report({ phase: "cleanup", status: "passed", remainingFixtures: 0 });
        report({ phase: "protected-records", protectedRecordsUnchanged: true });
      } },
    };
    const module = new vm.SourceTextModule(source, { context });
    await module.link((specifier) => {
      const exports = exportsByModule[specifier]; assert.ok(exports);
      return new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
      }, { context });
    });
    await module.evaluate();
    const valid = modeArgs.length === 2 && modeArgs[1] !== "";
    assert.equal(calls.length, valid ? 1 : 0);
    assert.equal(reads, valid ? 1 : 0);
    assert.equal(taskProcess.exitCode, valid ? undefined : 1);
    assert.equal(taskProcess.env.TITANIUM_PG_TEST_DATABASE_URL, undefined);
    assert.ok(!JSON.stringify(output).includes("OFFLINE_PRIVATE"));
    if (valid && modeArgs[0] === "--run") {
      assert.deepEqual(calls[0], ["--run", "--target", "target.local", "--authorize-temporary-writes", "--confirm-database", approved.expectedDatabaseId]);
      assert.ok(output.some(([value]) => typeof value === "string" && value.includes('"scenariosPassed":9')));
    }
    if (valid && modeArgs[0] === "--verify-run") {
      assert.deepEqual(calls[0], ["--verify-run", "offline-manifest.json", "--target", "target.local"]);
    }
  });
}

for (const outcome of ["success", "missing-unique", "cleanup-failure", "protected-failure", "scenario-failure"]) {
  test(`selective launcher enforces scope, authorization and completion: ${outcome}`, async () => {
    const source = (await readFile(new URL("../scripts/runMercadoPagoPostgresIntegration.ps1", import.meta.url), "utf8")).match(/@'\r?\n([\s\S]*?)\r?\n'@/)[1];
    const output = [], calls = [];
    const taskProcess = { argv: ["node", "-", "--selective", "--authorize-temporary-writes"], env: { TITANIUM_PG_TEST_DATABASE_URL: "OFFLINE_PRIVATE" } };
    const taskConsole = { log: (...args) => output.push(args), error: (...args) => output.push(args) };
    const context = vm.createContext({ process: taskProcess, console: taskConsole });
    const exportsByModule = {
      "node:fs/promises": { readFile: async () => JSON.stringify({ ...approved, branchVerifiedInNeon: true }) },
      "node:perf_hooks": { performance: { now: () => 1 } },
      "./tests/integration/mercadoPagoPostgresSupport.js": { AUTHORIZED_INTEGRATION_TARGET, assertAuthorizedIntegrationTarget, diagnoseIntegrationError, integrationAssert, safeError,
        validateTarget: (_target, url) => { assert.equal(url, "OFFLINE_PRIVATE"); } },
      "./tests/integration/mercadoPagoPostgresFixtures.js": { CASES: [], SELECTIVE_CASES },
      "./scripts/verifyMercadoPagoPostgresIntegration.js": { main: async (args) => {
        calls.push(Array.from(args));
        const options = parseIntegrationArgs(Array.from(args));
        assert.equal(options.selective, true);
        assertWriteAuthorization(options, { databaseId: approved.expectedDatabaseId });
        const report = (value) => taskConsole.log(JSON.stringify(value));
        report({ scenario: "group-receipt-rollback", status: "running" });
        if (outcome === "scenario-failure") throw new Error("OFFLINE_PRIVATE");
        report({ scenario: "group-receipt-rollback", status: "passed" });
        for (const [table] of keys.slice(0, outcome === "missing-unique" ? 4 : 5)) {
          report({ phase: "unique-constraint", table, status: "passed", expectedSqlstate: "23505" });
        }
        report({ phase: "cleanup", status: outcome === "cleanup-failure" ? "failed" : "passed", remainingFixtures: outcome === "cleanup-failure" ? null : 0 });
        report({ phase: "protected-records", protectedRecordsUnchanged: outcome !== "protected-failure" });
      } },
    };
    const module = new vm.SourceTextModule(source, { context });
    await module.link((specifier) => {
      const exports = exportsByModule[specifier]; assert.ok(exports);
      return new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
      }, { context });
    });
    await module.evaluate();
    assert.deepEqual(calls, [["--run", "--selective", "--target", "target.local", "--authorize-temporary-writes", "--confirm-database", approved.expectedDatabaseId]]);
    assert.equal(taskProcess.exitCode, outcome === "success" ? undefined : 1);
    assert.equal(taskProcess.env.TITANIUM_PG_TEST_DATABASE_URL, undefined);
    assert.ok(!JSON.stringify(output).includes("OFFLINE_PRIVATE"));
    const completion = output.map(([value]) => { try { return JSON.parse(value); } catch { return null; } }).find((value) => value?.phase === "complete");
    assert.equal(Boolean(completion), outcome === "success");
    if (completion) { assert.equal(completion.scenariosPassed, 1); assert.equal(completion.uniqueChecksPassed, 5); assert.equal(completion.remainingFixtures, 0); assert.equal(completion.protectedRecordsUnchanged, true); }
  });
}
