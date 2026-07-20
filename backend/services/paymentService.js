import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  Order,
  OrderItem,
  Payment,
  PaymentRefund,
  PaymentRefundItem,
  User,
} from "../models/index.js";
import {
  recordProductReturnFromOrderItem,
  recordProductSalesForOrder,
} from "./inventoryService.js";
import {
  activateMembershipsFromOrder,
  cancelMembershipEntitlementsForRefund,
} from "./membershipActivationService.js";
import {
  cancelReceiptsForFullRefund,
  createReceipt,
} from "./receiptService.js";
import { recordSubscriptionRefundEventsForPayment } from "./subscriptionEventService.js";

const PAYMENT_STATUSES = new Set([
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
]);
const PAYMENT_METHODS = new Set([
  "cash",
  "transfer",
  "card_terminal",
  "online_checkout",
]);
const PAYMENT_SOURCES = new Set(["admin_manual", "online_checkout"]);
const PAYMENT_PROVIDERS = new Set([
  "none",
  "bank_transfer",
  "mercadopago_terminal",
  "mercadopago_checkout",
]);
const MANUAL_METHODS = new Set(["cash", "transfer", "card_terminal"]);

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function withTransaction(transaction, callback) {
  if (transaction) {
    return callback(transaction);
  }

  return sequelize.transaction(callback);
}

function normalizeCurrency(currency = "MXN") {
  const normalized = String(currency || "MXN").trim().toUpperCase();

  if (normalized.length !== 3) {
    throw serviceError("currency debe tener 3 caracteres.");
  }

  return normalized;
}

function normalizeNullableString(value) {
  if (value == null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toCents(value, label = "monto") {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw serviceError(`${label} debe ser un monto valido.`);
  }

  return Math.round(numberValue * 100);
}

function fromCents(value) {
  return (value / 100).toFixed(2);
}

function normalizePositiveInteger(value, label) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw serviceError(`${label} debe ser un entero mayor que cero.`);
  }

  return normalized;
}

function normalizeBoolean(value, fallback = true) {
  if (value == null) return fallback;
  return Boolean(value);
}

function isUniqueConstraintError(error, constraintName, fieldName = null) {
  if (error?.parent?.constraint === constraintName) return true;
  if (error?.name !== "SequelizeUniqueConstraintError") return false;
  if (!fieldName) return true;

  return (error.errors || []).some((entry) => entry.path === fieldName);
}

function requestedRefundItems(rawItems) {
  if (rawItems == null) return null;

  if (!Array.isArray(rawItems)) {
    throw serviceError("items de reembolso debe ser un arreglo.");
  }

  return rawItems;
}

function calculateOrderItemAmountCents(orderItem, quantity) {
  const itemQuantity = normalizePositiveInteger(orderItem.quantity, "quantity");
  const subtotalCents = toCents(orderItem.subtotal, "orderItem.subtotal");

  return Math.round((subtotalCents / itemQuantity) * quantity);
}

async function getApprovedRefundItemTotals(paymentId, transaction) {
  const approvedRefunds = await PaymentRefund.findAll({
    where: {
      paymentId,
      status: "approved",
    },
    attributes: ["id"],
    transaction,
  });
  const refundIds = approvedRefunds.map((refund) => refund.id);

  if (refundIds.length === 0) return new Map();

  const items = await PaymentRefundItem.findAll({
    where: {
      refundId: {
        [Op.in]: refundIds,
      },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const totals = new Map();

  for (const item of items) {
    const current = totals.get(item.orderItemId) || {
      quantity: 0,
      amountCents: 0,
    };

    current.quantity += Number(item.quantity);
    current.amountCents += toCents(item.amount, "refundItem.amount");
    totals.set(item.orderItemId, current);
  }

  return totals;
}

async function getProductOrderItemsForPayment(payment, transaction) {
  return OrderItem.findAll({
    where: {
      orderId: payment.orderId,
      itemType: "product",
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

async function buildRequestedRefundItemRows({
  payment,
  rawItems,
  previousItemTotals,
  transaction,
}) {
  const items = requestedRefundItems(rawItems);

  if (items == null) return null;
  if (items.length === 0) return [];

  const orderItemIds = items.map((item) => item?.orderItemId).filter(Boolean);
  const uniqueOrderItemIds = [...new Set(orderItemIds)];

  if (orderItemIds.length !== items.length) {
    throw serviceError("orderItemId es obligatorio para cada item de reembolso.");
  }

  if (uniqueOrderItemIds.length !== orderItemIds.length) {
    throw serviceError("No repitas orderItemId dentro del mismo reembolso.");
  }

  const orderItems = await OrderItem.findAll({
    where: {
      id: {
        [Op.in]: uniqueOrderItemIds,
      },
      orderId: payment.orderId,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const orderItemsById = new Map(orderItems.map((item) => [item.id, item]));
  const rows = [];

  for (const rawItem of items) {
    const orderItem = orderItemsById.get(rawItem.orderItemId);

    if (!orderItem) {
      throw serviceError("OrderItem de reembolso no encontrado en la orden.", 404);
    }

    if (orderItem.itemType !== "product" || !orderItem.productId) {
      throw serviceError("Los reembolsos parciales por item solo soportan productos.");
    }

    const quantity = normalizePositiveInteger(rawItem.quantity, "quantity");
    const previous = previousItemTotals.get(orderItem.id) || {
      quantity: 0,
      amountCents: 0,
    };
    const remainingQuantity = Number(orderItem.quantity) - previous.quantity;

    if (quantity > remainingQuantity) {
      throw serviceError("La cantidad reembolsada excede la cantidad disponible.", 409);
    }

    const itemSubtotalCents = toCents(orderItem.subtotal, "orderItem.subtotal");
    const remainingAmountCents = itemSubtotalCents - previous.amountCents;
    const amountCents =
      rawItem.amount == null
        ? calculateOrderItemAmountCents(orderItem, quantity)
        : toCents(rawItem.amount, "refundItem.amount");

    if (amountCents <= 0) {
      throw serviceError("amount de item debe ser mayor que cero.");
    }

    if (amountCents > remainingAmountCents) {
      throw serviceError("El monto por item excede el saldo disponible.", 409);
    }

    rows.push({
      orderItem,
      orderItemId: orderItem.id,
      quantity,
      amount: fromCents(amountCents),
      amountCents,
      restock: normalizeBoolean(rawItem.restock, true),
    });
  }

  return rows;
}

async function buildFullProductRefundItemRows({
  payment,
  previousItemTotals,
  transaction,
}) {
  const orderItems = await getProductOrderItemsForPayment(payment, transaction);
  const rows = [];

  for (const orderItem of orderItems) {
    const previous = previousItemTotals.get(orderItem.id) || {
      quantity: 0,
      amountCents: 0,
    };
    const remainingQuantity = Number(orderItem.quantity) - previous.quantity;

    if (remainingQuantity <= 0) continue;

    const itemSubtotalCents = toCents(orderItem.subtotal, "orderItem.subtotal");
    const remainingAmountCents = itemSubtotalCents - previous.amountCents;

    if (remainingAmountCents <= 0) continue;

    rows.push({
      orderItem,
      orderItemId: orderItem.id,
      quantity: remainingQuantity,
      amount: fromCents(remainingAmountCents),
      amountCents: remainingAmountCents,
      restock: true,
    });
  }

  return rows;
}

function sumRefundItemAmountCents(items = []) {
  return items.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
}

function serializeRefundItemForComparison(item) {
  return {
    orderItemId: item.orderItemId,
    quantity: Number(item.quantity),
    amount: toCents(item.amount, "refundItem.amount"),
    restock: Boolean(item.restock),
  };
}

function sameRefundItemRows(left = [], right = []) {
  if (left.length !== right.length) return false;

  const sortByOrderItem = (items) =>
    [...items].sort((a, b) => a.orderItemId.localeCompare(b.orderItemId));
  const sortedLeft = sortByOrderItem(left.map(serializeRefundItemForComparison));
  const sortedRight = sortByOrderItem(right.map(serializeRefundItemForComparison));

  return sortedLeft.every((item, index) => {
    const other = sortedRight[index];
    return (
      item.orderItemId === other.orderItemId &&
      item.quantity === other.quantity &&
      item.amount === other.amount &&
      item.restock === other.restock
    );
  });
}

export function resolveManualPaymentProvider(method, provider) {
  const normalizedProvider = normalizeNullableString(provider);

  if (normalizedProvider) {
    if (!PAYMENT_PROVIDERS.has(normalizedProvider)) {
      throw serviceError("provider de pago invalido.");
    }

    return normalizedProvider;
  }

  if (method === "transfer") return "bank_transfer";
  if (method === "card_terminal") return "mercadopago_terminal";
  return "none";
}

function validatePaymentFields({ method, source, provider, status }) {
  if (!PAYMENT_METHODS.has(method)) {
    throw serviceError("method de pago invalido.");
  }

  if (!PAYMENT_SOURCES.has(source)) {
    throw serviceError("source de pago invalido.");
  }

  if (!PAYMENT_PROVIDERS.has(provider)) {
    throw serviceError("provider de pago invalido.");
  }

  if (!PAYMENT_STATUSES.has(status)) {
    throw serviceError("status de pago invalido.");
  }
}

async function findOrderForPayment(orderId, transaction) {
  if (!orderId) {
    throw serviceError("orderId es obligatorio.");
  }

  const order = await Order.findByPk(orderId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!order) {
    throw serviceError("Orden no encontrada.", 404);
  }

  if (["cancelled", "refunded"].includes(order.status)) {
    throw serviceError("No se pueden crear pagos para una orden cerrada.");
  }

  const [customer, items] = await Promise.all([
    User.findByPk(order.userId, {
      attributes: ["id", "email", "role"],
      transaction,
    }),
    OrderItem.findAll({
      where: { orderId: order.id },
      transaction,
    }),
  ]);

  order.setDataValue("customer", customer);
  order.setDataValue("items", items);

  return order;
}

async function assertOrderCanReceiveConfirmedPayment({
  order,
  transaction,
  ignorePaymentId = null,
  allowPaidOrder = false,
}) {
  if (order.status === "paid" && !allowPaidOrder) {
    throw serviceError("La orden ya tiene un pago confirmado.", 409);
  }

  const paidPaymentWhere = {
    orderId: order.id,
    status: "paid",
  };

  if (ignorePaymentId) {
    paidPaymentWhere.id = {
      [Op.ne]: ignorePaymentId,
    };
  }

  const existingPaidPayment = await Payment.findOne({
    where: paidPaymentWhere,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (existingPaidPayment) {
    throw serviceError("La orden ya tiene un pago confirmado.", 409);
  }
}

function inferPaymentType(order) {
  const items = order.get?.("items") || order.items || [];
  const itemTypes = new Set(items.map((item) => item.itemType));

  if (itemTypes.size === 0) return "mixed";
  if (itemTypes.size === 1 && itemTypes.has("product")) return "product";
  if (
    [...itemTypes].every((itemType) =>
      ["membership", "group_membership"].includes(itemType)
    )
  ) {
    return "membership";
  }

  return "mixed";
}

function inferLegacyMembershipFields(order) {
  const items = order.get?.("items") || order.items || [];
  const firstMembershipItem = items.find((item) =>
    ["membership", "group_membership"].includes(item.itemType)
  );

  return {
    planId: firstMembershipItem?.membershipPlanId || null,
  };
}

async function assertNoDuplicatePaymentIdentifiers(
  {
    externalReference = null,
    idempotencyKey = null,
    provider = null,
    providerPaymentId = null,
    ignorePaymentId = null,
  },
  transaction
) {
  const checks = [];

  if (externalReference) {
    checks.push({
      where: { externalReference },
      label: "externalReference ya existe.",
    });
  }

  if (idempotencyKey) {
    checks.push({
      where: { idempotencyKey },
      label: "idempotencyKey ya existe.",
    });
  }

  if (provider && providerPaymentId) {
    checks.push({
      where: { provider, providerPaymentId },
      label: "providerPaymentId ya existe para este provider.",
    });
  }

  for (const check of checks) {
    const where = ignorePaymentId
      ? {
          ...check.where,
          id: {
            [Op.ne]: ignorePaymentId,
          },
        }
      : check.where;
    const existing = await Payment.findOne({
      where,
      transaction,
    });

    if (existing) {
      throw serviceError(check.label, 409);
    }
  }
}

async function updateOrderAfterPaymentStatus(payment, transaction) {
  if (!payment.orderId) return null;

  const order = await Order.findByPk(payment.orderId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!order) return null;

  if (payment.status === "paid") {
    await order.update(
      {
        status: "paid",
        paidAt: payment.approvedAt || payment.paidAt || new Date(),
      },
      { transaction }
    );
    await recordProductSalesForOrder({
      orderId: order.id,
      createdBy: payment.createdBy || null,
      reference: `payment:${payment.id}`,
      transaction,
    });
    return order;
  }

  if (payment.status === "refunded") {
    const orderPayments = await Payment.findAll({
      where: { orderId: order.id },
      transaction,
    });
    const hasPaidPayment = orderPayments.some(
      (orderPayment) =>
        orderPayment.id !== payment.id && orderPayment.status === "paid"
    );

    await order.update(
      {
        status: hasPaidPayment ? "partially_refunded" : "refunded",
        refundedAt: hasPaidPayment ? order.refundedAt : payment.refundedAt,
      },
      { transaction }
    );
  }

  return order;
}

export async function createPaymentAttempt({
  orderId,
  method = "online_checkout",
  source = "online_checkout",
  provider = "mercadopago_checkout",
  status = "pending",
  providerPreferenceId = null,
  providerPaymentId = null,
  externalReference = null,
  providerStatus = null,
  providerStatusDetail = null,
  idempotencyKey = null,
  reference = null,
  notes = null,
  metadata = null,
  createdBy = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const order = await findOrderForPayment(orderId, t);

    await assertOrderCanReceiveConfirmedPayment({
      order,
      transaction: t,
    });

    validatePaymentFields({ method, source, provider, status });

    const normalizedExternalReference = normalizeNullableString(externalReference);
    const normalizedIdempotencyKey = normalizeNullableString(idempotencyKey);
    const normalizedProviderPaymentId = normalizeNullableString(providerPaymentId);

    await assertNoDuplicatePaymentIdentifiers(
      {
        externalReference: normalizedExternalReference,
        idempotencyKey: normalizedIdempotencyKey,
        provider,
        providerPaymentId: normalizedProviderPaymentId,
      },
      t
    );

    const paidAt = status === "paid" ? new Date() : null;
    const legacy = inferLegacyMembershipFields(order);
    const payment = await Payment.create(
      {
        userId: order.userId,
        orderId: order.id,
        planId: legacy.planId,
        paymentType: inferPaymentType(order),
        amount: order.total,
        method,
        source,
        provider,
        providerPreferenceId: normalizeNullableString(providerPreferenceId),
        providerPaymentId: normalizedProviderPaymentId,
        externalReference: normalizedExternalReference,
        providerStatus: normalizeNullableString(providerStatus),
        providerStatusDetail: normalizeNullableString(providerStatusDetail),
        idempotencyKey: normalizedIdempotencyKey,
        status,
        currency: normalizeCurrency(order.currency),
        reference: normalizeNullableString(reference),
        notes: normalizeNullableString(notes),
        paidAt,
        approvedAt: paidAt,
        metadata,
        createdBy,
      },
      { transaction: t }
    );

    await updateOrderAfterPaymentStatus(payment, t);

    return payment;
  });
}

export async function registerManualPayment({
  orderId,
  method = "cash",
  provider = null,
  reference = null,
  notes = null,
  metadata = null,
  createdBy = null,
  idempotencyKey = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (!MANUAL_METHODS.has(method)) {
      throw serviceError("Metodo manual invalido. Usa cash, transfer o card_terminal.");
    }

    const resolvedProvider = resolveManualPaymentProvider(method, provider);

    return createPaymentAttempt({
      orderId,
      method,
      source: "admin_manual",
      provider: resolvedProvider,
      status: "paid",
      reference,
      notes,
      metadata,
      createdBy,
      idempotencyKey,
      transaction: t,
    });
  });
}

export async function updatePaymentStatus({
  paymentId,
  status,
  providerPaymentId = undefined,
  providerStatus = undefined,
  providerStatusDetail = undefined,
  providerPreferenceId = undefined,
  externalReference = undefined,
  idempotencyKey = undefined,
  metadata = undefined,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (!PAYMENT_STATUSES.has(status)) {
      throw serviceError("status de pago invalido.");
    }

    const payment = await Payment.findByPk(paymentId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment) {
      throw serviceError("Pago no encontrado.", 404);
    }

    if (status === "paid" && payment.orderId) {
      const order = await Order.findByPk(payment.orderId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!order) {
        throw serviceError("Orden no encontrada.", 404);
      }

      await assertOrderCanReceiveConfirmedPayment({
        order,
        transaction: t,
        ignorePaymentId: payment.id,
        allowPaidOrder: payment.status === "paid",
      });
    }

    const nextValues = {
      status,
    };

    if (providerPaymentId !== undefined) {
      nextValues.providerPaymentId = normalizeNullableString(providerPaymentId);
    }
    if (providerStatus !== undefined) {
      nextValues.providerStatus = normalizeNullableString(providerStatus);
    }
    if (providerStatusDetail !== undefined) {
      nextValues.providerStatusDetail = normalizeNullableString(providerStatusDetail);
    }
    if (providerPreferenceId !== undefined) {
      nextValues.providerPreferenceId = normalizeNullableString(providerPreferenceId);
    }
    if (externalReference !== undefined) {
      nextValues.externalReference = normalizeNullableString(externalReference);
    }
    if (idempotencyKey !== undefined) {
      nextValues.idempotencyKey = normalizeNullableString(idempotencyKey);
    }
    if (metadata !== undefined) {
      nextValues.metadata = {
        ...(payment.metadata || {}),
        ...metadata,
      };
    }

    await assertNoDuplicatePaymentIdentifiers(
      {
        externalReference: nextValues.externalReference ?? payment.externalReference,
        idempotencyKey: nextValues.idempotencyKey ?? payment.idempotencyKey,
        provider: payment.provider,
        providerPaymentId:
          nextValues.providerPaymentId ?? payment.providerPaymentId,
        ignorePaymentId: payment.id,
      },
      t
    );

    const now = new Date();

    if (status === "paid") {
      nextValues.paidAt = payment.paidAt || now;
      nextValues.approvedAt = payment.approvedAt || now;
    }

    if (status === "cancelled") {
      nextValues.cancelledAt = payment.cancelledAt || now;
    }

    if (status === "refunded") {
      nextValues.refundedAt = payment.refundedAt || now;
    }

    await payment.update(nextValues, { transaction: t });
    await updateOrderAfterPaymentStatus(payment, t);

    if (status === "refunded") {
      await recordSubscriptionRefundEventsForPayment({
        payment,
        refund: null,
        fullyRefunded: true,
        transaction: t,
      });
    }

    return payment;
  });
}

export async function confirmPaidPayment({
  paymentId,
  providerPaymentId = undefined,
  providerStatus = undefined,
  providerStatusDetail = undefined,
  providerPreferenceId = undefined,
  externalReference = undefined,
  metadata = undefined,
  createdBy = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const payment = await Payment.findByPk(paymentId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment) {
      throw serviceError("Pago no encontrado.", 404);
    }

    if (!payment.orderId) {
      throw serviceError("El pago no esta asociado a una orden.");
    }

    const order = await Order.findByPk(payment.orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw serviceError("Orden no encontrada.", 404);
    }

    if (["cancelled", "refunded"].includes(payment.status)) {
      throw serviceError(
        "No se puede confirmar un pago cancelado o reembolsado.",
        409
      );
    }

    const confirmedPayment = await updatePaymentStatus({
      paymentId: payment.id,
      status: "paid",
      providerPaymentId,
      providerStatus,
      providerStatusDetail,
      providerPreferenceId,
      externalReference,
      metadata,
      transaction: t,
    });
    const activation = await activateMembershipsFromOrder({
      orderId: order.id,
      paymentId: confirmedPayment.id,
      createdBy,
      transaction: t,
    });
    const receipt = await createReceipt({
      orderId: order.id,
      paymentId: confirmedPayment.id,
      createdBy,
      metadata: {
        source: "mercadopago_checkout_pro",
      },
      transaction: t,
    });

    return {
      payment: confirmedPayment,
      order,
      activation,
      receipt,
    };
  });
}

async function findExistingRefundByProviderRefundId(providerRefundId, transaction) {
  if (!providerRefundId) return null;

  const refund = await PaymentRefund.findOne({
    where: { providerRefundId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!refund) return null;

  const items = await PaymentRefundItem.findAll({
    where: { refundId: refund.id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  refund.setDataValue("items", items);

  return refund;
}

function assertExistingRefundMatchesRequest({
  refund,
  paymentId,
  amount,
  status,
  items,
}) {
  const mismatches = [];

  if (refund.paymentId !== paymentId) mismatches.push("paymentId");
  if (status && refund.status !== status) mismatches.push("status");
  if (amount != null && toCents(refund.amount, "refund.amount") !== toCents(amount, "amount")) {
    mismatches.push("amount");
  }

  const requestedItems = requestedRefundItems(items);

  if (requestedItems != null) {
    const existingItems = refund.get?.("items") || refund.items || [];

    if (requestedItems.length !== existingItems.length) {
      mismatches.push("items");
    } else {
      const existingByOrderItem = new Map(
        existingItems.map((item) => [item.orderItemId, item])
      );

      for (const requestedItem of requestedItems) {
        const existingItem = existingByOrderItem.get(requestedItem.orderItemId);

        if (!existingItem) {
          mismatches.push("items");
          continue;
        }

        if (Number(existingItem.quantity) !== Number(requestedItem.quantity)) {
          mismatches.push("items.quantity");
        }

        if (Boolean(existingItem.restock) !== normalizeBoolean(requestedItem.restock, true)) {
          mismatches.push("items.restock");
        }

        if (
          requestedItem.amount != null &&
          toCents(existingItem.amount, "refundItem.amount") !==
            toCents(requestedItem.amount, "refundItem.amount")
        ) {
          mismatches.push("items.amount");
        }
      }
    }
  }

  if (mismatches.length > 0) {
    throw serviceError(
      `providerRefundId ya existe para otro reembolso: ${[...new Set(mismatches)].join(", ")}.`,
      409
    );
  }
}

async function processRefundInternal({
  paymentId,
  amount = null,
  reason = null,
  providerRefundId = null,
  requestedBy = null,
  status = "approved",
  items = null,
  metadata = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (!["pending", "approved", "failed", "cancelled"].includes(status)) {
      throw serviceError("status de reembolso invalido.");
    }

    const normalizedProviderRefundId = normalizeNullableString(providerRefundId);
    const existingByProviderRefundId =
      await findExistingRefundByProviderRefundId(normalizedProviderRefundId, t);

    if (existingByProviderRefundId) {
      assertExistingRefundMatchesRequest({
        refund: existingByProviderRefundId,
        paymentId,
        amount,
        status,
        items,
      });

      return existingByProviderRefundId;
    }

    const payment = await Payment.findByPk(paymentId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment) {
      throw serviceError("Pago no encontrado.", 404);
    }

    if (payment.status !== "paid") {
      throw serviceError("Solo se pueden reembolsar pagos con estado paid.", 409);
    }

    if (!payment.orderId) {
      throw serviceError("El pago no esta asociado a una orden.");
    }

    const order = await Order.findByPk(payment.orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw serviceError("Orden no encontrada.", 404);
    }

    const existingApprovedRefunds = await PaymentRefund.findAll({
      where: {
        paymentId: payment.id,
        status: "approved",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const refundedCents = existingApprovedRefunds.reduce(
      (sum, refund) => sum + toCents(refund.amount, "refund.amount"),
      0
    );
    const paymentAmountCents = toCents(payment.amount, "payment.amount");
    const availableCents = paymentAmountCents - refundedCents;
    const previousItemTotals = await getApprovedRefundItemTotals(payment.id, t);
    const requestedItemRows = await buildRequestedRefundItemRows({
      payment,
      rawItems: items,
      previousItemTotals,
      transaction: t,
    });
    const requestedItemsAmountCents = requestedItemRows
      ? sumRefundItemAmountCents(requestedItemRows)
      : null;
    const refundAmountCents =
      amount == null
        ? requestedItemsAmountCents ?? availableCents
        : toCents(amount, "amount");

    if (refundAmountCents <= 0) {
      throw serviceError("amount debe ser mayor que cero.");
    }

    if (
      requestedItemsAmountCents != null &&
      requestedItemsAmountCents > 0 &&
      requestedItemsAmountCents !== refundAmountCents
    ) {
      throw serviceError("amount debe coincidir con la suma de items.");
    }

    if (refundAmountCents > availableCents) {
      throw serviceError("El reembolso excede el monto pagado.", 409);
    }

    const approvedAt = status === "approved" ? new Date() : null;
    const fullyRefunded =
      status === "approved" && refundAmountCents >= availableCents;
    const productRefundRows =
      requestedItemRows ??
      (fullyRefunded
        ? await buildFullProductRefundItemRows({
            payment,
            previousItemTotals,
            transaction: t,
          })
        : []);
    const refund = await PaymentRefund.create(
      {
        paymentId: payment.id,
        orderId: payment.orderId,
        providerRefundId: normalizedProviderRefundId,
        amount: fromCents(refundAmountCents),
        reason: normalizeNullableString(reason),
        status,
        requestedBy,
        requestedAt: new Date(),
        approvedAt,
        metadata: {
          ...(metadata || {}),
          refundType: fullyRefunded ? "full" : "partial",
          itemized: productRefundRows.length > 0,
        },
      },
      { transaction: t }
    );
    const refundItems = productRefundRows.length
      ? await PaymentRefundItem.bulkCreate(
          productRefundRows.map((item) => ({
            refundId: refund.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            amount: item.amount,
            restock: item.restock,
          })),
          { transaction: t, validate: true }
        )
      : [];
    const sideEffects = {
      receiptCancelledCount: 0,
      cancelledSubscriptions: 0,
      cancelledGroups: 0,
      removedGroupMembers: 0,
      inventoryReturnCount: 0,
    };

    if (status === "approved") {
      for (const item of productRefundRows) {
        if (!item.restock) continue;

        const result = await recordProductReturnFromOrderItem({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          reference: `refund:${refund.id}:order-item:${item.orderItemId}`,
          createdBy: requestedBy,
          notes: reason,
          transaction: t,
        });

        if (!result.skipped && result.movement) {
          sideEffects.inventoryReturnCount += 1;
        }
      }

      if (fullyRefunded) {
        await payment.update(
          {
            status: "refunded",
            refundedAt: approvedAt,
          },
          { transaction: t }
        );

        await order.update(
          {
            status: "refunded",
            refundedAt: approvedAt,
          },
          { transaction: t }
        );

        sideEffects.receiptCancelledCount = await cancelReceiptsForFullRefund({
          orderId: order.id,
          paymentId: payment.id,
          refundId: refund.id,
          cancelledBy: requestedBy,
          reason,
          cancelledAt: approvedAt,
          transaction: t,
        });

        const membershipEffects = await cancelMembershipEntitlementsForRefund({
          paymentId: payment.id,
          refundId: refund.id,
          cancelledBy: requestedBy,
          reason,
          effectiveAt: approvedAt,
          transaction: t,
        });

        sideEffects.cancelledSubscriptions =
          membershipEffects.cancelledSubscriptions;
        sideEffects.cancelledGroups = membershipEffects.cancelledGroups;
        sideEffects.removedGroupMembers = membershipEffects.removedMembers;
      } else {
        await order.update(
          {
            status: "partially_refunded",
          },
          { transaction: t }
        );
      }

      await recordSubscriptionRefundEventsForPayment({
        payment,
        refund,
        fullyRefunded,
        transaction: t,
      });
    }

    await refund.update(
      {
        metadata: {
          ...(refund.metadata || {}),
          sideEffects,
        },
      },
      { transaction: t }
    );

    refund.setDataValue("items", refundItems);

    return refund;
  });
}

export async function processRefund(args) {
  const normalizedProviderRefundId = normalizeNullableString(
    args.providerRefundId
  );

  try {
    return await processRefundInternal({
      ...args,
      providerRefundId: normalizedProviderRefundId,
    });
  } catch (error) {
    if (
      args.transaction ||
      !normalizedProviderRefundId ||
      !isUniqueConstraintError(
        error,
        "payment_refunds_provider_refund_id_unique",
        "providerRefundId"
      )
    ) {
      throw error;
    }

    return sequelize.transaction(async (transaction) => {
      const refund = await findExistingRefundByProviderRefundId(
        normalizedProviderRefundId,
        transaction
      );

      if (!refund) throw error;

      assertExistingRefundMatchesRequest({
        refund,
        paymentId: args.paymentId,
        amount: args.amount,
        status: args.status || "approved",
        items: args.items,
      });

      return refund;
    });
  }
}

export async function findPaymentByExternalReference({
  externalReference,
  transaction = null,
  lock = null,
}) {
  const normalizedExternalReference = normalizeNullableString(externalReference);

  if (!normalizedExternalReference) {
    throw serviceError("externalReference es obligatorio.");
  }

  return Payment.findOne({
    where: {
      externalReference: normalizedExternalReference,
    },
    include: [
      {
        model: Order,
        as: "order",
        required: false,
      },
    ],
    transaction,
    lock,
  });
}
