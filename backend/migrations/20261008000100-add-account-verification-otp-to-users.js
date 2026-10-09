export async function up({ sequelize, transaction }) {
  await sequelize.query(
    `
    ALTER TABLE "core"."Users"
      ADD COLUMN IF NOT EXISTS "verificationOtp" VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS "verificationOtpExpires" TIMESTAMPTZ NULL;
    `,
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query(
    `
    ALTER TABLE "core"."Users"
      DROP COLUMN IF EXISTS "verificationOtpExpires",
      DROP COLUMN IF EXISTS "verificationOtp";
    `,
    { transaction }
  );
}
