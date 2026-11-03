import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { WebhookSignatureValidator } from "mercadopago";
import { observeRace, MIGRATION, TABLES } from "./productDeliveryNeonSupport.js";
import { down } from "../../migrations/20261102000100-create-product-delivery-system.js";

export async function runScenarios({ client, config, backends: [one, two], labels, store, check }) {
  const { models: m } = one;
  const runId = store.manifest.runId;
  const short = runId.slice(0, 8);
  const address = { recipientName: "PGDEL synthetic recipient", phone: "5555555555", postalCode: "00001",
    state: "Synthetic", municipality: "Synthetic", neighborhood: "Synthetic", street: "PGDEL test street",
    exteriorNumber: "1", interiorNumber: null, references: "Synthetic integration fixture " + short };
  const pickup = { method: "pickup", recipientName: address.recipientName, phone: address.phone };
  let customer, other, admin, product, rate, plan, groupPlan;
  const preferences = [];
  const providerPayments = new Map();
  const api = { async createPreference({ body, idempotencyKey }) {
    preferences.push({ body, idempotencyKey });
    return { id: "pgdel-pref-" + idempotencyKey,
      init_point: "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=PGDEL-FAKE-" + idempotencyKey };
  }, async getPayment({ id }) { return providerPayments.get(String(id)); },
  validateSignature(input) { WebhookSignatureValidator.validate(input); } };
  const items = () => [{ productId: product.id_producto, quantity: 2 }];
  const rejectsStatus = (callback, code) => assert.rejects(callback, (error) => error.statusCode === code);
  async function checkout(fulfillment = { method: "delivery", address: { ...address } }) {
    const quote = await one.checkout.createProductCheckoutQuote({ userId: customer.id, payload: { items: items(), fulfillment } });
    const payload = { items: items(), fulfillment, quoteToken: quote.quoteToken, idempotencyKey: randomUUID() };
    const result = await one.checkout.createMercadoPagoCheckout({ userId: customer.id, payload, mercadoPagoApi: api, requireProductFulfillment: true });
    return { quote, payload, order: await m.Order.findByPk(result.orderId),
      payment: await m.Payment.findOne({ where: { orderId: result.orderId } }),
      fulfillment: await m.OrderFulfillment.findOne({ where: { orderId: result.orderId } }) };
  }
  async function webhook(purchase, backend = one, providerId = null) {
    providerId ||= "98" + BigInt("0x" + randomBytes(8).toString("hex")).toString().padStart(20, "0");
    providerPayments.set(providerId, { id: providerId, status: "approved", status_detail: "accredited",
      transaction_amount: Number(purchase.payment.amount) - Number(purchase.order.shippingTotal || 0),
      shipping_amount: Number(purchase.order.shippingTotal || 0), transaction_details: { total_paid_amount: Number(purchase.payment.amount) },
      currency_id: "MXN", external_reference: purchase.order.id,
      preference_id: purchase.payment.providerPreferenceId,
      metadata: { order_id: purchase.order.id, user_id: customer.id, payment_id: purchase.payment.id } });
    const ts = String(Date.now()); const requestId = randomUUID();
    const hash = createHmac("sha256", backend.env.MERCADOPAGO_WEBHOOK_SECRET)
      .update(`id:${providerId};request-id:${requestId};ts:${ts};`).digest("hex");
    // Signature validation remains the real SDK implementation through the
    // checkout service; only remote provider responses are simulated.
    return backend.checkout.processMercadoPagoWebhook({ mercadoPagoApi: api,
      headers: { "x-request-id": requestId, "x-signature": `ts=${ts},v1=${hash}` },
      query: { "data.id": providerId, type: "payment" }, body: { type: "payment", data: { id: providerId } } });
  }
  async function advance(purchase, status, extra = {}) {
    const current = await m.OrderFulfillment.findOne({ where: { orderId: purchase.order.id } });
    return one.fulfillment.updateFulfillmentStatus({ orderId: purchase.order.id, actorId: admin.id,
      input: { status, expectedStatus: current.status, ...extra } });
  }
  async function sqlFailure(sql, values, expected) {
    await client.query("BEGIN");
    let actual;
    try { await client.query(sql, values); } catch (error) { actual = error.code; }
    finally { await client.query("ROLLBACK"); }
    assert.equal(actual, expected);
  }

  await check("four delivery tables, valid indexes, foreign keys and defaults", async () => {
    const indexes = (await client.query(`SELECT t.relname,i.indisvalid,i.indisunique,pg_get_indexdef(i.indexrelid) AS definition
      FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='core' AND t.relname=ANY($1::text[])`, [TABLES])).rows;
    assert.ok(indexes.length >= 10); assert.ok(indexes.every((index) => index.indisvalid));
    assert.ok(indexes.some((index) => index.relname === "UserAddresses" && index.indisunique && /WHERE "isDefault"/.test(index.definition)));
    const constraints = (await client.query(`SELECT c.contype FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='core' AND t.relname=ANY($1::text[])`, [TABLES])).rows;
    assert.equal(constraints.filter((constraint) => constraint.contype === "f").length, 6, "Six foreign keys link the new delivery tables.");
    const columns = (await client.query(`SELECT column_default,is_nullable,numeric_precision,numeric_scale FROM information_schema.columns
      WHERE table_schema='core' AND table_name='Orders' AND column_name='shippingTotal'`)).rows;
    assert.equal(columns.length, 1); assert.equal(columns[0].is_nullable, "NO");
    assert.equal(columns[0].numeric_precision, 12); assert.equal(columns[0].numeric_scale, 2);
    assert.equal(Number(columns[0].column_default), 0);
  });

  await check("rollback preserves nonzero shipping even without any fulfillment data", async () => {
    for (const table of TABLES) assert.equal((await client.query(`SELECT count(*)::int AS count FROM core."${table}"`)).rows[0].count, 0,
      "This isolated rollback case requires empty delivery tables; existing records are never removed to force it.");
    const transaction = await one.sequelize.transaction();
    let code;
    try {
      const user = await m.User.create({ email: "pgdel-guard-" + short + "@example.invalid", role: "cliente" }, { transaction });
      await m.Order.create({ userId: user.id, orderNumber: "PGDEL-GUARD-" + short, status: "draft", channel: "online",
        subtotal: "1.00", discountTotal: "0.00", taxTotal: "0.00", shippingTotal: "1.00", total: "2.00", currency: "MXN" }, { transaction });
      await down({ sequelize: one.sequelize, transaction });
    } catch (error) { code = error.original?.code || error.code; }
    finally { await transaction.rollback(); }
    assert.equal(code, "P0001");
  });

  await check("synthetic users, catalog and plans created without using existing sequences", async () => {
    const number = 1800000000 + Number.parseInt(short, 16) % 100000000;
    await one.sequelize.transaction(async (transaction) => {
      customer = await m.User.create({ email: "pgdel-" + short + "-customer@example.invalid", role: "cliente" }, { transaction });
      other = await m.User.create({ email: "pgdel-" + short + "-other@example.invalid", role: "cliente" }, { transaction });
      admin = await m.User.create({ email: "pgdel-" + short + "-admin@example.invalid", role: "administrador" }, { transaction });
      await m.Category.create({ id: -number, id_categoria: number, name: "PGDEL category " + short, productKind: "apparel" }, { transaction });
      await m.Brand.create({ id: -number, id_marca: number, name: "PGDEL brand " + short, categoryId: number }, { transaction });
      product = await m.Product.create({ id: -number, id_producto: number, name: "PGDEL product " + short,
        brandId: number, categoryId: number, price: "100.00", stock: 100, status: "Activo", productType: "Ropa" }, { transaction });
      rate = await m.ShippingRate.create({ name: "PGDEL synthetic rate " + short, postalCodeFrom: "00001", postalCodeTo: "00001",
        amount: "75.00", currency: "MXN", active: true, updatedBy: admin.id }, { transaction });
      plan = await m.MembershipPlan.create({ name: "PGDEL individual " + short, slug: "pgdel-individual-" + runId,
        price: "300.00", type: "individual", durationDays: 30, isActive: true }, { transaction });
      groupPlan = await m.MembershipPlan.create({ name: "PGDEL group " + short, slug: "pgdel-group-" + runId,
        price: "880.00", pricePerPerson: "440.00", minPeople: 2, maxPeople: 2, type: "group", durationDays: 30, isActive: true }, { transaction });
    });
    assert.equal(await m.User.count({ where: { id: [customer.id, other.id, admin.id] } }), 3);
  });

  let saved;
  await check("address create, read, edit, default and owner isolation on real rows", async () => {
    saved = await one.addresses.saveUserAddress({ userId: customer.id, input: { ...address, isDefault: true } });
    assert.equal((await m.UserAddress.findByPk(saved.id)).isDefault, true);
    saved = await one.addresses.saveUserAddress({ userId: customer.id, addressId: saved.id, input: { ...address, street: "PGDEL edited street" } });
    assert.equal(saved.street, "PGDEL edited street");
    await rejectsStatus(() => one.addresses.saveUserAddress({ userId: other.id, addressId: saved.id, input: address }), 404);
    await rejectsStatus(() => one.shipping.resolveDelivery({ userId: other.id, input: { method: "delivery", addressId: saved.id } }), 404);
    assert.equal(await m.UserAddress.count({ where: { userId: other.id } }), 0);
  });

  await check("concurrent default addresses serialize on two PostgreSQL PIDs", async () => {
    const race = await observeRace({ config, labels, table: "Users", id: customer.id,
      operations: [one, two].map((backend, index) => () => backend.addresses.saveUserAddress({ userId: customer.id,
        input: { ...address, street: "PGDEL concurrent " + index, isDefault: true } })) });
    assert.ok(race.results.every((result) => result.status === "fulfilled"));
    assert.equal(await m.UserAddress.count({ where: { userId: customer.id, isDefault: true } }), 1);
    return { distinctBlockedPids: new Set(race.blockedPids).size };
  });

  await check("server shipping rate, invalid coverage and immutable quoted totals", async () => {
    assert.equal((await one.shipping.quoteShipping("00001")).amount, "75.00");
    await rejectsStatus(() => one.shipping.quoteShipping("99999"), 422);
    const quote = await one.checkout.createProductCheckoutQuote({ userId: customer.id, payload: { items: items(), fulfillment: { method: "delivery", address } } });
    assert.equal(quote.shippingTotal, "75.00"); assert.equal(quote.total, "275.00");
    await rate.update({ amount: "76.00" });
    await rejectsStatus(() => one.checkout.createMercadoPagoCheckout({ userId: customer.id, mercadoPagoApi: api,
      payload: { items: items(), fulfillment: { method: "delivery", address }, quoteToken: quote.quoteToken, idempotencyKey: randomUUID() } }), 409);
    await rate.update({ amount: "75.00" });
  });

  let pickupPurchase, deliveryPurchase;
  await check("pickup checkout is free and starts awaiting real server confirmation", async () => {
    assert.ok(await one.shipping.getPickupLocation(), "The gym must already have pickup contact configured; existing configuration is not modified.");
    pickupPurchase = await checkout(pickup);
    assert.equal(pickupPurchase.order.total, "200.00"); assert.equal(pickupPurchase.order.shippingTotal, "0.00");
    assert.equal(pickupPurchase.fulfillment.status, "awaiting_payment");
    await rejectsStatus(() => advance(pickupPurchase, "preparing"), 409);
  });

  await check("delivery checkout snapshots address and charges shipping outside inventory", async () => {
    deliveryPurchase = await checkout({ method: "delivery", addressId: saved.id });
    assert.equal(deliveryPurchase.order.total, "275.00"); assert.equal(deliveryPurchase.payment.amount, "275.00");
    assert.equal(preferences.at(-1).body.shipments.cost, 75);
    assert.equal(await m.OrderItem.count({ where: { orderId: deliveryPurchase.order.id } }), 1);
    await one.addresses.deleteUserAddress({ userId: customer.id, addressId: saved.id });
    await deliveryPurchase.fulfillment.reload();
    assert.equal(deliveryPurchase.fulfillment.addressSnapshot.street, "PGDEL edited street");
  });

  await check("SQL rejects invalid postal codes, negative amounts and method states", async () => {
    await sqlFailure('UPDATE core."ShippingRates" SET amount=-1 WHERE id=$1', [rate.id], "23514");
    await sqlFailure('UPDATE core."ShippingRates" SET "postalCodeFrom"=\'99999\',"postalCodeTo"=\'00001\' WHERE id=$1', [rate.id], "23514");
    await sqlFailure('UPDATE core."ShippingRates" SET "postalCodeFrom"=\'ABCDE\' WHERE id=$1', [rate.id], "23514");
    await sqlFailure('UPDATE core."Orders" SET "shippingTotal"=-1 WHERE id=$1', [pickupPurchase.order.id], "23514");
    await sqlFailure('UPDATE core."OrderFulfillments" SET status=\'shipped\' WHERE id=$1', [pickupPurchase.fulfillment.id], "23514");
    await sqlFailure('UPDATE core."OrderFulfillments" SET "shippingCost"=75 WHERE id=$1', [pickupPurchase.fulfillment.id], "23514");
  });

  await check("SQL foreign keys and unique fulfillment/default indexes reject invalid rows", async () => {
    const defaultAddress = await m.UserAddress.findOne({ where: { userId: customer.id, isDefault: true } });
    await sqlFailure('UPDATE core."UserAddresses" SET "userId"=$1 WHERE id=$2', [randomUUID(), defaultAddress.id], "23503");
    const second = await one.addresses.saveUserAddress({ userId: customer.id, input: { ...address, isDefault: false } });
    await sqlFailure('UPDATE core."UserAddresses" SET "isDefault"=true WHERE id=$1', [second.id], "23505");
    await sqlFailure('UPDATE core."OrderFulfillments" SET "orderId"=$1 WHERE id=$2', [pickupPurchase.order.id, deliveryPurchase.fulfillment.id], "23505");
    await sqlFailure('UPDATE core."OrderFulfillments" SET "orderId"=$1 WHERE id=$2', [randomUUID(), deliveryPurchase.fulfillment.id], "23503");
  });

  await check("duplicate provider notifications confirm one payment, sale, receipt and logistics event", async () => {
    const providerId = "98" + BigInt("0x" + randomBytes(8).toString("hex")).toString().padStart(20, "0");
    assert.equal((await webhook(pickupPurchase, one, providerId)).ok, true);
    assert.equal((await webhook(pickupPurchase, one, providerId)).ok, true);
    assert.equal(await m.Receipt.count({ where: { paymentId: pickupPurchase.payment.id } }), 1);
    assert.equal(await m.FulfillmentEvent.count({ where: { fulfillmentId: pickupPurchase.fulfillment.id, toStatus: "payment_confirmed" } }), 1);
    assert.equal(await m.InventoryMovement.count({ where: { productId: product.id_producto, movementType: "sale" } }), 1);
    assert.equal(await m.InventoryReservation.count({ where: { orderId: pickupPurchase.order.id, status: "consumed" } }), 1);
  });

  await check("pickup preparing, ready and picked-up preserve dates, actor and terminal state", async () => {
    for (const status of ["preparing", "ready_for_pickup", "picked_up"]) await advance(pickupPurchase, status);
    await pickupPurchase.fulfillment.reload();
    assert.ok(pickupPurchase.fulfillment.preparedAt); assert.ok(pickupPurchase.fulfillment.readyAt); assert.ok(pickupPurchase.fulfillment.pickedUpAt);
    assert.equal(pickupPurchase.fulfillment.confirmedBy, admin.id);
    await rejectsStatus(() => advance(pickupPurchase, "preparing"), 409);
  });

  await check("delivery preparing, packed, shipped, incident and delivered keep real history", async () => {
    assert.equal((await webhook(deliveryPurchase)).ok, true);
    await advance(deliveryPurchase, "preparing"); await advance(deliveryPurchase, "packed");
    await rejectsStatus(() => advance(deliveryPurchase, "shipped"), 400);
    await advance(deliveryPurchase, "shipped", { carrier: "PGDEL fake carrier", trackingNumber: "PGDEL-" + short });
    const before = (await m.OrderFulfillment.findByPk(deliveryPurchase.fulfillment.id)).shippedAt;
    await advance(deliveryPurchase, "incident", { notes: "PGDEL synthetic incident" });
    await advance(deliveryPurchase, "shipped");
    assert.equal((await m.OrderFulfillment.findByPk(deliveryPurchase.fulfillment.id)).shippedAt.getTime(), before.getTime());
    await advance(deliveryPurchase, "delivered");
    const order = await m.Order.findByPk(deliveryPurchase.order.id, { include: [{ model: m.OrderFulfillment, as: "fulfillment",
      include: [{ model: m.FulfillmentEvent, as: "events", separate: true, order: [["sequence", "ASC"]] }] }] });
    assert.equal(order.fulfillment.status, "delivered"); assert.equal(order.fulfillment.confirmedBy, admin.id);
    assert.ok(order.fulfillment.events.length >= 7);
    const sequence = order.fulfillment.events.map((event) => BigInt(event.sequence));
    assert.ok(sequence.every((value, index) => !index || value > sequence[index - 1]));
  });

  await check("client role cannot update logistics through the service", async () => {
    await rejectsStatus(() => one.fulfillment.updateFulfillmentStatus({ orderId: deliveryPurchase.order.id, actorId: customer.id,
      input: { status: "preparing", expectedStatus: "delivered" } }), 403);
  });

  await check("pending order cancellation atomically releases reservation and cancels delivery", async () => {
    const purchase = await checkout();
    await one.orders.cancelPendingOrder({ orderId: purchase.order.id, userId: customer.id, cancelledBy: customer.id });
    assert.equal((await m.OrderFulfillment.findByPk(purchase.fulfillment.id)).status, "cancelled");
    assert.equal((await m.Payment.findByPk(purchase.payment.id)).status, "cancelled");
    assert.equal(await m.InventoryReservation.count({ where: { orderId: purchase.order.id, status: "released" } }), 1);
  });

  await check("receipt failure rolls back payment, inventory and logistics; retry succeeds", async () => {
    const purchase = await checkout();
    const before = (await m.Product.findByPk(product.id)).stock;
    m.Receipt.addHook("afterCreate", "pgdel-inject", () => { throw Object.assign(new Error("PGDEL injected receipt failure"), { code: "PGDEL_INJECTED" }); });
    try { await webhook(purchase); } catch { /* The persisted state is checked below. */ }
    finally { m.Receipt.removeHook("afterCreate", "pgdel-inject"); }
    assert.equal((await m.Payment.findByPk(purchase.payment.id)).status, "pending");
    assert.equal((await m.OrderFulfillment.findByPk(purchase.fulfillment.id)).status, "awaiting_payment");
    assert.equal((await m.Product.findByPk(product.id)).stock, before);
    assert.equal(await m.Receipt.count({ where: { paymentId: purchase.payment.id } }), 0);
    assert.equal((await webhook(purchase)).ok, true);
  });

  await check("individual and group membership checkout require no delivery or address", async () => {
    for (const selected of [plan, groupPlan]) {
      const result = await one.checkout.createMercadoPagoCheckout({ userId: customer.id, mercadoPagoApi: api,
        payload: { idempotencyKey: randomUUID(), membershipPlanId: selected.id,
          ...(selected.type === "group" ? { memberEmails: [other.email] } : {}) } });
      const order = await m.Order.findByPk(result.orderId);
      assert.equal(order.shippingTotal, "0.00"); assert.equal(await m.OrderFulfillment.count({ where: { orderId: order.id } }), 0);
      const purchase = { order, payment: await m.Payment.findOne({ where: { orderId: order.id } }) };
      assert.equal((await webhook(purchase)).ok, true);
      assert.equal((await m.Order.findByPk(order.id)).status, "paid");
    }
    assert.equal(await m.UserSubscription.count({ where: { userId: customer.id, planId: plan.id } }), 1);
    assert.equal(await m.SubscriptionHistory.count({ where: { userId: customer.id, planId: plan.id } }), 1);
    assert.equal(await m.SubscriptionGroup.count({ where: { ownerUserId: customer.id } }), 1);
  });

  let racedPurchase;
  await check("simultaneous checkout uses two blocked PostgreSQL PIDs and one order", async () => {
    const fulfillment = { method: "delivery", address };
    const quote = await one.checkout.createProductCheckoutQuote({ userId: customer.id, payload: { items: items(), fulfillment } });
    const payload = { items: items(), fulfillment, quoteToken: quote.quoteToken, idempotencyKey: randomUUID() };
    const preferenceBefore = preferences.length;
    const race = await observeRace({ config, labels, table: "Users", id: customer.id,
      operations: [one, two].map((backend) => () => backend.checkout.createMercadoPagoCheckout({ userId: customer.id, payload, mercadoPagoApi: api })) });
    assert.ok(race.results.every((result) => result.status === "fulfilled"));
    assert.equal(race.results[0].value.orderId, race.results[1].value.orderId);
    const orderId = race.results[0].value.orderId;
    assert.equal(preferences.length - preferenceBefore, 1);
    assert.equal(await m.Payment.count({ where: { idempotencyKey: payload.idempotencyKey } }), 1);
    assert.equal(await m.InventoryReservation.count({ where: { orderId } }), 1);
    assert.equal(await m.OrderFulfillment.count({ where: { orderId } }), 1);
    racedPurchase = { order: await m.Order.findByPk(orderId), payment: await m.Payment.findOne({ where: { orderId } }),
      fulfillment: await m.OrderFulfillment.findOne({ where: { orderId } }) };
    return { distinctBlockedPids: new Set(race.blockedPids).size };
  });

  await check("simultaneous duplicate webhooks produce one receipt and one logistics confirmation", async () => {
    const providerId = "98" + BigInt("0x" + randomBytes(8).toString("hex")).toString().padStart(20, "0");
    const race = await observeRace({ config, labels, table: "Orders", id: racedPurchase.order.id,
      operations: [one, two].map((backend) => () => webhook(racedPurchase, backend, providerId)) });
    assert.ok(race.results.every((result) => result.status === "fulfilled" && result.value.ok));
    assert.equal(await m.Receipt.count({ where: { paymentId: racedPurchase.payment.id } }), 1);
    assert.equal(await m.FulfillmentEvent.count({ where: { fulfillmentId: racedPurchase.fulfillment.id, toStatus: "payment_confirmed" } }), 1);
    return { distinctBlockedPids: new Set(race.blockedPids).size };
  });

  await check("simultaneous administrative transitions allow one winner and one stale conflict", async () => {
    const race = await observeRace({ config, labels, table: "Orders", id: racedPurchase.order.id,
      operations: [one, two].map((backend) => () => backend.fulfillment.updateFulfillmentStatus({ orderId: racedPurchase.order.id, actorId: admin.id,
        input: { status: "preparing", expectedStatus: "payment_confirmed" } })) });
    assert.equal(race.results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(race.results.filter((result) => result.status === "rejected" && result.reason.statusCode === 409).length, 1);
    assert.equal(await m.FulfillmentEvent.count({ where: { fulfillmentId: racedPurchase.fulfillment.id, toStatus: "preparing" } }), 1);
    return { distinctBlockedPids: new Set(race.blockedPids).size };
  });

  await check("promotion and shipping produce exact cents in order, payment and preference", async () => {
    const promotion = await m.Promotion.create({ name: "PGDEL promotion " + short, discountType: "fixed_amount", discountValue: "25.01",
      status: "active", startDate: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000) });
    await m.PromotionProduct.create({ promotionId: promotion.id, productId: product.id_producto });
    const purchase = await checkout();
    assert.equal(purchase.order.total, "249.99"); assert.equal(purchase.payment.amount, "249.99");
    const body = preferences.at(-1).body;
    assert.equal(body.items.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity, body.shipments.cost * 100), 24999);
  });

  await check("historical orders remain queryable with zero shipping and null fulfillment", async () => {
    const row = (await client.query('SELECT id FROM core."Orders" WHERE "orderNumber" NOT LIKE \'PGDEL-%\' LIMIT 1')).rows[0];
    assert.ok(row, "A preexisting order is required for this compatibility check.");
    const order = await m.Order.findByPk(row.id, { include: [{ model: m.OrderFulfillment, as: "fulfillment" }] });
    assert.ok(order); assert.equal(order.shippingTotal, "0.00"); assert.equal(order.fulfillment, null);
  });

  await check("rollback refuses to discard delivery data and preserves the migration", async () => {
    await client.query("BEGIN");
    let code;
    try { await down({ sequelize: { query: (sql) => client.query(sql) }, transaction: {} }); }
    catch (error) { code = error.code; }
    finally { await client.query("ROLLBACK"); }
    assert.equal(code, "P0001");
    assert.equal((await client.query('SELECT count(*)::int AS count FROM core."SequelizeMeta" WHERE name=$1', [MIGRATION])).rows[0].count, 1);
  });
}
