import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  User,
} from "../models/index.js";

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
const PAYMENT_PROVIDERS = new Set([
  "none",
  "bank_transfer",
  "mercadopago_terminal",
  "mercadopago_checkout",
]);
const ORDER_CHANNELS = new Set(["online", "reception", "mobile"]);

function parsePagination(query) {
  const page = Math.max(Number.parseInt(query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit || "20", 10), 1),
    100
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function parseList(value) {
  if (!value) return [];

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDate(value, label, endOfDay = false) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${label} no es una fecha valida.`);
    error.statusCode = 400;
    throw error;
  }

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function buildCreatedAtFilter(query) {
  const from = parseDate(
    query.from || query.dateFrom || query.startDate,
    "Fecha inicial"
  );
  const to = parseDate(
    query.to || query.dateTo || query.endDate,
    "Fecha final",
    true
  );

  if (!from && !to) return null;

  return {
    ...(from ? { [Op.gte]: from } : {}),
    ...(to ? { [Op.lte]: to } : {}),
  };
}

function buildEnumFilter(queryValue, allowedValues, label) {
  const values = parseList(queryValue);

  if (values.length === 0) return null;

  const invalid = values.find((value) => !allowedValues.has(value));

  if (invalid) {
    const error = new Error(`${label} invalido: ${invalid}`);
    error.statusCode = 400;
    throw error;
  }

  return values.length === 1 ? values[0] : { [Op.in]: values };
}

function sanitizePayment(payment, { admin = false } = {}) {
  const plain = payment.get ? payment.get({ plain: true }) : payment;
  const base = {
    id: plain.id,
    orderId: plain.orderId,
    amount: plain.amount,
    currency: plain.currency,
    method: plain.method,
    status: plain.status,
    providerStatus: plain.providerStatus,
    paidAt: plain.paidAt,
    approvedAt: plain.approvedAt,
    cancelledAt: plain.cancelledAt,
    refundedAt: plain.refundedAt,
    order: plain.order
      ? {
          id: plain.order.id,
          orderNumber: plain.order.orderNumber,
          status: plain.order.status,
          channel: plain.order.channel,
          total: plain.order.total,
        }
      : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };

  if (!admin) return base;

  return {
    ...base,
    userId: plain.userId,
    planId: plain.planId,
    subscriptionId: plain.subscriptionId,
    groupId: plain.groupId,
    paymentType: plain.paymentType,
    source: plain.source,
    provider: plain.provider,
    providerPreferenceId: plain.providerPreferenceId,
    providerPaymentId: plain.providerPaymentId,
    externalReference: plain.externalReference,
    providerStatusDetail: plain.providerStatusDetail,
    idempotencyKey: plain.idempotencyKey,
    reference: plain.reference,
    notes: plain.notes,
    createdBy: plain.createdBy,
    user: plain.user
      ? {
          id: plain.user.id,
          email: plain.user.email,
          role: plain.user.role,
        }
      : null,
    plan: plain.plan
      ? {
          id: plain.plan.id,
          name: plain.plan.name,
          type: plain.plan.type,
        }
      : null,
  };
}

async function buildPaymentWhere(query, options = {}) {
  const { userId = null } = options;
  const where = {};
  const status = buildEnumFilter(query.status, PAYMENT_STATUSES, "Estado");
  const method = buildEnumFilter(query.method, PAYMENT_METHODS, "Metodo");
  const provider = buildEnumFilter(query.provider, PAYMENT_PROVIDERS, "Proveedor");
  const source = query.source
    ? buildEnumFilter(
        query.source,
        new Set(["admin_manual", "online_checkout"]),
        "Origen"
      )
    : null;
  const createdAt = buildCreatedAtFilter(query);

  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (method) where.method = method;
  if (provider) where.provider = provider;
  if (source) where.source = source;
  if (createdAt) where.createdAt = createdAt;

  const customerId = query.customerId || query.clientId || query.userId;

  if (customerId && !userId) {
    where.userId = customerId;
  }

  if (query.planId) {
    const orderItems = await OrderItem.findAll({
      attributes: ["orderId"],
      where: {
        membershipPlanId: query.planId,
      },
      raw: true,
    });
    const orderIds = [
      ...new Set(orderItems.map((item) => item.orderId).filter(Boolean)),
    ];

    where[Op.or] = [
      { planId: query.planId },
      ...(orderIds.length > 0 ? [{ orderId: { [Op.in]: orderIds } }] : []),
    ];
  }

  return where;
}

function buildPaymentIncludes(query, { admin = false } = {}) {
  const channel = buildEnumFilter(query.channel, ORDER_CHANNELS, "Canal");

  return [
    {
      model: Order,
      as: "order",
      required: Boolean(channel),
      where: channel ? { channel } : undefined,
      include: [
        {
          model: OrderItem,
          as: "items",
          required: false,
        },
      ],
    },
    ...(admin
      ? [
          {
            model: User,
            as: "user",
            attributes: ["id", "email", "role"],
          },
          {
            model: MembershipPlan,
            as: "plan",
            required: false,
          },
        ]
      : []),
  ];
}

async function findPaymentById(paymentId, options = {}) {
  const { admin = false, transaction = null, lock = null } = options;

  return Payment.findByPk(paymentId, {
    include: buildPaymentIncludes({}, { admin }),
    transaction,
    lock,
  });
}

function handleControllerError(res, error, fallbackMessage) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(fallbackMessage, error);
  }

  return res.status(statusCode).json({
    ok: false,
    error: error.message || fallbackMessage,
  });
}

export async function listMyPayments(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = await buildPaymentWhere(req.query, { userId: req.user.id });

    const { rows, count } = await Payment.findAndCountAll({
      where,
      include: buildPaymentIncludes(req.query),
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      ok: true,
      payments: rows.map((payment) => sanitizePayment(payment)),
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "Error listando pagos");
  }
}

export async function getPaymentStatus(req, res) {
  try {
    const isAdmin = req.user.role === "administrador";
    const payment = await findPaymentById(req.params.paymentId, {
      admin: isAdmin,
    });

    if (!payment) {
      return res.status(404).json({ ok: false, error: "Pago no encontrado" });
    }

    if (!isAdmin && payment.userId !== req.user.id) {
      return res.status(403).json({
        ok: false,
        error: "No tienes permisos para consultar este pago",
      });
    }

    return res.json({
      ok: true,
      payment: sanitizePayment(payment, { admin: isAdmin }),
    });
  } catch (error) {
    return handleControllerError(res, error, "Error consultando pago");
  }
}

export async function listAdminPayments(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = await buildPaymentWhere(req.query);

    const { rows, count } = await Payment.findAndCountAll({
      where,
      include: buildPaymentIncludes(req.query, { admin: true }),
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      ok: true,
      payments: rows.map((payment) => sanitizePayment(payment, { admin: true })),
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "Error listando pagos admin");
  }
}

export async function refundPayment(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const payment = await Payment.findByPk(req.params.paymentId, {
      include: [
        {
          model: Order,
          as: "order",
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ ok: false, error: "Pago no encontrado" });
    }

    if (payment.status !== "paid") {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "Solo se pueden reembolsar pagos con estado paid",
      });
    }

    const refundedAt = new Date();
    const refundMetadata = {
      ...(payment.metadata || {}),
      lastManualRefund: {
        reason: req.body?.reason || null,
        requestedBy: req.user.id,
        requestedAt: refundedAt.toISOString(),
      },
    };

    await payment.update(
      {
        status: "refunded",
        refundedAt,
        metadata: refundMetadata,
      },
      { transaction }
    );

    if (payment.orderId) {
      const order = await Order.findByPk(payment.orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (order) {
        const orderPayments = await Payment.findAll({
          where: {
            orderId: order.id,
          },
          transaction,
        });
        const hasPaidPayment = orderPayments.some(
          (orderPayment) =>
            orderPayment.id !== payment.id && orderPayment.status === "paid"
        );

        await order.update(
          {
            status: hasPaidPayment ? "partially_refunded" : "refunded",
            refundedAt: hasPaidPayment ? order.refundedAt : refundedAt,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    const refunded = await findPaymentById(payment.id, { admin: true });

    return res.json({
      ok: true,
      payment: sanitizePayment(refunded, { admin: true }),
    });
  } catch (error) {
    await transaction.rollback();
    return handleControllerError(res, error, "Error registrando reembolso");
  }
}
