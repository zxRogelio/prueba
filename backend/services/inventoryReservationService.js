import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  InventoryReservation,
  OrderItem,
  Product,
} from "../models/index.js";

const RESERVATION_STATUSES = new Set([
  "active",
  "consumed",
  "released",
  "expired",
]);
const RELEASE_STATUSES = new Set(["released", "expired"]);
const DEFAULT_TTL_MINUTES = 30;

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

function normalizePositiveInteger(value, label) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw serviceError(`${label} debe ser mayor que cero.`);
  }

  return normalized;
}

function reservationTtlMinutes() {
  const configured = Number(process.env.INVENTORY_RESERVATION_TTL_MINUTES);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_TTL_MINUTES;
}

export function buildInventoryReservationExpiration(now = new Date()) {
  return new Date(now.getTime() + reservationTtlMinutes() * 60 * 1000);
}

function isUniqueConstraintError(error) {
  return error?.name === "SequelizeUniqueConstraintError";
}

async function getProductQuantitiesForOrder({ orderId, transaction }) {
  const orderItems = await OrderItem.findAll({
    where: {
      orderId,
      itemType: "product",
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
    order: [["productId", "ASC"]],
  });
  const quantities = new Map();

  for (const item of orderItems) {
    if (!item.productId) continue;

    const current = quantities.get(item.productId) || 0;
    quantities.set(
      item.productId,
      current + normalizePositiveInteger(item.quantity, "quantity")
    );
  }

  return quantities;
}

async function expireActiveReservations({
  productIds = null,
  now = new Date(),
  transaction,
}) {
  const where = {
    status: "active",
    expiresAt: {
      [Op.lte]: now,
    },
  };

  if (Array.isArray(productIds) && productIds.length > 0) {
    where.productId = {
      [Op.in]: productIds,
    };
  }

  const reservations = await InventoryReservation.findAll({
    where,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  for (const reservation of reservations) {
    await reservation.update(
      {
        status: "expired",
        releasedAt: now,
      },
      { transaction }
    );
  }

  return reservations.length;
}

async function lockProducts(productIds, transaction) {
  const sortedProductIds = [...productIds].sort((left, right) => left - right);
  const products = await Product.findAll({
    where: {
      id_producto: {
        [Op.in]: sortedProductIds,
      },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
    order: [["id_producto", "ASC"]],
  });
  const productsByBusinessId = new Map(
    products.map((product) => [product.id_producto, product])
  );

  for (const productId of sortedProductIds) {
    const product = productsByBusinessId.get(productId);

    if (!product || product.status !== "Activo") {
      throw serviceError("Producto no encontrado o inactivo.", 404);
    }
  }

  return productsByBusinessId;
}

async function getActiveReservationsByProduct(productIds, transaction) {
  const reservations = await InventoryReservation.findAll({
    where: {
      productId: {
        [Op.in]: productIds,
      },
      status: "active",
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
    order: [
      ["productId", "ASC"],
      ["createdAt", "ASC"],
    ],
  });
  const byProduct = new Map();

  for (const reservation of reservations) {
    const list = byProduct.get(reservation.productId) || [];
    list.push(reservation);
    byProduct.set(reservation.productId, list);
  }

  return byProduct;
}

function sumReservedQuantity(reservations = [], ignoreOrderId = null) {
  return reservations.reduce((sum, reservation) => {
    if (ignoreOrderId && reservation.orderId === ignoreOrderId) return sum;
    return sum + Number(reservation.quantity);
  }, 0);
}

function assertValidReservationStatus(status) {
  if (!RESERVATION_STATUSES.has(status)) {
    throw serviceError("status de reserva invalido.");
  }
}

export async function createInventoryReservationsForOrder({
  orderId,
  expiresAt = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const quantities = await getProductQuantitiesForOrder({
      orderId,
      transaction: t,
    });

    if (quantities.size === 0) return [];

    const now = new Date();
    const expiration = expiresAt || buildInventoryReservationExpiration(now);
    const productIds = [...quantities.keys()].sort((left, right) => left - right);

    await lockProducts(productIds, t);
    await expireActiveReservations({ productIds, now, transaction: t });

    const activeReservationsByProduct = await getActiveReservationsByProduct(
      productIds,
      t
    );
    const reservations = [];

    for (const productId of productIds) {
      const quantity = quantities.get(productId);
      const activeReservations = activeReservationsByProduct.get(productId) || [];
      const existingReservation = activeReservations.find(
        (reservation) => reservation.orderId === orderId
      );

      if (existingReservation) {
        if (Number(existingReservation.quantity) !== quantity) {
          throw serviceError(
            "La reserva activa no coincide con la cantidad de la orden.",
            409
          );
        }

        if (new Date(existingReservation.expiresAt).getTime() < expiration.getTime()) {
          await existingReservation.update(
            {
              expiresAt: expiration,
            },
            { transaction: t }
          );
        }

        reservations.push(existingReservation);
        continue;
      }

      const product = await Product.findOne({
        where: { id_producto: productId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const reservedByOtherOrders = sumReservedQuantity(
        activeReservations,
        orderId
      );
      const available = Number(product.stock) - reservedByOtherOrders;

      if (available < quantity) {
        throw serviceError(
          "Stock disponible insuficiente para reservar el producto solicitado.",
          409
        );
      }

      try {
        reservations.push(
          await InventoryReservation.create(
            {
              orderId,
              productId,
              quantity,
              status: "active",
              expiresAt: expiration,
            },
            { transaction: t }
          )
        );
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;

        const concurrentReservation = await InventoryReservation.findOne({
          where: {
            orderId,
            productId,
            status: "active",
          },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!concurrentReservation) throw error;
        if (Number(concurrentReservation.quantity) !== quantity) {
          throw serviceError(
            "La reserva activa no coincide con la cantidad de la orden.",
            409
          );
        }

        reservations.push(concurrentReservation);
      }
    }

    return reservations;
  });
}

export async function consumeInventoryReservationsForOrder({
  orderId,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const quantities = await getProductQuantitiesForOrder({
      orderId,
      transaction: t,
    });

    if (quantities.size === 0) return [];

    const now = new Date();
    const productIds = [...quantities.keys()].sort((left, right) => left - right);
    const productsByBusinessId = await lockProducts(productIds, t);

    await expireActiveReservations({ productIds, now, transaction: t });

    const activeReservationsByProduct = await getActiveReservationsByProduct(
      productIds,
      t
    );
    const orderReservations = await InventoryReservation.findAll({
      where: {
        orderId,
        productId: {
          [Op.in]: productIds,
        },
        status: {
          [Op.in]: ["active", "consumed"],
        },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
      order: [["productId", "ASC"]],
    });
    const reservations = [];

    for (const productId of productIds) {
      const quantity = quantities.get(productId);
      const existingConsumed = orderReservations.find(
        (reservation) =>
          reservation.productId === productId && reservation.status === "consumed"
      );

      if (existingConsumed) {
        if (Number(existingConsumed.quantity) !== quantity) {
          throw serviceError(
            "La reserva consumida no coincide con la cantidad de la orden.",
            409
          );
        }

        reservations.push(existingConsumed);
        continue;
      }

      const activeReservation = orderReservations.find(
        (reservation) =>
          reservation.productId === productId && reservation.status === "active"
      );

      if (activeReservation) {
        if (Number(activeReservation.quantity) !== quantity) {
          throw serviceError(
            "La reserva activa no coincide con la cantidad de la orden.",
            409
          );
        }

        await activeReservation.update(
          {
            status: "consumed",
            consumedAt: activeReservation.consumedAt || now,
          },
          { transaction: t }
        );
        reservations.push(activeReservation);
        continue;
      }

      const activeReservations = activeReservationsByProduct.get(productId) || [];
      const reservedByOtherOrders = sumReservedQuantity(
        activeReservations,
        orderId
      );
      const product = productsByBusinessId.get(productId);
      const available = Number(product.stock) - reservedByOtherOrders;

      if (available < quantity) {
        throw serviceError(
          "No hay reserva activa ni stock disponible para confirmar la orden.",
          409
        );
      }

      reservations.push(
        await InventoryReservation.create(
          {
            orderId,
            productId,
            quantity,
            status: "consumed",
            expiresAt: now,
            consumedAt: now,
          },
          { transaction: t }
        )
      );
    }

    return reservations;
  });
}

export async function releaseInventoryReservationsForOrder({
  orderId,
  status = "released",
  transaction = null,
}) {
  assertValidReservationStatus(status);

  if (!RELEASE_STATUSES.has(status)) {
    throw serviceError("Las reservas solo pueden liberarse como released o expired.");
  }

  return withTransaction(transaction, async (t) => {
    const now = new Date();
    const reservations = await InventoryReservation.findAll({
      where: {
        orderId,
        status: "active",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    for (const reservation of reservations) {
      await reservation.update(
        {
          status,
          releasedAt: now,
        },
        { transaction: t }
      );
    }

    return {
      releasedCount: reservations.length,
      reservations,
    };
  });
}

export async function expireInventoryReservations({
  now = new Date(),
  transaction = null,
} = {}) {
  return withTransaction(transaction, async (t) => {
    const expiredCount = await expireActiveReservations({
      now,
      transaction: t,
    });

    return {
      expiredCount,
    };
  });
}
