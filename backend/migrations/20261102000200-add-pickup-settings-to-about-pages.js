// Keep historical marketing/contact fields intact. No location is invented.
export async function up({ sequelize, transaction }) {
  await sequelize.query('ALTER TABLE "core"."AboutPages" ADD COLUMN "pickupSettings" JSONB NULL;', { transaction });
}

export async function down({ sequelize, transaction }) {
  await sequelize.query(`LOCK TABLE "core"."AboutPages" IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "core"."AboutPages" WHERE "pickupSettings" IS NOT NULL) THEN
        RAISE EXCEPTION 'Pickup configuration exists; retain the additive column when reverting application code.';
      END IF;
    END $$;
    ALTER TABLE "core"."AboutPages" DROP COLUMN "pickupSettings";`, { transaction });
}
