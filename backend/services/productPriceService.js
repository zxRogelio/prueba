import { sequelize } from "../config/sequelize.js";
import { Product, ProductPriceHistory } from "../models/index.js";

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

function toCents(value, label = "precio") {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw serviceError(`${label} debe ser un monto valido.`);
  }

  return Math.round(numberValue * 100);
}

function fromCents(value) {
  return (value / 100).toFixed(2);
}

function normalizeText(value) {
  if (value == null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

async function findProductForPriceChange(productId, transaction) {
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

export async function changeProductPrice({
  productId,
  newPrice,
  changedBy = null,
  reason = null,
  validFrom = new Date(),
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const product = await findProductForPriceChange(productId, t);
    const previousPriceCents = toCents(product.price, "previousPrice");
    const newPriceCents = toCents(newPrice, "newPrice");

    if (newPriceCents < 0) {
      throw serviceError("newPrice no puede ser negativo.");
    }

    if (previousPriceCents === newPriceCents) {
      return {
        product,
        history: null,
        changed: false,
      };
    }

    const changeDate = validFrom instanceof Date ? validFrom : new Date(validFrom);

    if (Number.isNaN(changeDate.getTime())) {
      throw serviceError("validFrom no es una fecha valida.");
    }

    await ProductPriceHistory.update(
      {
        validTo: changeDate,
      },
      {
        where: {
          productId: product.id_producto,
          validTo: null,
        },
        transaction: t,
      }
    );

    await product.update(
      {
        price: fromCents(newPriceCents),
      },
      { transaction: t }
    );

    const history = await ProductPriceHistory.create(
      {
        productId: product.id_producto,
        previousPrice: fromCents(previousPriceCents),
        newPrice: fromCents(newPriceCents),
        validFrom: changeDate,
        validTo: null,
        changedBy,
        reason: normalizeText(reason),
      },
      { transaction: t }
    );

    return {
      product,
      history,
      changed: true,
    };
  });
}

export async function updateProductWithCentralizedPrice({
  product,
  updates,
  changedBy = null,
  reason = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const nextUpdates = { ...(updates || {}) };
    const priceProvided = Object.hasOwn(nextUpdates, "price");
    const nextPrice = nextUpdates.price;

    delete nextUpdates.price;
    delete nextUpdates.priceChangeReason;
    delete nextUpdates.priceReason;

    if (Object.keys(nextUpdates).length > 0) {
      await product.update(nextUpdates, { transaction: t });
    }

    let priceChange = {
      product,
      history: null,
      changed: false,
    };

    if (priceProvided) {
      priceChange = await changeProductPrice({
        productId: product.id_producto,
        newPrice: nextPrice,
        changedBy,
        reason,
        transaction: t,
      });
    }

    return {
      product: priceChange.product,
      priceHistory: priceChange.history,
      priceChanged: priceChange.changed,
    };
  });
}
