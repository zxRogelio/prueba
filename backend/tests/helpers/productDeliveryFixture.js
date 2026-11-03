import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as crypto from "node:crypto";
import * as mercadoPago from "mercadopago";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { Router } from "express";

// Real services/controllers/middleware with an isolated Sequelize adapter.
// Never imports config/sequelize.js, reads .env, connects to a DB, or calls MP.
export async function deliveryFixture() {
  const env = { JWT_SECRET: "delivery-isolated-test-secret", MERCADOPAGO_ACCESS_TOKEN: "TEST-isolated",
    MERCADOPAGO_WEBHOOK_SECRET: "delivery-webhook-test-secret", FRONTEND_URL: "http://localhost:5173",
    BACKEND_PUBLIC_URL: "https://backend.example.test" };
  const context = vm.createContext({ process: { env }, console, Date, setTimeout, clearTimeout, Buffer, URL });
  const tables = {};
  const models = {};
  const failNext = new Set();
  const names = ["User", "Session", "UserAddress", "ShippingRate", "AboutPage", "OrderFulfillment", "FulfillmentEvent",
    "Brand", "Category", "MembershipPlan", "Order", "OrderDiscount", "OrderItem", "Payment", "Product", "Promotion", "PromotionProduct",
    "Receipt", "PaymentWebhookEvent", "PaymentRefund", "PaymentRefundItem", "InventoryReservation", "InventoryMovement",
    "Cart", "CartItem", "SubscriptionGroup", "SubscriptionGroupMember", "UserSubscription"];
  const matches = (row, where = {}) => Reflect.ownKeys(where).every((key) => {
    if (key === Op.or) return where[key].some((part) => matches(row, part));
    if (key === Op.and) return where[key].every((part) => matches(row, part));
    const expected = where[key];
    if (!expected || typeof expected !== "object" || expected instanceof Date) return row[key] === expected;
    return Reflect.ownKeys(expected).every((operator) => {
      if (operator === Op.in) return expected[operator].includes(row[key]);
      if (operator === Op.ne) return row[key] !== expected[operator];
      if (operator === Op.lte) return row[key] <= expected[operator];
      if (operator === Op.gte) return row[key] >= expected[operator];
      if (operator === Op.lt) return row[key] < expected[operator];
      if (operator === Op.gt) return row[key] > expected[operator];
      if (operator === Op.not) return row[key] !== expected[operator];
      throw new Error("Unsupported adapter operator " + String(operator));
    });
  });
  const toPlain = (row, visited = new Set()) => {
    const plain = { ...row };
    if (visited.has(row)) return plain;
    visited.add(row);
    for (const key of row._relations) {
      const value = row[key];
      plain[key] = Array.isArray(value) ? value.map((item) => toPlain(item, new Set(visited))) : value ? toPlain(value, new Set(visited)) : null;
    }
    return plain;
  };
  function relation(name, row, include) {
    const target = include.model._name;
    const candidates = tables[target];
    let found;
    if (name === "Order" && include.as === "customer") found = candidates.filter((value) => value.id === row.userId);
    else if (name === "Payment" && include.as === "order") found = candidates.filter((value) => value.id === row.orderId);
    else if (name === "OrderItem" && include.as === "product") found = candidates.filter((value) => value.id_producto === row.productId);
    else if (name === "OrderItem" && include.as === "membershipPlan") found = candidates.filter((value) => value.id === row.membershipPlanId);
    else if (name === "OrderItem" && include.as === "discounts") found = candidates.filter((value) => value.orderItemId === row.id);
    else if (name === "Promotion" && include.as === "products") found = candidates.filter((value) => value.promotionId === row.id);
    else if (name === "OrderDiscount" && include.as === "promotion") found = candidates.filter((value) => value.id === row.promotionId);
    else found = candidates.filter((value) => value[name === "OrderFulfillment" ? "fulfillmentId" : "orderId"] === row.id);
    found = found.filter((value) => matches(value, include.where) && attach(target, value, include.include));
    if (include.order) found.sort((a, b) => compare(a, b, include.order));
    const single = ["customer", "order", "product", "membershipPlan", "promotion", "fulfillment"].includes(include.as);
    Object.defineProperty(row, include.as, { configurable: true, writable: true, value: single ? found[0] || null : found });
    row._relations.add(include.as);
    return !include.required || found.length > 0;
  }
  function attach(name, row, includes = []) { return includes.every((include) => relation(name, row, include)); }
  function compare(a, b, order) {
    for (const term of order) {
      if (term.length !== 2 || typeof term[0] !== "string") continue;
      const [field, direction] = term;
      if (a[field] < b[field]) return direction === "DESC" ? 1 : -1;
      if (a[field] > b[field]) return direction === "DESC" ? -1 : 1;
    }
    return 0;
  }
  for (const name of names) {
    tables[name] = [];
    models[name] = {
      _name: name,
      async create(values) {
        if (failNext.delete(name)) throw new Error("Injected adapter failure: " + name);
        if (name === "PaymentWebhookEvent" && tables[name].some((row) => row.providerEventId === values.providerEventId)) {
          throw Object.assign(new Error("duplicate"), { name: "SequelizeUniqueConstraintError" });
        }
        const row = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...values };
        if (name === "FulfillmentEvent") row.sequence = tables[name].length + 1;
        Object.defineProperties(row, {
          _relations: { value: new Set() },
          update: { value: async (next) => { Object.assign(row, next, { updatedAt: new Date() }); return row; } },
          get: { value: (field) => typeof field === "string" ? row[field] : toPlain(row) },
          toJSON: { value: () => toPlain(row) },
          setDataValue: { value: (field, value) => { row[field] = value; } },
        });
        tables[name].push(row);
        return row;
      },
      async bulkCreate(values) { return Promise.all(values.map((value) => this.create(value))); },
      async findAll({ where, include = [], order = [], offset = 0, limit } = {}) {
        const rows = tables[name].filter((row) => matches(row, where) && attach(name, row, include));
        rows.sort((a, b) => compare(a, b, order));
        return rows.slice(offset, limit ? offset + limit : undefined);
      },
      async findOne(options) { return (await this.findAll(options))[0] || null; },
      async findByPk(id, options = {}) { return this.findOne({ ...options, where: { id } }); },
      async findAndCountAll(options) {
        return { rows: await this.findAll(options), count: (await this.findAll({ ...options, limit: undefined, offset: 0 })).length };
      },
      async update(values, { where } = {}) { const rows = await this.findAll({ where }); for (const row of rows) await row.update(values); return [rows.length]; },
      async destroy({ where }) { const before = tables[name].length; tables[name] = tables[name].filter((row) => !matches(row, where)); return before - tables[name].length; },
    };
  }
  let queue = Promise.resolve();
  let counter = 0;
  const sequelize = {
    config: { host: "isolated.invalid", database: "delivery_tests" },
    async query(sql) {
      if (sql === "SHOW transaction_isolation") return [{ transaction_isolation: "read committed" }];
      if (/OrderNumberCounters/.test(sql)) return [[{ lastValue: ++counter }]];
      if (/pg_advisory_xact_lock/.test(sql)) return [];
      throw new Error("Unexpected test SQL");
    },
    transaction(options, callback) {
      if (typeof options === "function") { callback = options; options = {}; }
      const execute = async () => {
        const snapshot = Object.fromEntries(names.map((name) => [name, tables[name].map((row) => [row, structuredClone({ ...row })])]));
        try { return await callback({ LOCK: { UPDATE: "UPDATE", SHARE: "SHARE" }, options }); }
        catch (error) {
          for (const name of names) tables[name] = snapshot[name].map(([row, values]) => {
            for (const key of Object.keys(row)) delete row[key];
            Object.assign(row, values); return row;
          });
          throw error;
        }
      };
      const result = queue.then(execute); queue = result.catch(() => {}); return result;
    },
  };
  const external = {
    "node:crypto": crypto, sequelize: { Op }, jsonwebtoken: { default: jwt }, mercadopago: mercadoPago, express: { Router },
  };
  const internal = {
    "config/sequelize.js": { sequelize }, "models/index.js": models,
    "models/User.js": { User: models.User }, "models/Session.js": { Session: models.Session },
    "middleware/tokenBlacklist.js": { isTokenBlacklisted: () => false },
    "models/CartItem.js": { calculateCartItemSubtotal: ({ unitPrice, quantity }) => (Number(unitPrice) * quantity).toFixed(2) },
    "services/subscriptionEventService.js": { recordMembershipActivationEvents: async () => [], recordSubscriptionCancellation: async () => ({}), recordSubscriptionRefundEventsForPayment: async () => [] },
    "services/subscriptionHistoryService.js": { createOrUpdateSubscriptionHistory: async () => ({}) },
  };
  const base = new URL("../../", import.meta.url);
  const cache = new Map();
  function synthetic(key, values) {
    if (!cache.has(key)) cache.set(key, new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    }, { context, identifier: key }));
    return cache.get(key);
  }
  async function moduleFor(url) {
    const key = url.href.slice(base.href.length);
    if (internal[key]) return synthetic(key, internal[key]);
    if (cache.has(url.href)) return cache.get(url.href);
    const module = new vm.SourceTextModule(await readFile(url, "utf8"), { context, identifier: url.href });
    cache.set(url.href, module);
    return module;
  }
  const linker = async (specifier, parent) => {
    if (external[specifier]) return synthetic(specifier, external[specifier]);
    assert.ok(specifier.startsWith("."), "Unexpected external dependency " + specifier);
    return moduleFor(new URL(specifier, parent.identifier));
  };
  async function load(path) {
    const module = await moduleFor(new URL(path, base));
    if (module.status === "unlinked") await module.link(linker);
    if (module.status === "linked") await module.evaluate();
    return module.namespace;
  }
  const service = await load("services/mercadoPagoCheckoutService.js");
  const fulfillment = await load("services/fulfillmentService.js");
  const addressService = await load("services/addressService.js");
  const controllers = await load("controllers/orderController.js");
  const routes = (await load("routes/deliveryRoutes.js")).default;
  const orders = (await load("routes/orderRoutes.js")).default;
  const customer = await models.User.create({ email: "customer@example.invalid", role: "cliente" });
  const other = await models.User.create({ email: "other@example.invalid", role: "cliente" });
  const admin = await models.User.create({ email: "admin@example.invalid", role: "administrador" });
  const product = await models.Product.create({ id_producto: 101, name: "Producto de prueba", price: "100.00", stock: 50, status: "Activo", brandId: 1, categoryId: 1, productType: "Ropa" });
  await models.Brand.create({ id_marca: 1, name: "Marca" });
  await models.Category.create({ id_categoria: 1, name: "Ropa" });
  await models.AboutPage.create({ slug: "main", isActive: true, ctaAddress: "Ubicación de prueba aislada", ctaPhone: "5555555555" });
  const rate = await models.ShippingRate.create({ name: "Tarifa solo para pruebas", postalCodeFrom: "01000", postalCodeTo: "01999", amount: "75.00", currency: "MXN", active: true });
  const preferences = [];
  const providerPayments = new Map();
  const api = {
    async createPreference({ body, idempotencyKey }) {
      preferences.push(body);
      return { id: "pref-" + idempotencyKey, init_point: "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=" + idempotencyKey };
    },
    async getPayment({ id }) { return providerPayments.get(String(id)); },
    validateSignature(input) { mercadoPago.WebhookSignatureValidator.validate(input); },
  };
  const items = [{ productId: 101, quantity: 2 }];
  const pickup = { method: "pickup", recipientName: "Cliente de prueba", phone: "5555555555" };
  const address = { recipientName: "Cliente de prueba", phone: "5555555555", postalCode: "01001", state: "Estado de prueba",
    municipality: "Municipio de prueba", neighborhood: "Colonia de prueba", street: "Calle de prueba", exteriorNumber: "1", references: "Referencia de prueba" };
  async function checkout(input = pickup, key = crypto.randomUUID()) {
    const quote = await service.createProductCheckoutQuote({ userId: customer.id, payload: { items, fulfillment: input } });
    const payload = { idempotencyKey: key, items, fulfillment: input, quoteToken: quote.quoteToken };
    const result = await service.createMercadoPagoCheckout({ userId: customer.id, payload, mercadoPagoApi: api });
    return { quote, payload, result, order: tables.Order.find((row) => row.id === result.orderId),
      payment: tables.Payment.find((row) => row.orderId === result.orderId), fulfillment: tables.OrderFulfillment.find((row) => row.orderId === result.orderId) };
  }
  async function webhook(purchase, status = "approved", providerId = "8800100", requestId = crypto.randomUUID(), amount = purchase.payment.amount) {
    const shipping = Number(purchase.order.shippingTotal || 0);
    providerPayments.set(providerId, { id: providerId, status, status_detail: status, transaction_amount: Number(amount) - shipping,
      shipping_amount: shipping, transaction_details: { total_paid_amount: Number(amount) }, currency_id: "MXN",
      external_reference: purchase.order.id, preference_id: purchase.payment.providerPreferenceId,
      metadata: { order_id: purchase.order.id, user_id: customer.id, payment_id: purchase.payment.id } });
    const ts = String(Date.now());
    const signature = crypto.createHmac("sha256", env.MERCADOPAGO_WEBHOOK_SECRET).update(`id:${providerId};request-id:${requestId};ts:${ts};`).digest("hex");
    return service.processMercadoPagoWebhook({ mercadoPagoApi: api,
      headers: { "x-request-id": requestId, "x-signature": `ts=${ts},v1=${signature}` }, query: { "data.id": providerId, type: "payment" },
      body: { type: "payment", data: { id: providerId } } });
  }
  async function tokenFor(user) {
    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: "1h" });
    await models.Session.create({ userId: user.id, token, revoked: false, expiresAt: new Date(Date.now() + 3600000) });
    return token;
  }
  return { env, service, fulfillment, addressService, controllers, routes, orders, models, tables, failNext, customer, other, admin,
    product, rate, api, preferences, items, pickup, address, checkout, webhook, tokenFor, load };
}
