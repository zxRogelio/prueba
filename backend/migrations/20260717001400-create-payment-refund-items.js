import { sequelize as appSequelize } from "../config/sequelize.js";

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

export async function up() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query(
      `
      CREATE TABLE IF NOT EXISTS "core"."PaymentRefundItems" (
        "id" UUID NOT NULL PRIMARY KEY,
        "refundId" UUID NOT NULL,
        "orderItemId" UUID NOT NULL,
        "quantity" INTEGER NOT NULL,
        "amount" DECIMAL(12, 2) NOT NULL,
        "restock" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "payment_refund_items_refund_id_fkey"
          FOREIGN KEY ("refundId") REFERENCES "core"."PaymentRefunds" ("id")
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "payment_refund_items_order_item_id_fkey"
          FOREIGN KEY ("orderItemId") REFERENCES "core"."OrderItems" ("id")
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "payment_refund_items_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "payment_refund_items_amount_positive" CHECK ("amount" > 0)
      );
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "payment_refund_items_refund_order_item_unique"
      ON "core"."PaymentRefundItems" ("refundId", "orderItemId");
      `,
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_refund_items_refund_id_idx" ON "core"."PaymentRefundItems" ("refundId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_refund_items_order_item_id_idx" ON "core"."PaymentRefundItems" ("orderItemId");',
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query(
      'DROP TABLE IF EXISTS "core"."PaymentRefundItems";',
      { transaction }
    );
  });
}
