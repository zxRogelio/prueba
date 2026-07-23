import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { Cart, CartItem, Product, User } from "../models/index.js";
import { calculateCartItemSubtotal } from "../models/CartItem.js";

function normalizeCurrency(currency = "MXN") {
  const normalized = String(currency).trim().toUpperCase();

  if (normalized.length !== 3) {
    throw new Error("La moneda del carrito debe tener 3 caracteres.");
  }

  return normalized;
}

function normalizeProductId(productId) {
  const normalized = Number(productId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error("productId debe ser un identificador de producto valido.");
  }

  return normalized;
}

function normalizeQuantity(quantity) {
  const normalized = Number(quantity);

  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new Error("La cantidad debe ser mayor o igual a uno.");
  }

  return normalized;
}

function toCents(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error("Monto invalido en carrito.");
  }

  return Math.round(numberValue * 100);
}

function fromCents(value) {
  return (value / 100).toFixed(2);
}

async function withTransaction(transaction, callback) {
  if (transaction) {
    return callback(transaction);
  }

  return sequelize.transaction(callback);
}

async function findActiveProduct(productId, transaction) {
  const product = await Product.findOne({
    where: {
      id_producto: normalizeProductId(productId),
    },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!product) {
    throw new Error("Producto no encontrado.");
  }

  if (product.status !== "Activo") {
    throw new Error("No se pueden agregar productos inactivos al carrito.");
  }

  return product;
}

function assertStockAvailable(product, requestedQuantity) {
  const stock = Number(product.stock);

  if (!Number.isInteger(stock) || stock < requestedQuantity) {
    throw new Error("Stock insuficiente para el producto solicitado.");
  }
}

async function findActiveCart(userId, transaction) {
  return Cart.findOne({
    where: {
      userId,
      status: "active",
    },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
}

export async function getOrCreateActiveCart({
  userId,
  currency = "MXN",
  expiresAt = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const user = await User.findByPk(userId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    const existingCart = await findActiveCart(userId, t);

    if (existingCart) {
      return existingCart;
    }

    return Cart.create(
      {
        userId,
        status: "active",
        currency: normalizeCurrency(currency),
        subtotal: 0,
        total: 0,
        lastActivityAt: new Date(),
        expiresAt,
      },
      { transaction: t }
    );
  });
}

export async function recalculateCartTotals({ cartId, transaction = null }) {
  return withTransaction(transaction, async (t) => {
    const cart = await Cart.findByPk(cartId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!cart) {
      throw new Error("Carrito no encontrado.");
    }

    const items = await CartItem.findAll({
      where: { cartId },
      transaction: t,
    });

    const subtotalCents = items.reduce(
      (sum, item) => sum + toCents(item.subtotal),
      0
    );
    const total = fromCents(subtotalCents);

    await cart.update(
      {
        subtotal: total,
        total,
        lastActivityAt: new Date(),
      },
      { transaction: t }
    );

    return cart;
  });
}

export async function getActiveCartWithItems({ userId, transaction = null }) {
  return withTransaction(transaction, async (t) => {
    return Cart.findOne({
      where: {
        userId,
        status: "active",
      },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
            },
          ],
        },
      ],
      transaction: t,
      order: [[{ model: CartItem, as: "items" }, "createdAt", "ASC"]],
    });
  });
}

export async function addProductToCart({
  userId,
  productId,
  quantity = 1,
  currency = "MXN",
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const normalizedQuantity = normalizeQuantity(quantity);
    const product = await findActiveProduct(productId, t);
    const cart = await getOrCreateActiveCart({
      userId,
      currency,
      transaction: t,
    });

    const existingItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        productId: product.id_producto,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const nextQuantity =
      normalizedQuantity + Number(existingItem?.quantity || 0);

    assertStockAvailable(product, nextQuantity);

    if (existingItem) {
      await existingItem.update(
        {
          quantity: nextQuantity,
          unitPriceSnapshot: product.price,
          subtotal: calculateCartItemSubtotal({
            quantity: nextQuantity,
            unitPriceSnapshot: product.price,
          }),
        },
        { transaction: t }
      );
    } else {
      await CartItem.create(
        {
          cartId: cart.id,
          productId: product.id_producto,
          quantity: normalizedQuantity,
          unitPriceSnapshot: product.price,
          subtotal: calculateCartItemSubtotal({
            quantity: normalizedQuantity,
            unitPriceSnapshot: product.price,
          }),
        },
        { transaction: t }
      );
    }

    await recalculateCartTotals({ cartId: cart.id, transaction: t });

    return getActiveCartWithItems({ userId, transaction: t });
  });
}

export async function updateCartItemQuantity({
  userId,
  cartItemId,
  quantity,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const normalizedQuantity = normalizeQuantity(quantity);
    const cart = await findActiveCart(userId, t);

    if (!cart) {
      throw new Error("Carrito activo no encontrado.");
    }

    const item = await CartItem.findOne({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!item) {
      throw new Error("Producto no encontrado en el carrito.");
    }

    const product = await findActiveProduct(item.productId, t);
    assertStockAvailable(product, normalizedQuantity);

    await item.update(
      {
        quantity: normalizedQuantity,
        unitPriceSnapshot: product.price,
        subtotal: calculateCartItemSubtotal({
          quantity: normalizedQuantity,
          unitPriceSnapshot: product.price,
        }),
      },
      { transaction: t }
    );

    await recalculateCartTotals({ cartId: cart.id, transaction: t });

    return getActiveCartWithItems({ userId, transaction: t });
  });
}

export async function removeCartItem({
  userId,
  cartItemId,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const cart = await findActiveCart(userId, t);

    if (!cart) {
      throw new Error("Carrito activo no encontrado.");
    }

    const deletedCount = await CartItem.destroy({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
      transaction: t,
    });

    if (deletedCount === 0) {
      throw new Error("Producto no encontrado en el carrito.");
    }

    await recalculateCartTotals({ cartId: cart.id, transaction: t });

    return getActiveCartWithItems({ userId, transaction: t });
  });
}

export async function markCartConverted({
  cartId,
  orderId,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const cart = await Cart.findByPk(cartId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!cart) {
      throw new Error("Carrito no encontrado.");
    }

    if (cart.status !== "active") {
      throw new Error("Solo un carrito activo puede convertirse en orden.");
    }

    return cart.update(
      {
        status: "converted",
        convertedOrderId: orderId,
        lastActivityAt: new Date(),
      },
      { transaction: t }
    );
  });
}

export async function markInactiveCarts({
  status,
  olderThan,
  transaction = null,
}) {
  if (!["abandoned", "expired"].includes(status)) {
    throw new Error("El estado debe ser abandoned o expired.");
  }

  return withTransaction(transaction, async (t) => {
    const where = {
      status: "active",
    };

    if (olderThan) {
      where.lastActivityAt = {
        [Op.lt]: olderThan,
      };
    }

    const [updatedCount] = await Cart.update(
      {
        status,
        lastActivityAt: new Date(),
      },
      {
        where,
        transaction: t,
      }
    );

    return updatedCount;
  });
}
