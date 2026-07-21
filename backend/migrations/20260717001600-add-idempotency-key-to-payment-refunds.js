export async function up({ sequelize, transaction }) {
  await sequelize.query(
    `
    ALTER TABLE "core"."PaymentRefunds"
      ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(160) NULL;
    `,
    { transaction }
  );

  await sequelize.query(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_idempotency_key_unique"
    ON "core"."PaymentRefunds" ("idempotencyKey")
    WHERE "idempotencyKey" IS NOT NULL;
    `,
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query(
    'DROP INDEX IF EXISTS "core"."payment_refunds_idempotency_key_unique";',
    { transaction }
  );

  await sequelize.query(
    `
    ALTER TABLE "core"."PaymentRefunds"
      DROP COLUMN IF EXISTS "idempotencyKey";
    `,
    { transaction }
  );
}
