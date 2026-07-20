import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderDiscount,
  OrderItem,
  Payment,
  Product,
  Promotion,
  User,
} from "../models/index.js";
import { createOrder as createOrderService } from "../services/orderService.js";
import { getOrderPaymentStatus as getOrderPaymentStatusService } from "../services/mercadoPagoCheckoutService.js";
import {
  assertOrderTransition,
  assertPaymentTransition,
} from "../services/stateTransitionService.js";

const ORDER_STATUSES = new Set([
  "draft",
  "pending_payment",
  "paid",
  "cancelled",
  "partially_refunded",
  "disputed",
  "charged_back",
  "refunded",
]);
const ORDER_CHANNELS = new Set(["online", "reception", "mobile"]);
const CANCELLABLE_ORDER_STATUSES = new Set(["draft", "pending_payment"]);

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
  if (!payment) return null;

  const plain = payment.get ? payment.get({ plain: true }) : payment;
  const base = {
    id: plain.id,
    orderId: plain.orderId,
    amount: plain.amount,
    currency: plain.currency,
    method: plain.method,
    status: plain.status,
    paidAt: plain.paidAt,
    approvedAt: plain.approvedAt,
    cancelledAt: plain.cancelledAt,
    refundedAt: plain.refundedAt,
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
    source: plain.source,
    provider: plain.provider,
    providerPreferenceId: plain.providerPreferenceId,
    providerPaymentId: plain.providerPaymentId,
    externalReference: plain.externalReference,
    providerStatus: plain.providerStatus,
    providerStatusDetail: plain.providerStatusDetail,
    idempotencyKey: plain.idempotencyKey,
    reference: plain.reference,
    notes: plain.notes,
    createdBy: plain.createdBy,
  };
}

function sanitizeOrderDiscount(discount) {
  const plain = discount.get ? discount.get({ plain: true }) : discount;

  return {
    id: plain.id,
    orderId: plain.orderId,
    orderItemId: plain.orderItemId,
    promotionId: plain.promotionId,
    amount: plain.amount,
    description: plain.description,
    promotion: plain.promotion
      ? {
          id: plain.promotion.id,
          name: plain.promotion.name,
          discountType: plain.promotion.discountType,
          discountValue: plain.promotion.discountValue,
          status: plain.promotion.status,
        }
      : null,
    createdAt: plain.createdAt,
  };
}

function sanitizeOrderItem(item) {
  const plain = item.get ? item.get({ plain: true }) : item;

  return {
    id: plain.id,
    orderId: plain.orderId,
    itemType: plain.itemType,
    productId: plain.productId,
    membershipPlanId: plain.membershipPlanId,
    quantity: plain.quantity,
    unitPrice: plain.unitPrice,
    discountAmount: plain.discountAmount,
    subtotal: plain.subtotal,
    itemNameSnapshot: plain.itemNameSnapshot,
    itemDescriptionSnapshot: plain.itemDescriptionSnapshot,
    categorySnapshot: plain.categorySnapshot,
    brandSnapshot: plain.brandSnapshot,
    productTypeSnapshot: plain.productTypeSnapshot,
    durationDaysSnapshot: plain.durationDaysSnapshot,
    product: plain.product
      ? {
          id: plain.product.id,
          id_producto: plain.product.id_producto,
          name: plain.product.name,
          status: plain.product.status,
        }
      : null,
    membershipPlan: plain.membershipPlan
      ? {
          id: plain.membershipPlan.id,
          name: plain.membershipPlan.name,
          type: plain.membershipPlan.type,
          durationDays: plain.membershipPlan.durationDays,
        }
      : null,
    discounts: Array.isArray(plain.discounts)
      ? plain.discounts.map(sanitizeOrderDiscount)
      : [],
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

function sanitizeOrder(order, { admin = false } = {}) {
  const plain = order.get ? order.get({ plain: true }) : order;

  return {
    id: plain.id,
    userId: plain.userId,
    orderNumber: plain.orderNumber,
    status: plain.status,
    channel: plain.channel,
    subtotal: plain.subtotal,
    discountTotal: plain.discountTotal,
    taxTotal: plain.taxTotal,
    total: plain.total,
    currency: plain.currency,
    paidAt: plain.paidAt,
    cancelledAt: plain.cancelledAt,
    refundedAt: plain.refundedAt,
    notes: admin ? plain.notes : undefined,
    metadata: admin ? plain.metadata : undefined,
    customer:
      admin && plain.customer
        ? {
            id: plain.customer.id,
            email: plain.customer.email,
            role: plain.customer.role,
          }
        : undefined,
    items: Array.isArray(plain.items) ? plain.items.map(sanitizeOrderItem) : [],
    discounts: Array.isArray(plain.discounts)
      ? plain.discounts.map(sanitizeOrderDiscount)
      : [],
    payments: Array.isArray(plain.payments)
      ? plain.payments.map((payment) => sanitizePayment(payment, { admin }))
      : [],
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

function buildOrderWhere(query, options = {}) {
  const { userId = null } = options;
  const where = {};
  const status = buildEnumFilter(query.status, ORDER_STATUSES, "Estado");
  const channel = buildEnumFilter(query.channel, ORDER_CHANNELS, "Canal");
  const createdAt = buildCreatedAtFilter(query);

  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (createdAt) where.createdAt = createdAt;

  const customerId = query.customerId || query.clientId || query.userId;

  if (customerId && !userId) {
    where.userId = customerId;
  }

  return where;
}

function buildOrderIncludes(query, { admin = false } = {}) {
  const planId = query.planId || null;
  const method = buildEnumFilter(
    query.method,
    new Set(["cash", "transfer", "card_terminal", "online_checkout"]),
    "Metodo"
  );

  return [
    ...(admin
      ? [
          {
            model: User,
            as: "customer",
            attributes: ["id", "email", "role"],
          },
        ]
      : []),
    {
      model: OrderItem,
      as: "items",
      required: Boolean(planId),
      where: planId ? { membershipPlanId: planId } : undefined,
      include: [
        {
          model: Product,
          as: "product",
          required: false,
        },
        {
          model: MembershipPlan,
          as: "membershipPlan",
          required: false,
        },
        {
          model: OrderDiscount,
          as: "discounts",
          required: false,
          include: [
            {
              model: Promotion,
              as: "promotion",
              required: false,
            },
          ],
        },
      ],
    },
    {
      model: OrderDiscount,
      as: "discounts",
      required: false,
      include: [
        {
          model: Promotion,
          as: "promotion",
          required: false,
        },
      ],
    },
    {
      model: Payment,
      as: "payments",
      required: Boolean(method),
      where: method ? { method } : undefined,
    },
  ];
}

async function findOrderById(orderId, options = {}) {
  const { admin = false, transaction = null, lock = null } = options;

  return Order.findByPk(orderId, {
    include: buildOrderIncludes({}, { admin }),
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

export async function createAdminOrder(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const {
      userId,
      channel = "reception",
      status = "draft",
      currency = "MXN",
      notes = null,
      metadata = null,
      items = [],
    } = req.body || {};

    if (!userId) {
      const error = new Error("userId es obligatorio.");
      error.statusCode = 400;
      throw error;
    }

    if (!ORDER_CHANNELS.has(channel)) {
      const error = new Error("channel invalido.");
      error.statusCode = 400;
      throw error;
    }

    if (!["draft", "pending_payment"].includes(status)) {
      const error = new Error(
        "Solo se pueden crear ordenes en draft o pending_payment."
      );
      error.statusCode = 400;
      throw error;
    }

    if (!Array.isArray(items) || items.length === 0) {
      const error = new Error("La orden debe incluir al menos un item.");
      error.statusCode = 400;
      throw error;
    }

    const order = await createOrderService({
      userId,
      channel,
      status,
      currency,
      createdBy: req.user.id,
      notes,
      metadata,
      items,
      transaction,
    });

    await transaction.commit();

    const created = await findOrderById(order.id, { admin: true });

    return res.status(201).json({
      ok: true,
      order: sanitizeOrder(created, { admin: true }),
    });
  } catch (error) {
    await transaction.rollback();
    return handleControllerError(res, error, "Error creando orden admin");
  }
}

export async function listMyOrders(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = buildOrderWhere(req.query, { userId: req.user.id });

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: buildOrderIncludes(req.query),
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      ok: true,
      orders: rows.map((order) => sanitizeOrder(order)),
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "Error listando ordenes");
  }
}

export async function getOrderById(req, res) {
  try {
    const isAdmin = req.user.role === "administrador";
    const order = await findOrderById(req.params.orderId, { admin: isAdmin });

    if (!order) {
      return res.status(404).json({ ok: false, error: "Orden no encontrada" });
    }

    if (!isAdmin && order.userId !== req.user.id) {
      return res.status(403).json({
        ok: false,
        error: "No tienes permisos para consultar esta orden",
      });
    }

    return res.json({
      ok: true,
      order: sanitizeOrder(order, { admin: isAdmin }),
    });
  } catch (error) {
    return handleControllerError(res, error, "Error obteniendo orden");
  }
}

export async function getOrderPaymentStatus(req, res) {
  try {
    const isAdmin = req.user.role === "administrador";
    const result = await getOrderPaymentStatusService({
      orderId: req.params.orderId,
      userId: req.user.id,
      isAdmin,
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error consultando estado de pago de orden"
    );
  }
}

export async function listAdminOrders(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = buildOrderWhere(req.query);

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: buildOrderIncludes(req.query, { admin: true }),
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      ok: true,
      orders: rows.map((order) => sanitizeOrder(order, { admin: true })),
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "Error listando ordenes admin");
  }
}

export async function cancelOrder(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const isAdmin = req.user.role === "administrador";
    const order = await Order.findByPk(req.params.orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ ok: false, error: "Orden no encontrada" });
    }

    if (!isAdmin && order.userId !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        ok: false,
        error: "No tienes permisos para cancelar esta orden",
      });
    }

    if (!CANCELLABLE_ORDER_STATUSES.has(order.status)) {
      await transaction.rollback();
      return res.status(409).json({
        ok: false,
        error: "Solo se pueden cancelar ordenes draft o pending_payment",
      });
    }

    const cancelledAt = new Date();

    assertOrderTransition(order.status, "cancelled");

    await order.update(
      {
        status: "cancelled",
        cancelledAt,
      },
      { transaction }
    );

    assertPaymentTransition("pending", "cancelled");

    await Payment.update(
      {
        status: "cancelled",
        cancelledAt,
      },
      {
        where: {
          orderId: order.id,
          status: "pending",
        },
        transaction,
      }
    );

    await transaction.commit();

    const cancelled = await findOrderById(order.id, { admin: isAdmin });

    return res.json({
      ok: true,
      order: sanitizeOrder(cancelled, { admin: isAdmin }),
    });
  } catch (error) {
    await transaction.rollback();
    return handleControllerError(res, error, "Error cancelando orden");
  }
}
