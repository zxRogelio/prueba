import {
  ORDER_TRANSITIONS,
  PAYMENT_REFUND_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  assertOrderTransition,
  assertPaymentRefundTransition,
  assertPaymentTransition,
} from "../services/stateTransitionService.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectConflict(callback, label) {
  try {
    callback();
  } catch (error) {
    assert(
      error.statusCode === 409,
      `${label}: se esperaba 409, llego ${error.statusCode || "sin status"}.`
    );
    return;
  }

  throw new Error(`${label}: se esperaba error 409.`);
}

function verifyMatrix({ name, matrix, assertTransition }) {
  const states = Object.keys(matrix);
  let validCount = 0;
  let invalidCount = 0;

  for (const currentStatus of states) {
    for (const nextStatus of states) {
      if (matrix[currentStatus].has(nextStatus)) {
        const resolved = assertTransition(currentStatus, nextStatus);
        assert(
          resolved === nextStatus,
          `${name}: ${currentStatus} -> ${nextStatus} devolvio ${resolved}.`
        );
        validCount += 1;
      } else {
        expectConflict(
          () => assertTransition(currentStatus, nextStatus),
          `${name}: ${currentStatus} -> ${nextStatus}`
        );
        invalidCount += 1;
      }
    }
  }

  return { validCount, invalidCount };
}

function main() {
  const payment = verifyMatrix({
    name: "Payment",
    matrix: PAYMENT_TRANSITIONS,
    assertTransition: assertPaymentTransition,
  });
  const order = verifyMatrix({
    name: "Order",
    matrix: ORDER_TRANSITIONS,
    assertTransition: assertOrderTransition,
  });
  const refund = verifyMatrix({
    name: "PaymentRefund",
    matrix: PAYMENT_REFUND_TRANSITIONS,
    assertTransition: assertPaymentRefundTransition,
  });

  for (const status of Object.keys(PAYMENT_TRANSITIONS)) {
    assertPaymentTransition(null, status);
  }
  assertOrderTransition(null, "draft");
  assertOrderTransition(null, "pending_payment");
  expectConflict(() => assertOrderTransition(null, "paid"), "Order inicial paid");

  for (const status of Object.keys(PAYMENT_REFUND_TRANSITIONS)) {
    assertPaymentRefundTransition(null, status);
  }

  const explicitInvalid = [
    ["Payment", () => assertPaymentTransition("refunded", "paid")],
    ["Payment", () => assertPaymentTransition("cancelled", "paid")],
    ["Payment", () => assertPaymentTransition("paid", "pending")],
    ["Payment", () => assertPaymentTransition("failed", "refunded")],
    ["Payment", () => assertPaymentTransition("charged_back", "paid")],
    ["Payment", () => assertPaymentTransition("disputed", "paid")],
    ["Order", () => assertOrderTransition("refunded", "paid")],
    ["Order", () => assertOrderTransition("cancelled", "paid")],
    ["Order", () => assertOrderTransition("charged_back", "paid")],
    ["Order", () => assertOrderTransition("disputed", "paid")],
    ["PaymentRefund", () => assertPaymentRefundTransition("approved", "pending")],
    ["PaymentRefund", () => assertPaymentRefundTransition("failed", "approved")],
  ];

  for (const [name, assertion] of explicitInvalid) {
    expectConflict(assertion, `${name}: invalida explicita`);
  }

  console.log("Verificacion OK: matriz central de transiciones.");
  console.log({
    payment,
    order,
    refund,
    explicitInvalidCount: explicitInvalid.length,
  });
}

main();
