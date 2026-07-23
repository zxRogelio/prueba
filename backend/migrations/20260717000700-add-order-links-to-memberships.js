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
      ALTER TABLE "core"."UserSubscriptions"
        ADD COLUMN IF NOT EXISTS "orderItemId" UUID NULL;

      ALTER TABLE "core"."Receipts"
        ADD COLUMN IF NOT EXISTS "orderId" UUID NULL;

      ALTER TABLE "core"."SubscriptionGroups"
        ADD COLUMN IF NOT EXISTS "orderItemId" UUID NULL;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'user_subscriptions_order_item_id_fkey'
        ) THEN
          ALTER TABLE "core"."UserSubscriptions"
            ADD CONSTRAINT "user_subscriptions_order_item_id_fkey"
            FOREIGN KEY ("orderItemId") REFERENCES "core"."OrderItems" ("id")
            ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'receipts_order_id_fkey'
        ) THEN
          ALTER TABLE "core"."Receipts"
            ADD CONSTRAINT "receipts_order_id_fkey"
            FOREIGN KEY ("orderId") REFERENCES "core"."Orders" ("id")
            ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'subscription_groups_order_item_id_fkey'
        ) THEN
          ALTER TABLE "core"."SubscriptionGroups"
            ADD CONSTRAINT "subscription_groups_order_item_id_fkey"
            FOREIGN KEY ("orderItemId") REFERENCES "core"."OrderItems" ("id")
            ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptions_order_item_id_unique"
      ON "core"."UserSubscriptions" ("orderItemId")
      WHERE "orderItemId" IS NOT NULL;
      `,
      { transaction }
    );

    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "receipts_order_id_idx" ON "core"."Receipts" ("orderId");',
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "subscription_groups_order_item_id_unique"
      ON "core"."SubscriptionGroups" ("orderItemId")
      WHERE "orderItemId" IS NOT NULL;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      COMMENT ON COLUMN "core"."UserSubscriptions"."paymentId"
        IS 'LEGACY: relacion directa con Payment. Mantener temporalmente hasta migrar a OrderItem.';
      COMMENT ON COLUMN "core"."SubscriptionGroups"."paymentId"
        IS 'LEGACY: relacion directa con Payment. Mantener temporalmente hasta migrar a OrderItem.';
      COMMENT ON COLUMN "core"."Receipts"."paymentId"
        IS 'LEGACY: relacion directa con Payment. Mantener temporalmente junto con orderId.';
      `,
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query(
      'DROP INDEX IF EXISTS "core"."subscription_groups_order_item_id_unique";',
      { transaction }
    );
    await appSequelize.query(
      'DROP INDEX IF EXISTS "core"."receipts_order_id_idx";',
      { transaction }
    );
    await appSequelize.query(
      'DROP INDEX IF EXISTS "core"."user_subscriptions_order_item_id_unique";',
      { transaction }
    );

    await appSequelize.query(
      `
      ALTER TABLE "core"."SubscriptionGroups"
        DROP CONSTRAINT IF EXISTS "subscription_groups_order_item_id_fkey",
        DROP COLUMN IF EXISTS "orderItemId";

      ALTER TABLE "core"."Receipts"
        DROP CONSTRAINT IF EXISTS "receipts_order_id_fkey",
        DROP COLUMN IF EXISTS "orderId";

      ALTER TABLE "core"."UserSubscriptions"
        DROP CONSTRAINT IF EXISTS "user_subscriptions_order_item_id_fkey",
        DROP COLUMN IF EXISTS "orderItemId";
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      COMMENT ON COLUMN "core"."UserSubscriptions"."paymentId" IS NULL;
      COMMENT ON COLUMN "core"."SubscriptionGroups"."paymentId" IS NULL;
      COMMENT ON COLUMN "core"."Receipts"."paymentId" IS NULL;
      `,
      { transaction }
    );
  });
}
