import { sequelize as appSequelize } from "../config/sequelize.js";

const webhookStatuses = ["received", "processed", "ignored", "failed"];
const refundStatuses = ["pending", "approved", "failed", "cancelled"];

export const useTransaction = false;

function enumValues(values) {
  return values.map((value) => `'${value}'`).join(", ");
}

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
      DO $$
      BEGIN
        CREATE TYPE "core"."payment_webhook_processing_status_enum"
          AS ENUM (${enumValues(webhookStatuses)});
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      DO $$
      BEGIN
        CREATE TYPE "core"."payment_refund_status_enum"
          AS ENUM (${enumValues(refundStatuses)});
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE TABLE IF NOT EXISTS "core"."PaymentWebhookEvents" (
        "id" UUID NOT NULL PRIMARY KEY,
        "provider" VARCHAR(50) NOT NULL,
        "providerEventId" VARCHAR(200) NOT NULL,
        "eventType" VARCHAR(120) NOT NULL,
        "paymentId" UUID NULL,
        "providerPaymentId" VARCHAR(160) NULL,
        "signatureValid" BOOLEAN NULL,
        "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "processingStatus" "core"."payment_webhook_processing_status_enum"
          NOT NULL DEFAULT 'received',
        "processedAt" TIMESTAMPTZ NULL,
        "errorMessage" TEXT NULL,
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "payment_webhook_events_payment_id_fkey"
          FOREIGN KEY ("paymentId") REFERENCES "core"."Payments" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "payment_webhook_events_provider_event_unique"
          UNIQUE ("provider", "providerEventId"),
        CONSTRAINT "payment_webhook_events_retry_count_non_negative"
          CHECK ("retryCount" >= 0)
      );
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE TABLE IF NOT EXISTS "core"."PaymentRefunds" (
        "id" UUID NOT NULL PRIMARY KEY,
        "paymentId" UUID NOT NULL,
        "orderId" UUID NOT NULL,
        "providerRefundId" VARCHAR(160) NULL,
        "amount" DECIMAL(12, 2) NOT NULL,
        "reason" TEXT NULL,
        "status" "core"."payment_refund_status_enum"
          NOT NULL DEFAULT 'pending',
        "requestedBy" UUID NULL,
        "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "approvedAt" TIMESTAMPTZ NULL,
        "metadata" JSONB NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "payment_refunds_payment_id_fkey"
          FOREIGN KEY ("paymentId") REFERENCES "core"."Payments" ("id")
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "payment_refunds_order_id_fkey"
          FOREIGN KEY ("orderId") REFERENCES "core"."Orders" ("id")
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "payment_refunds_requested_by_fkey"
          FOREIGN KEY ("requestedBy") REFERENCES "core"."Users" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "payment_refunds_amount_positive" CHECK ("amount" > 0)
      );
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_provider_refund_id_unique"
      ON "core"."PaymentRefunds" ("providerRefundId")
      WHERE "providerRefundId" IS NOT NULL;
      `,
      { transaction }
    );

    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_webhook_events_payment_id_idx" ON "core"."PaymentWebhookEvents" ("paymentId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_webhook_events_provider_payment_id_idx" ON "core"."PaymentWebhookEvents" ("providerPaymentId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_webhook_events_processing_status_idx" ON "core"."PaymentWebhookEvents" ("processingStatus");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_webhook_events_created_at_idx" ON "core"."PaymentWebhookEvents" ("createdAt");',
      { transaction }
    );

    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_refunds_payment_id_idx" ON "core"."PaymentRefunds" ("paymentId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_refunds_order_id_idx" ON "core"."PaymentRefunds" ("orderId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_refunds_status_idx" ON "core"."PaymentRefunds" ("status");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_refunds_requested_by_idx" ON "core"."PaymentRefunds" ("requestedBy");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "payment_refunds_created_at_idx" ON "core"."PaymentRefunds" ("createdAt");',
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query('DROP TABLE IF EXISTS "core"."PaymentRefunds";', {
      transaction,
    });
    await appSequelize.query(
      'DROP TABLE IF EXISTS "core"."PaymentWebhookEvents";',
      { transaction }
    );
    await appSequelize.query(
      'DROP TYPE IF EXISTS "core"."payment_refund_status_enum";',
      { transaction }
    );
    await appSequelize.query(
      'DROP TYPE IF EXISTS "core"."payment_webhook_processing_status_enum";',
      { transaction }
    );
  });
}
