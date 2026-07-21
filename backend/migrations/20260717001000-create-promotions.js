const discountTypes = ["percentage", "fixed_amount", "special_price"];
const promotionStatuses = ["draft", "active", "inactive", "expired"];

function enumValues(values) {
  return values.map((value) => `'${value}'`).join(", ");
}

export async function up({ sequelize, transaction }) {
  await sequelize.query('CREATE SCHEMA IF NOT EXISTS "core";', { transaction });

  await sequelize.query(
    `
    DO $$
    BEGIN
      CREATE TYPE "core"."promotion_discount_type_enum"
        AS ENUM (${enumValues(discountTypes)});
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
      CREATE TYPE "core"."promotion_status_enum"
        AS ENUM (${enumValues(promotionStatuses)});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."Promotions" (
      "id" UUID NOT NULL PRIMARY KEY,
      "name" VARCHAR(160) NOT NULL,
      "description" TEXT NULL,
      "discountType" "core"."promotion_discount_type_enum" NOT NULL,
      "discountValue" DECIMAL(12, 2) NOT NULL,
      "startDate" TIMESTAMPTZ NOT NULL,
      "endDate" TIMESTAMPTZ NOT NULL,
      "status" "core"."promotion_status_enum" NOT NULL DEFAULT 'draft',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "promotions_discount_value_non_negative"
        CHECK ("discountValue" >= 0),
      CONSTRAINT "promotions_percentage_range"
        CHECK ("discountType" <> 'percentage' OR "discountValue" <= 100),
      CONSTRAINT "promotions_date_range"
        CHECK ("endDate" >= "startDate")
    );
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."PromotionProducts" (
      "id" UUID NOT NULL PRIMARY KEY,
      "promotionId" UUID NOT NULL,
      "productId" INTEGER NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "promotion_products_promotion_id_fkey"
        FOREIGN KEY ("promotionId") REFERENCES "core"."Promotions" ("id")
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "promotion_products_product_id_fkey"
        FOREIGN KEY ("productId") REFERENCES "core"."Products" ("id_producto")
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "promotion_products_unique_product"
        UNIQUE ("promotionId", "productId")
    );
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."OrderDiscounts" (
      "id" UUID NOT NULL PRIMARY KEY,
      "orderId" UUID NOT NULL,
      "orderItemId" UUID NULL,
      "promotionId" UUID NULL,
      "amount" DECIMAL(12, 2) NOT NULL,
      "description" TEXT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "order_discounts_order_id_fkey"
        FOREIGN KEY ("orderId") REFERENCES "core"."Orders" ("id")
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "order_discounts_order_item_id_fkey"
        FOREIGN KEY ("orderItemId") REFERENCES "core"."OrderItems" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL,
      CONSTRAINT "order_discounts_promotion_id_fkey"
        FOREIGN KEY ("promotionId") REFERENCES "core"."Promotions" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL,
      CONSTRAINT "order_discounts_amount_non_negative"
        CHECK ("amount" >= 0)
    );
    `,
    { transaction }
  );

  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "promotions_status_idx" ON "core"."Promotions" ("status");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "promotions_start_date_idx" ON "core"."Promotions" ("startDate");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "promotions_end_date_idx" ON "core"."Promotions" ("endDate");',
    { transaction }
  );

  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "promotion_products_promotion_id_idx" ON "core"."PromotionProducts" ("promotionId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "promotion_products_product_id_idx" ON "core"."PromotionProducts" ("productId");',
    { transaction }
  );

  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "order_discounts_order_id_idx" ON "core"."OrderDiscounts" ("orderId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "order_discounts_order_item_id_idx" ON "core"."OrderDiscounts" ("orderItemId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "order_discounts_promotion_id_idx" ON "core"."OrderDiscounts" ("promotionId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "order_discounts_created_at_idx" ON "core"."OrderDiscounts" ("createdAt");',
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query('DROP TABLE IF EXISTS "core"."OrderDiscounts";', {
    transaction,
  });
  await sequelize.query('DROP TABLE IF EXISTS "core"."PromotionProducts";', {
    transaction,
  });
  await sequelize.query('DROP TABLE IF EXISTS "core"."Promotions";', {
    transaction,
  });
  await sequelize.query('DROP TYPE IF EXISTS "core"."promotion_status_enum";', {
    transaction,
  });
  await sequelize.query(
    'DROP TYPE IF EXISTS "core"."promotion_discount_type_enum";',
    { transaction }
  );
}
