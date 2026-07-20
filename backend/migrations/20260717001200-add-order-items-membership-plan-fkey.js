const constraintName = "order_items_membership_plan_id_fkey";

async function countOrphanOrderItems(sequelize, transaction) {
  const [rows] = await sequelize.query(
    `
    SELECT COUNT(*)::int AS "orphanCount"
    FROM "core"."OrderItems" AS "orderItem"
    LEFT JOIN "core"."MembershipPlans" AS "membershipPlan"
      ON "membershipPlan"."id" = "orderItem"."membershipPlanId"
    WHERE "orderItem"."membershipPlanId" IS NOT NULL
      AND "membershipPlan"."id" IS NULL;
    `,
    { transaction }
  );

  return Number(rows[0]?.orphanCount || 0);
}

export async function up({ sequelize, transaction }) {
  const orphanCount = await countOrphanOrderItems(sequelize, transaction);

  if (orphanCount > 0) {
    throw new Error(
      `No se puede agregar ${constraintName}: existen ${orphanCount} OrderItems con membershipPlanId huerfano. Corrige esos registros antes de ejecutar esta migracion.`
    );
  }

  await sequelize.query(
    `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${constraintName}'
          AND conrelid = '"core"."OrderItems"'::regclass
      ) THEN
        ALTER TABLE "core"."OrderItems"
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY ("membershipPlanId") REFERENCES "core"."MembershipPlans" ("id")
          ON UPDATE CASCADE ON DELETE RESTRICT;
      END IF;
    END $$;
    `,
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query(
    `
    ALTER TABLE "core"."OrderItems"
      DROP CONSTRAINT IF EXISTS "${constraintName}";
    `,
    { transaction }
  );
}
