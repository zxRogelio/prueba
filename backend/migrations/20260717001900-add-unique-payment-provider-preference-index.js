import { QueryTypes } from "sequelize";

async function findDuplicateProviderPreferences(sequelize, transaction) {
  return sequelize.query(
    `
    SELECT
      "provider",
      "providerPreferenceId",
      COUNT(*)::int AS "paymentCount"
    FROM "core"."Payments"
    WHERE "providerPreferenceId" IS NOT NULL
    GROUP BY "provider", "providerPreferenceId"
    HAVING COUNT(*) > 1
    ORDER BY "paymentCount" DESC, "provider" ASC, "providerPreferenceId" ASC;
    `,
    {
      transaction,
      type: QueryTypes.SELECT,
    }
  );
}

export async function up({ sequelize, transaction }) {
  const duplicates = await findDuplicateProviderPreferences(
    sequelize,
    transaction
  );

  if (duplicates.length > 0) {
    const summary = duplicates
      .map(
        (row) =>
          `${row.provider}:${row.providerPreferenceId}: ${row.paymentCount}`
      )
      .join(", ");

    throw new Error(
      `No se puede crear payments_provider_preference_id_unique; existen preferencias repetidas: ${summary}.`
    );
  }

  await sequelize.query(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_preference_id_unique"
    ON "core"."Payments" ("provider", "providerPreferenceId")
    WHERE "providerPreferenceId" IS NOT NULL;
    `,
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query(
    'DROP INDEX IF EXISTS "core"."payments_provider_preference_id_unique";',
    { transaction }
  );
}
