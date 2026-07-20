import { sequelize } from "../config/sequelize.js";
import {
  InventoryMovement,
  OrderItem,
  Product,
} from "../models/index.js";

const INCREASE_MOVEMENTS = new Set(["purchase", "return", "restock"]);
const DECREASE_MOVEMENTS = new Set(["sale", "damaged", "expired"]);
const ALL_MOVEMENTS = new Set([
  "purchase",
  "sale",
  "return",
  "restock",
  "adjustment",
  "damaged",
  "expired",
]);

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

function normalizeProductId(productId) {
  const normalized = Number(productId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw serviceError("productId debe ser un identificador valido.");
  }

  return normalized;
}

function normalizePositiveInteger(value, label) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw serviceError(`${label} debe ser mayor que cero.`);
  }

  return normalized;
}

function normalizeStock(value, label) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized)) {
    throw serviceError(`${label} debe ser un entero.`);
  }

  return normalized;
}

function allowNegativeStock(explicitValue = null) {
  if (explicitValue != null) return Boolean(explicitValue);
  return String(process.env.ALLOW_NEGATIVE_STOCK || "").toLowerCase() === "true";
}

function normalizeText(value) {
  if (value == null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

async function findProductForInventory(productId, transaction) {
  const product = await Product.findOne({
    where: {
      id_producto: normalizeProductId(productId),
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!product) {
    throw serviceError("Producto no encontrado.", 404);
  }

  return product;
}

function calculateStockAfter({
  movementType,
  quantity,
  requestedStockAfter,
  stockBefore,
}) {
  if (movementType === "adjustment") {
    const stockAfter = normalizeStock(requestedStockAfter, "stockAfter");
    return {
      stockAfter,
      quantity: Math.abs(stockAfter - stockBefore),
    };
  }

  const normalizedQuantity = normalizePositiveInteger(quantity, "quantity");

  if (INCREASE_MOVEMENTS.has(movementType)) {
    return {
      stockAfter: stockBefore + normalizedQuantity,
      quantity: normalizedQuantity,
    };
  }

  if (DECREASE_MOVEMENTS.has(movementType)) {
    return {
      stockAfter: stockBefore - normalizedQuantity,
      quantity: normalizedQuantity,
    };
  }

  throw serviceError(`movementType invalido: ${movementType}`);
}

export async function applyInventoryMovement({
  productId,
  movementType,
  quantity = null,
  stockAfter = null,
  orderItemId = null,
  reference = null,
  createdBy = null,
  notes = null,
  allowNegative = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (!ALL_MOVEMENTS.has(movementType)) {
      throw serviceError(`movementType invalido: ${movementType}`);
    }

    const product = await findProductForInventory(productId, t);
    const stockBefore = normalizeStock(product.stock, "stockBefore");
    const next = calculateStockAfter({
      movementType,
      quantity,
      requestedStockAfter: stockAfter,
      stockBefore,
    });

    if (next.quantity === 0) {
      return {
        product,
        movement: null,
        changed: false,
      };
    }

    if (next.stockAfter < 0 && !allowNegativeStock(allowNegative)) {
      throw serviceError("El movimiento dejaria stock negativo.");
    }

    await product.update(
      {
        stock: next.stockAfter,
      },
      { transaction: t }
    );

    const movement = await InventoryMovement.create(
      {
        productId: product.id_producto,
        orderItemId,
        movementType,
        quantity: next.quantity,
        stockBefore,
        stockAfter: next.stockAfter,
        reference: normalizeText(reference),
        createdBy,
        notes: normalizeText(notes),
      },
      { transaction: t }
    );

    return {
      product,
      movement,
      changed: true,
    };
  });
}

export async function adjustProductStock({
  productId,
  newStock,
  reference = null,
  createdBy = null,
  notes = null,
  allowNegative = null,
  transaction = null,
}) {
  return applyInventoryMovement({
    productId,
    movementType: "adjustment",
    stockAfter: newStock,
    reference,
    createdBy,
    notes,
    allowNegative,
    transaction,
  });
}

export async function recordProductSaleFromOrderItem({
  orderItemId,
  createdBy = null,
  reference = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const existingSale = await InventoryMovement.findOne({
      where: {
        orderItemId,
        movementType: "sale",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existingSale) {
      return {
        movement: existingSale,
        skipped: true,
        reason: "sale_already_recorded",
      };
    }

    const orderItem = await OrderItem.findByPk(orderItemId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!orderItem) {
      throw serviceError("OrderItem no encontrado.", 404);
    }

    if (orderItem.itemType !== "product" || !orderItem.productId) {
      return {
        movement: null,
        skipped: true,
        reason: "order_item_is_not_product",
      };
    }

    const result = await applyInventoryMovement({
      productId: orderItem.productId,
      orderItemId: orderItem.id,
      movementType: "sale",
      quantity: orderItem.quantity,
      reference: reference || `order-item:${orderItem.id}`,
      createdBy,
      transaction: t,
    });

    return {
      ...result,
      skipped: false,
    };
  });
}

export async function recordProductSalesForOrder({
  orderId,
  createdBy = null,
  reference = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const orderItems = await OrderItem.findAll({
      where: {
        orderId,
        itemType: "product",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const results = [];

    for (const orderItem of orderItems) {
      results.push(
        await recordProductSaleFromOrderItem({
          orderItemId: orderItem.id,
          createdBy,
          reference: reference || `order:${orderId}`,
          transaction: t,
        })
      );
    }

    return results;
  });
}

export async function recordProductReturnFromOrderItem({
  orderItemId,
  quantity = null,
  createdBy = null,
  reference = null,
  notes = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const orderItem = await OrderItem.findByPk(orderItemId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!orderItem) {
      throw serviceError("OrderItem no encontrado.", 404);
    }

    if (orderItem.itemType !== "product" || !orderItem.productId) {
      throw serviceError("Solo se pueden devolver items de producto.");
    }

    const normalizedReference = normalizeText(reference);

    if (normalizedReference) {
      const existingReturn = await InventoryMovement.findOne({
        where: {
          orderItemId: orderItem.id,
          movementType: "return",
          reference: normalizedReference,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existingReturn) {
        return {
          movement: existingReturn,
          skipped: true,
          reason: "return_already_recorded",
        };
      }
    }

    return applyInventoryMovement({
      productId: orderItem.productId,
      orderItemId: orderItem.id,
      movementType: "return",
      quantity: quantity || orderItem.quantity,
      reference: normalizedReference || `order-item:${orderItem.id}`,
      createdBy,
      notes,
      transaction: t,
    });
  });
}
