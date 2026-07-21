export const PAYMENT_TRANSITIONS = Object.freeze({
  pending: new Set(["pending", "paid", "failed", "cancelled", "disputed", "charged_back"]),
  paid: new Set(["paid", "refunded", "disputed", "charged_back"]),
  failed: new Set(["failed"]),
  cancelled: new Set(["cancelled"]),
  disputed: new Set(["disputed", "charged_back"]),
  charged_back: new Set(["charged_back"]),
  refunded: new Set(["refunded"]),
});

export const ORDER_TRANSITIONS = Object.freeze({
  draft: new Set(["draft", "pending_payment", "paid", "cancelled"]),
  pending_payment: new Set(["pending_payment", "paid", "cancelled", "disputed", "charged_back"]),
  paid: new Set(["paid", "partially_refunded", "refunded", "disputed", "charged_back"]),
  partially_refunded: new Set(["partially_refunded", "refunded", "disputed", "charged_back"]),
  cancelled: new Set(["cancelled"]),
  disputed: new Set(["disputed", "charged_back"]),
  charged_back: new Set(["charged_back"]),
  refunded: new Set(["refunded"]),
});

export const PAYMENT_REFUND_TRANSITIONS = Object.freeze({
  pending: new Set(["pending", "approved", "failed", "cancelled"]),
  approved: new Set(["approved"]),
  failed: new Set(["failed"]),
  cancelled: new Set(["cancelled"]),
});

const INITIAL_PAYMENT_STATUSES = new Set(Object.keys(PAYMENT_TRANSITIONS));
const INITIAL_ORDER_STATUSES = new Set(["draft", "pending_payment"]);
const INITIAL_REFUND_STATUSES = new Set(Object.keys(PAYMENT_REFUND_TRANSITIONS));

function transitionError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

function normalizeStatus(status, label) {
  if (status == null) {
    throw transitionError(`${label} es obligatorio.`);
  }

  const normalized = String(status).trim();

  if (!normalized) {
    throw transitionError(`${label} es obligatorio.`);
  }

  return normalized;
}

function assertKnownStatus({ matrix, status, entity }) {
  if (!Object.prototype.hasOwnProperty.call(matrix, status)) {
    throw transitionError(`Estado ${entity} invalido: ${status}.`);
  }
}

function assertInitialStatus({ allowed, nextStatus, entity }) {
  if (!allowed.has(nextStatus)) {
    throw transitionError(`Estado inicial ${entity} invalido: ${nextStatus}.`);
  }
}

function assertTransition({ matrix, initialAllowed, currentStatus, nextStatus, entity }) {
  const normalizedNext = normalizeStatus(nextStatus, `${entity}.status`);

  assertKnownStatus({ matrix, status: normalizedNext, entity });

  if (currentStatus == null) {
    assertInitialStatus({
      allowed: initialAllowed,
      nextStatus: normalizedNext,
      entity,
    });
    return normalizedNext;
  }

  const normalizedCurrent = normalizeStatus(
    currentStatus,
    `${entity}.currentStatus`
  );

  assertKnownStatus({ matrix, status: normalizedCurrent, entity });

  if (!matrix[normalizedCurrent].has(normalizedNext)) {
    throw transitionError(
      `Transicion ${entity} invalida: ${normalizedCurrent} -> ${normalizedNext}.`
    );
  }

  return normalizedNext;
}

export function isKnownPaymentStatus(status) {
  return Object.prototype.hasOwnProperty.call(
    PAYMENT_TRANSITIONS,
    String(status || "")
  );
}

export function isKnownOrderStatus(status) {
  return Object.prototype.hasOwnProperty.call(
    ORDER_TRANSITIONS,
    String(status || "")
  );
}

export function isKnownPaymentRefundStatus(status) {
  return Object.prototype.hasOwnProperty.call(
    PAYMENT_REFUND_TRANSITIONS,
    String(status || "")
  );
}

export function assertPaymentTransition(currentStatus, nextStatus) {
  return assertTransition({
    matrix: PAYMENT_TRANSITIONS,
    initialAllowed: INITIAL_PAYMENT_STATUSES,
    currentStatus,
    nextStatus,
    entity: "Payment",
  });
}

export function assertOrderTransition(currentStatus, nextStatus) {
  return assertTransition({
    matrix: ORDER_TRANSITIONS,
    initialAllowed: INITIAL_ORDER_STATUSES,
    currentStatus,
    nextStatus,
    entity: "Order",
  });
}

export function assertPaymentRefundTransition(currentStatus, nextStatus) {
  return assertTransition({
    matrix: PAYMENT_REFUND_TRANSITIONS,
    initialAllowed: INITIAL_REFUND_STATUSES,
    currentStatus,
    nextStatus,
    entity: "PaymentRefund",
  });
}
