const orderItemTypes = ["product", "membership", "group_membership"];

function enumValues(values) {
  return values.map((value) => `'${value}'`).join(", ");
}

export async function up({ sequelize, transaction }) {
  await sequelize.query('CREATE SCHEMA IF NOT EXISTS "core";', { transaction });

  await sequelize.query(
    `
    DO $$
    BEGIN
      CREATE TYPE "core"."order_item_type_enum" AS ENUM (${enumValues(orderItemTypes)});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."OrderItems" (
      "id" UUID NOT NULL PRIMARY KEY,
      "orderId" UUID NOT NULL,
      "itemType" "core"."order_item_type_enum" NOT NULL,
      "productId" INTEGER NULL,
      "membershipPlanId" UUID NULL,
      "quantity" INTEGER NOT NULL,
      "unitPrice" DECIMAL(12, 2) NOT NULL,
      "discountAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "subtotal" DECIMAL(12, 2) NOT NULL,
      "itemNameSnapshot" VARCHAR(200) NOT NULL,
      "itemDescriptionSnapshot" TEXT NULL,
      "categorySnapshot" VARCHAR(160) NULL,
      "brandSnapshot" VARCHAR(160) NULL,
      "productTypeSnapshot" VARCHAR(80) NULL,
      "durationDaysSnapshot" INTEGER NULL,
      "metadata" JSONB NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "order_items_order_id_fkey"
        FOREIGN KEY ("orderId") REFERENCES "core"."Orders" ("id")
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "order_items_product_id_fkey"
        FOREIGN KEY ("productId") REFERENCES "core"."Products" ("id_producto")
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0),
      CONSTRAINT "order_items_unit_price_non_negative" CHECK ("unitPrice" >= 0),
      CONSTRAINT "order_items_discount_amount_non_negative" CHECK ("discountAmount" >= 0),
      CONSTRAINT "order_items_subtotal_non_negative" CHECK ("subtotal" >= 0),
      CONSTRAINT "order_items_duration_days_positive"
        CHECK ("durationDaysSnapshot" IS NULL OR "durationDaysSnapshot" > 0),
      CONSTRAINT "order_items_reference_matches_type" CHECK (
        (
          "itemType" = 'product'
          AND "productId" IS NOT NULL
          AND "membershipPlanId" IS NULL
        )
        OR
        (
          "itemType" IN ('membership', 'group_membership')
          AND "membershipPlanId" IS NOT NULL
          AND "productId" IS NULL
        )
      )
    );
    `,
    { transaction }
  );

  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "core"."OrderItems" ("orderId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "core"."OrderItems" ("productId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "order_items_membership_plan_id_idx" ON "core"."OrderItems" ("membershipPlanId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "order_items_item_type_idx" ON "core"."OrderItems" ("itemType");',
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query('DROP TABLE IF EXISTS "core"."OrderItems";', {
    transaction,
  });
  await sequelize.query('DROP TYPE IF EXISTS "core"."order_item_type_enum";', {
    transaction,
  });
}
