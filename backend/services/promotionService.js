import { Op } from "sequelize";
import {
  OrderDiscount,
  Promotion,
  PromotionProduct,
} from "../models/index.js";

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw serviceError("Fecha de promocion invalida.");
  }

  return date;
}

function describePromotion(promotion) {
  return [
    promotion.name,
    promotion.discountType,
    Number(promotion.discountValue).toFixed(2),
  ].join(" | ");
}

export function calculatePromotionDiscountCents({
  promotion,
  unitPrice,
  quantity,
}) {
  const unitPriceCents = toCents(unitPrice, "unitPrice");
  const quantityValue = Number(quantity);

  if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
    throw serviceError("quantity debe ser mayor que cero.");
  }

  const grossCents = unitPriceCents * quantityValue;
  const discountValueCents = toCents(
    promotion.discountValue,
    "discountValue"
  );

  if (promotion.discountType === "percentage") {
    const percentage = Number(promotion.discountValue);
    return Math.min(
      grossCents,
      Math.round((grossCents * percentage) / 100)
    );
  }

  if (promotion.discountType === "fixed_amount") {
    return Math.min(grossCents, discountValueCents);
  }

  if (promotion.discountType === "special_price") {
    const discountPerUnit = Math.max(unitPriceCents - discountValueCents, 0);
    return Math.min(grossCents, discountPerUnit * quantityValue);
  }

  throw serviceError("Tipo de promocion invalido.");
}

export async function findApplicableProductPromotions({
  productId,
  promotionId = null,
  at = new Date(),
  transaction,
} = {}) {
  const effectiveAt = normalizeDate(at);
  const where = {
    status: "active",
    startDate: { [Op.lte]: effectiveAt },
    endDate: { [Op.gte]: effectiveAt },
  };

  if (promotionId) {
    where.id = promotionId;
  }

  return Promotion.findAll({
    where,
    include: [
      {
        model: PromotionProduct,
        as: "products",
        required: true,
        where: { productId },
        attributes: ["id", "productId"],
      },
    ],
    transaction,
    order: [
      ["createdAt", "ASC"],
      ["name", "ASC"],
    ],
  });
}

export async function calculateProductPromotionDiscount({
  productId,
  unitPrice,
  quantity,
  promotionId = null,
  at = new Date(),
  transaction,
} = {}) {
  const promotions = await findApplicableProductPromotions({
    productId,
    promotionId,
    at,
    transaction,
  });

  if (promotionId && promotions.length === 0) {
    throw serviceError("La promocion no esta activa o no aplica al producto.");
  }

  let best = null;

  for (const promotion of promotions) {
    const discountCents = calculatePromotionDiscountCents({
      promotion,
      unitPrice,
      quantity,
    });

    if (discountCents <= 0) {
      continue;
    }

    if (!best || discountCents > best.discountCents) {
      best = {
        promotion,
        discountCents,
        description: describePromotion(promotion),
      };
    }
  }

  return (
    best || {
      promotion: null,
      discountCents: 0,
      description: null,
    }
  );
}

export async function createOrderDiscountSnapshots({
  orderId,
  builtItems,
  createdItems,
  transaction,
}) {
  const rows = [];

  builtItems.forEach((built, index) => {
    const appliedDiscount = built.appliedDiscount;

    if (!appliedDiscount || appliedDiscount.discountCents <= 0) {
      return;
    }

    rows.push({
      orderId,
      orderItemId: createdItems[index]?.id || null,
      promotionId: appliedDiscount.promotion?.id || null,
      amount: fromCents(appliedDiscount.discountCents),
      description: appliedDiscount.description,
    });
  });

  if (rows.length === 0) {
    return [];
  }

  return OrderDiscount.bulkCreate(rows, {
    transaction,
    validate: true,
  });
}
