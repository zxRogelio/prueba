// Explicit remote-test runtime. Only the public ingress is tunneled; application
// routes, synthetic credentials and administration stay on loopback.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import * as sdk from "mercadopago";
import { loadBackend } from "./productDeliveryNeonSupport.js";
import { remoteOrigin, assertTestSeller, assertOwnedRemotePayment, authenticateRemoteWebhook } from "./productDeliveryRemoteSafety.js";

export const REMOTE_API = "http://127.0.0.1:5530";
export const REMOTE_WEB = "http://127.0.0.1:5188";
const denyOutbound = () => { throw new Error("Only preferences and read-only provider payment lookups are enabled."); };
const listen = (app, port) => new Promise((resolve, reject) => {
  const server = app.listen(port, "127.0.0.1", () => resolve(server)); server.once("error", reject);
});
const stop = (server) => new Promise((resolve) => server.close(resolve));

export async function startRemoteServer({ config, store, env, publicUrl }) {
  const origin = remoteOrigin(publicUrl);
  assert.equal(env.MERCADOPAGO_RECONCILIATION_ENVIRONMENT, "test");
  assert.equal(env.MERCADOPAGO_RECONCILIATION_PAYMENT_MODE, "checkout_pro_test_account");
  assert.equal(env.MERCADOPAGO_EXPECTED_LIVE_MODE, "true");
  assert.ok(env.MERCADOPAGO_ACCESS_TOKEN); assert.ok(env.MERCADOPAGO_WEBHOOK_SECRET);
  const response = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: "Bearer " + env.MERCADOPAGO_ACCESS_TOKEN },
    redirect: "error", signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, "Could not verify seller before starting remote checkout.");
  const seller = await response.json(); assertTestSeller(seller, env.MERCADOPAGO_EXPECTED_SELLER_ID);
  if (store.manifest.seller) assert.equal(store.manifest.seller.id, String(seller.id));
  if (store.manifest.publicUrl) assert.equal(store.manifest.publicUrl, origin);
  store.manifest.seller = { id: String(seller.id), verifiedTestAccount: true };
  store.manifest.publicUrl = origin;
  store.manifest.notificationUrl = origin + "/api/webhooks/mercadopago";
  store.manifest.preferences ||= []; store.manifest.inbound ||= []; store.manifest.replays ||= [];
  await store.save();
  let backend;
  const scopedSdk = {
    ...sdk,
    MercadoPagoConfig: class extends sdk.MercadoPagoConfig {
      constructor(input) { assert.equal(input.accessToken, env.MERCADOPAGO_ACCESS_TOKEN); super(input); }
    },
    Preference: class {
      constructor(client) { this.real = new sdk.Preference(client); }
      async create(input) {
        const { body } = input;
        assert.equal(body.notification_url, store.manifest.notificationUrl);
        for (const url of Object.values(body.back_urls)) assert.equal(new URL(url).origin, origin);
        const orderId = body.external_reference;
        assert.ok(store.manifest.rows.Orders?.ids.includes(orderId));
        const order = await backend.models.Order.findByPk(orderId);
        const cents = body.items.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity, 0)
          + Math.round(Number(body.shipments?.cost || 0) * 100);
        assert.equal(cents, Math.round(Number(order.total) * 100));
        // This is the real SDK POST /checkout/preferences, never a mock.
        const preference = await this.real.create(input);
        assert.ok(/(^|\.)mercadopago\.com(?:\.mx)?$/.test(new URL(preference.init_point).hostname));
        store.manifest.preferences.push({ orderId, id: String(preference.id), checkoutUrl: preference.init_point,
          total: (cents / 100).toFixed(2), shippingTotal: order.shippingTotal, notificationUrl: body.notification_url,
          createdAt: new Date().toISOString(), provider: "remote-mercadopago" });
        await store.save();
        return preference;
      }
    },
    Payment: class {
      constructor(client) { this.real = new sdk.Payment(client); }
      async get({ id }) {
        assert.match(String(id), /^\d+$/);
        const payment = await this.real.get({ id });
        assertOwnedRemotePayment(payment, store.manifest, seller.id, true);
        return payment;
      }
    },
    PaymentRefund: class { constructor() { denyOutbound(); } },
  };
  const short = store.manifest.runId.slice(0, 8);
  const slug = "pgdel-remote-" + short;
  backend = await loadBackend(config, store, "pgdel-remote-" + short, { jwt: randomBytes(32).toString("hex"), webhook: env.MERCADOPAGO_WEBHOOK_SECRET }, {
    env: { PICKUP_SETTINGS_SLUG: slug, FRONTEND_URL: origin, BACKEND_PUBLIC_URL: origin, NODE_ENV: "test",
      MERCADOPAGO_ACCESS_TOKEN: env.MERCADOPAGO_ACCESS_TOKEN, INVENTORY_RESERVATION_TTL_MINUTES: "90" },
    external: { mercadopago: scopedSdk, express: { default: express, Router: express.Router }, bcrypt: { default: bcrypt },
      "express-rate-limit": { default: rateLimit, rateLimit }, dotenv: { default: { config: () => ({ parsed: {} }) } } },
    internal: { "utils/sendEmailBrevo.js": { sendOTP: denyOutbound, sendConfirmationEmail: denyOutbound, sendVerificationEmail: denyOutbound, sendAccountVerificationOTP: denyOutbound },
      "utils/cloudinaryUpload.js": { uploadBufferToCloudinary: denyOutbound } },
  });
  let localServer, ingressServer;
  try {
    const m = backend.models;
    const number = 1800000000 + Number.parseInt(short, 16) % 100000000;
    const password = randomBytes(24).toString("hex") + "aA1!";
    const hash = await bcrypt.hash(password, 10);
    let customer, admin, product;
    if (store.manifest.fixture) {
      const saved = store.manifest.fixture;
      customer = await m.User.findByPk(saved.customerId); admin = await m.User.findByPk(saved.adminId); product = await m.Product.findByPk(saved.productId);
      assert.equal(customer.email, slug + "@example.invalid"); assert.equal(admin.email, slug + "-admin@example.invalid");
      assert.equal(customer.role, "cliente"); assert.equal(admin.role, "administrador"); assert.equal(product.id_producto, number);
      await backend.sequelize.transaction(async (transaction) => {
        await customer.update({ password: hash }, { transaction }); await admin.update({ password: hash }, { transaction });
        const previousSessions = store.manifest.rows.sessions?.ids || [];
        if (previousSessions.length) await m.Session.update({ revoked: true }, { where: { id: previousSessions }, transaction });
      });
    } else await backend.sequelize.transaction(async (transaction) => {
      customer = await m.User.create({ email: slug + "@example.invalid", password: hash, isVerified: true, role: "cliente" }, { transaction });
      admin = await m.User.create({ email: slug + "-admin@example.invalid", password: hash, isVerified: true, role: "administrador" }, { transaction });
      await m.AboutPage.create({ id: -number, slug, pickupSettings: { name: "PGDEL REMOTE - GIMNASIO SINTÉTICO",
        address: "PRUEBA - Calle sintética 1", municipality: "Municipio sintético", state: "Estado sintético", postalCode: "00001",
        phone: "5555555555", hours: "PRUEBA 10:00–18:00", instructions: "PRUEBA REMOTA - no entregar mercancía real", enabled: true } }, { transaction });
      await m.Category.create({ id: -number, id_categoria: number, name: "PGDEL REMOTE category " + short, productKind: "apparel" }, { transaction });
      await m.Brand.create({ id: -number, id_marca: number, name: "PGDEL REMOTE brand " + short, categoryId: number }, { transaction });
      product = await m.Product.create({ id: -number, id_producto: number, name: "PGDEL REMOTE Producto sintético " + short,
        brandId: number, categoryId: number, price: "100.00", stock: 20, status: "Activo", productType: "Ropa" }, { transaction });
      await m.ShippingRate.create({ name: "PGDEL REMOTE Tarifa sintética " + short, postalCodeFrom: "00001", postalCodeTo: "00001",
        amount: "75.00", currency: "MXN", active: true, updatedBy: admin.id }, { transaction });
    });
    m.Product.addScope("defaultScope", { where: { id_producto: number } }, { override: true });
    m.Order.addScope("defaultScope", { where: { userId: customer.id } }, { override: true });
    m.MembershipPlan.addScope("defaultScope", { where: { slug } }, { override: true });
    m.ShippingRate.addScope("defaultScope", { where: { updatedBy: admin.id } }, { override: true });
    const app = express(); app.disable("x-powered-by");
    app.use(cors({ origin: REMOTE_WEB })); app.use(express.json({ limit: "64kb" }));
    const auth = await backend.load("controllers/authController.js");
    app.post("/api/auth/login", (await backend.load("middleware/loginLimiter.js")).loginLimiter, auth.login);
    for (const route of ["deliveryRoutes.js", "orderRoutes.js", "checkoutRoutes.js"]) app.use("/api", (await backend.load("routes/" + route)).default);
    app.use("/api/products", (await backend.load("routes/public/productRoutes.js")).default);
    app.use("/api/memberships", (await backend.load("routes/membershipRoutes.js")).default);
    app.use((error, _req, res, _next) => { console.error("Remote local API failure:", error.name); res.status(500).json({ error: "Local test API failure." }); });
    localServer = await listen(app, 5530);

    const providerClient = new sdk.Payment(new sdk.MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN, options: { timeout: 10000 } }));
    const controller = await backend.load("controllers/checkoutController.js");
    const publicApp = express(); publicApp.disable("x-powered-by");
    publicApp.use(helmet()); publicApp.use(express.json({ limit: "64kb" }));
    publicApp.get("/health", (_req, res) => res.json({ ok: true, mode: "test-webhook-only", runId: store.manifest.runId }));
    publicApp.get("/pago/resultado", (req, res) => {
      const id = req.query.orderId;
      if (!store.manifest.rows.Orders?.ids.includes(id)) return res.sendStatus(404);
      return res.redirect(REMOTE_WEB + "/pago/resultado?orderId=" + encodeURIComponent(id));
    });
    // A single global bucket intentionally ignores all forwarded IP headers.
    // Only this public test ingress is throttled here; no proxy trust is added.
    const limiter = rateLimit({ windowMs: 60000, limit: 60, keyGenerator: () => "remote-test-ingress", standardHeaders: true, legacyHeaders: false });
    let replayQueue = Promise.resolve();
    const totals = async (orderId, transaction = null) => {
      const items = await m.OrderItem.findAll({ where: { orderId }, transaction });
      const fulfillment = await m.OrderFulfillment.findOne({ where: { orderId }, transaction });
      return { receipts: await m.Receipt.count({ where: { orderId }, transaction }),
        sales: await m.InventoryMovement.count({ where: { orderItemId: items.map((item) => item.id), movementType: "sale" }, transaction }),
        fulfillmentEvents: fulfillment ? await m.FulfillmentEvent.count({ where: { fulfillmentId: fulfillment.id }, transaction }) : 0,
        stock: (await m.Product.findByPk(product.id, { transaction })).stock };
    };
    publicApp.post("/api/webhooks/mercadopago", limiter, async (req, res) => {
      const receivedAt = new Date().toISOString();
      let provider;
      try {
        const id = authenticateRemoteWebhook({ headers: req.headers, query: req.query, secret: env.MERCADOPAGO_WEBHOOK_SECRET, validator: sdk.WebhookSignatureValidator });
        if ((req.body?.type || req.query.type) !== "payment") return res.status(202).json({ ignored: true });
        provider = await providerClient.get({ id });
        assertOwnedRemotePayment(provider, store.manifest, seller.id, true);
      } catch (error) {
        store.manifest.inbound.push({ receivedAt, authenticAccepted: false, rejectedBeforeDatabase: true, reason: error.name,
          signaturePresent: typeof req.headers["x-signature"] === "string", queryIdPresent: typeof req.query["data.id"] === "string",
          detail: /^[A-Za-z_]{1,80}$/.test(error.reason || "") ? error.reason : null });
        await store.save(); return res.status(401).json({ ok: false, error: "Unverified or unrelated notification." });
      }
      const evidence = { receivedAt, authenticAccepted: true, paymentId: String(provider.id), orderId: String(provider.external_reference),
        providerStatus: provider.status, signatureValid: true, signatureDigest: createHash("sha256").update(req.headers["x-signature"]).digest("hex") };
      store.manifest.inbound.push(evidence); await store.save();
      res.once("finish", () => {
        evidence.httpStatus = res.statusCode;
        replayQueue = replayQueue.then(async () => {
          if (res.statusCode === 200) {
            const before = await totals(evidence.orderId);
            // Replay the ORIGINAL authenticated provider headers in memory,
            // immediately, without manufacturing a signature or payment.
            const result = await backend.checkout.processMercadoPagoWebhook({ headers: req.headers, query: req.query, body: req.body });
            const after = await totals(evidence.orderId);
            assert.deepEqual(after, before, "Authentic notification replay changed inventory or accounting.");
            assert.equal(result.duplicate, true);
            store.manifest.replays.push({ at: new Date().toISOString(), providerPaymentId: evidence.paymentId, orderId: evidence.orderId,
              originalSignatureReused: true, duplicate: true, before, after });
          }
          await store.save();
        }).catch(async (error) => { store.manifest.replayError = { name: error.name, code: error.code || null }; await store.save(); });
      });
      return controller.receiveMercadoPagoWebhook(req, res);
    });
    publicApp.use((_req, res) => res.sendStatus(404));
    publicApp.use((_error, _req, res, _next) => res.status(400).json({ ok: false }));
    ingressServer = await listen(publicApp, 5521);
    const fixture = { apiOrigin: REMOTE_API, webOrigin: REMOTE_WEB, customerEmail: customer.email, adminEmail: admin.email, password,
      productName: product.name, productId: number, runId: store.manifest.runId };
    store.manifest.fixture = { customerId: customer.id, adminId: admin.id, productId: product.id, productBusinessId: number, initialStock: 20 };
    await store.save();
    const remoteStatuses = async (orderId) => {
      assert.ok(store.manifest.rows.Orders?.ids.includes(orderId));
      const query = new URLSearchParams({ external_reference: orderId, limit: "10" });
      const response = await fetch("https://api.mercadopago.com/v1/payments/search?" + query, {
        headers: { Authorization: "Bearer " + env.MERCADOPAGO_ACCESS_TOKEN }, redirect: "error", signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200);
      const result = await response.json(); const statuses = [];
      for (const entry of result.results || []) {
        const payment = await providerClient.get({ id: entry.id });
        assertOwnedRemotePayment(payment, store.manifest, seller.id, true);
        statuses.push({ id: String(payment.id), status: payment.status, merchandiseAmount: payment.transaction_amount, shippingAmount: payment.shipping_amount || 0 });
      }
      return statuses;
    };
    return { backend, fixture, totals, remoteStatuses,
      close: async () => { await stop(ingressServer); await stop(localServer); await replayQueue; await backend.close(); } };
  } catch (error) {
    if (ingressServer) await stop(ingressServer); if (localServer) await stop(localServer);
    await backend.close(); throw error;
  }
}
