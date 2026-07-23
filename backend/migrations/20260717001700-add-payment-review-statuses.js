export const useTransaction = false;

async function orderStatusExists(sequelize, status) {
  const [rows] = await sequelize.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'core'
        AND t.typname = 'order_status_enum'
        AND e.enumlabel = :status
    ) AS "exists";
    `,
    {
      replacements: { status },
    }
  );

  return Boolean(rows[0]?.exists);
}

export async function up({ sequelize }) {
  if (!(await orderStatusExists(sequelize, "disputed"))) {
    await sequelize.query(`
      ALTER TYPE "core"."order_status_enum" ADD VALUE 'disputed';
    `);
  }

  if (!(await orderStatusExists(sequelize, "charged_back"))) {
    await sequelize.query(`
      ALTER TYPE "core"."order_status_enum" ADD VALUE 'charged_back';
    `);
  }
}

export async function down() {
  // PostgreSQL no permite eliminar valores de un ENUM de forma segura sin
  // reconstruir el tipo y migrar datos historicos. El rollback es no destructivo.
}
