const reservationStatuses = ["active", "consumed", "released", "expired"];

function enumValues(values) {
  return values.map((value) => `'${value}'`).join(", ");
}

export async function up({ sequelize, transaction }) {
  await sequelize.query('CREATE SCHEMA IF NOT EXISTS "core";', { transaction });

  await sequelize.query(
    `
    DO $$
    BEGIN
      CREATE TYPE "core"."inventory_reservation_status_enum"
        AS ENUM (${enumValues(reservationStatuses)});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE TABLE IF NOT EXISTS "core"."InventoryReservations" (
      "id" UUID NOT NULL PRIMARY KEY,
      "orderId" UUID NOT NULL,
      "productId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL,
      "status" "core"."inventory_reservation_status_enum"
        NOT NULL DEFAULT 'active',
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "consumedAt" TIMESTAMPTZ NULL,
      "releasedAt" TIMESTAMPTZ NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "inventory_reservations_order_id_fkey"
        FOREIGN KEY ("orderId") REFERENCES "core"."Orders" ("id")
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "inventory_reservations_product_id_fkey"
        FOREIGN KEY ("productId") REFERENCES "core"."Products" ("id_producto")
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "inventory_reservations_quantity_positive"
        CHECK ("quantity" > 0)
    );
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS "inventory_reservations_active_order_product_unique"
    ON "core"."InventoryReservations" ("orderId", "productId")
    WHERE "status" = 'active';
    `,
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "inventory_reservations_order_id_idx" ON "core"."InventoryReservations" ("orderId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "inventory_reservations_product_id_idx" ON "core"."InventoryReservations" ("productId");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "inventory_reservations_status_idx" ON "core"."InventoryReservations" ("status");',
    { transaction }
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "inventory_reservations_expires_at_idx" ON "core"."InventoryReservations" ("expiresAt");',
    { transaction }
  );
  await sequelize.query(
    `
    CREATE INDEX IF NOT EXISTS "inventory_reservations_active_product_expires_idx"
    ON "core"."InventoryReservations" ("productId", "expiresAt")
    WHERE "status" = 'active';
    `,
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query(
    'DROP TABLE IF EXISTS "core"."InventoryReservations";',
    { transaction }
  );
  await sequelize.query(
    'DROP TYPE IF EXISTS "core"."inventory_reservation_status_enum";',
    { transaction }
  );
}
