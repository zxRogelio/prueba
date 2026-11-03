import test from "node:test";
import assert from "node:assert/strict";
import { mercadoPagoPaymentAmounts } from "../utils/mercadoPagoAmounts.js";
import { deliveryFixture } from "./helpers/productDeliveryFixture.js";

test("real Checkout Pro shipping shape separates merchandise 100 and shipping 75", () => {
  assert.deepEqual(mercadoPagoPaymentAmounts({ transaction_amount: 100, shipping_amount: 75, transaction_details: { total_paid_amount: 175 } }),
    { merchandiseCents: 10000, shippingCents: 7500, totalCents: 17500 });
});
test("pickup and memberships preserve their amount without shipping", () => {
  for (const shipping_amount of [undefined, null, 0, "0.00"]) assert.equal(mercadoPagoPaymentAmounts({ transaction_amount: "300.00", shipping_amount }).totalCents, 30000);
});
test("provider fees or installment totals cannot substitute for order principal", () => {
  assert.equal(mercadoPagoPaymentAmounts({ transaction_amount: 100, shipping_amount: 75, transaction_details: { total_paid_amount: 200, net_received_amount: 163.27 } }).totalCents, 17500);
});
test("malformed provider merchandise and shipping values fail closed", () => {
  for (const transaction_amount of [undefined, null, "", " ", true, -1, 0, 1.001, Infinity, NaN]) assert.throws(() => mercadoPagoPaymentAmounts({ transaction_amount }), (error) => error.statusCode === 400);
  for (const shipping_amount of ["", " ", true, -1, 0.001, Infinity, NaN]) assert.throws(() => mercadoPagoPaymentAmounts({ transaction_amount: 100, shipping_amount }), (error) => error.statusCode === 400);
});
test("a signed provider payment with separate shipping confirms one receipt and sale", async () => {
  const f = await deliveryFixture(); const purchase = await f.checkout({ method: "delivery", address: f.address });
  await f.webhook(purchase);
  assert.equal(purchase.payment.status, "paid"); assert.equal(purchase.order.total, "275.00");
  assert.equal(purchase.fulfillment.status, "payment_confirmed");
  assert.equal(f.tables.Receipt.length, 1); assert.equal(f.tables.InventoryMovement.length, 1);
  const audit = f.tables.PaymentWebhookEvent[0].payload.providerPayment;
  assert.equal(audit.amount, 275); assert.equal(audit.merchandiseAmount, 200); assert.equal(audit.shippingAmount, 75);
});
test("missing, inflated and substituted shipping cannot activate a paid delivery", async () => {
  for (const change of [{ shipping_amount: undefined }, { shipping_amount: 0, transaction_amount: 275 },
    { shipping_amount: 74, transaction_amount: 201 }, { shipping_amount: 75, transaction_amount: 275 },
    { shipping_amount: 75, transaction_amount: 199, transaction_details: { total_paid_amount: 275 } }]) {
    const f = await deliveryFixture(); const purchase = await f.checkout({ method: "delivery", address: f.address });
    const getPayment = f.api.getPayment;
    f.api.getPayment = async (input) => ({ ...await getPayment(input), ...change });
    await assert.rejects(() => f.webhook(purchase), (error) => error.statusCode === 400);
    assert.equal(purchase.payment.status, "pending"); assert.equal(f.tables.Receipt.length, 0); assert.equal(f.tables.InventoryMovement.length, 0);
  }
});
