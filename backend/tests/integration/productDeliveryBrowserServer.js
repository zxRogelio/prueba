// Local browser fixture server. Never imported by index.js or deployed routes.
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import * as mercadoPago from "mercadopago";
import { loadBackend } from "./productDeliveryNeonSupport.js";

export const API_ORIGIN = "http://127.0.0.1:5510";
export const WEB_ORIGIN = "http://127.0.0.1:5178";

export async function startBrowserServer(config, store) {
  const short = store.manifest.runId.slice(0, 8);
  const slug = "pgdel-browser-" + short;
  const preferences = new Map();
  const providerPayments = new Map();
  const secrets = { jwt: randomBytes(32).toString("hex"), webhook: randomBytes(32).toString("hex") };
  const noOutbound = () => { throw new Error("Outbound side effects are disabled in browser fixtures."); };
  const fakeSdk = {
    ...mercadoPago,
    MercadoPagoConfig: class { constructor(input) { assert.equal(input.accessToken, "TEST-PGDEL-NOT-A-CREDENTIAL"); } },
    Preference: class { async create({ body, requestOptions }) {
      const id = body.external_reference;
      assert.ok(store.manifest.rows.Orders?.ids.includes(id));
      const order = await backend.models.Order.findByPk(id);
      const cents = body.items.reduce((sum, item) => sum + item.quantity * Math.round(Number(item.unit_price) * 100), 0)
        + Math.round(Number(body.shipments?.cost || 0) * 100);
      assert.equal(cents, Math.round(Number(order.total) * 100), "Provider preference must include products and shipping exactly.");
      preferences.set(id, { body, idempotencyKey: requestOptions.idempotencyKey });
      return { id: "browser-pref-" + id, init_point: API_ORIGIN + "/__test/checkout/" + id };
    } },
    Payment: class { async get({ id }) { assert.ok(providerPayments.has(String(id))); return providerPayments.get(String(id)); } },
    PaymentRefund: class { constructor() { noOutbound(); } },
  };
  const backend = await loadBackend(config, store, "pgdel-browser-" + short, secrets, {
    env: { PICKUP_SETTINGS_SLUG: slug, FRONTEND_URL: WEB_ORIGIN, BACKEND_PUBLIC_URL: "https://browser-fixture.example.test", NODE_ENV: "test" },
    external: { mercadopago: fakeSdk, express: { default: express, Router: express.Router }, bcrypt: { default: bcrypt },
      "express-rate-limit": { default: rateLimit, rateLimit }, dotenv: { default: { config: () => ({ parsed: {} }) } } },
    internal: { "utils/sendEmailBrevo.js": { sendOTP: noOutbound, sendConfirmationEmail: noOutbound, sendVerificationEmail: noOutbound, sendAccountVerificationOTP: noOutbound },
      "utils/cloudinaryUpload.js": { uploadBufferToCloudinary: noOutbound } },
  });
  try {
    const m = backend.models;
    const number = 1800000000 + Number.parseInt(short, 16) % 100000000;
    const password = randomBytes(20).toString("hex") + "aA1!";
    const hash = await bcrypt.hash(password, 10);
    let customer, admin, product, plan;
    await backend.sequelize.transaction(async (transaction) => {
      customer = await m.User.create({ email: "pgdel-browser-" + short + "@example.invalid", password: hash, isVerified: true, role: "cliente" }, { transaction });
      admin = await m.User.create({ email: "pgdel-browser-admin-" + short + "@example.invalid", password: hash, isVerified: true, role: "administrador" }, { transaction });
      await m.AboutPage.create({ id: -number, slug, ctaAddress: "PRUEBA SINTÉTICA - sin ubicación real", ctaPhone: "5555555555" }, { transaction });
      await m.Category.create({ id: -number, id_categoria: number, name: "PGDEL browser category " + short, productKind: "apparel" }, { transaction });
      await m.Brand.create({ id: -number, id_marca: number, name: "PGDEL browser brand " + short, categoryId: number }, { transaction });
      product = await m.Product.create({ id: -number, id_producto: number, name: "PGDEL Producto sintético " + short,
        brandId: number, categoryId: number, price: "100.00", stock: 100, status: "Activo", productType: "Ropa" }, { transaction });
      plan = await m.MembershipPlan.create({ name: "PGDEL Membresía sintética " + short, slug: "pgdel-browser-" + short,
        price: "300.00", type: "individual", durationDays: 30, isActive: true }, { transaction });
    });
    // Browser listings are restricted to this run's synthetic catalog/orders.
    // Write hooks still prohibit changing any original records.
    m.Product.addScope("defaultScope", { where: { id_producto: number } }, { override: true });
    m.Order.addScope("defaultScope", { where: { userId: customer.id } }, { override: true });
    m.MembershipPlan.addScope("defaultScope", { where: { id: plan.id } }, { override: true });
    m.ShippingRate.addScope("defaultScope", { where: { updatedBy: admin.id } }, { override: true });

    const app = express();
    app.disable("x-powered-by");
    app.use(cors({ origin: WEB_ORIGIN }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const auth = await backend.load("controllers/authController.js");
    const limiter = await backend.load("middleware/loginLimiter.js");
    app.post("/api/auth/login", limiter.loginLimiter, auth.login);
    for (const route of ["deliveryRoutes.js", "orderRoutes.js", "checkoutRoutes.js"]) {
      app.use("/api", (await backend.load("routes/" + route)).default);
    }
    app.use("/api/memberships", (await backend.load("routes/membershipRoutes.js")).default);
    app.use("/api/products", (await backend.load("routes/public/productRoutes.js")).default);

    const nonce = randomBytes(32).toString("hex");
    async function notify(orderId, status) {
      assert.ok(store.manifest.rows.Orders?.ids.includes(orderId));
      assert.ok(["approved", "rejected"].includes(status));
      const payment = await m.Payment.findOne({ where: { orderId } });
      const order = await m.Order.findByPk(orderId);
      const providerId = payment.providerPaymentId || "98" + BigInt("0x" + randomBytes(8).toString("hex")).toString();
      providerPayments.set(String(providerId), { id: String(providerId), status, status_detail: status === "approved" ? "accredited" : "cc_rejected_other_reason",
        transaction_amount: Number(payment.amount) - Number(order.shippingTotal || 0), shipping_amount: Number(order.shippingTotal || 0),
        transaction_details: { total_paid_amount: Number(payment.amount) }, currency_id: "MXN", external_reference: orderId,
        preference_id: payment.providerPreferenceId, metadata: { order_id: orderId, user_id: customer.id, payment_id: payment.id } });
      const ts = String(Date.now()); const requestId = randomUUID();
      const signature = createHmac("sha256", secrets.webhook).update(`id:${providerId};request-id:${requestId};ts:${ts};`).digest("hex");
      const response = await fetch(API_ORIGIN + "/api/webhooks/mercadopago?type=payment&data.id=" + providerId, {
        method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId, "x-signature": `ts=${ts},v1=${signature}` },
        body: JSON.stringify({ id: "browser-event-" + providerId + "-" + status, type: "payment", data: { id: String(providerId) } }),
      });
      const body = await response.json();
      assert.equal(response.status, 200, "Signed local webhook failed: " + body.error);
      return body;
    }
    app.get("/__test/checkout/:orderId", (req, res) => {
      const pref = preferences.get(req.params.orderId);
      if (!pref) return res.sendStatus(404);
      const total = pref.body.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) + Number(pref.body.shipments?.cost || 0);
      return res.type("html").send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Checkout simulado</title><body>
        <h1>PROVEEDOR SIMULADO</h1><p>No es una prueba remota de Mercado Pago. Datos sintéticos, sin dinero real.</p>
        <p>Total de preferencia: <strong>$${total.toFixed(2)}</strong></p>
        <form method="post"><input type="hidden" name="nonce" value="${nonce}">
        <button name="status" value="approved">Simular pago aprobado</button><button name="status" value="rejected">Simular pago rechazado</button></form></body></html>`);
    });
    app.post("/__test/checkout/:orderId", async (req, res, next) => {
      try {
        assert.equal(req.body.nonce, nonce);
        await notify(req.params.orderId, req.body.status);
        res.redirect(WEB_ORIGIN + "/pago/resultado?orderId=" + req.params.orderId);
      } catch (error) { next(error); }
    });
    app.post("/__test/replay/:orderId", async (req, res, next) => {
      try { assert.equal(req.headers["x-fixture-nonce"], nonce); res.json(await notify(req.params.orderId, "approved")); }
      catch (error) { next(error); }
    });
    app.use((error, _req, res, _next) => {
      console.error("Browser fixture request failed:", error.name, error.code || "", error.message);
      res.status(500).json({ error: "Local browser fixture request failed." });
    });
    const server = await new Promise((resolve, reject) => {
      const running = app.listen(5510, "127.0.0.1", () => resolve(running)); running.once("error", reject);
    });
    return { backend, preferences, customer, admin, product, plan,
      fixture: { apiOrigin: API_ORIGIN, webOrigin: WEB_ORIGIN, customerEmail: customer.email, adminEmail: admin.email,
        password, productName: product.name, productId: number, planName: plan.name, planId: plan.id, nonce },
      close: async () => { await new Promise((resolve) => server.close(resolve)); await backend.close(); } };
  } catch (error) { await backend.close(); throw error; }
}
