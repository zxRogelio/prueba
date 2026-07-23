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
      CREATE TABLE IF NOT EXISTS "core"."SubscriptionHistories" (
        "id" UUID NOT NULL PRIMARY KEY,
        "userId" UUID NOT NULL,
        "subscriptionId" UUID NOT NULL,
        "planId" UUID NOT NULL,
        "paymentId" UUID NULL,
        "planName" VARCHAR(120) NOT NULL,
        "planType" VARCHAR(30) NOT NULL,
        "durationDays" INTEGER NOT NULL,
        "amountPaid" DECIMAL(12, 2) NOT NULL,
        "purchaseDate" TIMESTAMPTZ NULL,
        "startsAt" DATE NOT NULL,
        "endsAt" DATE NOT NULL,
        "subscriptionStatus" VARCHAR(30) NOT NULL,
        "source" VARCHAR(30) NOT NULL,
        "paymentMethod" VARCHAR(30) NULL,
        "autoRenew" BOOLEAN NOT NULL DEFAULT false,
        "isGroupSubscription" BOOLEAN NOT NULL DEFAULT false,
        "renewedNextPeriod" BOOLEAN NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "subscription_histories_subscription_id_unique"
          UNIQUE ("subscriptionId"),
        CONSTRAINT "subscription_histories_user_id_fkey"
          FOREIGN KEY ("userId") REFERENCES "core"."Users" ("id")
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "subscription_histories_subscription_id_fkey"
          FOREIGN KEY ("subscriptionId") REFERENCES "core"."UserSubscriptions" ("id")
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "subscription_histories_plan_id_fkey"
          FOREIGN KEY ("planId") REFERENCES "core"."MembershipPlans" ("id")
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "subscription_histories_payment_id_fkey"
          FOREIGN KEY ("paymentId") REFERENCES "core"."Payments" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "subscription_histories_duration_days_check"
          CHECK ("durationDays" > 0),
        CONSTRAINT "subscription_histories_amount_paid_check"
          CHECK ("amountPaid" >= 0),
        CONSTRAINT "subscription_histories_dates_check"
          CHECK ("endsAt" >= "startsAt")
      );
      `,
      { transaction }
    );

    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "subscription_histories_user_id_idx" ON "core"."SubscriptionHistories" ("userId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "subscription_histories_plan_id_idx" ON "core"."SubscriptionHistories" ("planId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "subscription_histories_payment_id_idx" ON "core"."SubscriptionHistories" ("paymentId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "subscription_histories_plan_type_idx" ON "core"."SubscriptionHistories" ("planType");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "subscription_histories_starts_at_idx" ON "core"."SubscriptionHistories" ("startsAt");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "subscription_histories_ends_at_idx" ON "core"."SubscriptionHistories" ("endsAt");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "subscription_histories_renewed_next_period_idx" ON "core"."SubscriptionHistories" ("renewedNextPeriod");',
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query(
      'DROP TABLE IF EXISTS "core"."SubscriptionHistories";',
      { transaction }
    );
  });
}
