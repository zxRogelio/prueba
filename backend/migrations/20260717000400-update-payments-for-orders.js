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
      ALTER TABLE "core"."Payments"
        ADD COLUMN IF NOT EXISTS "orderId" UUID NULL,
        ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
        ADD COLUMN IF NOT EXISTS "providerPreferenceId" VARCHAR(160) NULL,
        ADD COLUMN IF NOT EXISTS "externalReference" VARCHAR(200) NULL,
        ADD COLUMN IF NOT EXISTS "providerStatus" VARCHAR(80) NULL,
        ADD COLUMN IF NOT EXISTS "providerStatusDetail" VARCHAR(200) NULL,
        ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(160) NULL,
        ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS "metadata" JSONB NULL;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      UPDATE "core"."Payments"
      SET
        "provider" = 'mercadopago_terminal',
        "updatedAt" = NOW()
      WHERE "provider" = 'mercadopago_point';
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      UPDATE "core"."Payments"
      SET
        "method" = 'online_checkout',
        "updatedAt" = NOW()
      WHERE "method" IN ('online_card', 'online_wallet');
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      UPDATE "core"."Payments"
      SET "approvedAt" = COALESCE("approvedAt", "paidAt")
      WHERE "status" = 'paid'
        AND "paidAt" IS NOT NULL;
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
          WHERE conname = 'payments_order_id_fkey'
        ) THEN
          ALTER TABLE "core"."Payments"
            ADD CONSTRAINT "payments_order_id_fkey"
            FOREIGN KEY ("orderId") REFERENCES "core"."Orders" ("id")
            ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
      `,
      { transaction }
    );

    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payments_order_id" ON "core"."Payments" ("orderId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payments_provider" ON "core"."Payments" ("provider");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payments_created_at" ON "core"."Payments" ("createdAt");',
      { transaction }
    );
    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "payments_external_reference_unique"
      ON "core"."Payments" ("externalReference")
      WHERE "externalReference" IS NOT NULL;
      `,
      { transaction }
    );
    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_unique"
      ON "core"."Payments" ("idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL;
      `,
      { transaction }
    );
    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_payment_id_unique"
      ON "core"."Payments" ("provider", "providerPaymentId")
      WHERE "providerPaymentId" IS NOT NULL;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      COMMENT ON COLUMN "core"."Payments"."planId"
        IS 'LEGACY: relacion directa con MembershipPlan. Mantener temporalmente hasta migrar a OrderItem.';
      COMMENT ON COLUMN "core"."Payments"."subscriptionId"
        IS 'LEGACY: relacion directa con UserSubscription. Mantener temporalmente hasta migrar a OrderItem.';
      COMMENT ON COLUMN "core"."Payments"."groupId"
        IS 'LEGACY: relacion directa con SubscriptionGroup. Mantener temporalmente hasta migrar a OrderItem.';
      COMMENT ON COLUMN "core"."Payments"."method"
        IS 'Valores estandarizados: cash, transfer, card_terminal, online_checkout.';
      COMMENT ON COLUMN "core"."Payments"."source"
        IS 'Valores estandarizados: admin_manual, online_checkout.';
      COMMENT ON COLUMN "core"."Payments"."provider"
        IS 'Valores estandarizados: none, bank_transfer, mercadopago_terminal, mercadopago_checkout.';
      COMMENT ON COLUMN "core"."Payments"."status"
        IS 'Valores estandarizados: pending, paid, failed, cancelled, refunded.';
      `,
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query(
      'DROP INDEX IF EXISTS "core"."payments_provider_payment_id_unique";',
      { transaction }
    );
    await appSequelize.query(
      'DROP INDEX IF EXISTS "core"."payments_idempotency_key_unique";',
      { transaction }
    );
    await appSequelize.query(
      'DROP INDEX IF EXISTS "core"."payments_external_reference_unique";',
      { transaction }
    );
    await appSequelize.query(
      'DROP INDEX IF EXISTS "core"."payments_created_at";',
      { transaction }
    );
    await appSequelize.query('DROP INDEX IF EXISTS "core"."payments_provider";', {
      transaction,
    });
    await appSequelize.query('DROP INDEX IF EXISTS "core"."payments_order_id";', {
      transaction,
    });

    await appSequelize.query(
      `
      ALTER TABLE "core"."Payments"
        DROP CONSTRAINT IF EXISTS "payments_order_id_fkey",
        DROP COLUMN IF EXISTS "metadata",
        DROP COLUMN IF EXISTS "refundedAt",
        DROP COLUMN IF EXISTS "cancelledAt",
        DROP COLUMN IF EXISTS "approvedAt",
        DROP COLUMN IF EXISTS "idempotencyKey",
        DROP COLUMN IF EXISTS "providerStatusDetail",
        DROP COLUMN IF EXISTS "providerStatus",
        DROP COLUMN IF EXISTS "externalReference",
        DROP COLUMN IF EXISTS "providerPreferenceId",
        DROP COLUMN IF EXISTS "currency",
        DROP COLUMN IF EXISTS "orderId";
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      COMMENT ON COLUMN "core"."Payments"."planId" IS NULL;
      COMMENT ON COLUMN "core"."Payments"."subscriptionId" IS NULL;
      COMMENT ON COLUMN "core"."Payments"."groupId" IS NULL;
      COMMENT ON COLUMN "core"."Payments"."method" IS NULL;
      COMMENT ON COLUMN "core"."Payments"."source" IS NULL;
      COMMENT ON COLUMN "core"."Payments"."provider" IS NULL;
      COMMENT ON COLUMN "core"."Payments"."status" IS NULL;
      `,
      { transaction }
    );
  });
}
