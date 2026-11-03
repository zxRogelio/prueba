export async function up({ sequelize, transaction }) {
  await sequelize.query(`
    CREATE TABLE "core"."AccessQrTokens" (
      "id" UUID NOT NULL PRIMARY KEY,
      "userId" UUID NOT NULL REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "subscriptionId" UUID NOT NULL REFERENCES "core"."UserSubscriptions" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "tokenHash" VARCHAR(64) NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "usedAt" TIMESTAMPTZ NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "access_qr_tokens_hash_check" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
      CONSTRAINT "access_qr_tokens_expiry_check" CHECK ("expiresAt" > "createdAt"),
      CONSTRAINT "access_qr_tokens_used_check" CHECK ("usedAt" IS NULL OR ("usedAt" >= "createdAt" AND "usedAt" < "expiresAt"))
    );
    CREATE UNIQUE INDEX "access_qr_tokens_hash_unique" ON "core"."AccessQrTokens" ("tokenHash");
    CREATE INDEX "access_qr_tokens_user_idx" ON "core"."AccessQrTokens" ("userId");
    CREATE INDEX "access_qr_tokens_subscription_idx" ON "core"."AccessQrTokens" ("subscriptionId");
    CREATE INDEX "access_qr_tokens_expires_idx" ON "core"."AccessQrTokens" ("expiresAt");

    CREATE TABLE "core"."GymAccessLogs" (
      "id" UUID NOT NULL PRIMARY KEY,
      "qrTokenId" UUID NOT NULL REFERENCES "core"."AccessQrTokens" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "userId" UUID NOT NULL REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "subscriptionId" UUID NOT NULL REFERENCES "core"."UserSubscriptions" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "scannedBy" UUID NOT NULL REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "scannedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "result" VARCHAR(20) NOT NULL DEFAULT 'granted',
      CONSTRAINT "gym_access_logs_result_check" CHECK ("result" = 'granted'),
      CONSTRAINT "gym_access_logs_scanner_check" CHECK ("scannedBy" <> "userId")
    );
    CREATE UNIQUE INDEX "gym_access_logs_token_unique" ON "core"."GymAccessLogs" ("qrTokenId");
    CREATE INDEX "gym_access_logs_user_date_idx" ON "core"."GymAccessLogs" ("userId", "scannedAt", "id");
    CREATE INDEX "gym_access_logs_date_idx" ON "core"."GymAccessLogs" ("scannedAt", "id");
    CREATE INDEX "gym_access_logs_subscription_idx" ON "core"."GymAccessLogs" ("subscriptionId");
    CREATE INDEX "gym_access_logs_scanner_idx" ON "core"."GymAccessLogs" ("scannedBy");
  `, { transaction });
}

export async function down({ sequelize, transaction }) {
  // Never silently erase attendance records when reverting a deployment.
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "core"."GymAccessLogs" LIMIT 1) THEN
        RAISE EXCEPTION 'No se puede revertir QR: existen entradas registradas.';
      END IF;
    END $$;
    DROP TABLE "core"."GymAccessLogs";
    DROP TABLE "core"."AccessQrTokens";
  `, { transaction });
}
