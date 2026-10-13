import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { addDays, ownedRows, UNIQUE_FIXTURE_NAME } from "./mercadoPagoPostgresFixtures.js";
import {
  diagnoseIntegrationError, integrationAssert, openClient, PROTECTED_IDS, PROTECTED_ORDER_NUMBER, PROTECTED_PROVIDER_ID, quoteIdentifier, safeError,
} from "./mercadoPagoPostgresSupport.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  promise.catch(() => {}); // Tambien puede rechazarse durante inicializacion.
  return { promise, resolve, reject };
}
function spawnWorker(context, suffix) {
  const ready = deferred(), completed = deferred(), exited = deferred();
  const env = {};
  for (const key of ["SystemRoot", "WINDIR", "PATH", "Path", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  env.TITANIUM_PG_INTEGRATION_WORKER = "isolated-v1";
  const child = fork(fileURLToPath(new URL("./mercadoPagoPostgresWorker.js", import.meta.url)), [], {
    env, execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  let resultReceived = false;
  const timer = setTimeout(() => {
    ready.reject(new Error("Worker timeout")); completed.reject(new Error("Worker timeout")); child.kill();
  }, 60000);
  child.on("error", (error) => { ready.reject(error); completed.reject(error); });
  child.on("message", (message) => {
    if (message.type === "ready") ready.resolve(message.pid);
    if (message.type === "completed") { resultReceived = true; completed.resolve(message); }
    if (message.type === "fatal") {
      ready.reject(Object.assign(new Error("Worker initialization failed"), { cause: message.error }));
      completed.reject(new Error("Worker failed"));
    }
  });
  child.on("exit", (code) => {
    clearTimeout(timer); exited.resolve();
    if (!resultReceived) { ready.reject(new Error("Worker exited before readiness/result")); completed.reject(new Error(`Worker exit ${code}`)); }
  });
  child.send({ type: "initialize", target: context.config.target, connectionString: context.config.url.toString(),
    runId: context.manifest.runId, secrets: context.secrets, name: `pgit-${context.manifest.runId.slice(0, 8)}-${suffix}` });
  return { ready: ready.promise, completed: completed.promise,
    execute: (job) => child.send({ type: "execute", job }),
    async stop() { if (child.exitCode === null && child.signalCode === null) child.kill(); await exited.promise; } };
}

export function locksReachGate(rows, pids, gatePid) {
  const reachesGate = (pid, visited = new Set()) => {
    if (pid === gatePid) return true;
    if (visited.has(pid)) return false;
    const next = new Set([...visited, pid]);
    return (rows.find((row) => row.pid === pid)?.blockers || []).some((blocker) => reachesGate(blocker, next));
  };
  return rows.length === pids.length && pids.every((pid) => rows.some((row) => row.pid === pid)) &&
    rows.every((row) => row.wait_event_type === "Lock" && reachesGate(row.pid));
}
async function waitForContendedLocks(monitor, pids, gatePid) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const { rows } = await monitor.query(`SELECT pid, pg_blocking_pids(pid) AS blockers,
      wait_event_type FROM pg_stat_activity WHERE pid=ANY($1::int[])`, [pids]);
    if (locksReachGate(rows, pids, gatePid)) {
      return rows.map((row) => ({ pid: row.pid, blockers: row.blockers }));
    }
    await delay(50);
  }
  throw new Error("Both independent PostgreSQL sessions did not reach the expected contended lock");
}
async function concurrent(context, jobs, gate) {
  const workers = jobs.map((_, index) => spawnWorker(context, `${gate.kind}-${index}`));
  let locker;
  try {
    const pids = await Promise.all(workers.map((worker) => worker.ready));
    assert.equal(new Set(pids).size, jobs.length, "Workers must use independent PostgreSQL backends");
    locker = await openClient(context.config, `pgit-${context.manifest.runId.slice(0, 8)}-gate`);
    await locker.query("BEGIN");
    const { rows: [{ pid: gatePid }] } = await locker.query("SELECT pg_backend_pid() AS pid");
    if (gate.kind === "user") {
      const locked = await locker.query('SELECT id FROM core."Users" WHERE id=$1 FOR UPDATE', [gate.id]);
      assert.equal(locked.rowCount, 1);
    } else {
      await locker.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`mercadopago_payment:${gate.id}`]);
    }
    workers.forEach((worker, index) => worker.execute(jobs[index]));
    const contention = await waitForContendedLocks(context.monitor, pids, gatePid);
    await locker.query("ROLLBACK"); // Libera el bloqueo sin modificar la fila del fixture.
    const results = await Promise.all(workers.map((worker) => worker.completed));
    for (const result of results) requireSuccess(result);
    return { pids, contention, results: results.map((result) => result.result) };
  } finally {
    if (locker) { await locker.query("ROLLBACK").catch(() => {}); await locker.end(); }
    await Promise.all(workers.map((worker) => worker.stop()));
  }
}
async function single(context, job) {
  const worker = spawnWorker(context, `single-${randomUUID().slice(0, 8)}`);
  try { await worker.ready; worker.execute(job); return await worker.completed; }
  finally { await worker.stop(); }
}
function requireSuccess(result) {
  if (!result.ok) throw Object.assign(new Error("Fixture operation failed"), { cause: result.error });
}

async function snapshot(context) {
  await context.monitor.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const rows = await ownedRows(context.monitor, context.manifest);
    await context.monitor.query("COMMIT");
    return rows;
  } catch (error) { await context.monitor.query("ROLLBACK"); throw error; }
}
function checkNoOverlaps(rows, userId) {
  const active = rows.UserSubscriptions.filter((row) => row.userId === userId && row.status === "active")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (let i = 1; i < active.length; i++) assert.ok(active[i - 1].endsAt < active[i].startsAt, "Inclusive periods overlap");
}
export function checkConfirmed(rows, fixture) {
  const payments = rows.Payments.filter((row) => row.orderId === fixture.orderId);
  assert.equal(payments.length, 1); assert.equal(payments[0].id, fixture.paymentId);
  assert.equal(payments[0].status, "paid"); assert.equal(payments[0].providerPaymentId, fixture.providerId);
  assert.equal(rows.Orders.find((row) => row.id === fixture.orderId)?.status, "paid");
  assert.equal(rows.Receipts.filter((row) => row.paymentId === fixture.paymentId && row.status === "issued").length, 1);
  if (!fixture.group) {
    const subscriptions = rows.UserSubscriptions.filter((row) => row.orderItemId === fixture.itemId);
    assert.equal(subscriptions.length, 1);
    assert.equal(subscriptions[0].paymentId, fixture.paymentId);
    const days = (Date.parse(subscriptions[0].endsAt) - Date.parse(subscriptions[0].startsAt)) / 86400000 + 1;
    assert.equal(days, fixture.durationDays);
    assert.equal(rows.SubscriptionHistories.filter((row) => row.subscriptionId === subscriptions[0].id).length, 1);
  } else {
    const groups = rows.SubscriptionGroups.filter((row) => row.orderItemId === fixture.itemId);
    integrationAssert(groups.length === 1, "Group confirmation must create exactly one group.", "groups.count", "execution", { expected: 1, actual: groups.length });
    integrationAssert(groups[0].status === "pending_admin_approval", "A complete paid group must await administrative approval.", "group.status", "execution", { expected: "pending_admin_approval", actual: groups[0].status });
    const members = rows.SubscriptionGroupMembers.filter((row) => row.groupId === groups[0].id);
    integrationAssert(members.length === 2, "The group must contain its owner and one invited member.", "group.members.count", "execution", { expected: 2, actual: members.length });
    integrationAssert(new Set(members.map((member) => member.invitedEmail)).size === 2, "Group member invitations must be unique.", "group.members.unique", "execution");
    integrationAssert(rows.UserSubscriptions.filter((row) => row.groupId === groups[0].id).length === 0, "A group awaiting approval must not grant individual access.", "group.subscriptions.count", "execution");
  }
  checkNoOverlaps(rows, fixture.userId);
}
export function assertInjectedFailure(result, failAt) {
  integrationAssert(result.ok === false, "The injected failure must reject the fixture operation.", "injected_failure.rejected", "execution", { expected: false, actual: result.ok });
  integrationAssert(result.error?.code === "PGIT_INJECTED_FAILURE",
    failAt === "activation" ? "Activation INSERT must be reached before the intentional failure."
      : "Receipt INSERT must be reached before the intentional failure; an earlier validation error is not a receipt rollback test.",
    "injected_failure.code", "execution", { expected: "PGIT_INJECTED_FAILURE", actual: result.error?.code, worker: result.error });
}
function assertUnchangedEntities(before, after, fixture) {
  for (const [table, id] of [["Payments", fixture.paymentId], ["Orders", fixture.orderId]]) {
    assert.deepEqual(after[table].find((row) => row.id === id), before[table].find((row) => row.id === id));
  }
  for (const table of ["UserSubscriptions", "Receipts", "SubscriptionHistories", "SubscriptionEvents", "SubscriptionGroups", "SubscriptionGroupMembers"]) {
    assert.deepEqual(after[table], before[table], `Rollback changed ${table}`);
  }
}

// Solo devuelve una huella: nunca publica datos de la orden/pago reales.
export async function protectedFingerprint(client) {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const protectedIds = [...PROTECTED_IDS];
    const { rows: orders } = await client.query('SELECT * FROM core."Orders" WHERE "orderNumber"=$1 OR id=ANY($2::uuid[]) ORDER BY id', [PROTECTED_ORDER_NUMBER, protectedIds]);
    const { rows: payments } = await client.query('SELECT * FROM core."Payments" WHERE "orderId"=ANY($1::uuid[]) OR "providerPaymentId"=$2 OR id=ANY($3::uuid[]) ORDER BY id', [orders.map((r) => r.id), PROTECTED_PROVIDER_ID, protectedIds]);
    const userIds = [...new Set([...orders.map((r) => r.userId), ...payments.map((r) => r.userId)])];
    const { rows: subscriptions } = await client.query('SELECT * FROM core."UserSubscriptions" WHERE "userId"=ANY($1::uuid[]) ORDER BY id', [userIds]);
    const { rows: receipts } = await client.query('SELECT * FROM core."Receipts" WHERE "paymentId"=ANY($1::uuid[]) ORDER BY id', [payments.map((r) => r.id)]);
    const { rows: groups } = await client.query('SELECT * FROM core."SubscriptionGroups" WHERE "ownerUserId"=ANY($1::uuid[]) ORDER BY id', [userIds]);
    const { rows: members } = await client.query('SELECT * FROM core."SubscriptionGroupMembers" WHERE "groupId"=ANY($1::uuid[]) ORDER BY id', [groups.map((r) => r.id)]);
    const fingerprint = createHash("sha256").update(JSON.stringify({ orders, payments, subscriptions, receipts, groups, members })).digest("hex");
    await client.query("COMMIT");
    return fingerprint;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

async function assertUniqueConstraint(context, table, id, replacement, columns) {
  const expectedConstraints = context.preflight.indexes.filter((index) => index.table_name === table && index.is_unique &&
    index.is_valid && JSON.stringify(index.columns) === JSON.stringify(columns)).map((index) => index.name);
  integrationAssert(expectedConstraints.length > 0, "A valid intended unique index is required before probing.",
    `unique.${table}.index`, "execution");
  integrationAssert(typeof id === "string", "A fixture source row is required before probing.", `unique.${table}.source`, "execution");
  await context.monitor.query("BEGIN");
  try {
    let conflict;
    try {
      await context.monitor.query(`INSERT INTO core.${quoteIdentifier(table)}
        SELECT (jsonb_populate_record(NULL::core.${quoteIdentifier(table)}, to_jsonb(t) || $2::jsonb)).*
        FROM core.${quoteIdentifier(table)} t WHERE id=$1`, [id, JSON.stringify({ id: randomUUID(), ...replacement })]);
    } catch (error) { conflict = error; }
    integrationAssert(conflict?.code === "23505", `Expected real unique violation on ${table}.`,
      `unique.${table}.sqlstate`, "execution", { expected: "23505", actual: conflict?.code, worker: conflict });
    integrationAssert(expectedConstraints.includes(conflict.constraint), "The intended unique index must cause the rejection.",
      `unique.${table}.constraint`, "execution");
  } finally { await context.monitor.query("ROLLBACK"); }
}

// No depende de posiciones de escenarios; los origenes pertenecen al manifiesto del run.
export async function runUniqueConstraintProbes(context, { paid, unused, groupFixture }, report) {
  const purchases = context.manifest.scenarios.flatMap((scenario) => scenario.purchases);
  for (const fixture of [paid, unused, groupFixture]) {
    integrationAssert(purchases.includes(fixture), "Unique probes must use owned fixture purchases.", "unique.fixtures", "execution");
  }
  const final = await snapshot(context);
  checkConfirmed(final, paid);
  checkConfirmed(final, groupFixture);
  integrationAssert(final.Payments.find((row) => row.id === unused.paymentId)?.status === "pending",
    "The provider uniqueness probe requires a separate pending fixture order.", "unique.pending_order", "execution");
  const group = final.SubscriptionGroups.find((row) => row.orderItemId === groupFixture.itemId);
  const probes = [
    ["Payments", paid.paymentId, {
      orderId: unused.orderId, userId: unused.userId, externalReference: randomUUID(),
      idempotencyKey: randomUUID(), providerPreferenceId: randomUUID(), subscriptionId: null, groupId: null,
    }, ["provider", "providerPaymentId"]],
    ["Receipts", final.Receipts.find((row) => row.paymentId === paid.paymentId)?.id,
      { folio: `PGIT-${randomUUID()}` }, ["paymentId"]],
    ["UserSubscriptions", final.UserSubscriptions.find((row) => row.orderItemId === paid.itemId)?.id, {}, ["orderItemId"]],
    ["SubscriptionGroups", group?.id, {}, ["orderItemId"]],
    ["SubscriptionGroupMembers", final.SubscriptionGroupMembers.find((row) => row.groupId === group?.id)?.id,
      {}, ["groupId", "invitedEmail"]],
  ];
  for (const [table, id, replacement, columns] of probes) {
    const started = Date.now();
    report({ phase: "unique-constraint", table, columns, status: "running" });
    try {
      await assertUniqueConstraint(context, table, id, replacement, columns);
      report({ phase: "unique-constraint", table, columns, status: "passed", expectedSqlstate: "23505", durationMs: Date.now() - started });
    } catch (error) {
      report({ phase: "unique-constraint", table, columns, status: "failed", durationMs: Date.now() - started,
        error: safeError(diagnoseIntegrationError(error, "execution")) });
      throw error;
    }
  }
  assert.deepEqual(await snapshot(context), final, "Unique-constraint probes must roll back");
  report({ scenario: "real-unique-constraints", status: "passed", expectedSqlstate: "23505", uniqueChecksPassed: probes.length });
}

export async function runScenarios(context, report) {
  const { manifest } = context;
  const protectedBefore = await protectedFingerprint(context.monitor);
  let primaryError;
  try {
    for (const scenario of manifest.scenarios) {
      if (scenario.name === UNIQUE_FIXTURE_NAME) continue; // Solo prepara datos para los indices, no repite otro escenario.
      report({ scenario: scenario.name, status: "running" });
      const [fixture, second] = scenario.purchases;
      const before = await snapshot(context);
      const job = (action, purchase = fixture, extra = {}) => ({ action, fixture: purchase, ...extra });
      const reconciliation = (index) => job("reconcile", fixture, {
        operatorId: scenario.operators[index].userId, operatorToken: context.operatorTokens.get(scenario.operators[index].userId),
      });
      let evidence = {};
      switch (scenario.name) {
        case "simultaneous-purchases":
        case "preserve-periods": {
          if (scenario.name === "simultaneous-purchases") {
            const preview = await single(context, job("preview"));
            requireSuccess(preview); assert.equal(preview.result.dryRun, true);
            assert.deepEqual(await snapshot(context), before, "Preview wrote fixture data");
          }
          evidence = await concurrent(context, [job("confirm"), job("confirm", second)], { kind: "user", id: scenario.userId });
          const after = await snapshot(context);
          for (const purchase of scenario.purchases) checkConfirmed(after, purchase);
          const newPeriods = after.UserSubscriptions.filter((row) => scenario.purchases.some((p) => p.itemId === row.orderItemId))
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          assert.equal(newPeriods[1].startsAt, addDays(newPeriods[0].endsAt, 1));
          const baselines = before.UserSubscriptions.filter((row) => row.userId === scenario.userId);
          for (const row of baselines) assert.deepEqual(after.UserSubscriptions.find((r) => r.id === row.id), row);
          if (baselines.length) assert.equal(newPeriods[0].startsAt, addDays(baselines.map((r) => r.endsAt).sort().at(-1), 1));
          break;
        }
        case "inclusive-overlap": {
          const annual = before.UserSubscriptions.find((row) => row.id === scenario.baselineIds[0]);
          const rejected = await single(context, job("explicit-period", fixture, { startsAt: annual.endsAt, endsAt: addDays(annual.endsAt, 29) }));
          assert.equal(rejected.ok, false); assert.equal(rejected.error.statusCode, 409);
          assert.deepEqual(await snapshot(context), before);
          requireSuccess(await single(context, job("explicit-period", fixture, { startsAt: addDays(annual.endsAt, 1), endsAt: addDays(annual.endsAt, 30) })));
          const after = await snapshot(context); checkNoOverlaps(after, scenario.userId);
          assert.deepEqual(after.UserSubscriptions.find((row) => row.id === annual.id), annual);
          break;
        }
        case "duplicate-webhooks":
        case "webhook-reconciliation":
        case "duplicate-reconciliations": {
          const jobs = scenario.name === "duplicate-webhooks" ? [job("webhook"), job("webhook")]
            : scenario.name === "webhook-reconciliation" ? [job("webhook"), reconciliation(0)]
            : [reconciliation(0), reconciliation(1)];
          evidence = await concurrent(context, jobs, { kind: "provider", id: fixture.providerId });
          const after = await snapshot(context); checkConfirmed(after, fixture);
          const events = after.PaymentWebhookEvents.filter((row) => row.providerPaymentId === fixture.providerId);
          assert.equal(events.length, jobs.filter((j) => j.action === "webhook").length);
          assert.ok(events.every((event) => event.signatureValid === true && event.processingStatus === "processed"));
          const history = after.Payments.find((row) => row.id === fixture.paymentId).metadata.reconciliationHistory || [];
          assert.equal(history.length, jobs.filter((j) => j.action === "reconcile").length);
          assert.equal(new Set(history.map((attempt) => attempt.attemptId)).size, history.length);
          for (const attempt of history) assert.ok(scenario.operators.some((operator) => operator.userId === attempt.requestedBy));
          break;
        }
        case "activation-rollback":
        case "receipt-rollback":
        case "group-receipt-rollback": {
          const failed = await single(context, job("webhook", fixture, { failAt: scenario.name === "activation-rollback" ? "activation" : "receipt" }));
          assertInjectedFailure(failed, scenario.name === "activation-rollback" ? "activation" : "receipt");
          const rolledBack = await snapshot(context); assertUnchangedEntities(before, rolledBack, fixture);
          const failedEvents = rolledBack.PaymentWebhookEvents.filter((row) => row.providerPaymentId === fixture.providerId);
          assert.equal(failedEvents.length, 1); assert.equal(failedEvents[0].processingStatus, "failed");
          requireSuccess(await single(context, job("webhook")));
          checkConfirmed(await snapshot(context), fixture);
          // Segundo evento independiente comprueba idempotencia tras el reintento.
          requireSuccess(await single(context, job("webhook")));
          checkConfirmed(await snapshot(context), fixture);
          break;
        }
        default: throw new Error("Unimplemented PostgreSQL scenario");
      }
      assert.equal(await protectedFingerprint(context.monitor), protectedBefore, "Protected real payment/order changed");
      report({ scenario: scenario.name, status: "passed", ...evidence });
    }
    report({ scenario: "real-unique-constraints", status: "running" });
    const support = manifest.scenarios.find((scenario) => scenario.name === UNIQUE_FIXTURE_NAME);
    let paid, unused;
    if (support) {
      [paid, unused] = support.purchases;
      // Un proceso/pool PostgreSQL independiente confirma solo la compra individual de apoyo.
      requireSuccess(await single(context, { action: "confirm", fixture: paid }));
      checkConfirmed(await snapshot(context), paid);
      integrationAssert(await protectedFingerprint(context.monitor) === protectedBefore,
        "Protected records changed during unique-fixture preparation.", "protectedFingerprint", "protected_records");
    } else {
      paid = manifest.scenarios.find((scenario) => scenario.name === "simultaneous-purchases").purchases[0];
      unused = manifest.scenarios.find((scenario) => scenario.name === "inclusive-overlap").purchases[0];
    }
    const groupFixture = manifest.scenarios.find((s) => s.name === "group-receipt-rollback").purchases[0];
    await runUniqueConstraintProbes(context, { paid, unused, groupFixture }, report);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    let matched = null;
    try {
      matched = await protectedFingerprint(context.monitor) === protectedBefore;
      integrationAssert(matched, "Protected records changed during scenarios; manual review required.", "protectedFingerprint", "protected_records");
    } catch (error) {
      report({ phase: "protected-records", status: "failed", protectedRecordsUnchanged: matched,
        error: safeError(diagnoseIntegrationError(error, "protected_records")) });
      if (!primaryError) throw error;
    }
  }
}
