import { sequelize as appSequelize } from "../config/sequelize.js";

const subscriptionEventTypes = [
  "created",
  "activated",
  "renewed",
  "extended",
  "expired",
  "cancelled",
  "refunded",
];

function enumValues(values) {
  return values.map((value) => `'${value}'`).join(", ");
}

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
    DO $$
    BEGIN
      CREATE TYPE "core"."subscription_event_type_enum"
        AS ENUM (${enumValues(subscriptionEventTypes)});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
      { transaction }
    );

    await appSequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."SubscriptionEvents" (
      "id" UUID NOT NULL PRIMARY KEY,
      "subscriptionId" UUID NOT NULL,
      "userId" UUID NOT NULL,
      "orderId" UUID NULL,
      "paymentId" UUID NULL,
      "eventType" "core"."subscription_event_type_enum" NOT NULL,
      "previousStatus" VARCHAR(30) NULL,
      "newStatus" VARCHAR(30) NULL,
      "effectiveAt" TIMESTAMPTZ NOT NULL,
      "metadata" JSONB NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "subscription_events_subscription_id_fkey"
        FOREIGN KEY ("subscriptionId") REFERENCES "core"."UserSubscriptions" ("id")
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "subscription_events_user_id_fkey"
        FOREIGN KEY ("userId") REFERENCES "core"."Users" ("id")
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "subscription_events_order_id_fkey"
        FOREIGN KEY ("orderId") REFERENCES "core"."Orders" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL,
      CONSTRAINT "subscription_events_payment_id_fkey"
        FOREIGN KEY ("paymentId") REFERENCES "core"."Payments" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL
    );
    `,
      { transaction }
    );

    await appSequelize.query(
    'CREATE INDEX IF NOT EXISTS "subscription_events_subscription_id_idx" ON "core"."SubscriptionEvents" ("subscriptionId");',
      { transaction }
    );
    await appSequelize.query(
    'CREATE INDEX IF NOT EXISTS "subscription_events_user_id_idx" ON "core"."SubscriptionEvents" ("userId");',
      { transaction }
    );
    await appSequelize.query(
    'CREATE INDEX IF NOT EXISTS "subscription_events_order_id_idx" ON "core"."SubscriptionEvents" ("orderId");',
      { transaction }
    );
    await appSequelize.query(
    'CREATE INDEX IF NOT EXISTS "subscription_events_payment_id_idx" ON "core"."SubscriptionEvents" ("paymentId");',
      { transaction }
    );
    await appSequelize.query(
    'CREATE INDEX IF NOT EXISTS "subscription_events_event_type_idx" ON "core"."SubscriptionEvents" ("eventType");',
      { transaction }
    );
    await appSequelize.query(
    'CREATE INDEX IF NOT EXISTS "subscription_events_effective_at_idx" ON "core"."SubscriptionEvents" ("effectiveAt");',
      { transaction }
    );
    await appSequelize.query(
    'CREATE INDEX IF NOT EXISTS "subscription_events_created_at_idx" ON "core"."SubscriptionEvents" ("createdAt");',
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query('DROP TABLE IF EXISTS "core"."SubscriptionEvents";', {
      transaction,
    });
    await appSequelize.query(
      'DROP TYPE IF EXISTS "core"."subscription_event_type_enum";',
      { transaction }
    );
  });
}
