import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import {
  AUTHORIZED_INTEGRATION_TARGET, UUID, PROTECTED_IDS, assertFixtureIds, newProviderId, quoteIdentifier,
} from "./mercadoPagoPostgresSupport.js";

export const CASES = [
  ["simultaneous-purchases", "Dos pagos/planes distintos del mismo usuario sin membresias previas", 2],
  ["inclusive-overlap", "Rechazar superposicion en el ultimo dia inclusivo y aceptar el dia siguiente", 1],
  ["duplicate-webhooks", "Dos webhooks distintos para la misma operacion", 1],
  ["webhook-reconciliation", "Webhook y reconciliacion concurrentes para la misma operacion", 1],
  ["duplicate-reconciliations", "Dos operadores y reconciliaciones concurrentes; conservar ambos intentos", 1],
  ["activation-rollback", "Fallo despues del INSERT de la suscripcion; rollback y reintento", 1],
  ["receipt-rollback", "Fallo despues del INSERT del recibo; rollback de pago y membresia y reintento", 1],
  ["preserve-periods", "Dos renovaciones concurrentes despues de una anual vigente y una futura", 2],
  ["group-receipt-rollback", "Rollback de paquete e integrantes y confirmacion duplicada sin duplicarlos", 1],
].map(([name, description, purchases]) => ({ name, description, purchases, temporaryWrites: true }));
export const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const SELECTIVE_CASES = CASES.filter((spec) => spec.name === "group-receipt-rollback");
export const UNIQUE_FIXTURE_NAME = "unique-constraints-fixtures";
const SELECTIVE_FIXTURE_CASES = [...SELECTIVE_CASES,
  { name: UNIQUE_FIXTURE_NAME, purchases: 2 }];
const SELECTIVE_SCOPE = "group-receipt-rollback-and-unique-constraints";
// v1 produjo 78 caracteres locales; conservar su lectura/limpieza, no generar nuevos.
export const fixtureEmail = (runId, id, version = 2) => version === 1
  ? `pgit-${runId}-${id}@example.invalid`
  : `pgit-${runId.replaceAll("-", "").slice(0, 16)}-${id.replaceAll("-", "")}@example.invalid`;

// Se genera y persiste antes del primer INSERT; no contiene URL ni tokens.
export function buildManifest(databaseId, { selective = false } = {}) {
  if (selective) assert.equal(databaseId, AUTHORIZED_INTEGRATION_TARGET.expectedDatabaseId,
    "Selective fixtures require the explicitly authorized integration database");
  const runId = randomUUID();
  const email = (id) => fixtureEmail(runId, id);
  const scenarios = (selective ? SELECTIVE_FIXTURE_CASES : CASES).map((spec, index) => {
    const userId = randomUUID();
    const memberId = !selective || spec.name === "group-receipt-rollback" ? randomUUID() : null;
    const operators = (selective ? [] : [0, 1]).map(() => ({ userId: randomUUID(), sessionId: randomUUID() }));
    const purchases = Array.from({ length: spec.purchases }, (_, number) => {
      const planId = randomUUID();
      return {
        runId, userId, planId, orderId: randomUUID(), itemId: randomUUID(), paymentId: randomUUID(),
        providerId: newProviderId(), durationDays: number === 0 ? 30 : 45,
        amount: spec.name === "group-receipt-rollback" ? 880 : 440,
        group: spec.name === "group-receipt-rollback",
        orderNumber: `PGIT-${runId.slice(0, 12)}-${index}-${number}`,
        planSlug: `pgit-${runId}-${planId}`,
      };
    });
    return { name: spec.name, userId, memberId, userEmail: email(userId), memberEmail: memberId ? email(memberId) : null,
      operators: operators.map((operator) => ({ ...operator, email: email(operator.userId) })),
      baselinePlanId: selective ? null : randomUUID(), baselineIds: selective ? [] : [randomUUID(), randomUUID()], purchases };
  });
  return { version: selective ? 3 : 2, runId, databaseId, createdAt: new Date().toISOString(), scenarios,
    ...(selective ? { scope: SELECTIVE_SCOPE } : {}) };
}
export function validateManifest(manifest, databaseId) {
  assert.ok([1, 2, 3].includes(manifest.version), "Unsupported integration manifest version");
  const selective = manifest.version === 3;
  const specs = selective ? SELECTIVE_FIXTURE_CASES : CASES;
  if (selective) {
    assert.equal(manifest.scope, SELECTIVE_SCOPE, "Invalid selective manifest scope");
    assert.equal(manifest.databaseId, AUTHORIZED_INTEGRATION_TARGET.expectedDatabaseId,
      "Selective manifests require the explicitly authorized integration database");
  } else assert.equal(manifest.scope, undefined, "Legacy manifests cannot request a selective scope");
  assert.match(manifest.runId, UUID);
  assert.equal(manifest.databaseId, databaseId);
  assert.equal(manifest.scenarios.length, specs.length);
  const ids = [];
  const providerIds = [];
  for (const [index, scenario] of manifest.scenarios.entries()) {
    assert.equal(scenario.name, specs[index].name);
    assert.equal(scenario.purchases.length, specs[index].purchases);
    assert.equal(scenario.operators.length, selective ? 0 : 2);
    const hasMember = !selective || scenario.name === "group-receipt-rollback";
    if (!hasMember) { assert.equal(scenario.memberId, null); assert.equal(scenario.memberEmail, null); }
    if (selective) { assert.equal(scenario.baselinePlanId, null); assert.deepEqual(scenario.baselineIds, []); }
    for (const [id, email] of [[scenario.userId, scenario.userEmail], ...(hasMember ? [[scenario.memberId, scenario.memberEmail]] : []),
      ...scenario.operators.map((operator) => [operator.userId, operator.email])]) {
      assert.match(id, UUID);
      assert.equal(email, fixtureEmail(manifest.runId, id, manifest.version));
      ids.push(id);
    }
    for (const id of [...(selective ? [] : [scenario.baselinePlanId]), ...scenario.baselineIds, ...scenario.operators.map((o) => o.sessionId)]) {
      assert.match(id, UUID); ids.push(id);
    }
    for (const [number, purchase] of scenario.purchases.entries()) {
      assertFixtureIds(purchase, manifest.runId);
      assert.equal(purchase.userId, scenario.userId);
      assert.equal(purchase.planSlug, `pgit-${manifest.runId}-${purchase.planId}`);
      assert.equal(purchase.orderNumber, `PGIT-${manifest.runId.slice(0, 12)}-${index}-${number}`);
      assert.equal(purchase.durationDays, number === 0 ? 30 : 45);
      assert.equal(purchase.group, scenario.name === "group-receipt-rollback");
      assert.equal(purchase.amount, purchase.group ? 880 : 440);
      ids.push(purchase.planId, purchase.orderId, purchase.itemId, purchase.paymentId);
      providerIds.push(purchase.providerId);
    }
  }
  assert.equal(new Set(ids).size, ids.length, "Manifest entity IDs must be disjoint");
  assert.ok(ids.every((id) => !PROTECTED_IDS.has(id)), "Protected IDs cannot appear in the manifest");
  assert.equal(new Set(providerIds).size, providerIds.length, "Synthetic operations must be distinct between purchases");
}

export async function seedFixtures(backend, manifest, secrets) {
  validateManifest(manifest, manifest.databaseId);
  assert.ok([2, 3].includes(manifest.version), "Legacy manifests can only be inspected or cleaned, never seeded again");
  const { User, Session, MembershipPlan, Order, OrderItem, Payment, UserSubscription } = backend.models;
  const operatorTokens = new Map();
  await backend.sequelize.transaction(async (transaction) => {
    const options = { transaction };
    for (const scenario of manifest.scenarios) {
      await User.create({ id: scenario.userId, email: scenario.userEmail, role: "cliente", isVerified: true }, options);
      if (scenario.memberId) await User.create({ id: scenario.memberId, email: scenario.memberEmail, role: "cliente", isVerified: true }, options);
      for (const operator of scenario.operators) {
        await User.create({ id: operator.userId, email: operator.email, role: "administrador", isVerified: true,
          isPendingApproval: false, mustChangePassword: false }, options);
        const token = jwt.sign({ id: operator.userId }, secrets.jwt, { algorithm: "HS256", expiresIn: "1h" });
        operatorTokens.set(operator.userId, token);
        await Session.create({ id: operator.sessionId, userId: operator.userId, token,
          expiresAt: new Date(Date.now() + 3600000), revoked: false, userAgent: `PGIT/${manifest.runId}` }, options);
      }
      if (scenario.baselinePlanId) await MembershipPlan.create({ id: scenario.baselinePlanId, name: "PGIT existing annual",
        slug: `pgit-${manifest.runId}-${scenario.baselinePlanId}`, durationDays: 365, price: 1000, type: "individual" }, options);
      for (const purchase of scenario.purchases) {
        const metadata = { integrationRunId: manifest.runId };
        await MembershipPlan.create({ id: purchase.planId, name: `PGIT ${scenario.name}`, slug: purchase.planSlug,
          durationDays: purchase.durationDays, price: purchase.amount, type: purchase.group ? "group" : "individual",
          minPeople: purchase.group ? 2 : 1, maxPeople: purchase.group ? 2 : 1,
          pricePerPerson: purchase.group ? 440 : null }, options);
        await Order.create({ id: purchase.orderId, userId: scenario.userId, orderNumber: purchase.orderNumber,
          status: "pending_payment", channel: "online", subtotal: purchase.amount, total: purchase.amount,
          currency: "MXN", metadata }, options);
        await OrderItem.create({ id: purchase.itemId, orderId: purchase.orderId,
          itemType: purchase.group ? "group_membership" : "membership", membershipPlanId: purchase.planId,
          quantity: 1, unitPrice: purchase.amount, itemNameSnapshot: `PGIT ${scenario.name}`,
          durationDaysSnapshot: purchase.durationDays,
          metadata: { ...metadata, ...(purchase.group ? { memberEmails: [scenario.memberEmail] } : {}) } }, options);
        await Payment.create({ id: purchase.paymentId, userId: scenario.userId, orderId: purchase.orderId,
          amount: purchase.amount, currency: "MXN", paymentType: "membership", method: "online_checkout",
          source: "online_checkout", provider: "mercadopago_checkout", status: "pending",
          providerPreferenceId: `pgit-${manifest.runId}-${purchase.itemId}`, externalReference: purchase.orderId,
          idempotencyKey: `pgit-${manifest.runId}-${purchase.paymentId}`, metadata }, options);
      }
      if (["inclusive-overlap", "preserve-periods"].includes(scenario.name)) {
        const today = new Date().toISOString().slice(0, 10);
        const dates = [[today, addDays(today, 364)], [addDays(today, 365), addDays(today, 394)]];
        for (const [index, [startsAt, endsAt]] of dates.entries()) {
          if (index === 1 && scenario.name !== "preserve-periods") continue;
          await UserSubscription.create({ id: scenario.baselineIds[index], userId: scenario.userId,
            planId: index === 0 ? scenario.baselinePlanId : scenario.purchases[0].planId,
            startsAt, endsAt, status: "active", source: "admin_manual",
            notes: `PGIT/${manifest.runId}/baseline` }, options);
        }
      }
    }
  });
  return operatorTokens;
}

const TABLES = ["Users", "sessions", "MembershipPlans", "Orders", "OrderItems", "Payments", "Receipts",
  "UserSubscriptions", "SubscriptionGroups", "SubscriptionGroupMembers", "SubscriptionHistories",
  "SubscriptionEvents", "PaymentWebhookEvents"];
export async function ownedRows(client, manifest) {
  const scenarios = manifest.scenarios;
  const users = scenarios.flatMap((s) => [s.userId, s.memberId, ...s.operators.map((o) => o.userId)]).filter(Boolean);
  const purchases = scenarios.flatMap((s) => s.purchases);
  const get = async (table, where, params) => (await client.query(`SELECT * FROM core.${quoteIdentifier(table)} WHERE ${where} ORDER BY id`, params)).rows;
  const result = {};
  result.Users = await get("Users", "id=ANY($1::uuid[])", [users]);
  for (const row of result.Users) assert.equal(row.email, fixtureEmail(manifest.runId, row.id, manifest.version));
  result.sessions = await get("sessions", '"userId"=ANY($1::uuid[])', [users]);
  for (const row of result.sessions) {
    assert.ok(scenarios.some((s) => s.operators.some((o) => o.sessionId === row.id && o.userId === row.userId)));
    assert.equal(row.userAgent, `PGIT/${manifest.runId}`);
  }
  result.MembershipPlans = await get("MembershipPlans", "id=ANY($1::uuid[])", [
    [...scenarios.map((s) => s.baselinePlanId).filter(Boolean), ...purchases.map((p) => p.planId)],
  ]);
  for (const row of result.MembershipPlans) assert.equal(row.slug, `pgit-${manifest.runId}-${row.id}`);
  result.Orders = await get("Orders", "id=ANY($1::uuid[])", [purchases.map((p) => p.orderId)]);
  for (const row of result.Orders) {
    assert.equal(row.metadata?.integrationRunId, manifest.runId);
    assert.equal(row.orderNumber, purchases.find((p) => p.orderId === row.id)?.orderNumber);
    assert.ok(users.includes(row.userId));
  }
  result.OrderItems = await get("OrderItems", '"orderId"=ANY($1::uuid[])', [purchases.map((p) => p.orderId)]);
  for (const row of result.OrderItems) assert.ok(purchases.some((p) => p.itemId === row.id && p.orderId === row.orderId));
  result.Payments = await get("Payments", '"orderId"=ANY($1::uuid[])', [purchases.map((p) => p.orderId)]);
  for (const row of result.Payments) {
    assert.equal(row.metadata?.integrationRunId, manifest.runId);
    assert.ok(purchases.some((p) => p.paymentId === row.id && p.orderId === row.orderId && p.userId === row.userId));
  }
  result.Receipts = await get("Receipts", '"paymentId"=ANY($1::uuid[])', [purchases.map((p) => p.paymentId)]);
  result.UserSubscriptions = await get("UserSubscriptions", '"userId"=ANY($1::uuid[])', [users]);
  for (const row of result.UserSubscriptions) assert.ok(result.MembershipPlans.some((plan) => plan.id === row.planId));
  result.SubscriptionGroups = await get("SubscriptionGroups", '"ownerUserId"=ANY($1::uuid[])', [users]);
  for (const row of result.SubscriptionGroups) assert.ok(purchases.some((p) => p.itemId === row.orderItemId));
  result.SubscriptionGroupMembers = await get("SubscriptionGroupMembers", '"groupId"=ANY($1::uuid[])', [result.SubscriptionGroups.map((g) => g.id)]);
  for (const row of result.SubscriptionGroupMembers) assert.ok(row.userId == null || users.includes(row.userId));
  result.SubscriptionHistories = await get("SubscriptionHistories", '"userId"=ANY($1::uuid[])', [users]);
  result.SubscriptionEvents = await get("SubscriptionEvents", '"userId"=ANY($1::uuid[])', [users]);
  result.PaymentWebhookEvents = await get("PaymentWebhookEvents", 'provider=\'mercadopago_checkout\' AND "providerPaymentId"=ANY($1::text[])', [purchases.map((p) => p.providerId)]);
  return result;
}

// Nunca TRUNCATE, CASCADE ni eliminacion por patrones de texto.
export async function cleanupFixtures(client, manifest) {
  validateManifest(manifest, manifest.databaseId);
  await client.query("BEGIN");
  try {
    const owned = await ownedRows(client, manifest);
    const { rows: references } = await client.query(`
      SELECT cn.nspname AS child_schema, cr.relname AS child_table, ca.attname AS child_column,
        pr.relname AS parent_table, pa.attname AS parent_column, cardinality(c.conkey) AS key_count
      FROM pg_constraint c JOIN pg_class pr ON pr.oid=c.confrelid JOIN pg_namespace pn ON pn.oid=pr.relnamespace
        JOIN pg_class cr ON cr.oid=c.conrelid JOIN pg_namespace cn ON cn.oid=cr.relnamespace
        JOIN pg_attribute ca ON ca.attrelid=c.conrelid AND ca.attnum=c.conkey[1]
        JOIN pg_attribute pa ON pa.attrelid=c.confrelid AND pa.attnum=c.confkey[1]
      WHERE c.contype='f' AND pn.nspname='core' AND pr.relname=ANY($1::text[])`, [TABLES]);
    for (const fk of references) {
      const parentIds = owned[fk.parent_table].map((row) => row.id);
      if (!parentIds.length) continue;
      assert.equal(fk.key_count, 1, "Cleanup requires review of composite foreign keys");
      assert.equal(fk.parent_column, "id", "Cleanup requires review of non-ID foreign keys");
      const allowed = fk.child_schema === "core" ? (owned[fk.child_table] || []).map((row) => row.id) : [];
      const table = `${quoteIdentifier(fk.child_schema)}.${quoteIdentifier(fk.child_table)}`;
      const filter = allowed.length ? " AND NOT (id=ANY($2::uuid[]))" : "";
      const { rows: [{ count }] } = await client.query(
        `SELECT count(*)::int AS count FROM ${table} WHERE ${quoteIdentifier(fk.child_column)}=ANY($1::uuid[])${filter}`,
        allowed.length ? [parentIds, allowed] : [parentIds]
      );
      assert.equal(count, 0, "Cleanup blocked by a reference outside the manifest scope");
    }
    await client.query('UPDATE core."Payments" SET "subscriptionId"=NULL, "groupId"=NULL WHERE id=ANY($1::uuid[])', [owned.Payments.map((r) => r.id)]);
    for (const table of ["SubscriptionEvents", "SubscriptionHistories", "PaymentWebhookEvents", "Receipts",
      "UserSubscriptions", "SubscriptionGroupMembers", "SubscriptionGroups", "Payments", "OrderItems",
      "Orders", "sessions", "MembershipPlans", "Users"]) {
      await client.query(`DELETE FROM core.${quoteIdentifier(table)} WHERE id=ANY($1::uuid[])`, [owned[table].map((r) => r.id)]);
    }
    const remaining = await ownedRows(client, manifest);
    assert.ok(Object.values(remaining).every((rows) => rows.length === 0), "Cleanup left fixture rows");
    await client.query("COMMIT");
    return { removed: Object.fromEntries(Object.entries(owned).map(([table, rows]) => [table, rows.length])) };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}
