import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { WebhookSignatureValidator } from "mercadopago";
import { assertFixtureIds, diagnoseIntegrationError, loadRealBackend, openClient, preflight, safeError, validateTarget } from "./mercadoPagoPostgresSupport.js";

// No se puede usar como CLI general ni importar desde el servidor.
if (!process.send || process.env.TITANIUM_PG_INTEGRATION_WORKER !== "isolated-v1") {
  throw new Error("Integration worker requires the authorized parent harness");
}
let backend;
let config;
let secrets;
let runId;
let completed = false;
const send = (value) => new Promise((resolve, reject) => process.send(value, (error) => error ? reject(error) : resolve()));
process.on("disconnect", () => { if (!completed) process.exit(1); });
// No imprime objetos de Sequelize/SDK, JWT ni parametros de consultas.
console.error = () => {};

async function verifyFixture(fixture) {
  assertFixtureIds(fixture, runId);
  const order = await backend.models.Order.findByPk(fixture.orderId);
  const payment = await backend.models.Payment.findByPk(fixture.paymentId);
  assert.equal(order?.metadata?.integrationRunId, runId);
  assert.equal(order?.orderNumber, fixture.orderNumber);
  assert.equal(order?.userId, fixture.userId);
  assert.equal(payment?.metadata?.integrationRunId, runId);
  assert.equal(payment?.orderId, fixture.orderId);
  assert.equal(payment?.userId, fixture.userId);
}
function providerApi(fixture) {
  const provider = {
    id: fixture.providerId, status: "approved", status_detail: "accredited", live_mode: true,
    collector_id: 999000123, transaction_amount: fixture.amount, currency_id: "MXN",
    external_reference: fixture.orderId, preference_id: `pgit-${runId}-${fixture.itemId}`,
    metadata: { order_id: fixture.orderId, payment_id: fixture.paymentId, user_id: fixture.userId },
  };
  return {
    async getPayment({ id }) { assert.equal(String(id), fixture.providerId); return structuredClone(provider); },
    async getSeller() { return { id: 999000123, tags: ["normal", "test_user"] }; },
    validateSignature: (options) => WebhookSignatureValidator.validate(options),
    createPreference() { throw new Error("Provider purchases forbidden"); },
  };
}

async function execute(job) {
  const { fixture } = job;
  await verifyFixture(fixture);
  const api = providerApi(fixture);
  const hookName = `PGIT-${runId}`;
  let model;
  if (job.failAt === "activation") model = backend.models.UserSubscription;
  if (job.failAt === "receipt") model = backend.models.Receipt;
  if (model) {
    model.addHook("afterCreate", hookName, (row, options) => {
      const belongs = job.failAt === "activation" ? row.orderItemId === fixture.itemId : row.paymentId === fixture.paymentId;
      if (belongs) {
        assert.ok(options.transaction, "Injected failure must occur after a real transactional INSERT");
        throw Object.assign(new Error("Intentional integration failure after INSERT"), { code: "PGIT_INJECTED_FAILURE" });
      }
    });
  }
  try {
    switch (job.action) {
      case "confirm": {
        await backend.payments.confirmPaidPayment({ paymentId: fixture.paymentId,
          providerPaymentId: fixture.providerId, providerStatus: "approved" });
        return { action: "confirmed" };
      }
      case "explicit-period": {
        const result = await backend.memberships.createOrRenewUserSubscription({ userId: fixture.userId,
          planId: fixture.planId, startsAt: job.startsAt, endsAt: job.endsAt,
          notes: `PGIT/${runId}/explicit` });
        return { action: "period_created", subscriptionId: result.subscription.id };
      }
      case "reconcile": {
        const result = await backend.checkout.reconcileMercadoPagoPayment({ orderId: fixture.orderId,
          providerPaymentId: fixture.providerId, dryRun: false, mercadoPagoApi: api,
          operatorToken: job.operatorToken, requestedBy: job.operatorId,
          approval: { orderId: fixture.orderId, databaseId: config.databaseId } });
        return { action: result.action, attemptId: result.attemptId };
      }
      case "preview": {
        const result = await backend.checkout.reconcileMercadoPagoPayment({ orderId: fixture.orderId,
          providerPaymentId: fixture.providerId, mercadoPagoApi: api });
        return { action: "preview", dryRun: result.dryRun };
      }
      case "webhook": {
        const ts = String(Math.floor(Date.now() / 1000));
        const requestId = `pgit-${runId}-${randomUUID()}`;
        const manifest = `id:${fixture.providerId};request-id:${requestId};ts:${ts};`;
        const hash = createHmac("sha256", secrets.webhook).update(manifest).digest("hex");
        const result = await backend.checkout.processMercadoPagoWebhook({
          headers: { "x-signature": `ts=${ts},v1=${hash}`, "x-request-id": requestId },
          query: { "data.id": fixture.providerId, type: "payment" },
          body: { type: "payment", action: "payment.updated", data: { id: fixture.providerId } }, mercadoPagoApi: api,
        });
        return { action: result.result?.action || "processed" };
      }
      default: throw new Error("Unknown integration job");
    }
  } finally { model?.removeHook("afterCreate", hookName); }
}

process.on("message", async (message) => {
  try {
    if (message.type === "initialize") {
      assert.ok(!backend);
      runId = message.runId;
      secrets = message.secrets;
      config = validateTarget(message.target, message.connectionString);
      const client = await openClient(config, message.name + "-preflight");
      try { await preflight(client, config); } finally { await client.end(); }
      backend = await loadRealBackend(config, message.name, secrets);
      const [[{ pid }]] = await backend.sequelize.query("SELECT pg_backend_pid() AS pid");
      await send({ type: "ready", pid });
    } else if (message.type === "execute") {
      assert.ok(backend && !completed);
      completed = true;
      let outcome;
      try { outcome = { ok: true, result: await execute(message.job) }; }
      catch (error) { outcome = { ok: false, error: safeError(diagnoseIntegrationError(error, "worker")) }; }
      await backend.close();
      await send({ type: "completed", ...outcome });
      process.disconnect();
    } else throw new Error("Invalid worker message");
  } catch (error) {
    await backend?.close().catch(() => {});
    await send({ type: "fatal", error: safeError(error) }).catch(() => {});
    process.exit(1);
  }
});
