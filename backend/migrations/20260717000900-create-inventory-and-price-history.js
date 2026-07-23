import { sequelize as appSequelize } from "../config/sequelize.js";

const inventoryMovementTypes = [
  "purchase",
  "sale",
  "return",
  "restock",
  "adjustment",
  "damaged",
  "expired",
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
        CREATE TYPE "core"."inventory_movement_type_enum"
          AS ENUM (${enumValues(inventoryMovementTypes)});
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE TABLE IF NOT EXISTS "core"."InventoryMovements" (
        "id" UUID NOT NULL PRIMARY KEY,
        "productId" INTEGER NOT NULL,
        "orderItemId" UUID NULL,
        "movementType" "core"."inventory_movement_type_enum" NOT NULL,
        "quantity" INTEGER NOT NULL,
        "stockBefore" INTEGER NOT NULL,
        "stockAfter" INTEGER NOT NULL,
        "reference" VARCHAR(200) NULL,
        "createdBy" UUID NULL,
        "notes" TEXT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "inventory_movements_product_id_fkey"
          FOREIGN KEY ("productId") REFERENCES "core"."Products" ("id_producto")
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "inventory_movements_order_item_id_fkey"
          FOREIGN KEY ("orderItemId") REFERENCES "core"."OrderItems" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "inventory_movements_created_by_fkey"
          FOREIGN KEY ("createdBy") REFERENCES "core"."Users" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "inventory_movements_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "inventory_movements_stock_before_non_negative" CHECK ("stockBefore" >= 0),
        CONSTRAINT "inventory_movements_stock_after_non_negative" CHECK ("stockAfter" >= 0)
      );
      `,
      { transaction }
    );

    await appSequelize.query(
      `
      CREATE TABLE IF NOT EXISTS "core"."ProductPriceHistories" (
        "id" UUID NOT NULL PRIMARY KEY,
        "productId" INTEGER NOT NULL,
        "previousPrice" DECIMAL(12, 2) NOT NULL,
        "newPrice" DECIMAL(12, 2) NOT NULL,
        "validFrom" TIMESTAMPTZ NOT NULL,
        "validTo" TIMESTAMPTZ NULL,
        "changedBy" UUID NULL,
        "reason" TEXT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "product_price_histories_product_id_fkey"
          FOREIGN KEY ("productId") REFERENCES "core"."Products" ("id_producto")
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "product_price_histories_changed_by_fkey"
          FOREIGN KEY ("changedBy") REFERENCES "core"."Users" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "product_price_histories_previous_price_non_negative"
          CHECK ("previousPrice" >= 0),
        CONSTRAINT "product_price_histories_new_price_non_negative"
          CHECK ("newPrice" >= 0),
        CONSTRAINT "product_price_histories_valid_range"
          CHECK ("validTo" IS NULL OR "validTo" >= "validFrom")
      );
      `,
      { transaction }
    );

    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "inventory_movements_product_id_idx" ON "core"."InventoryMovements" ("productId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "inventory_movements_movement_type_idx" ON "core"."InventoryMovements" ("movementType");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "inventory_movements_created_at_idx" ON "core"."InventoryMovements" ("createdAt");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "inventory_movements_order_item_id_idx" ON "core"."InventoryMovements" ("orderItemId");',
      { transaction }
    );

    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "product_price_histories_product_id_idx" ON "core"."ProductPriceHistories" ("productId");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "product_price_histories_valid_from_idx" ON "core"."ProductPriceHistories" ("validFrom");',
      { transaction }
    );
    await appSequelize.query(
      'CREATE INDEX IF NOT EXISTS "product_price_histories_valid_to_idx" ON "core"."ProductPriceHistories" ("validTo");',
      { transaction }
    );
    await appSequelize.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "product_price_histories_one_open_period"
      ON "core"."ProductPriceHistories" ("productId")
      WHERE "validTo" IS NULL;
      `,
      { transaction }
    );
  });
}

export async function down() {
  await runWithAppRuntime(async (transaction) => {
    await appSequelize.query(
      'DROP TABLE IF EXISTS "core"."ProductPriceHistories";',
      { transaction }
    );
    await appSequelize.query(
      'DROP TABLE IF EXISTS "core"."InventoryMovements";',
      { transaction }
    );
    await appSequelize.query(
      'DROP TYPE IF EXISTS "core"."inventory_movement_type_enum";',
      { transaction }
    );
  });
}
