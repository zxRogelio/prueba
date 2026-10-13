import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import * as crypto from "node:crypto";
import * as mercadoPago from "mercadopago";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { calculateInclusiveSubscriptionPeriod, addSubscriptionDays } from "../utils/subscriptionDates.js";
import { parseArgs } from "node:util";

const ADMIN_ID = "5f9bd727-133f-4a5e-b383-3395e59fd548";

// Carga los servicios reales con modelos en memoria. Nunca importa config/sequelize.js.
async function fixture({ annual = false, parallel = false } = {}) {
  const databaseConfig = { host: "test.invalid", port: 5432, database: "isolated", username: "test_only" };
  const databaseId = crypto.createHash("sha256").update(JSON.stringify({ ...databaseConfig, schema: "core" })).digest("hex");
  const env = {
    MERCADOPAGO_ACCESS_TOKEN: "TEST-private-token",
    MERCADOPAGO_WEBHOOK_SECRET: "private-webhook-secret",
    JWT_SECRET: "isolated-session-signing-key-only-for-tests",
    MERCADOPAGO_EXPECTED_SELLER_ID: "3558098908",
    MERCADOPAGO_EXPECTED_LIVE_MODE: "false",
    MERCADOPAGO_RECONCILIATION_ENVIRONMENT: "test",
    MERCADOPAGO_RECONCILIATION_DATABASE_ID: databaseId,
  };
  const logs = [];
  const context = vm.createContext({ process: { env }, console: { ...console, error: (...args) => logs.push(args) }, Date, setTimeout });
  const tables = {};
  let writes = 0;
  const models = {};
  const lockEvents = [];
  const lockQueues = new Map();
  async function acquire(key, transaction) {
    if (transaction.held.has(key)) return;
    const previous = lockQueues.get(key) || Promise.resolve();
    let release;
    const next = new Promise((resolve) => { release = resolve; });
    lockQueues.set(key, previous.then(() => next));
    await previous;
    transaction.held.add(key);
    transaction.releases.push(release);
    lockEvents.push({ key, transactionId: transaction.id });
  }
  const assertWritable = (options) => {
    if (options?.transaction?.options.readOnly) throw new Error("Write attempted in read-only transaction");
  };
  const matches = (row, where = {}) => Reflect.ownKeys(where).every((key) => {
    const expected = where[key];
    const actual = row[key];
    if (expected && typeof expected === "object") {
      return Reflect.ownKeys(expected).every((op) => {
        if (op === Op.ne) return actual !== expected[op];
        if (op === Op.in) return expected[op].includes(actual);
        if (op === Op.gte) return actual >= expected[op];
        if (op === Op.lte) return actual <= expected[op];
        throw new Error("Unsupported query operator");
      });
    }
    return actual === expected;
  });
  const modelNames = [
    "Cart", "CartItem", "InventoryMovement", "MembershipPlan", "Order", "OrderItem",
    "Payment", "PaymentRefund", "PaymentRefundItem", "PaymentWebhookEvent", "Receipt",
    "SubscriptionGroup", "SubscriptionGroupMember", "User", "UserSubscription", "Session",
  ];
  for (const name of modelNames) {
    tables[name] = [];
    const wrap = (values) => ({
      ...values,
      async update(next, options) { assertWritable(options); writes++; Object.assign(this, next); return this; },
      get(field) { return this[field]; },
      setDataValue(field, value) { this[field] = value; },
    });
    models[name] = {
      async create(values, options) {
        assertWritable(options);
        writes++;
        if (name === "PaymentWebhookEvent" && tables[name].some(
          (row) => row.providerEventId === values.providerEventId
        )) throw Object.assign(new Error("duplicate event"), { name: "SequelizeUniqueConstraintError" });
        const row = wrap({ id: crypto.randomUUID(), createdAt: new Date(), retryCount: 0, ...values });
        tables[name].push(row);
        return row;
      },
      async findAll({ where, order = [], transaction, lock, include = [] } = {}) {
        if (lock && transaction?.options.readOnly) throw new Error("Row lock in read-only transaction");
        const rows = tables[name].filter((row) => matches(row, where) && include.every((relation) => {
          if (name !== "SubscriptionGroupMember" || relation.as !== "group") return true;
          const group = tables.SubscriptionGroup.find((g) => g.id === row.groupId);
          return group && matches(group, relation.where);
        }));
        return rows.sort((a, b) => {
          for (const [field, direction] of order) {
            if (a[field] === b[field]) continue;
            return (a[field] > b[field] ? 1 : -1) * (direction === "DESC" ? -1 : 1);
          }
          return 0;
        });
      },
      async findOne(options) { return (await this.findAll(options))[0] || null; },
      async findByPk(id, options = {}) {
        if (options.lock && options.transaction?.options.readOnly) throw new Error("Row lock in read-only transaction");
        if (name === "User" && options.lock) await acquire(`user:${id}`, options.transaction);
        return tables[name].find((row) => row.id === id) || null;
      },
    };
    models[name].seed = (values) => {
      const row = wrap(values);
      tables[name].push(row);
      return row;
    };
  }
  let queue = Promise.resolve();
  let transactions = 0;
  let readOnlyTransactions = 0;
  const sequelize = {
    config: databaseConfig,
    async query(sql, { transaction, replacements } = {}) {
      assert.ok(transaction, "SQL requires a mocked transaction");
      if (sql === "SHOW transaction_isolation") {
        return [{ transaction_isolation: (transaction.options.isolationLevel || "READ COMMITTED").toLowerCase() }];
      }
      if (sql === "SET TRANSACTION READ ONLY") {
        transaction.options.readOnly = true;
        return [];
      }
      assert.match(sql, /^SELECT pg_advisory_xact_lock/);
      assertWritable({ transaction });
      await acquire(replacements.key, transaction);
      return [];
    },
    transaction(options, callback) {
      if (typeof options === "function") { callback = options; options = {}; }
      const execute = async () => {
        if (options.readOnly) readOnlyTransactions++; else transactions++;
        const t = { id: crypto.randomUUID(), options, LOCK: { UPDATE: "UPDATE" }, held: new Set(), releases: [] };
        const snapshot = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [
          name, rows.map((row) => [row, { ...row }]),
        ]));
        try { return await callback(t); }
        catch (error) {
          for (const [name, rows] of Object.entries(snapshot)) {
            tables[name] = rows.map(([row, values]) => {
              for (const key of Object.keys(row)) delete row[key];
              Object.assign(row, values);
              return row;
            });
          }
          throw error;
        } finally { for (const release of t.releases) release(); }
      };
      if (parallel) return execute();
      const run = queue.then(execute);
      queue = run.catch(() => {});
      return run;
    },
  };
  const unexpected = () => { throw new Error("Unexpected external dependency"); };
  const stubs = {
    "../config/sequelize.js": { sequelize },
    "../models/index.js": models,
    "./cartService.js": { markCartConverted: unexpected },
    "./orderService.js": { createOrder: unexpected, getOrderWithDetails: unexpected },
    "./inventoryService.js": {
      recordProductSalesForOrder: async () => ({}), recordProductReturnFromOrderItem: unexpected,
    },
    "./inventoryReservationService.js": {
      createInventoryReservationsForOrder: unexpected,
      consumeInventoryReservationsForOrder: async () => ({}),
      releaseInventoryReservationsForOrder: unexpected,
    },
    "./mercadoPagoRefundService.js": {
      createMercadoPagoRefundApi: unexpected, mapMercadoPagoRefundStatus: unexpected,
      normalizeMercadoPagoRefundResponse: unexpected,
    },
    "./subscriptionEventService.js": {
      recordMembershipActivationEvents: async () => [],
      recordSubscriptionCancellation: unexpected, recordSubscriptionRefundEventsForPayment: unexpected,
    },
    "./subscriptionHistoryService.js": { createOrUpdateSubscriptionHistory: async () => ({}) },
    "node:crypto": crypto, sequelize: { Op }, mercadopago: mercadoPago, jsonwebtoken: { default: jwt },
  };
  const realFiles = new Set([
    "mercadoPagoCheckoutService.js", "paymentService.js", "membershipActivationService.js",
    "receiptService.js", "stateTransitionService.js",
    "mercadoPagoReconciliationAuthorization.js", "../utils/subscriptionDates.js",
  ]);
  const cache = new Map();
  async function load(name) {
    if (cache.has(name)) return cache.get(name);
    const source = await readFile(new URL("../services/" + name, import.meta.url), "utf8");
    const module = new vm.SourceTextModule(source, { context, identifier: name });
    cache.set(name, module);
    await module.link(async (specifier) => {
      if (specifier.startsWith("./") && realFiles.has(specifier.slice(2))) {
        return load(specifier.slice(2));
      }
      if (specifier === "../utils/subscriptionDates.js") return load(specifier);
      const values = stubs[specifier];
      assert.ok(values, "No stub for " + specifier);
      return new vm.SyntheticModule(Object.keys(values), function () {
        for (const [key, value] of Object.entries(values)) this.setExport(key, value);
      }, { context });
    });
    return module;
  }
  const module = await load("mercadoPagoCheckoutService.js");
  await module.evaluate();
  const service = module.namespace;
  const operatorToken = jwt.sign({ id: ADMIN_ID }, env.JWT_SECRET, { expiresIn: "1h" });
  models.User.seed({ id: ADMIN_ID, role: "administrador", isVerified: true, isPendingApproval: false, mustChangePassword: false });
  models.User.seed({ id: "user-1", email: "client@example.invalid", role: "cliente", isVerified: true });
  models.Session.seed({ id: "session-1", userId: ADMIN_ID, token: operatorToken, revoked: false, expiresAt: new Date(Date.now() + 3600000) });
  const order = models.Order.seed({
    id: "order-1", orderNumber: "ORD-TEST", userId: "user-1",
    status: "pending_payment", total: "440.00", currency: "MXN", channel: "online",
  });
  const payment = models.Payment.seed({
    id: "payment-1", userId: "user-1", orderId: order.id, status: "pending",
    provider: "mercadopago_checkout", source: "online_checkout", amount: "440.00",
    currency: "MXN", providerPreferenceId: "pref-1", providerPaymentId: null, metadata: {},
  });
  models.MembershipPlan.seed({ id: "monthly", isActive: true, durationDays: 30 });
  models.OrderItem.seed({
    id: "item-1", orderId: order.id, itemType: "membership", membershipPlanId: "monthly",
  });
  const existingAnnual = annual ? models.UserSubscription.seed({
    id: "annual-1", userId: "user-1", planId: "annual", status: "active",
    startsAt: "2098-06-21", endsAt: "2099-06-21", createdAt: new Date(),
  }) : null;
  const providerPayment = {
    id: 183880156306, status: "approved", status_detail: "accredited", collector_id: 3558098908, live_mode: false,
    transaction_amount: 440, currency_id: "MXN", external_reference: order.id,
    preference_id: "pref-1", metadata: { order_id: order.id, payment_id: payment.id },
  };
  let providerCalls = 0;
  const api = {
    async getPayment() { providerCalls++; return providerPayment; },
    async getSeller() { return { id: 3558098908 }; },
    validateSignature: (options) => mercadoPago.WebhookSignatureValidator.validate(options),
  };
  function webhook({ dataId = String(providerPayment.id), requestId = "request-1", query, body, secret } = {}) {
    const ts = String(Math.floor(Date.now() / 1000));
    const signedId = query === undefined ? dataId : query["data.id"] ?? query.data_id;
    const manifest = (signedId ? "id:" + String(signedId).toLowerCase() + ";" : "") +
      "request-id:" + requestId + ";ts:" + ts + ";";
    const hash = crypto.createHmac("sha256", secret || env.MERCADOPAGO_WEBHOOK_SECRET)
      .update(manifest).digest("hex");
    return {
      headers: { "X-Signature": "ts=" + ts + ",v1=" + hash, "X-Request-Id": requestId },
      query: query || { "data.id": dataId, type: "payment" },
      body: body || { type: "payment", data: { id: dataId } }, mercadoPagoApi: api,
    };
  }
  writes = 0;
  return {
    service, api, tables, models, payment, order, providerPayment, existingAnnual, webhook,
    env, operatorToken, databaseId, logs, lockEvents, sequelize,
    membershipService: cache.get("membershipActivationService.js").namespace,
    writes: () => writes, transactions: () => transactions, providerCalls: () => providerCalls,
    readOnlyTransactions: () => readOnlyTransactions,
    reconcile: (options = {}) => service.reconcileMercadoPagoPayment({
      orderId: order.id, providerPaymentId: String(providerPayment.id), mercadoPagoApi: api,
      ...(options.dryRun === false ? { operatorToken, approval: { orderId: order.id, databaseId } } : {}),
      ...options,
    }),
  };
}

test("firma invalida: no consulta al proveedor ni confirma", async () => {
  const f = await fixture();
  await assert.rejects(f.service.processMercadoPagoWebhook(f.webhook({ secret: "wrong" })), { statusCode: 401 });
  assert.equal(f.providerCalls(), 0);
  assert.equal(f.payment.status, "pending");
  assert.equal(f.tables.PaymentWebhookEvent[0].errorMessage, "SignatureMismatch");
});

test("firma usa el data.id de URL en minusculas y encabezados sin distinguir mayusculas", async () => {
  const f = await fixture();
  f.providerPayment.id = "ABC123";
  await f.service.processMercadoPagoWebhook(f.webhook({ dataId: "ABC123" }));
  assert.equal(f.payment.status, "paid");
});

test("sin data.id en URL, no incorpora body.id ni query.id al manifiesto firmado", async () => {
  const f = await fixture();
  await f.service.processMercadoPagoWebhook(f.webhook({ query: { id: String(f.providerPayment.id), type: "payment" } }));
  assert.equal(f.payment.status, "paid");
});

test("approved confirma orden, membresia y recibo usando servicios reales; duplicados no duplican", async () => {
  const f = await fixture();
  await f.service.processMercadoPagoWebhook(f.webhook());
  assert.equal(f.payment.status, "paid");
  assert.equal(f.order.status, "paid");
  assert.equal(f.tables.UserSubscription.length, 1);
  assert.equal(f.tables.Receipt.length, 1);
  const duplicate = await f.service.processMercadoPagoWebhook(f.webhook());
  assert.equal(duplicate.duplicate, true);
  await f.service.processMercadoPagoWebhook(f.webhook({ requestId: "request-2" }));
  assert.equal(f.tables.UserSubscription.length, 1);
  assert.equal(f.tables.Receipt.length, 1);
});

test("un duplicado debe validar su firma sin corromper el evento procesado", async () => {
  const f = await fixture();
  await f.service.processMercadoPagoWebhook(f.webhook());
  await assert.rejects(f.service.processMercadoPagoWebhook(f.webhook({ secret: "wrong" })), { statusCode: 401 });
  assert.equal(f.tables.PaymentWebhookEvent[0].processingStatus, "processed");
  assert.equal(f.tables.PaymentWebhookEvent[0].signatureValid, true);
});

test("payments sin preference_id conservan la preferencia local", async () => {
  const f = await fixture();
  delete f.providerPayment.preference_id;
  await f.reconcile({ dryRun: false, requestedBy: ADMIN_ID });
  assert.equal(f.payment.providerPreferenceId, "pref-1");
  await f.service.processMercadoPagoWebhook(f.webhook());
  assert.equal(f.payment.providerPreferenceId, "pref-1");
  assert.equal(f.tables.Receipt.length, 1);
});

test("timestamps vencidos o futuros y headers ausentes se rechazan", async () => {
  for (const header of [
    "ts=" + (Math.floor(Date.now() / 1000) - 600) + ",v1=bad",
    "ts=" + (Math.floor(Date.now() / 1000) + 600) + ",v1=bad",
    "v1=bad", null,
  ]) {
    const f = await fixture();
    const request = f.webhook();
    request.headers["X-Signature"] = header;
    await assert.rejects(f.service.processMercadoPagoWebhook(request), { statusCode: 401 });
    assert.equal(f.providerCalls(), 0);
  }
});

test("alterar x-request-id invalida la firma; timestamps en milisegundos siguen siendo validos", async () => {
  const f = await fixture();
  const request = f.webhook();
  request.headers["X-Request-Id"] = "tampered";
  await assert.rejects(f.service.processMercadoPagoWebhook(request), { statusCode: 401 });
  assert.equal(f.providerCalls(), 0);
  const ts = String(Date.now());
  const hash = crypto.createHmac("sha256", "private-webhook-secret")
    .update("id:183880156306;request-id:request-1;ts:" + ts + ";").digest("hex");
  const valid = f.webhook();
  valid.headers["X-Signature"] = "ts=" + ts + ",v1=" + hash;
  await f.service.processMercadoPagoWebhook(valid);
  assert.equal(f.payment.status, "paid");
});

test("error de proveedor preserva causa sanitizada y permite reintento", async () => {
  const f = await fixture();
  const getPayment = f.api.getPayment;
  f.api.getPayment = async () => { throw Object.assign(
    new Error("internal_error Bearer TEST-private-token v1=abcdef"), { status: 500 }
  ); };
  await assert.rejects(f.service.processMercadoPagoWebhook(f.webhook()), (error) => {
    assert.equal(error.statusCode, 502);
    const diagnostics = f.service.getMercadoPagoErrorDiagnostics(error);
    assert.equal(diagnostics.stage, "provider_lookup");
    assert.match(diagnostics.message, /internal_error/);
    assert.doesNotMatch(diagnostics.message, /TEST-private-token|abcdef/);
    return true;
  });
  assert.equal(f.payment.status, "pending");
  assert.equal(f.tables.PaymentWebhookEvent[0].retryCount, 1);
  f.api.getPayment = getPayment;
  await f.service.processMercadoPagoWebhook(f.webhook());
  assert.equal(f.payment.status, "paid");
});

test("fallo de recibo revierte confirmacion y activacion; conserva causa del 500", async () => {
  const f = await fixture();
  const createReceipt = f.models.Receipt.create;
  f.models.Receipt.create = async () => { throw Object.assign(
    new Error("required receipt field"), { original: { code: "23502" } }
  ); };
  await assert.rejects(f.service.processMercadoPagoWebhook(f.webhook()), (error) => {
    assert.equal(error.statusCode, 500);
    assert.equal(f.service.getMercadoPagoErrorDiagnostics(error).code, "23502");
    assert.equal(f.service.getMercadoPagoErrorDiagnostics(error).stage, "local_confirmation");
    return true;
  });
  assert.equal(f.payment.status, "pending");
  assert.equal(f.order.status, "pending_payment");
  assert.equal(f.tables.UserSubscription.length, 0);
  f.models.Receipt.create = createReceipt;
  await f.service.processMercadoPagoWebhook(f.webhook());
  assert.equal(f.tables.UserSubscription.length, 1);
  assert.equal(f.tables.Receipt.length, 1);
});

test("vista previa verifica vendedor y operacion en transaccion read-only sin escrituras", async () => {
  const f = await fixture();
  const preview = await f.reconcile();
  assert.equal(preview.dryRun, true);
  assert.equal(preview.localStatus, "pending");
  assert.equal(f.writes(), 0);
  assert.equal(f.transactions(), 0);
  assert.equal(f.readOnlyTransactions(), 1);
  assert.equal(f.tables.PaymentWebhookEvent.length, 0);
});

test("reconciliacion rechaza vendedor, ID, referencias, monto, moneda o estado incorrectos", async () => {
  for (const mutation of [
    (f) => { f.api.getSeller = async () => ({ id: "another-seller" }); },
    (f) => { f.providerPayment.id = "wrong-id"; },
    (f) => { f.providerPayment.external_reference = "another-order"; },
    (f) => { f.providerPayment.metadata.payment_id = "another-payment"; },
    (f) => { f.providerPayment.transaction_amount = 1; },
    (f) => { f.providerPayment.currency_id = "USD"; },
    (f) => { f.providerPayment.status = "pending"; },
    (f) => { f.payment.status = "refunded"; },
    (f) => { f.payment.amount = "439.00"; },
    (f) => { f.order.currency = "USD"; },
    (f) => { f.payment.currency = "USD"; },
    (f) => { f.payment.userId = "another-user"; },
    (f) => { f.providerPayment.live_mode = true; },
    (f) => { delete f.providerPayment.live_mode; },
    (f) => { delete f.providerPayment.external_reference; },
    (f) => { f.providerPayment.transaction_amount = 440.001; },
    (f) => { f.payment.providerPaymentId = "183880156307"; },
  ]) {
    const f = await fixture();
    mutation(f);
    await assert.rejects(f.reconcile({ providerPaymentId: "183880156306", dryRun: false, requestedBy: ADMIN_ID }));
    assert.equal(f.writes(), 0);
  }
});

test("aplicar requiere sesion; reintentos conservan recibo, membresia e historial", async () => {
  const f = await fixture();
  await assert.rejects(f.reconcile({ dryRun: false, operatorToken: null }), { statusCode: 401 });
  await Promise.all([
    f.reconcile({ dryRun: false, requestedBy: ADMIN_ID }),
    f.reconcile({ dryRun: false, requestedBy: ADMIN_ID }),
  ]);
  assert.equal(f.payment.status, "paid");
  assert.equal(f.tables.UserSubscription.length, 1);
  assert.equal(f.tables.Receipt.length, 1);
  assert.equal(f.payment.metadata.reconciliation.source, "provider_api_reconciliation");
  assert.equal(f.payment.metadata.reconciliationHistory.length, 2);
  assert.equal(f.payment.metadata.reconciliationHistory[0].outcome, "confirmed");
  assert.equal(f.payment.metadata.reconciliationHistory[1].outcome, "rechecked");
  assert.notEqual(f.payment.metadata.reconciliationHistory[0].attemptId, f.payment.metadata.reconciliationHistory[1].attemptId);
  assert.equal(f.tables.Receipt[0].createdBy, ADMIN_ID);
  assert.equal(f.tables.UserSubscription[0].createdBy, ADMIN_ID);
  await assert.rejects(f.reconcile({ orderId: "another-order", dryRun: false, requestedBy: ADMIN_ID }));
});

test("mensual se programa despues del vencimiento anual, sin reemplazar la anual", async () => {
  const f = await fixture({ annual: true });
  const originalAnnual = { ...f.existingAnnual };
  await f.reconcile({ dryRun: false, requestedBy: ADMIN_ID });
  assert.deepEqual(f.existingAnnual, originalAnnual);
  const monthly = f.tables.UserSubscription.find((row) => row.planId === "monthly");
  assert.equal(monthly.startsAt, "2099-06-22");
  assert.equal(monthly.endsAt, "2099-07-21");
  assert.equal(monthly.orderItemId, "item-1");
});

test("otra operacion no reemplaza la operacion que ya confirmo el pago", async () => {
  const f = await fixture();
  await f.reconcile({ dryRun: false, requestedBy: ADMIN_ID });
  f.providerPayment.id = 183880156307;
  await assert.rejects(f.reconcile({ dryRun: false, requestedBy: ADMIN_ID }), { statusCode: 409 });
  assert.equal(f.payment.providerPaymentId, "183880156306");
  assert.equal(f.tables.Receipt.length, 1);
});

test("controlador registra solo diagnosticos sanitizados y responde con error generico", async () => {
  const f = await fixture();
  const logs = [];
  const context = vm.createContext({ console: { error: (...args) => logs.push(args) } });
  const original = Object.assign(new Error("internal_error TEST-private-token private-webhook-secret"), {
    status: 500, config: { headers: { Authorization: "Bearer TEST-private-token" } },
    sql: "private-query", original: { code: "23502" },
  });
  const error = Object.assign(new Error("generic"), {
    cause: original, statusCode: 500, mercadoPagoStage: "local_confirmation",
  });
  const values = {
    getMercadoPagoErrorDiagnostics: f.service.getMercadoPagoErrorDiagnostics,
    createMercadoPagoCheckout: async () => { throw error; },
    processMercadoPagoWebhook: async () => { throw error; },
  };
  const dependency = new vm.SyntheticModule(Object.keys(values), function () {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context });
  const source = await readFile(new URL("../controllers/checkoutController.js", import.meta.url), "utf8");
  const module = new vm.SourceTextModule(source, { context });
  await module.link(() => dependency);
  await module.evaluate();
  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await module.namespace.receiveMercadoPagoWebhook({ headers: {}, query: {}, body: {} }, response);
  assert.equal(response.code, 500);
  assert.equal(response.body.error, "Error procesando webhook de Mercado Pago");
  assert.equal(logs[0][1].code, "23502");
  assert.match(JSON.stringify(logs), /internal_error/);
  assert.doesNotMatch(JSON.stringify(logs), /TEST-private-token|private-webhook-secret|private-query|Authorization/);
});

test("politica ausente, destino equivocado y modos incoherentes bloquean antes de consultar proveedor", async () => {
  for (const mutate of [
    (f) => { delete f.env.MERCADOPAGO_EXPECTED_SELLER_ID; },
    (f) => { f.env.MERCADOPAGO_RECONCILIATION_DATABASE_ID = "a".repeat(64); },
    (f) => { f.env.MERCADOPAGO_RECONCILIATION_ENVIRONMENT = "production"; },
    (f) => { f.env.MERCADOPAGO_EXPECTED_LIVE_MODE = "yes"; },
  ]) {
    const f = await fixture(); mutate(f);
    await assert.rejects(f.reconcile());
    assert.equal(f.writes(), 0); assert.equal(f.providerCalls(), 0);
  }
});

test("token y pago de otro vendedor se rechazan aunque coincidan entre ellos", async () => {
  const f = await fixture();
  f.providerPayment.collector_id = 123;
  f.api.getSeller = async () => ({ id: 123 });
  await assert.rejects(f.reconcile(), { statusCode: 409 });
  assert.equal(f.writes(), 0);
});

test("aplicar exige confirmar orden y base exactas", async () => {
  for (const approval of [null, {}, { orderId: "other", databaseId: "bad" }]) {
    const f = await fixture();
    await assert.rejects(f.reconcile({ dryRun: false, approval }), { statusCode: 403 });
    assert.equal(f.writes(), 0); assert.equal(f.providerCalls(), 0);
  }
});

test("actor arbitrario, sesiones revocadas y administradores no habilitados no autorizan", async () => {
  for (const mutate of [
    (f) => { f.tables.Session[0].revoked = true; },
    (f) => { f.tables.Session[0].expiresAt = new Date(0); },
    (f) => { f.tables.Session[0].userId = "other"; },
    (f) => { f.tables.User[0].role = "cliente"; },
    (f) => { f.tables.User[0].isVerified = false; },
    (f) => { f.tables.User[0].isPendingApproval = true; },
    (f) => { f.tables.User[0].mustChangePassword = true; },
  ]) {
    const f = await fixture(); mutate(f);
    await assert.rejects(f.reconcile({ dryRun: false }));
    assert.equal(f.writes(), 0); assert.equal(f.providerCalls(), 0);
  }
  const f = await fixture();
  await assert.rejects(f.reconcile({ dryRun: false, requestedBy: "invented-admin" }), { statusCode: 403 });
  for (const token of ["invalid", jwt.sign({ id: ADMIN_ID }, "wrong-key"),
    jwt.sign({ id: ADMIN_ID }, f.env.JWT_SECRET),
    jwt.sign({ id: ADMIN_ID }, f.env.JWT_SECRET, { expiresIn: -1 }),
    jwt.sign({ id: ADMIN_ID }, f.env.JWT_SECRET, { algorithm: "HS512", expiresIn: "1h" })]) {
    await assert.rejects(f.reconcile({ dryRun: false, operatorToken: token }), { statusCode: 401 });
  }
  assert.equal(f.writes(), 0);
});

test("sesion revocada despues de vista previa se verifica nuevamente bajo transaccion", async () => {
  const f = await fixture();
  const getPayment = f.api.getPayment;
  f.api.getPayment = async () => { f.tables.Session[0].revoked = true; return getPayment(); };
  await assert.rejects(f.reconcile({ dryRun: false }), { statusCode: 401 });
  assert.equal(f.writes(), 0);
});

test("estado del proveedor se consulta nuevamente tras adquirir bloqueo", async () => {
  const f = await fixture();
  let calls = 0;
  f.api.getPayment = async () => ({ ...f.providerPayment, status: ++calls === 1 ? "approved" : "refunded" });
  await assert.rejects(f.reconcile({ dryRun: false }), { statusCode: 409 });
  assert.equal(calls, 2); assert.equal(f.writes(), 0); assert.equal(f.payment.status, "pending");
});

test("vista previa muestra anual y mensual prevista sin tokens, correo ni escrituras", async () => {
  const f = await fixture({ annual: true });
  const preview = await f.reconcile();
  assert.equal(preview.memberships.existing[0].id, f.existingAnnual.id);
  assert.equal(preview.memberships.planned[0].startsAt, "2099-06-22");
  assert.equal(preview.memberships.planned[0].endsAt, "2099-07-21");
  assert.equal(preview.databaseId, f.databaseId);
  assert.doesNotMatch(JSON.stringify(preview), /token|password|secret|@/i);
  assert.equal(f.writes(), 0); assert.equal(f.transactions(), 0);
});

test("orden cerrada, otro pago confirmado y operacion asociada a otra orden se rechazan", async () => {
  for (const mutate of [
    (f) => { f.order.status = "cancelled"; },
    (f) => { f.models.Payment.seed({ id: "other-payment", orderId: f.order.id, status: "paid" }); },
    (f) => { f.models.Payment.seed({ id: "other-payment", orderId: "other-order", provider: "mercadopago_checkout", providerPaymentId: String(f.providerPayment.id) }); },
  ]) {
    const f = await fixture(); mutate(f);
    await assert.rejects(f.reconcile({ dryRun: false }));
    assert.equal(f.writes(), 0);
  }
});

test("fallo de recibo revierte reconciliacion y queda auditado sin credenciales; reintento confirma", async () => {
  const f = await fixture({ annual: true });
  const create = f.models.Receipt.create;
  f.models.Receipt.create = async () => { throw new Error("Receipt unavailable"); };
  await assert.rejects(f.reconcile({ dryRun: false }));
  assert.equal(f.payment.status, "pending"); assert.equal(f.order.status, "pending_payment");
  assert.equal(f.tables.UserSubscription.length, 1); assert.equal(f.tables.Receipt.length, 0);
  assert.equal(f.payment.metadata.reconciliationHistory, undefined);
  assert.equal(f.logs[0][1].requestedBy, ADMIN_ID);
  assert.doesNotMatch(JSON.stringify(f.logs), /TEST-private-token|eyJ|password|Authorization/);
  f.models.Receipt.create = create;
  await f.reconcile({ dryRun: false });
  assert.equal(f.tables.UserSubscription.length, 2); assert.equal(f.tables.Receipt.length, 1);
  assert.equal(f.payment.metadata.reconciliationHistory.length, 1);
});

test("periodos inclusivos tienen exactamente durationDays; UTC maneja cambio de mes y ano bisiesto", () => {
  for (const durationDays of [1, 7, 30, 365]) {
    const period = calculateInclusiveSubscriptionPeriod({ durationDays, today: "2028-02-28" });
    assert.equal((new Date(period.endsAt) - new Date(period.startsAt)) / 86400000 + 1, durationDays);
  }
  assert.equal(addSubscriptionDays("2028-02-28", 1), "2028-02-29");
  for (const durationDays of [0, -1, 1.5, NaN]) {
    assert.throws(() => calculateInclusiveSubscriptionPeriod({ durationDays }));
  }
});

test("transacciones independientes sin cola global usan bloqueo por usuario y no superponen compras", async () => {
  const f = await fixture({ parallel: true });
  f.models.MembershipPlan.seed({ id: "other-plan", isActive: true, durationDays: 7 });
  await Promise.all([
    f.membershipService.createOrRenewUserSubscription({ userId: "user-1", planId: "monthly", orderItemId: "buy-1" }),
    f.membershipService.createOrRenewUserSubscription({ userId: "user-1", planId: "other-plan", orderItemId: "buy-2" }),
  ]);
  const subscriptions = [...f.tables.UserSubscription].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  assert.equal(subscriptions.length, 2);
  assert.equal(subscriptions[1].startsAt, addSubscriptionDays(subscriptions[0].endsAt, 1));
  assert.equal(new Set(f.lockEvents.filter((e) => e.key === "user:user-1").map((e) => e.transactionId)).size, 2);
});

test("periodos explicitos no pueden superponerse ni reemplazar la anual", async () => {
  const f = await fixture({ annual: true });
  await assert.rejects(f.membershipService.createOrRenewUserSubscription({
    userId: "user-1", planId: "monthly", startsAt: "2099-06-20", endsAt: "2099-07-20",
  }), { statusCode: 409 });
  assert.equal(f.tables.UserSubscription.length, 1); assert.equal(f.writes(), 0);
});

test("paquete de dos integrantes revierte al fallar recibo y reintenta sin duplicar grupo ni acceso", async () => {
  const f = await fixture();
  f.models.User.seed({ id: "group-member", email: "member@example.invalid", role: "cliente" });
  Object.assign(f.tables.OrderItem[0], { itemType: "group_membership", unitPrice: 880,
    subtotal: 880, metadata: { memberEmails: ["member@example.invalid"] } });
  Object.assign(f.tables.MembershipPlan[0], { type: "group", minPeople: 2, maxPeople: 2, price: 880, pricePerPerson: 440 });
  f.order.total = "880.00"; f.payment.amount = "880.00"; f.providerPayment.transaction_amount = 880;
  const createReceipt = f.models.Receipt.create;
  let reachedReceipt = 0;
  f.models.Receipt.create = async (values, options) => {
    const row = await createReceipt(values, options);
    reachedReceipt++;
    assert.ok(options.transaction);
    assert.equal(f.tables.SubscriptionGroup.length, 1);
    assert.equal(f.tables.SubscriptionGroupMember.length, 2);
    throw Object.assign(new Error("Intentional local receipt failure"), { code: "PGIT_INJECTED_FAILURE" });
  };
  await assert.rejects(f.service.processMercadoPagoWebhook(f.webhook()));
  assert.equal(reachedReceipt, 1);
  assert.equal(f.payment.status, "pending");
  assert.equal(f.order.status, "pending_payment");
  assert.equal(f.payment.groupId ?? null, null);
  for (const table of ["SubscriptionGroup", "SubscriptionGroupMember", "UserSubscription", "Receipt"]) assert.equal(f.tables[table].length, 0);
  f.models.Receipt.create = createReceipt;
  for (const requestId of ["group-retry", "group-duplicate"]) {
    await f.service.processMercadoPagoWebhook(f.webhook({ requestId }));
    assert.equal(f.payment.status, "paid");
    assert.equal(f.order.status, "paid");
    assert.equal(f.tables.Receipt.length, 1);
    assert.equal(f.tables.SubscriptionGroup.length, 1);
    assert.equal(f.tables.SubscriptionGroup[0].status, "pending_admin_approval");
    assert.equal(f.payment.groupId, f.tables.SubscriptionGroup[0].id);
    assert.equal(f.tables.SubscriptionGroupMember.length, 2);
    assert.equal(f.tables.UserSubscription.length, 0);
  }
});

test("paquete nuevo usa 30 dias inclusivos, se programa tras anual y aprueba sin sustituirla", async () => {
  const f = await fixture({ annual: true });
  f.tables.OrderItem[0].itemType = "group_membership";
  Object.assign(f.tables.MembershipPlan[0], { maxPeople: 1, pricePerPerson: 440 });
  const annual = { ...f.existingAnnual };
  const preview = await f.reconcile();
  assert.equal(preview.memberships.planned[0].action, "create_pending_group");
  await f.reconcile({ dryRun: false });
  const group = f.tables.SubscriptionGroup[0];
  assert.equal(group.startsAt, "2099-06-22"); assert.equal(group.endsAt, "2099-07-21");
  await f.membershipService.activateSubscriptionGroupMembers({ groupId: group.id, approvedBy: ADMIN_ID });
  assert.deepEqual(f.existingAnnual, annual);
  assert.equal(f.tables.UserSubscription.length, 2);
  assert.equal(f.tables.UserSubscription[1].startsAt, group.startsAt);
  assert.equal(f.tables.UserSubscription[1].endsAt, group.endsAt);
});

test("aprobacion grupal conserva vencimiento preexistente y bloquea conflictos futuros", async () => {
  for (const conflict of [false, true]) {
    const f = await fixture({ annual: true });
    f.tables.OrderItem[0].itemType = "group_membership";
    Object.assign(f.tables.MembershipPlan[0], { maxPeople: 1, pricePerPerson: 440 });
    await f.reconcile({ dryRun: false });
    const group = f.tables.SubscriptionGroup[0];
    group.endsAt = "2099-07-22"; // paquete legado: su vencimiento no se recorta
    if (conflict) f.models.UserSubscription.seed({
      id: "future-conflict", userId: "user-1", planId: "monthly", status: "active",
      startsAt: group.startsAt, endsAt: group.endsAt,
    });
    const operation = f.membershipService.activateSubscriptionGroupMembers({ groupId: group.id });
    if (conflict) {
      await assert.rejects(operation, { statusCode: 409 });
      assert.equal(group.status, "pending_admin_approval");
    } else {
      await operation;
      assert.equal(f.tables.UserSubscription[1].endsAt, "2099-07-22");
    }
    assert.equal(group.endsAt, "2099-07-22");
  }
});

test("snapshot de duracion comprado coincide entre vista previa y activacion aunque cambie el plan", async () => {
  const f = await fixture({ annual: true });
  f.tables.OrderItem[0].durationDaysSnapshot = 7;
  const preview = await f.reconcile();
  assert.equal(preview.memberships.planned[0].durationDays, 7);
  assert.equal(preview.memberships.planned[0].endsAt, "2099-06-28");
  await f.reconcile({ dryRun: false });
  assert.equal(f.tables.UserSubscription[1].endsAt, "2099-06-28");
});

test("aislamiento incompatible no permite usar un snapshot obsoleto para activar", async () => {
  const f = await fixture();
  await assert.rejects(f.sequelize.transaction({ isolationLevel: "REPEATABLE READ" }, (transaction) =>
    f.membershipService.createOrRenewUserSubscription({ userId: "user-1", planId: "monthly", transaction })
  ), { statusCode: 409 });
  assert.equal(f.writes(), 0);
});

test("auditoria legada se conserva y cada reintento agrega su propio registro", async () => {
  const f = await fixture();
  f.payment.metadata = { reconciliation: { source: "legacy", requestedBy: "original-operator", reconciledAt: "2026-01-01" } };
  const original = { ...f.payment.metadata.reconciliation };
  await f.reconcile({ dryRun: false });
  assert.deepEqual(f.payment.metadata.reconciliation, original);
  assert.equal(f.payment.metadata.reconciliationHistory.length, 2);
  assert.deepEqual(f.payment.metadata.reconciliationHistory[0], original);
  assert.equal(f.payment.metadata.reconciliationHistory[1].requestedBy, ADMIN_ID);
});

test("CLI aislada conserva dryRun, no acepta actor como autorizacion ni tokens visibles", async () => {
  const f = await fixture();
  const source = await readFile(new URL("../scripts/reconcileMercadoPagoPayment.js", import.meta.url), "utf8");
  for (const [args, isTTY, expectedCalls, expectedExit] of [
    [["--order-id", "order-1", "--provider-payment-id", "123"], false, 1, undefined],
    [["--show-database-id"], false, 0, undefined],
    [["--apply", "--actor", "invented"], false, 0, 1],
    [["--apply", "--operator-token-stdin", "--confirm-order", "order-1", "--confirm-database", f.databaseId], true, 0, 1],
    [["--operator-token-stdin"], false, 0, 1],
  ]) {
    const calls = [], logs = [];
    const processStub = { stdin: { isTTY }, exitCode: undefined };
    const context = vm.createContext({ process: processStub, console: {
      log: (...values) => logs.push(values), error: (...values) => logs.push(values),
    } });
    const dependencies = {
      "node:util": { parseArgs: (options) => parseArgs({ ...options, args }) },
      "../config/sequelize.js": { sequelize: { config: {}, close: async () => {} } },
      "../services/mercadoPagoReconciliationAuthorization.js": { getReconciliationDatabaseId: () => f.databaseId },
      "../services/mercadoPagoCheckoutService.js": {
        getMercadoPagoErrorDiagnostics: f.service.getMercadoPagoErrorDiagnostics,
        reconcileMercadoPagoPayment: async (options) => { calls.push(options); return { dryRun: options.dryRun }; },
      },
    };
    const module = new vm.SourceTextModule(source, { context });
    await module.link((specifier) => {
      const exports = dependencies[specifier];
      assert.ok(exports, "CLI dependency must be isolated");
      return new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
      }, { context });
    });
    await module.evaluate();
    assert.equal(calls.length, expectedCalls); assert.equal(processStub.exitCode, expectedExit);
    if (calls.length) { assert.equal(calls[0].dryRun, true); assert.equal(calls[0].operatorToken, null); }
    assert.doesNotMatch(JSON.stringify(logs), /TEST-private-token|eyJ|private-webhook-secret/);
  }
});
