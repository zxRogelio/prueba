import { sequelize as appSequelize } from "../config/sequelize.js";

const behaviorEventTypes = [
  "login",
  "product_view",
  "product_search",
  "product_click",
  "add_to_cart",
  "remove_from_cart",
  "quantity_changed",
  "checkout_started",
  "checkout_completed",
  "cart_abandoned",
  "routine_view",
  "routine_started",
  "routine_completed",
  "membership_view",
  "recommendation_view",
  "recommendation_click",
];

const behaviorEntityTypes = [
  "product",
  "cart",
  "order",
  "routine",
  "membership_plan",
  "recommendation",
];

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
        CREATE TYPE "core"."behavior_event_type_enum"
          AS ENUM (${enumValues(behaviorEventTypes)});
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
        CREATE TYPE "core"."behavior_entity_type_enum"
          AS ENUM (${enumValues(behaviorEntityTypes)});
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE TABLE IF NOT EXISTS "core"."BehaviorEvents" (
        "id" UUID NOT NULL PRIMARY KEY,
        "userId" UUID NULL,
        "sessionId" UUID NULL,
        "eventType" "core"."behavior_event_type_enum" NOT NULL,
        "entityType" "core"."behavior_entity_type_enum" NULL,
        "entityId" VARCHAR(160) NULL,
        "source" VARCHAR(80) NULL,
        "quantity" INTEGER NULL,
        "metadata" JSONB NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "behavior_events_user_id_fkey"
          FOREIGN KEY ("userId") REFERENCES "core"."Users" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "behavior_events_session_id_fkey"
          FOREIGN KEY ("sessionId") REFERENCES "core"."sessions" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "behavior_events_quantity_non_negative"
          CHECK ("quantity" IS NULL OR "quantity" >= 0)
      );
      `,
      { transaction }
    );

    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "behavior_events_user_id_idx" ON "core"."BehaviorEvents" ("userId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "behavior_events_event_type_idx" ON "core"."BehaviorEvents" ("eventType");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "behavior_events_entity_type_idx" ON "core"."BehaviorEvents" ("entityType");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "behavior_events_entity_id_idx" ON "core"."BehaviorEvents" ("entityId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "behavior_events_created_at_idx" ON "core"."BehaviorEvents" ("createdAt");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "behavior_events_session_id_idx" ON "core"."BehaviorEvents" ("sessionId");',
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query('DROP TABLE IF EXISTS "core"."BehaviorEvents";', {
      transaction,
    });
    await appSequelize.query(
      'DROP TYPE IF EXISTS "core"."behavior_entity_type_enum";',
      { transaction }
    );
    await appSequelize.query(
      'DROP TYPE IF EXISTS "core"."behavior_event_type_enum";',
      { transaction }
    );
  });
}
