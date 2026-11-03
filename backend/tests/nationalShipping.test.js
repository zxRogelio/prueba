import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { deliveryFixture } from "./helpers/productDeliveryFixture.js";

// All amounts and records below are fictional, in-memory fixtures. No .env,
// PostgreSQL connection, remote preference or provider payment is used.
const national = (changes = {}) => ({ name: "Envío nacional", postalCodeFrom: "00000", postalCodeTo: "99999",
  amount: "123.45", currency: "MXN", active: true, ...changes });

async function save(f, body, id) {
  const controller = await f.load("controllers/deliveryController.js");
  let status = 200, data;
  const response = { status(value) { status = value; return this; }, json(value) { data = value; return this; } };
  await controller.saveShippingRate({ params: id ? { rateId: id } : {}, user: { id: f.admin.id }, body }, response);
  return { status, data };
}

test("national range stays five-character strings and cannot invent a price", async () => {
  const f = await deliveryFixture();
  const shipping = await f.load("services/shippingService.js");
  const normalized = shipping.normalizeShippingRate(national());
  assert.equal(normalized.postalCodeFrom, "00000"); assert.equal(normalized.postalCodeTo, "99999");
  assert.equal(normalized.currency, "MXN");
  for (const change of [{ amount: undefined }, { amount: "" }, { currency: "USD" }, { postalCodeFrom: 0 }, { postalCodeTo: 99999 }]) {
    assert.equal((await save(f, national(change))).status, 400);
  }
  assert.equal(f.tables.ShippingRate.length, 1);
});

for (const postalCode of ["43000", "06000", "64000", "22000", "97000"]) {
  test(`national format/range ${postalCode}: server total, shipping preference and snapshots agree (mock provider)`, async () => {
    const f = await deliveryFixture();
    assert.equal((await save(f, national())).status, 201);
    const purchase = await f.checkout({ method: "delivery", address: { ...f.address, postalCode } });
    assert.equal(purchase.quote.shippingTotal, "123.45");
    assert.equal(purchase.order.total, "323.45"); assert.equal(purchase.payment.amount, "323.45");
    assert.equal(purchase.fulfillment.addressSnapshot.postalCode, postalCode);
    assert.equal(purchase.fulfillment.rateSnapshot.name, "Envío nacional");
    assert.equal(purchase.fulfillment.shippingCost, "123.45");
    assert.equal(f.preferences[0].shipments.cost, 123.45);
    assert.equal(f.preferences[0].items.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity, 0), 20000);
    assert.equal(purchase.fulfillment.status, "awaiting_payment");
  });
}

for (const postalCode of ["4300", "06A00"]) {
  test(`invalid postal format ${postalCode} is rejected before checkout`, async () => {
    const f = await deliveryFixture(); await save(f, national());
    await assert.rejects(() => f.checkout({ method: "delivery", address: { ...f.address, postalCode } }), (error) => error.statusCode === 400);
    assert.equal(f.preferences.length, 0); assert.equal(f.tables.Order.length, 0);
  });
}

test("pickup remains free with an active national tariff", async () => {
  const f = await deliveryFixture(); await save(f, national());
  const purchase = await f.checkout();
  assert.equal(purchase.quote.shippingTotal, "0.00"); assert.equal(purchase.order.total, "200.00");
  assert.equal(purchase.fulfillment.shippingCost, "0.00"); assert.equal(purchase.fulfillment.rateSnapshot, null);
  assert.equal(f.preferences[0].shipments, undefined);
});

test("an administrator can deactivate/reactivate the same national tariff", async () => {
  const f = await deliveryFixture(); const created = await save(f, national());
  assert.equal((await save(f, { active: false }, created.data.rate.id)).status, 200);
  await assert.rejects(() => f.checkout({ method: "delivery", address: { ...f.address, postalCode: "43000" } }), (error) => error.statusCode === 422);
  assert.equal(f.preferences.length, 0);
  assert.equal((await save(f, { active: true }, created.data.rate.id)).status, 200);
  assert.equal((await f.checkout({ method: "delivery", address: { ...f.address, postalCode: "43000" } })).order.shippingTotal, "123.45");
});

test("price edits invalidate old quotes, preserve existing orders/payments and require reconfirmation", async () => {
  const f = await deliveryFixture(); const created = await save(f, national());
  const input = { method: "delivery", address: { ...f.address, postalCode: "06000" } };
  const previous = await f.checkout(input);
  const snapshot = JSON.stringify({ order: previous.order.get({ plain: true }), payment: previous.payment.get({ plain: true }), fulfillment: previous.fulfillment.get({ plain: true }) });
  const oldQuote = await f.service.createProductCheckoutQuote({ userId: f.customer.id, payload: { items: f.items, fulfillment: input } });
  assert.equal((await save(f, { amount: "155.50" }, created.data.rate.id)).status, 200);
  assert.equal(JSON.stringify({ order: previous.order.get({ plain: true }), payment: previous.payment.get({ plain: true }), fulfillment: previous.fulfillment.get({ plain: true }) }), snapshot);
  await assert.rejects(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id,
    payload: { idempotencyKey: randomUUID(), items: f.items, fulfillment: input, quoteToken: oldQuote.quoteToken }, mercadoPagoApi: f.api }), (error) => error.statusCode === 409);
  const updated = await f.checkout(input);
  assert.equal(updated.quote.shippingTotal, "155.50"); assert.equal(updated.order.total, "355.50");
  assert.equal(previous.fulfillment.shippingCost, "123.45");
});

test("regional rates retain priority over the national fallback", async () => {
  const f = await deliveryFixture(); const original = JSON.stringify(f.rate.get({ plain: true }));
  await save(f, national());
  const shipping = await f.load("services/shippingService.js");
  assert.equal((await shipping.quoteShipping("01001")).id, f.rate.id);
  const regional = await save(f, national({ name: "Región de prueba", postalCodeFrom: "06000", postalCodeTo: "06000", amount: "40.00" }));
  assert.equal(regional.status, 201);
  assert.equal((await shipping.quoteShipping("06000")).amount, "40.00");
  assert.equal((await shipping.quoteShipping("43000")).amount, "123.45");
  assert.equal(JSON.stringify(f.rate.get({ plain: true })), original);
});

test("a national tariff cannot be duplicated, even if the existing one is inactive", async () => {
  for (const active of [true, false]) {
    const f = await deliveryFixture(); await save(f, national({ active }));
    for (const newActive of [true, false]) {
      const rejected = await save(f, national({ name: "Otra nacional", active: newActive }));
      assert.equal(rejected.status, 409); assert.match(rejected.data.error, /Edita la existente/);
    }
    assert.equal(f.tables.ShippingRate.filter((item) => item.postalCodeFrom === "00000").length, 1);
  }
});

test("equal-width overlapping regions are rejected; different widths and inactive rates are allowed", async () => {
  const f = await deliveryFixture();
  const overlap = national({ name: "Región de prueba", postalCodeFrom: "01001", postalCodeTo: "02000" });
  const conflict = await save(f, overlap);
  assert.equal(conflict.status, 409); assert.match(conflict.data.error, /ambigüedad/);
  assert.equal((await save(f, { ...overlap, postalCodeTo: "01999" })).status, 201);
  const inactive = await save(f, { ...overlap, active: false });
  assert.equal(inactive.status, 201);
  assert.equal((await save(f, { active: true }, inactive.data.rate.id)).status, 409);
});

test("legacy duplicate national tariffs fail closed and can be deactivated to resolve ambiguity", async () => {
  const f = await deliveryFixture(); const primary = await save(f, national());
  const duplicate = await f.models.ShippingRate.create(national({ amount: "80.00" }));
  const shipping = await f.load("services/shippingService.js");
  await assert.rejects(() => shipping.quoteShipping("43000"), (error) => error.statusCode === 422);
  assert.equal((await save(f, { active: false }, duplicate.id)).status, 200);
  assert.equal((await shipping.quoteShipping("43000")).amount, "123.45");
  // Retained inactive legacy rows must not prevent the chosen existing rate
  // from being reactivated later. A second ACTIVE fallback still conflicts.
  assert.equal((await save(f, { active: false }, primary.data.rate.id)).status, 200);
  assert.equal((await save(f, { active: true }, primary.data.rate.id)).status, 200);
  assert.equal((await save(f, { active: true }, duplicate.id)).status, 409);
});

test("simultaneous national saves serialize the configuration write (in-memory transaction adapter)", async () => {
  const f = await deliveryFixture();
  const results = await Promise.all([save(f, national()), save(f, national())]);
  assert.deepEqual(results.map((item) => item.status).sort(), [201, 409]);
  assert.equal(f.tables.ShippingRate.length, 2);
});

test("browser-supplied shipping amounts cannot override a signed national quote", async () => {
  const f = await deliveryFixture(); await save(f, national());
  const input = { method: "delivery", address: { ...f.address, postalCode: "97000" } };
  const quote = await f.service.createProductCheckoutQuote({ userId: f.customer.id, payload: { items: f.items, fulfillment: input } });
  const result = await f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api,
    payload: { idempotencyKey: randomUUID(), items: f.items, fulfillment: { ...input, shippingCost: "0.01" }, shippingTotal: "0.01", quoteToken: quote.quoteToken } });
  const order = f.tables.Order.find((row) => row.id === result.orderId);
  assert.equal(order.shippingTotal, "123.45"); assert.equal(order.total, "323.45");
});
