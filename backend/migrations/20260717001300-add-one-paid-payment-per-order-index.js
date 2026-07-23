import { sequelize as appSequelize } from "../config/sequelize.js";

const indexName = "payments_order_id_paid_unique";

export const useTransaction = false;

async function runWithAppRuntime(callback) {
  const transaction = await appSequelize.transaction();

  try {
    await callback(transaction);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function findDuplicatePaidPayments(sequelize, transaction) {
  const [rows] = await sequelize.query(
    `
    SELECT
      "orderId",
      COUNT(*)::int AS "paidPaymentCount",
      ARRAY_AGG("id" ORDER BY "createdAt") AS "paymentIds"
    FROM "core"."Payments"
    WHERE "orderId" IS NOT NULL
      AND "status" = 'paid'
    GROUP BY "orderId"
    HAVING COUNT(*) > 1
    ORDER BY "orderId";
    `,
    { transaction }
  );

  return rows;
}

export async function up() {
  await runWithAppRuntime(async (transaction) => {
    const duplicates = await findDuplicatePaidPayments(
      appSequelize,
      transaction
    );

    if (duplicates.length > 0) {
      throw new Error(
        `No se puede crear ${indexName}: existen ordenes con mas de un pago paid. Reporte: ${JSON.stringify(duplicates)}`
      );
    }

    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}"
        ON "core"."Payments" ("orderId")
        WHERE "orderId" IS NOT NULL
          AND "status" = 'paid';
      `,
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query(`DROP INDEX IF EXISTS "core"."${indexName}";`, {
      transaction,
    });
  });
}
