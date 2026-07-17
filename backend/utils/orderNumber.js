import { sequelize } from "../config/sequelize.js";

const ORDER_NUMBER_PREFIX = "ORD";
const ORDER_NUMBER_PADDING = 6;

export function formatOrderNumber(year, sequenceValue) {
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(sequenceValue).padStart(
    ORDER_NUMBER_PADDING,
    "0"
  )}`;
}

function getOrderYear(date) {
  const orderDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(orderDate.getTime())) {
    throw new Error("Fecha invalida para generar numero de orden.");
  }

  return orderDate.getFullYear();
}

async function nextOrderCounterValue({ sequelizeInstance, transaction, year }) {
  const [rows] = await sequelizeInstance.query(
    `
    INSERT INTO "core"."OrderNumberCounters"
      ("year", "lastValue", "createdAt", "updatedAt")
    VALUES
      (:year, 1, NOW(), NOW())
    ON CONFLICT ("year")
    DO UPDATE SET
      "lastValue" = "OrderNumberCounters"."lastValue" + 1,
      "updatedAt" = NOW()
    RETURNING "lastValue";
    `,
    {
      replacements: { year },
      transaction,
    }
  );

  const nextValue = Number(rows?.[0]?.lastValue);

  if (!Number.isSafeInteger(nextValue) || nextValue <= 0) {
    throw new Error("No se pudo generar un consecutivo de orden valido.");
  }

  return nextValue;
}

export async function generateOrderNumber({
  sequelizeInstance = sequelize,
  transaction = null,
  date = new Date(),
} = {}) {
  const year = getOrderYear(date);

  if (transaction) {
    const nextValue = await nextOrderCounterValue({
      sequelizeInstance,
      transaction,
      year,
    });

    return formatOrderNumber(year, nextValue);
  }

  return sequelizeInstance.transaction(async (managedTransaction) => {
    const nextValue = await nextOrderCounterValue({
      sequelizeInstance,
      transaction: managedTransaction,
      year,
    });

    return formatOrderNumber(year, nextValue);
  });
}
