import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as SequelizeModule from "sequelize";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { deliveryFixture } from "./helpers/productDeliveryFixture.js";
import { assertFulfillmentTransition, normalizeAddress, FULFILLMENT_STATUSES, textField, uuidField } from "../utils/deliveryValidation.js";
import { up, down } from "../migrations/20261102000100-create-product-delivery-system.js";
import { validateLocalDeliveryTarget } from "../scripts/verifyProductDeliveryPostgres.js";

const rejectsStatus = (callback, status) => assert.rejects(callback, (error) => error.statusCode === status);
const advance = (f, purchase, status, extra = {}) => f.fulfillment.updateFulfillmentStatus({ orderId: purchase.order.id,
  actorId: f.admin.id, input: { status, expectedStatus: purchase.fulfillment.status, ...extra } });

test("recogida gratuita: cotización, orden, pago y preferencia tienen el mismo total", async () => {
  const f = await deliveryFixture();
  const p = await f.checkout();
  assert.equal(p.quote.shippingTotal, "0.00"); assert.equal(p.order.shippingTotal, "0.00");
  assert.equal(p.payment.amount, p.order.total); assert.equal(p.order.total, "200.00");
  assert.equal(p.fulfillment.addressSnapshot, null); assert.ok(p.fulfillment.pickupLocationSnapshot.address);
  assert.equal(f.preferences[0].shipments, undefined);
  assert.equal(p.fulfillment.status, "awaiting_payment");
  await rejectsStatus(() => advance(f, p, "preparing"), 409);
  assert.equal(f.tables.InventoryMovement.length, 0); assert.equal(f.tables.InventoryReservation[0].status, "active");
});

test("envío: tarifa del servidor en shipments, sin crear productos de inventario", async () => {
  const f = await deliveryFixture();
  const p = await f.checkout({ method: "delivery", address: f.address, shippingCost: 1 });
  assert.equal(p.quote.shippingTotal, "75.00"); assert.equal(p.order.total, "275.00");
  assert.equal(p.payment.amount, "275.00"); assert.equal(f.preferences[0].shipments.cost, 75);
  assert.equal(f.preferences[0].shipments.mode, "not_specified");
  assert.equal(f.tables.OrderItem.length, 1); assert.equal(f.tables.Product.length, 1);
  assert.equal(p.fulfillment.addressSnapshot.postalCode, "01001");
});

test("promoción real del catálogo: cotización, descuentos y cobro incluyen centavos exactos", async () => {
  const f = await deliveryFixture();
  const promotion = await f.models.Promotion.create({ name: "Descuento de prueba", status: "active", discountType: "fixed_amount", discountValue: "25.01",
    startDate: new Date(Date.now() - 60000), endDate: new Date(Date.now() + 60000) });
  await f.models.PromotionProduct.create({ promotionId: promotion.id, productId: 101 });
  const p = await f.checkout({ method: "delivery", address: f.address });
  assert.equal(p.quote.subtotal, "200.00"); assert.equal(p.quote.discountTotal, "25.01"); assert.equal(p.quote.total, "249.99");
  assert.equal(p.order.total, "249.99"); assert.equal(p.payment.amount, "249.99"); assert.equal(f.tables.OrderDiscount.length, 1);
  const body = f.preferences[0];
  assert.equal(body.items.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity, body.shipments.cost * 100), 24999);
});

test("dirección incompleta y teléfono inválido se rechazan antes de crear órdenes", async () => {
  const f = await deliveryFixture();
  for (const key of ["recipientName", "phone", "postalCode", "state", "municipality", "neighborhood", "street", "exteriorNumber", "references"]) {
    const address = { ...f.address }; delete address[key];
    await rejectsStatus(() => f.service.createProductCheckoutQuote({ userId: f.customer.id, payload: { items: f.items, fulfillment: { method: "delivery", address } } }), 400);
  }
  assert.throws(() => normalizeAddress({ ...f.address, phone: "abc5555555555" }));
  assert.throws(() => normalizeAddress(null), (error) => error.statusCode === 400);
  assert.equal(f.tables.Order.length, 0); assert.equal(f.preferences.length, 0);
});

test("validación rechaza controles, tipos inesperados e identificadores inválidos", () => {
  for (const value of [42, {}, [], "\u0000", "nom\nbre", "nom\rbre", "nom\tbre", "nombre\u001f"]) {
    assert.throws(() => textField(value, "Nombre"), (error) => error.statusCode === 400);
  }
  for (const value of [null, 1, "../address", "not-a-uuid"]) {
    assert.throws(() => uuidField(value), (error) => error.statusCode === 400);
  }
  assert.equal(uuidField(randomUUID()).length, 36);
  assert.equal(textField(" Cliente ", "Nombre"), "Cliente");
});

test("código postal fuera de cobertura, tarifa inactiva y cobertura ambigua bloquean el pago", async () => {
  const f = await deliveryFixture();
  const quote = (address) => f.service.createProductCheckoutQuote({ userId: f.customer.id, payload: { items: f.items, fulfillment: { method: "delivery", address } } });
  await rejectsStatus(() => quote({ ...f.address, postalCode: "99999" }), 422);
  await f.rate.update({ active: false }); await rejectsStatus(() => quote(f.address), 422);
  await f.rate.update({ active: true });
  await f.models.ShippingRate.create({ ...f.rate.get({ plain: true }), id: randomUUID() });
  await rejectsStatus(() => quote(f.address), 422);
});

test("recogida sin dirección real configurada se bloquea", async () => {
  const f = await deliveryFixture();
  await f.tables.AboutPage[0].update({ ctaAddress: "" });
  await rejectsStatus(() => f.checkout(), 422);
  assert.equal(f.tables.Order.length, 0);
});

test("las tarifas validan rangos, precisión, límites, moneda y activación antes de guardarse", async () => {
  const f = await deliveryFixture(); const shipping = await f.load("services/shippingService.js");
  const valid = { name: "Tarifa", postalCodeFrom: "00000", postalCodeTo: "99999", amount: "0" };
  assert.equal(shipping.normalizeShippingRate(valid).amount, "0.00");
  for (const change of [{ postalCodeFrom: "ABCDE" }, { postalCodeFrom: "99999", postalCodeTo: "00000" },
    { amount: -1 }, { amount: "1.001" }, { amount: "NaN" }, { amount: Infinity }, { amount: "10000000000" },
    { currency: "USD" }, { active: "true" }]) {
    assert.throws(() => shipping.normalizeShippingRate({ ...valid, ...change }), (error) => error.statusCode === 400);
  }
});

test("cotización no se puede alterar, usar desde otra cuenta ni después de vencer", async () => {
  const f = await deliveryFixture();
  const quote = await f.service.createProductCheckoutQuote({ userId: f.customer.id, payload: { items: f.items, fulfillment: f.pickup } });
  const make = (userId, quoteToken) => f.service.createMercadoPagoCheckout({ userId, mercadoPagoApi: f.api,
    payload: { items: f.items, fulfillment: f.pickup, quoteToken, idempotencyKey: randomUUID() } });
  await rejectsStatus(() => make(f.customer.id, quote.quoteToken + "altered"), 409);
  await rejectsStatus(() => make(f.other.id, quote.quoteToken), 409);
  const claims = jwt.decode(quote.quoteToken); delete claims.iat; delete claims.exp;
  const expired = jwt.sign(claims, f.env.JWT_SECRET, { expiresIn: -1 });
  await rejectsStatus(() => make(f.customer.id, expired), 409);
  assert.equal(f.tables.Order.length, 0);
});

test("cambios de tarifa, dirección, precio y cantidad requieren volver a confirmar", async () => {
  for (const change of ["rate", "address", "price", "quantity"]) {
    const f = await deliveryFixture();
    const fulfillment = { method: "delivery", address: { ...f.address } };
    const quote = await f.service.createProductCheckoutQuote({ userId: f.customer.id, payload: { items: f.items, fulfillment } });
    if (change === "rate") await f.rate.update({ amount: "90.00" });
    if (change === "address") fulfillment.address.street = "Otra calle";
    if (change === "price") await f.product.update({ price: "110.00" });
    const items = change === "quantity" ? [{ productId: 101, quantity: 3 }] : f.items;
    await rejectsStatus(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api,
      payload: { idempotencyKey: randomUUID(), fulfillment, quoteToken: quote.quoteToken, items } }), 409);
    assert.equal(f.tables.Order.length, 0); assert.equal(f.tables.InventoryReservation.length, 0);
  }
});

test("idempotencia: reintentos conservan orden, preferencia y reserva; cambiar entrega produce conflicto", async () => {
  const f = await deliveryFixture(); const p = await f.checkout();
  const retry = await f.service.createMercadoPagoCheckout({ userId: f.customer.id, payload: p.payload, mercadoPagoApi: f.api });
  assert.equal(retry.orderId, p.order.id); assert.equal(f.preferences.length, 1);
  assert.equal(f.tables.Payment.length, 1); assert.equal(f.tables.InventoryReservation.length, 1);
  await rejectsStatus(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api,
    payload: { ...p.payload, fulfillment: { ...f.pickup, phone: "5555555556" } } }), 409);
  const delivery = { method: "delivery", address: f.address };
  const quote = await f.service.createProductCheckoutQuote({ userId: f.customer.id, payload: { items: f.items, fulfillment: delivery } });
  await rejectsStatus(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api,
    payload: { ...p.payload, fulfillment: delivery, quoteToken: quote.quoteToken } }), 409);
});

test("checkout de productos exige entrega cotizada y rechaza intentos incompletos", async () => {
  const f = await deliveryFixture();
  await rejectsStatus(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api, requireProductFulfillment: true,
    payload: { idempotencyKey: randomUUID(), items: f.items } }), 400);
  await rejectsStatus(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api, requireProductFulfillment: true,
    payload: { idempotencyKey: randomUUID(), items: f.items, fulfillment: f.pickup } }), 400);
  const p = await f.checkout();
  const retry = await f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api, requireProductFulfillment: true, payload: p.payload });
  assert.equal(retry.orderId, p.order.id);
});

test("renovar la firma de una cotización idéntica reutiliza orden, preferencia y reserva", async () => {
  const f = await deliveryFixture(); const p = await f.checkout();
  const claims = jwt.decode(p.quote.quoteToken); delete claims.iat; delete claims.exp;
  const quoteToken = jwt.sign({ ...claims, iat: Math.floor(Date.now() / 1000) + 1 }, f.env.JWT_SECRET, { expiresIn: "15m" });
  const retry = await f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api,
    payload: { ...p.payload, quoteToken } });
  assert.equal(retry.orderId, p.order.id);
  assert.equal(f.tables.Order.length, 1); assert.equal(f.tables.Payment.length, 1);
  assert.equal(f.preferences.length, 1); assert.equal(f.tables.InventoryReservation.length, 1);
});

test("reintentos existentes aceptan su cotización vencida, pero no una alterada o con otro importe", async () => {
  const f = await deliveryFixture(); const p = await f.checkout({ method: "delivery", address: f.address });
  const claims = jwt.decode(p.quote.quoteToken); delete claims.iat; delete claims.exp;
  const expired = jwt.sign(claims, f.env.JWT_SECRET, { expiresIn: -1 });
  assert.equal((await f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api,
    payload: { ...p.payload, quoteToken: expired } })).orderId, p.order.id);
  for (const quoteToken of [expired + "tampered", jwt.sign(claims, "different-secret"),
    jwt.sign({ ...claims, sub: f.other.id }, f.env.JWT_SECRET),
    jwt.sign({ ...claims, aud: "other-audience" }, f.env.JWT_SECRET),
    jwt.sign({ ...claims, digest: undefined }, f.env.JWT_SECRET)]) {
    await rejectsStatus(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api,
      payload: { ...p.payload, quoteToken } }), 409);
  }
  await f.rate.update({ amount: "80.00" });
  const changed = await f.service.createProductCheckoutQuote({ userId: f.customer.id,
    payload: { items: f.items, fulfillment: p.payload.fulfillment } });
  await rejectsStatus(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, mercadoPagoApi: f.api,
    payload: { ...p.payload, quoteToken: changed.quoteToken } }), 409);
  assert.equal(f.tables.Order.length, 1); assert.equal(f.preferences.length, 1);
});

test("dos checkouts concurrentes de la misma operación conservan una sola orden", async () => {
  const f = await deliveryFixture();
  // The adapter serializes transactions, but must also emulate the database's
  // unique payment key so the losing transaction exercises the retry path.
  const create = f.models.Payment.create;
  f.models.Payment.create = async function (values) {
    if (f.tables.Payment.some((payment) => payment.idempotencyKey === values.idempotencyKey)) {
      throw Object.assign(new Error("duplicate"), { name: "SequelizeUniqueConstraintError", errors: [{ path: "idempotencyKey" }] });
    }
    return create.call(this, values);
  };
  const quote = await f.service.createProductCheckoutQuote({ userId: f.customer.id, payload: { items: f.items, fulfillment: f.pickup } });
  const payload = { items: f.items, fulfillment: f.pickup, quoteToken: quote.quoteToken, idempotencyKey: randomUUID() };
  const results = await Promise.all([1, 2].map(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, payload, mercadoPagoApi: f.api })));
  assert.equal(results[0].orderId, results[1].orderId);
  assert.equal(f.tables.Order.length, 1); assert.equal(f.tables.Payment.length, 1);
  assert.equal(f.preferences.length, 1); assert.equal(f.tables.InventoryReservation.length, 1);
});

test("pago aprobado y webhooks duplicados: una venta, recibo, reserva consumida y evento logístico", async () => {
  const f = await deliveryFixture(); const p = await f.checkout({ method: "delivery", address: f.address });
  const request = randomUUID();
  assert.equal((await f.webhook(p, "approved", "8800101", request)).ok, true);
  assert.equal((await f.webhook(p, "approved", "8800101", request)).ok, true);
  assert.equal((await f.webhook(p, "approved", "8800101")).ok, true);
  assert.equal(p.order.status, "paid"); assert.equal(p.payment.status, "paid");
  assert.equal(p.fulfillment.status, "payment_confirmed"); assert.equal(f.product.stock, 48);
  assert.equal(f.tables.InventoryMovement.length, 1); assert.equal(f.tables.Receipt.length, 1);
  assert.equal(f.tables.InventoryReservation.filter((row) => row.status === "consumed").length, 1);
  assert.equal(f.tables.FulfillmentEvent.filter((row) => row.toStatus === "payment_confirmed").length, 1);
});

test("pago rechazado libera reservas y conserva la entrega pendiente", async () => {
  const f = await deliveryFixture(); const p = await f.checkout();
  assert.equal((await f.webhook(p, "rejected")).ok, true);
  assert.equal(p.payment.status, "failed"); assert.equal(p.fulfillment.status, "awaiting_payment");
  assert.equal(f.tables.InventoryReservation[0].status, "released"); assert.equal(f.product.stock, 50);
  await rejectsStatus(() => advance(f, p, "preparing"), 409);
});

test("importe aprobado incorrecto no confirma la orden ni la logística", async () => {
  const f = await deliveryFixture(); const p = await f.checkout({ method: "delivery", address: f.address });
  await rejectsStatus(() => f.webhook(p, "approved", "8800101", randomUUID(), "200.00"), 400);
  assert.equal(p.payment.status, "pending"); assert.equal(p.fulfillment.status, "awaiting_payment");
  assert.equal(f.tables.InventoryMovement.length, 0);
});

test("fallo de recibo revierte pago, venta y evento de entrega; reintento confirma", async () => {
  const f = await deliveryFixture(); const p = await f.checkout(); f.failNext.add("Receipt");
  await rejectsStatus(() => f.webhook(p), 500);
  assert.equal(p.order.status, "pending_payment"); assert.equal(p.fulfillment.status, "awaiting_payment");
  assert.equal(f.tables.InventoryMovement.length, 0); assert.equal(f.product.stock, 50);
  assert.equal(f.tables.FulfillmentEvent.length, 1);
  assert.equal((await f.webhook(p)).ok, true); assert.equal(p.fulfillment.status, "payment_confirmed");
});

test("recogida administrativa registra fechas, actor, historial y rechaza cambios posteriores", async () => {
  const f = await deliveryFixture(); const p = await f.checkout(); await f.webhook(p);
  await rejectsStatus(() => advance(f, p, "picked_up"), 409);
  for (const status of ["preparing", "ready_for_pickup", "picked_up"]) await advance(f, p, status);
  assert.ok(p.fulfillment.preparedAt); assert.ok(p.fulfillment.readyAt); assert.ok(p.fulfillment.pickedUpAt);
  assert.equal(p.fulfillment.confirmedBy, f.admin.id);
  assert.equal(f.tables.FulfillmentEvent.filter((event) => event.actorId === f.admin.id).length, 3);
  await rejectsStatus(() => advance(f, p, "preparing"), 409);
  await rejectsStatus(() => advance(f, p, "picked_up"), 409);
});

test("envío administrativo exige guía y paquetería y registra entrega real", async () => {
  const f = await deliveryFixture(); const p = await f.checkout({ method: "delivery", address: f.address }); await f.webhook(p);
  await advance(f, p, "preparing"); await advance(f, p, "packed");
  await rejectsStatus(() => advance(f, p, "shipped"), 400);
  await advance(f, p, "shipped", { carrier: "Paquetería de prueba", trackingNumber: "GUIA-TEST" });
  await advance(f, p, "delivered");
  assert.ok(p.fulfillment.shippedAt); assert.ok(p.fulfillment.deliveredAt); assert.equal(p.fulfillment.confirmedBy, f.admin.id);
  assert.equal(f.tables.InventoryMovement.length, 1);
});

test("incidencia solo vuelve al estado previo; cancelación y fallo requieren observaciones", async () => {
  const f = await deliveryFixture(); const p = await f.checkout(); await f.webhook(p);
  await advance(f, p, "preparing"); await rejectsStatus(() => advance(f, p, "incident"), 400);
  await advance(f, p, "incident", { notes: "Producto en revisión" });
  await rejectsStatus(() => advance(f, p, "ready_for_pickup"), 409);
  await advance(f, p, "preparing");
  await rejectsStatus(() => advance(f, p, "cancelled"), 400);
  await advance(f, p, "cancelled", { notes: "Cliente solicita cancelar la entrega" });
  assert.equal(p.payment.status, "paid"); assert.ok(p.fulfillment.cancelledAt);
});

test("entrega fallida permite reexpedición con guía; pagos en revisión bloquean los cambios", async () => {
  const f = await deliveryFixture(); const p = await f.checkout({ method: "delivery", address: f.address }); await f.webhook(p);
  await advance(f, p, "preparing"); await advance(f, p, "packed");
  await advance(f, p, "shipped", { carrier: "Prueba", trackingNumber: "GUIA-1" });
  await rejectsStatus(() => advance(f, p, "delivery_failed"), 400);
  await advance(f, p, "delivery_failed", { notes: "Domicilio cerrado" });
  await advance(f, p, "shipped", { carrier: "Prueba", trackingNumber: "GUIA-2" });
  assert.equal(p.fulfillment.trackingNumber, "GUIA-2");
  const shipmentEvents = f.tables.FulfillmentEvent.filter((event) => event.toStatus === "shipped");
  assert.equal(shipmentEvents[0].details.trackingNumber, "GUIA-1"); assert.equal(shipmentEvents[1].details.trackingNumber, "GUIA-2");
  await p.order.update({ status: "disputed" });
  await rejectsStatus(() => advance(f, p, "delivered"), 409);
});

test("resolver incidencias conserva fechas originales; una reexpedición registra una fecha nueva", async () => {
  const f = await deliveryFixture(); const p = await f.checkout({ method: "delivery", address: f.address }); await f.webhook(p);
  for (const [status, dateField] of [["preparing", "preparedAt"], ["packed", "packedAt"], ["shipped", "shippedAt"]]) {
    await advance(f, p, status, { carrier: "Prueba", trackingNumber: "GUIA-1" });
    const original = new Date("2026-10-01T00:00:00Z");
    await p.fulfillment.update({ [dateField]: original });
    await advance(f, p, "incident", { notes: "Incidencia temporal" });
    await advance(f, p, status);
    assert.equal(p.fulfillment[dateField].getTime(), original.getTime());
  }
  await advance(f, p, "delivery_failed", { notes: "Domicilio cerrado" });
  await advance(f, p, "shipped", { trackingNumber: "GUIA-2" });
  assert.ok(p.fulfillment.shippedAt > new Date("2026-10-01T00:00:00Z"));
  await advance(f, p, "incident", { notes: "Revisar expedición" });
  await advance(f, p, "cancelled", { notes: "Cancelación confirmada" });
  assert.ok(p.fulfillment.cancelledAt);
});

test("rangos inclusivos y específicos conservan ceros iniciales y admiten envío gratuito explícito", async () => {
  const f = await deliveryFixture();
  const shipping = await f.load("services/shippingService.js");
  assert.equal((await shipping.quoteShipping("01000")).id, f.rate.id);
  assert.equal((await shipping.quoteShipping("01999")).id, f.rate.id);
  const narrow = await f.models.ShippingRate.create({ name: "Gratis", postalCodeFrom: "01001", postalCodeTo: "01001",
    amount: "0.00", currency: "MXN", active: true });
  assert.equal((await shipping.quoteShipping("01001")).id, narrow.id);
  const p = await f.checkout({ method: "delivery", address: f.address });
  assert.equal(p.order.shippingTotal, "0.00"); assert.equal(p.payment.amount, "200.00");
  assert.equal(f.preferences[0].shipments, undefined); assert.equal(p.fulfillment.method, "delivery");
});

test("un cliente no puede invocar el servicio administrativo directamente", async () => {
  const f = await deliveryFixture(); const p = await f.checkout(); await f.webhook(p);
  await rejectsStatus(() => f.fulfillment.updateFulfillmentStatus({ orderId: p.order.id, actorId: f.customer.id,
    input: { status: "preparing", expectedStatus: "payment_confirmed" } }), 403);
  assert.equal(p.fulfillment.status, "payment_confirmed");
});

test("cancelar una orden pendiente libera inventario y registra cancelación logística", async () => {
  const f = await deliveryFixture(); const p = await f.checkout();
  const orders = await f.load("services/orderService.js");
  await orders.cancelPendingOrder({ orderId: p.order.id, userId: f.customer.id, cancelledBy: f.customer.id });
  assert.equal(p.payment.status, "cancelled"); assert.equal(p.fulfillment.status, "cancelled");
  assert.equal(f.tables.InventoryReservation[0].status, "released");
  assert.equal(f.tables.FulfillmentEvent.at(-1).actorId, f.customer.id); assert.equal(f.product.stock, 50);
});

test("intentos administrativos duplicados y estado obsoleto no duplican eventos", async () => {
  const f = await deliveryFixture(); const p = await f.checkout(); await f.webhook(p);
  const input = { status: "preparing", expectedStatus: "payment_confirmed" };
  const results = await Promise.allSettled([1, 2].map(() => f.fulfillment.updateFulfillmentStatus({ orderId: p.order.id, actorId: f.admin.id, input })));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(f.tables.FulfillmentEvent.filter((event) => event.toStatus === "preparing").length, 1);
});

test("direcciones: propiedad, una predeterminada y snapshot inmune a edición/eliminación", async () => {
  const f = await deliveryFixture();
  const first = await f.addressService.saveUserAddress({ userId: f.customer.id, input: { ...f.address, isDefault: true } });
  const second = await f.addressService.saveUserAddress({ userId: f.customer.id, input: { ...f.address, street: "Segunda calle", isDefault: true } });
  assert.equal(first.isDefault, false); assert.equal(second.isDefault, true);
  await rejectsStatus(() => f.addressService.saveUserAddress({ userId: f.other.id, addressId: first.id, input: f.address }), 404);
  const foreignAddress = await f.models.UserAddress.create({ ...f.address, userId: f.other.id });
  await rejectsStatus(() => f.checkout({ method: "delivery", addressId: foreignAddress.id }), 404);
  const p = await f.checkout({ method: "delivery", addressId: first.id });
  await f.addressService.saveUserAddress({ userId: f.customer.id, addressId: first.id, input: { ...f.address, street: "Calle editada" } });
  await f.addressService.deleteUserAddress({ userId: f.customer.id, addressId: first.id });
  assert.equal(p.fulfillment.addressSnapshot.street, f.address.street);
});

test("matriz logística: no mezcla recogida con domicilio y los estados terminales no tienen salidas", () => {
  for (const method of ["pickup", "delivery"]) {
    for (const status of ["picked_up", "delivered", "cancelled"]) for (const next of FULFILLMENT_STATUSES) {
      assert.throws(() => assertFulfillmentTransition({ method, status }, next));
    }
  }
  assert.throws(() => assertFulfillmentTransition({ method: "pickup", status: "preparing" }, "packed"));
  assert.throws(() => assertFulfillmentTransition({ method: "delivery", status: "preparing" }, "ready_for_pickup"));
});

test("compras de membresía y órdenes antiguas siguen sin requerir logística", async () => {
  const f = await deliveryFixture();
  const plan = await f.models.MembershipPlan.create({ name: "Mensual", type: "individual", price: "300.00", isActive: true, durationDays: 30 });
  const payload = { idempotencyKey: randomUUID(), membershipPlanId: plan.id };
  const result = await f.service.createMercadoPagoCheckout({ userId: f.customer.id, payload, mercadoPagoApi: f.api });
  const order = f.tables.Order.find((row) => row.id === result.orderId);
  assert.equal(order.shippingTotal, "0.00"); assert.equal(f.tables.OrderFulfillment.length, 0);
  await rejectsStatus(() => f.service.createMercadoPagoCheckout({ userId: f.customer.id, payload: { ...payload, fulfillment: f.pickup }, mercadoPagoApi: f.api }), 400);
  const legacy = await f.service.createMercadoPagoCheckout({ userId: f.customer.id, payload: { idempotencyKey: randomUUID(), items: f.items }, mercadoPagoApi: f.api });
  assert.ok(legacy.orderId); assert.equal(f.tables.OrderFulfillment.length, 0);
  const purchase = { order, payment: f.tables.Payment.find((row) => row.orderId === order.id) };
  assert.equal((await f.webhook(purchase)).ok, true);
  assert.equal(f.tables.UserSubscription.length, 1); assert.equal(f.tables.OrderFulfillment.length, 0);
});

test("centavos con descuentos: preferencia + envío coincide exactamente con orden y pago", async () => {
  const f = await deliveryFixture();
  const body = f.service.buildPreferenceBody({ order: { id: randomUUID(), userId: f.customer.id, total: "175.00", shippingTotal: "75.00",
    items: [{ id: randomUUID(), itemNameSnapshot: "Tres unidades con descuento", quantity: 3, subtotal: "100.00" }] }, payment: { id: randomUUID(), amount: "175.00" } });
  assert.equal(body.items.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity, Math.round(body.shipments.cost * 100)), 17500);
});

test("migración es aditiva, usa la transacción del runner y protege rollback con datos", async () => {
  const calls = []; const transaction = {};
  const sequelize = { query: async (sql, options) => { calls.push(sql); assert.equal(options.transaction, transaction); } };
  await up({ sequelize, transaction });
  assert.match(calls[0], /ADD COLUMN "shippingTotal"/); assert.doesNotMatch(calls[0], /UPDATE "core"\."Payments"|DELETE FROM|DROP TABLE/);
  await down({ sequelize, transaction }); assert.match(calls[1], /RAISE EXCEPTION/);
  assert.match(calls[1], /"Orders" WHERE "shippingTotal" <> 0/);
  assert.ok(calls[1].indexOf("ACCESS EXCLUSIVE MODE") < calls[1].indexOf("IF EXISTS"));
});

test("modelos y asociaciones reales de Sequelize resuelven pedidos, eventos y propietarios sin conectar", async () => {
  const sequelize = new SequelizeModule.Sequelize("postgres://offline:offline@127.0.0.1/titanium_delivery_test", { logging: false });
  sequelize.connectionManager.getConnection = async () => { throw new Error("Database connections forbidden in this test"); };
  const context = vm.createContext({ console, Date });
  const cache = new Map();
  const config = new URL("../config/sequelize.js", import.meta.url).href;
  const external = new vm.SyntheticModule(Object.keys(SequelizeModule), function () {
    for (const [key, value] of Object.entries(SequelizeModule)) this.setExport(key, value);
  }, { context });
  const connection = new vm.SyntheticModule(["sequelize"], function () { this.setExport("sequelize", sequelize); }, { context });
  async function moduleFor(url) {
    if (url.href === config) return connection;
    if (!cache.has(url.href)) cache.set(url.href, new vm.SourceTextModule(await readFile(url, "utf8"), { context, identifier: url.href }));
    return cache.get(url.href);
  }
  const entry = await moduleFor(new URL("../models/index.js", import.meta.url));
  await entry.link((specifier, parent) => specifier === "sequelize" ? external : moduleFor(new URL(specifier, parent.identifier)));
  await entry.evaluate();
  const { Order, User, UserAddress, OrderFulfillment, FulfillmentEvent, ShippingRate } = entry.namespace;
  for (const [source, alias, target, foreignKey] of [
    [User, "addresses", UserAddress, "userId"], [UserAddress, "user", User, "userId"],
    [Order, "fulfillment", OrderFulfillment, "orderId"], [OrderFulfillment, "order", Order, "orderId"],
    [OrderFulfillment, "events", FulfillmentEvent, "fulfillmentId"], [FulfillmentEvent, "fulfillment", OrderFulfillment, "fulfillmentId"],
    [FulfillmentEvent, "actor", User, "actorId"], [OrderFulfillment, "confirmedByUser", User, "confirmedBy"],
    [ShippingRate, "updatedByUser", User, "updatedBy"],
  ]) {
    assert.equal(source.associations[alias].target, target);
    assert.equal(source.associations[alias].foreignKey, foreignKey);
  }
  assert.equal(Order.rawAttributes.shippingTotal.defaultValue, 0);
  assert.equal(FulfillmentEvent.rawAttributes.sequence.autoIncrement, true);
  assert.equal(FulfillmentEvent.options.updatedAt, false);
  const includes = Order._validateIncludedElements({ model: Order, include: [{ model: OrderFulfillment, as: "fulfillment",
    include: [{ model: FulfillmentEvent, as: "events", separate: true, order: [["sequence", "ASC"]] }] }] });
  assert.equal(includes.includeMap.fulfillment.includeMap.events.separate, true);
  await assert.rejects(() => OrderFulfillment.build({ orderId: randomUUID(), method: "invalid", recipientName: "Test", phone: "5555555555" }).validate(),
    (error) => error.name === "SequelizeValidationError");
  await sequelize.close();
});

test("verificación PostgreSQL solo acepta una base local vacía y autorización explícita", () => {
  const flags = ["--run", "--allow-local-ddl"];
  assert.ok(validateLocalDeliveryTarget("postgres://test:test@127.0.0.1/titanium_delivery_test", flags));
  for (const url of [undefined, "postgres://test:test@remote.invalid/titanium_delivery_test", "postgres://test:test@127.0.0.1/production",
    "postgres://test:test@127.0.0.1/titanium_delivery_test?host=remote.invalid", "https://127.0.0.1/titanium_delivery_test"]) {
    assert.throws(() => validateLocalDeliveryTarget(url, flags));
  }
  assert.throws(() => validateLocalDeliveryTarget("postgres://test:test@127.0.0.1/titanium_delivery_test", []));
});

test("HTTP real: JWT, autorización, propiedad, filtros y seguimiento sin datos privados de otros clientes", async (t) => {
  const f = await deliveryFixture(); const p = await f.checkout(); await f.webhook(p);
  const tokens = await Promise.all([f.customer, f.other, f.admin].map(f.tokenFor));
  const checkoutRoutes = (await f.load("routes/checkoutRoutes.js")).default;
  const app = express(); app.use(express.json()); app.use("/api", f.orders, f.routes, checkoutRoutes);
  const server = await new Promise((resolve) => { const listening = app.listen(0, "127.0.0.1", () => resolve(listening)); });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const root = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, token, options = {}) => fetch(root + path, { ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  assert.equal((await request("/addresses/me")).status, 401);
  const options = await (await request("/delivery/options", tokens[0])).json(); assert.ok(options.pickupLocation.address);
  const quoteResponse = await request("/checkout/product-quote", tokens[0], { method: "POST", body: JSON.stringify({ items: f.items, fulfillment: f.pickup }) });
  assert.equal(quoteResponse.status, 200); assert.equal(quoteResponse.headers.get("cache-control"), "no-store");
  assert.ok((await quoteResponse.json()).quoteToken);
  assert.equal((await request("/checkout/products/mercadopago", tokens[0], { method: "POST", body: JSON.stringify({ idempotencyKey: randomUUID(), items: f.items }) })).status, 400);
  assert.equal((await request(`/orders/${p.order.id}`, tokens[1])).status, 403);
  assert.equal((await request(`/admin/orders/${p.order.id}/fulfillment`, tokens[0], { method: "PATCH", body: JSON.stringify({ status: "preparing", expectedStatus: "payment_confirmed" }) })).status, 403);
  assert.equal((await request(`/admin/orders/${p.order.id}/fulfillment`, tokens[2], { method: "PATCH", body: JSON.stringify({ status: "preparing", expectedStatus: "payment_confirmed" }) })).status, 200);
  const detail = await (await request(`/orders/${p.order.id}`, tokens[0])).json();
  assert.equal(detail.order.fulfillment.status, "preparing"); assert.equal(detail.order.fulfillment.events.length, 3);
  assert.equal(detail.order.fulfillment.events[2].actorId, undefined); assert.equal(detail.order.metadata, undefined);
  const mine = await (await request("/orders/me?productOnly=true", tokens[1])).json(); assert.equal(mine.orders.length, 0);
  const filtered = await (await request("/admin/orders?productOnly=true&deliveryMethod=delivery", tokens[2])).json(); assert.equal(filtered.orders.length, 0);
  const found = await (await request("/admin/orders?productOnly=true&deliveryMethod=pickup&fulfillmentStatus=preparing", tokens[2])).json(); assert.equal(found.orders.length, 1);
  assert.equal((await request("/admin/shipping-rates", tokens[0])).status, 403);
  const saved = await (await request("/addresses/me", tokens[0], { method: "POST", body: JSON.stringify({ ...f.address, isDefault: true }) })).json();
  assert.ok(saved.address.id);
  const addresses = await request("/addresses/me", tokens[0]);
  assert.equal(addresses.headers.get("cache-control"), "no-store");
  assert.equal((await addresses.json()).addresses.length, 1);
  assert.equal((await request(`/addresses/me/${saved.address.id}`, tokens[1], { method: "PUT", body: JSON.stringify(f.address) })).status, 404);
  assert.equal((await request(`/addresses/me/${saved.address.id}`, tokens[0], { method: "DELETE" })).status, 204);
  assert.equal((await request("/admin/shipping-rates", tokens[2], { method: "POST", body: JSON.stringify({ name: "Nueva", postalCodeFrom: "02000", postalCodeTo: "02999", amount: "50.00" }) })).status, 201);
  const rates = await (await request("/admin/shipping-rates", tokens[2])).json(); assert.equal(rates.rates.length, 2);
  const updatedRate = await request(`/admin/shipping-rates/${f.rate.id}`, tokens[2], { method: "PATCH", body: JSON.stringify({ amount: "80.00", active: false }) });
  assert.equal(updatedRate.status, 200); assert.equal((await updatedRate.json()).rate.amount, "80.00");
  assert.equal(f.rate.updatedBy, f.admin.id); assert.equal(f.rate.active, false);
  assert.equal((await request(`/admin/shipping-rates/${randomUUID()}`, tokens[2], { method: "PATCH", body: "{}" })).status, 404);
  assert.equal((await request("/admin/shipping-rates/invalid", tokens[2], { method: "PATCH", body: "{}" })).status, 400);
});
