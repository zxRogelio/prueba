import { randomUUID } from "node:crypto";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  Receipt,
  User,
} from "../models/index.js";

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

function datePart(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function buildReceiptFolio(date = new Date()) {
  const randomPart = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `TSG-${datePart(date)}-${randomPart}`;
}

export async function generateReceiptNumber({
  date = new Date(),
  transaction = null,
} = {}) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const folio = buildReceiptFolio(date);
    const existing = await Receipt.findOne({
      where: { folio },
      transaction,
    });

    if (!existing) {
      return folio;
    }
  }

  throw serviceError("No se pudo generar un folio de recibo unico.", 500);
}

async function findPaymentForReceipt(paymentId, transaction) {
  const payment = await Payment.findByPk(paymentId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!payment) {
    throw serviceError("Pago no encontrado.", 404);
  }

  if (payment.status !== "paid") {
    throw serviceError("Solo se pueden emitir recibos para pagos pagados.");
  }

  return payment;
}

export async function createReceipt({
  paymentId,
  orderId = null,
  createdBy = null,
  metadata = null,
  issuedAt = new Date(),
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (!paymentId) {
      throw serviceError("paymentId es obligatorio.");
    }

    const payment = await findPaymentForReceipt(paymentId, t);
    const resolvedOrderId = orderId || payment.orderId || null;

    if (orderId && payment.orderId && payment.orderId !== orderId) {
      throw serviceError("El pago no pertenece a la orden indicada.");
    }

    const existingReceipt = await Receipt.findOne({
      where: {
        paymentId: payment.id,
        status: "issued",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existingReceipt) {
      return existingReceipt;
    }

    const order = resolvedOrderId
      ? await Order.findByPk(resolvedOrderId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        })
      : null;

    if (resolvedOrderId && !order) {
      throw serviceError("Orden no encontrada para el recibo.", 404);
    }

    const folio = await generateReceiptNumber({
      date: issuedAt,
      transaction: t,
    });

    return Receipt.create(
      {
        paymentId: payment.id,
        orderId: resolvedOrderId,
        folio,
        status: "issued",
        issuedAt,
        metadata: {
          orderNumber: order?.orderNumber || null,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          source: payment.source,
          ...(metadata || {}),
        },
        createdBy,
      },
      { transaction: t }
    );
  });
}

export async function preparePrintableReceipt({
  receiptId,
  folio = null,
  transaction = null,
}) {
  const where = receiptId ? { id: receiptId } : { folio };

  if (!receiptId && !folio) {
    throw serviceError("receiptId o folio es obligatorio.");
  }

  const receipt = await Receipt.findOne({
    where,
    include: [
      {
        model: Payment,
        as: "payment",
        required: true,
      },
      {
        model: Order,
        as: "order",
        required: false,
        include: [
          {
            model: User,
            as: "customer",
            attributes: ["id", "email", "role"],
          },
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: MembershipPlan,
                as: "membershipPlan",
                required: false,
              },
            ],
          },
        ],
      },
    ],
    transaction,
  });

  if (!receipt) {
    throw serviceError("Recibo no encontrado.", 404);
  }

  const plain = receipt.get({ plain: true });

  return {
    id: plain.id,
    folio: plain.folio,
    status: plain.status,
    issuedAt: plain.issuedAt,
    payment: {
      id: plain.payment.id,
      amount: plain.payment.amount,
      currency: plain.payment.currency,
      method: plain.payment.method,
      source: plain.payment.source,
      provider: plain.payment.provider,
      paidAt: plain.payment.paidAt,
      approvedAt: plain.payment.approvedAt,
    },
    order: plain.order
      ? {
          id: plain.order.id,
          orderNumber: plain.order.orderNumber,
          status: plain.order.status,
          channel: plain.order.channel,
          subtotal: plain.order.subtotal,
          discountTotal: plain.order.discountTotal,
          taxTotal: plain.order.taxTotal,
          total: plain.order.total,
          currency: plain.order.currency,
          customer: plain.order.customer,
          items: plain.order.items,
        }
      : null,
    metadata: plain.metadata || {},
  };
}

export async function cancelReceiptsForFullRefund({
  orderId = null,
  paymentId = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const where = {
      status: "issued",
    };

    if (orderId) where.orderId = orderId;
    if (paymentId) where.paymentId = paymentId;

    if (!orderId && !paymentId) {
      throw serviceError("orderId o paymentId es obligatorio.");
    }

    const [updatedCount] = await Receipt.update(
      {
        status: "cancelled",
      },
      {
        where,
        transaction: t,
      }
    );

    return updatedCount;
  });
}
