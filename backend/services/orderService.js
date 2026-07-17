import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  Brand,
  Category,
  MembershipPlan,
  Order,
  OrderDiscount,
  OrderItem,
  Payment,
  Product,
  Promotion,
  Receipt,
  User,
} from "../models/index.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { recordProductSalesForOrder } from "./inventoryService.js";
import {
  calculateProductPromotionDiscount,
  createOrderDiscountSnapshots,
} from "./promotionService.js";

const ORDER_STATUSES = new Set([
  "draft",
  "pending_payment",
  "paid",
  "cancelled",
  "partially_refunded",
  "refunded",
]);
const ORDER_CHANNELS = new Set(["online", "reception", "mobile"]);
const CREATABLE_ORDER_STATUSES = new Set(["draft", "pending_payment"]);
const CANCELLABLE_ORDER_STATUSES = new Set(["draft", "pending_payment"]);
const MEMBERSHIP_ITEM_TYPES = new Set(["membership", "group_membership"]);

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

function normalizeQuantity(quantity = 1) {
  const normalized = Number(quantity);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw serviceError("quantity debe ser mayor que cero.");
  }

  return normalized;
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

function normalizeProductId(productId) {
  const normalized = Number(productId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw serviceError("productId debe ser un identificador valido.");
  }

  return normalized;
}

function buildDateFilter({ from, to } = {}) {
  if (!from && !to) return null;

  const filter = {};

  if (from) {
    const date = new Date(from);
    if (Number.isNaN(date.getTime())) {
      throw serviceError("Fecha inicial invalida.");
    }
    filter[Op.gte] = date;
  }

  if (to) {
    const date = new Date(to);
    if (Number.isNaN(date.getTime())) {
      throw serviceError("Fecha final invalida.");
    }
    filter[Op.lte] = date;
  }

  return filter;
}

function validateOrderState({ status, channel }) {
  if (!ORDER_STATUSES.has(status)) {
    throw serviceError("status de orden invalido.");
  }

  if (!ORDER_CHANNELS.has(channel)) {
    throw serviceError("channel de orden invalido.");
  }
}

async function findCustomer(userId, transaction) {
  const customer = await User.findByPk(userId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!customer || customer.role !== "cliente") {
    throw serviceError("Cliente no encontrado o invalido.", 404);
  }

  return customer;
}

async function buildProductOrderItem(rawItem, transaction) {
  if (!rawItem.productId) {
    throw serviceError("productId es obligatorio para items product.");
  }

  const quantity = normalizeQuantity(rawItem.quantity || 1);
  const product = await Product.findOne({
    where: {
      id_producto: normalizeProductId(rawItem.productId),
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!product || product.status !== "Activo") {
    throw serviceError("Producto no encontrado o inactivo.");
  }

  if (Number(product.stock) < quantity) {
    throw serviceError("Stock insuficiente para el producto solicitado.");
  }

  const [brand, category] = await Promise.all([
    Brand.findOne({
      where: { id_marca: product.brandId },
      transaction,
    }),
    Category.findOne({
      where: { id_categoria: product.categoryId },
      transaction,
    }),
  ]);
  const unitPriceCents = toCents(product.price, "unitPrice");
  const grossCents = unitPriceCents * quantity;
  const appliedDiscount = await calculateProductPromotionDiscount({
    productId: product.id_producto,
    unitPrice: product.price,
    quantity,
    promotionId: rawItem.promotionId || null,
    transaction,
  });
  const discountCents = Math.min(appliedDiscount.discountCents, grossCents);

  return {
    item: {
      itemType: "product",
      productId: product.id_producto,
      membershipPlanId: null,
      quantity,
      unitPrice: fromCents(unitPriceCents),
      discountAmount: fromCents(discountCents),
      subtotal: fromCents(grossCents - discountCents),
      itemNameSnapshot: product.name,
      itemDescriptionSnapshot: product.description,
      categorySnapshot: category?.name || null,
      brandSnapshot: brand?.name || null,
      productTypeSnapshot: product.productType,
      durationDaysSnapshot: null,
      metadata: rawItem.metadata || null,
    },
    appliedDiscount,
    grossCents,
    discountCents,
    netCents: grossCents - discountCents,
  };
}

async function buildMembershipOrderItem(rawItem, transaction) {
  if (!rawItem.membershipPlanId) {
    throw serviceError(
      "membershipPlanId es obligatorio para items de membresia."
    );
  }

  const itemType = rawItem.itemType;
  const quantity = normalizeQuantity(rawItem.quantity || 1);
  const plan = await MembershipPlan.findOne({
    where: {
      id: rawItem.membershipPlanId,
      isActive: true,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!plan) {
    throw serviceError("Plan de membresia no encontrado o inactivo.", 404);
  }

  if (itemType === "membership" && plan.type === "group") {
    throw serviceError("Usa itemType group_membership para planes grupales.");
  }

  if (itemType === "group_membership" && plan.type !== "group") {
    throw serviceError("group_membership solo acepta planes de tipo group.");
  }

  const unitPriceCents = toCents(plan.price, "unitPrice");
  const discountCents = 0;
  const grossCents = unitPriceCents * quantity;

  return {
    item: {
      itemType,
      productId: null,
      membershipPlanId: plan.id,
      quantity,
      unitPrice: fromCents(unitPriceCents),
      discountAmount: fromCents(discountCents),
      subtotal: fromCents(grossCents - discountCents),
      itemNameSnapshot: plan.name,
      itemDescriptionSnapshot: plan.description,
      categorySnapshot: "membership",
      brandSnapshot: null,
      productTypeSnapshot: plan.type,
      durationDaysSnapshot: plan.durationDays,
      metadata: rawItem.metadata || null,
    },
    appliedDiscount: null,
    plan,
    grossCents,
    discountCents,
    netCents: grossCents - discountCents,
  };
}

export async function buildOrderItemPayload(rawItem, transaction) {
  const itemType = rawItem?.itemType;

  if (itemType === "product") {
    return buildProductOrderItem(rawItem, transaction);
  }

  if (MEMBERSHIP_ITEM_TYPES.has(itemType)) {
    return buildMembershipOrderItem(rawItem, transaction);
  }

  throw serviceError("itemType invalido.");
}

export async function buildOrderItems({ items, transaction }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw serviceError("La orden debe incluir al menos un item.");
  }

  const builtItems = [];
  let subtotalCents = 0;
  let discountTotalCents = 0;
  let totalCents = 0;

  for (const rawItem of items) {
    const built = await buildOrderItemPayload(rawItem, transaction);
    builtItems.push(built);
    subtotalCents += built.grossCents;
    discountTotalCents += built.discountCents;
    totalCents += built.netCents;
  }

  return {
    items: builtItems,
    subtotal: fromCents(subtotalCents),
    discountTotal: fromCents(discountTotalCents),
    taxTotal: "0.00",
    total: fromCents(totalCents),
  };
}

export async function createOrder({
  userId,
  items,
  channel = "reception",
  status = "draft",
  currency = "MXN",
  createdBy = null,
  notes = null,
  metadata = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    validateOrderState({ status, channel });

    if (!CREATABLE_ORDER_STATUSES.has(status)) {
      throw serviceError("Solo se pueden crear ordenes draft o pending_payment.");
    }

    await findCustomer(userId, t);

    const totals = await buildOrderItems({ items, transaction: t });
    const orderNumber = await generateOrderNumber({
      sequelizeInstance: sequelize,
      transaction: t,
    });
    const order = await Order.create(
      {
        userId,
        orderNumber,
        status,
        channel,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        currency: normalizeCurrency(currency),
        createdBy,
        notes,
        metadata,
      },
      { transaction: t }
    );

    const createdItems = await OrderItem.bulkCreate(
      totals.items.map((built) => ({
        ...built.item,
        orderId: order.id,
      })),
      { transaction: t, validate: true, individualHooks: true }
    );
    await createOrderDiscountSnapshots({
      orderId: order.id,
      builtItems: totals.items,
      createdItems,
      transaction: t,
    });

    return getOrderWithDetails({ orderId: order.id, transaction: t });
  });
}

export async function createOrderItems({
  orderId,
  items,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const order = await Order.findByPk(orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw serviceError("Orden no encontrada.", 404);
    }

    if (order.status !== "draft") {
      throw serviceError("Solo se pueden agregar items a ordenes draft.");
    }

    const totals = await buildOrderItems({ items, transaction: t });
    const createdItems = await OrderItem.bulkCreate(
      totals.items.map((built) => ({
        ...built.item,
        orderId: order.id,
      })),
      { transaction: t, validate: true, individualHooks: true }
    );
    await createOrderDiscountSnapshots({
      orderId: order.id,
      builtItems: totals.items,
      createdItems,
      transaction: t,
    });
    const existingItems = await OrderItem.findAll({
      where: { orderId: order.id },
      transaction: t,
    });
    const subtotalCents = existingItems.reduce(
      (sum, item) => sum + toCents(item.unitPrice) * Number(item.quantity),
      0
    );
    const discountTotalCents = existingItems.reduce(
      (sum, item) => sum + toCents(item.discountAmount || 0),
      0
    );
    const totalCents = existingItems.reduce(
      (sum, item) => sum + toCents(item.subtotal),
      0
    );

    await order.update(
      {
        subtotal: fromCents(subtotalCents),
        discountTotal: fromCents(discountTotalCents),
        total: fromCents(totalCents),
      },
      { transaction: t }
    );

    return createdItems;
  });
}

export async function getOrderWithDetails({
  orderId,
  userId = null,
  transaction = null,
  lock = null,
} = {}) {
  const where = { id: orderId };

  if (userId) {
    where.userId = userId;
  }

  return Order.findOne({
    where,
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
        required: false,
      },
      {
        model: Receipt,
        as: "receipts",
        required: false,
      },
    ],
    transaction,
    lock,
    order: [
      [{ model: OrderItem, as: "items" }, "createdAt", "ASC"],
      [{ model: Payment, as: "payments" }, "createdAt", "ASC"],
      [{ model: OrderDiscount, as: "discounts" }, "createdAt", "ASC"],
    ],
  });
}

export async function listOrders({
  userId = null,
  status = null,
  channel = null,
  customerId = null,
  from = null,
  to = null,
  limit = 20,
  offset = 0,
  transaction = null,
} = {}) {
  const where = {};

  if (userId) where.userId = userId;
  if (customerId && !userId) where.userId = customerId;
  if (status) where.status = status;
  if (channel) where.channel = channel;

  const createdAt = buildDateFilter({ from, to });
  if (createdAt) where.createdAt = createdAt;

  return Order.findAndCountAll({
    where,
    include: [
      {
        model: OrderItem,
        as: "items",
        required: false,
        include: [
          {
            model: OrderDiscount,
            as: "discounts",
            required: false,
          },
        ],
      },
      {
        model: Payment,
        as: "payments",
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
    transaction,
  });
}

export async function markOrderPaid({
  orderId,
  paidAt = new Date(),
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const order = await Order.findByPk(orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw serviceError("Orden no encontrada.", 404);
    }

    if (["cancelled", "refunded"].includes(order.status)) {
      throw serviceError("No se puede marcar como pagada una orden cerrada.");
    }

    await order.update(
      {
        status: "paid",
        paidAt,
      },
      { transaction: t }
    );
    await recordProductSalesForOrder({
      orderId: order.id,
      createdBy: order.createdBy || null,
      reference: `order:${order.id}`,
      transaction: t,
    });

    return order;
  });
}

export async function cancelPendingOrder({
  orderId,
  userId = null,
  cancelledBy = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const order = await Order.findByPk(orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw serviceError("Orden no encontrada.", 404);
    }

    if (userId && order.userId !== userId) {
      throw serviceError("No tienes permisos para cancelar esta orden.", 403);
    }

    if (!CANCELLABLE_ORDER_STATUSES.has(order.status)) {
      throw serviceError("Solo se pueden cancelar ordenes draft o pending_payment.");
    }

    const cancelledAt = new Date();

    await order.update(
      {
        status: "cancelled",
        cancelledAt,
        metadata: {
          ...(order.metadata || {}),
          cancelledBy,
        },
      },
      { transaction: t }
    );

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
        transaction: t,
      }
    );

    return order;
  });
}
