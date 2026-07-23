const cartStatuses = ["active", "converted", "abandoned", "expired"];

function enumValues(values) {
  return values.map((value) => `'${value}'`).join(", ");
}

export async function up({ sequelize, transaction }) {
  await sequelize.query('CREATE SCHEMA IF NOT EXISTS "core";', { transaction });

  await sequelize.query(
    `
    DO $$
    BEGIN
      CREATE TYPE "core"."cart_status_enum" AS ENUM (${enumValues(cartStatuses)});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."Carts" (
      "id" UUID NOT NULL PRIMARY KEY,
      "userId" UUID NOT NULL,
      "status" "core"."cart_status_enum" NOT NULL DEFAULT 'active',
      "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
      "subtotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "total" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "convertedOrderId" UUID NULL,
      "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "expiresAt" TIMESTAMPTZ NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "carts_user_id_fkey"
        FOREIGN KEY ("userId") REFERENCES "core"."Users" ("id")
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "carts_converted_order_id_fkey"
        FOREIGN KEY ("convertedOrderId") REFERENCES "core"."Orders" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL,
      CONSTRAINT "carts_subtotal_non_negative" CHECK ("subtotal" >= 0),
      CONSTRAINT "carts_total_non_negative" CHECK ("total" >= 0),
      CONSTRAINT "carts_currency_length_check" CHECK (char_length("currency") = 3)
    );
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."CartItems" (
      "id" UUID NOT NULL PRIMARY KEY,
      "cartId" UUID NOT NULL,
      "productId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitPriceSnapshot" DECIMAL(12, 2) NOT NULL,
      "subtotal" DECIMAL(12, 2) NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "cart_items_cart_id_fkey"
        FOREIGN KEY ("cartId") REFERENCES "core"."Carts" ("id")
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "cart_items_product_id_fkey"
        FOREIGN KEY ("productId") REFERENCES "core"."Products" ("id_producto")
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "cart_items_quantity_positive" CHECK ("quantity" > 0),
      CONSTRAINT "cart_items_unit_price_snapshot_non_negative"
        CHECK ("unitPriceSnapshot" >= 0),
      CONSTRAINT "cart_items_subtotal_non_negative" CHECK ("subtotal" >= 0)
    );
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS "carts_one_active_per_user"
    ON "core"."Carts" ("userId")
    WHERE "status" = 'active';
    `,
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "carts_user_id_idx" ON "core"."Carts" ("userId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "carts_status_idx" ON "core"."Carts" ("status");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "carts_converted_order_id_idx" ON "core"."Carts" ("convertedOrderId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "carts_last_activity_at_idx" ON "core"."Carts" ("lastActivityAt");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "cart_items_cart_id_idx" ON "core"."CartItems" ("cartId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "cart_items_product_id_idx" ON "core"."CartItems" ("productId");',
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query('DROP TABLE IF EXISTS "core"."CartItems";', {
    transaction,
  });
  await sequelize.query('DROP TABLE IF EXISTS "core"."Carts";', {
    transaction,
  });
  await sequelize.query('DROP TYPE IF EXISTS "core"."cart_status_enum";', {
    transaction,
  });
}
