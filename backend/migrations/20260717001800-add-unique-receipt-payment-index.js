import { QueryTypes } from "sequelize";

async function findDuplicateReceipts(sequelize, transaction) {
  return sequelize.query(
    `
    SELECT "paymentId", COUNT(*)::int AS "receiptCount"
    FROM "core"."Receipts"
    WHERE "paymentId" IS NOT NULL
    GROUP BY "paymentId"
    HAVING COUNT(*) > 1
    ORDER BY "receiptCount" DESC, "paymentId" ASC;
    `,
    {
      transaction,
      type: QueryTypes.SELECT,
    }
  );
}

export async function up({ sequelize, transaction }) {
  const duplicates = await findDuplicateReceipts(sequelize, transaction);

  if (duplicates.length > 0) {
    const summary = duplicates
      .map((row) => `${row.paymentId}: ${row.receiptCount}`)
      .join(", ");

    throw new Error(
      `No se puede crear receipts_payment_id_unique; existen pagos con mas de un recibo: ${summary}.`
    );
  }

  await sequelize.query(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS "receipts_payment_id_unique"
    ON "core"."Receipts" ("paymentId")
    WHERE "paymentId" IS NOT NULL;
    `,
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query(
    'DROP INDEX IF EXISTS "core"."receipts_payment_id_unique";',
    { transaction }
  );
}
