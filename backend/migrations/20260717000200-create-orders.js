const orderStatuses = [
  "draft",
  "pending_payment",
  "paid",
  "cancelled",
  "partially_refunded",
  "refunded",
];

const orderChannels = ["online", "reception", "mobile"];

function enumValues(values) {
  return values.map((value) => `'${value}'`).join(", ");
}

export async function up({ sequelize, transaction }) {
  await sequelize.query('CREATE SCHEMA IF NOT EXISTS "core";', { transaction });

  await sequelize.query(
    `
    DO $$
    BEGIN
      CREATE TYPE "core"."order_status_enum" AS ENUM (${enumValues(orderStatuses)});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
    { transaction }
  );

  await sequelize.query(
    `
    DO $$
    BEGIN
      CREATE TYPE "core"."order_channel_enum" AS ENUM (${enumValues(orderChannels)});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."OrderNumberCounters" (
      "year" INTEGER PRIMARY KEY,
      "lastValue" BIGINT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "order_number_counters_year_check" CHECK ("year" >= 2000),
      CONSTRAINT "order_number_counters_last_value_check" CHECK ("lastValue" >= 0)
    );
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."Orders" (
      "id" UUID NOT NULL PRIMARY KEY,
      "userId" UUID NOT NULL,
      "orderNumber" VARCHAR(40) NOT NULL,
      "status" "core"."order_status_enum" NOT NULL DEFAULT 'draft',
      "channel" "core"."order_channel_enum" NOT NULL DEFAULT 'reception',
      "subtotal" DECIMAL(12, 2) NOT NULL,
      "discountTotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "taxTotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "total" DECIMAL(12, 2) NOT NULL,
      "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
      "createdBy" UUID NULL,
      "paidAt" TIMESTAMPTZ NULL,
      "cancelledAt" TIMESTAMPTZ NULL,
      "refundedAt" TIMESTAMPTZ NULL,
      "notes" TEXT NULL,
      "metadata" JSONB NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "orders_order_number_unique" UNIQUE ("orderNumber"),
      CONSTRAINT "orders_user_id_fkey"
        FOREIGN KEY ("userId") REFERENCES "core"."Users" ("id")
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "orders_created_by_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "core"."Users" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL,
      CONSTRAINT "orders_subtotal_non_negative" CHECK ("subtotal" >= 0),
      CONSTRAINT "orders_discount_total_non_negative" CHECK ("discountTotal" >= 0),
      CONSTRAINT "orders_tax_total_non_negative" CHECK ("taxTotal" >= 0),
      CONSTRAINT "orders_total_non_negative" CHECK ("total" >= 0),
      CONSTRAINT "orders_currency_length_check" CHECK (char_length("currency") = 3)
    );
    `,
    { transaction }
  );

  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "core"."Orders" ("userId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "orders_created_by_idx" ON "core"."Orders" ("createdBy");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "core"."Orders" ("status");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "orders_channel_idx" ON "core"."Orders" ("channel");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "core"."Orders" ("createdAt");',
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query('DROP TABLE IF EXISTS "core"."Orders";', {
    transaction,
  });
  await sequelize.query('DROP TABLE IF EXISTS "core"."OrderNumberCounters";', {
    transaction,
  });
  await sequelize.query('DROP TYPE IF EXISTS "core"."order_channel_enum";', {
    transaction,
  });
  await sequelize.query('DROP TYPE IF EXISTS "core"."order_status_enum";', {
    transaction,
  });
}
