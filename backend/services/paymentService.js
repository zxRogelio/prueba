import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  Order,
  OrderItem,
  Payment,
  PaymentRefund,
  User,
} from "../models/index.js";
import { recordProductSalesForOrder } from "./inventoryService.js";

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

function defaultManualProvider(method, provider) {
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
    validatePaymentFields({ method, source, provider, status });

    const order = await findOrderForPayment(orderId, t);
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

    const resolvedProvider = defaultManualProvider(method, provider);

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

    return payment;
  });
}

export async function processRefund({
  paymentId,
  amount = null,
  reason = null,
  providerRefundId = null,
  requestedBy = null,
  status = "approved",
  metadata = null,
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

    if (payment.status !== "paid") {
      throw serviceError("Solo se pueden reembolsar pagos con estado paid.");
    }

    if (!payment.orderId) {
      throw serviceError("El pago no esta asociado a una orden.");
    }

    const refundAmountCents =
      amount == null ? toCents(payment.amount, "amount") : toCents(amount, "amount");

    if (refundAmountCents <= 0) {
      throw serviceError("amount debe ser mayor que cero.");
    }

    const existingRefunds = await PaymentRefund.findAll({
      where: {
        paymentId: payment.id,
        status: "approved",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const refundedCents = existingRefunds.reduce(
      (sum, refund) => sum + toCents(refund.amount, "refund.amount"),
      0
    );
    const paymentAmountCents = toCents(payment.amount, "payment.amount");

    if (refundedCents + refundAmountCents > paymentAmountCents) {
      throw serviceError("El reembolso excede el monto pagado.");
    }

    const normalizedProviderRefundId = normalizeNullableString(providerRefundId);

    if (normalizedProviderRefundId) {
      const existing = await PaymentRefund.findOne({
        where: { providerRefundId: normalizedProviderRefundId },
        transaction: t,
      });

      if (existing) {
        throw serviceError("providerRefundId ya existe.", 409);
      }
    }

    const approvedAt = status === "approved" ? new Date() : null;
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
        metadata,
      },
      { transaction: t }
    );

    if (status === "approved") {
      const fullyRefunded =
        refundedCents + refundAmountCents >= paymentAmountCents;

      if (fullyRefunded) {
        await payment.update(
          {
            status: "refunded",
            refundedAt: approvedAt,
          },
          { transaction: t }
        );
      }

      const order = await Order.findByPk(payment.orderId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (order) {
        await order.update(
          {
            status: fullyRefunded ? "refunded" : "partially_refunded",
            refundedAt: fullyRefunded ? approvedAt : order.refundedAt,
          },
          { transaction: t }
        );
      }
    }

    return refund;
  });
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
