export async function up({ sequelize, transaction }) {
  await sequelize.query(`
    CREATE TABLE "core"."UserPersonalDatas" (
      "userId" UUID PRIMARY KEY REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "fullName" VARCHAR(160), "phone" VARCHAR(30),
      "createdAt" TIMESTAMPTZ NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE "core"."PrivacyConsents" (
      "id" UUID PRIMARY KEY,
      "userId" UUID NOT NULL REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "noticeId" VARCHAR(80) NOT NULL, "version" VARCHAR(80) NOT NULL,
      "contentSha256" VARCHAR(64) NOT NULL CHECK ("contentSha256" ~ '^[a-f0-9]{64}$'),
      "documentUrl" TEXT NOT NULL, "source" VARCHAR(30) NOT NULL CHECK ("source" IN ('registration', 'self_service')),
      "acceptedAt" TIMESTAMPTZ NOT NULL, "revokedAt" TIMESTAMPTZ,
      UNIQUE ("userId", "noticeId", "version", "contentSha256")
    );
    CREATE TABLE "core"."PrivacyPreferences" (
      "userId" UUID PRIMARY KEY REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" >= 1), "choices" JSONB NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMPTZ NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE "core"."PrivacyPreferenceEvents" (
      "id" UUID PRIMARY KEY,
      "userId" UUID NOT NULL REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "version" INTEGER NOT NULL CHECK ("version" >= 2), "changes" JSONB NOT NULL,
      "recordedAt" TIMESTAMPTZ NOT NULL, UNIQUE ("userId", "version")
    );
    CREATE TABLE "core"."ReauthenticationChallenges" (
      "id" UUID PRIMARY KEY,
      "userId" UUID NOT NULL REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "sessionId" UUID NOT NULL REFERENCES "core"."sessions" ("id") ON DELETE RESTRICT,
      "purpose" VARCHAR(40) NOT NULL CHECK ("purpose" = 'account-cancellation'),
      "credentialHash" VARCHAR(64) NOT NULL,
      "method" VARCHAR(20) NOT NULL CHECK ("method" IN ('otp', 'totp')),
      "codeHash" VARCHAR(64), "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 5),
      "createdAt" TIMESTAMPTZ NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL,
      "consumedAt" TIMESTAMPTZ, CHECK ("expiresAt" > "createdAt")
    );
    CREATE INDEX "reauth_challenges_user_date" ON "core"."ReauthenticationChallenges" ("userId", "createdAt");
    CREATE TABLE "core"."ReauthenticationProofs" (
      "id" UUID PRIMARY KEY,
      "userId" UUID NOT NULL REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "sessionId" UUID NOT NULL REFERENCES "core"."sessions" ("id") ON DELETE RESTRICT,
      "purpose" VARCHAR(40) NOT NULL CHECK ("purpose" = 'account-cancellation'),
      "credentialHash" VARCHAR(64) NOT NULL, "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
      "createdAt" TIMESTAMPTZ NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL,
      "consumedAt" TIMESTAMPTZ, CHECK ("expiresAt" > "createdAt")
    );
    CREATE INDEX "reauth_proofs_user_date" ON "core"."ReauthenticationProofs" ("userId", "createdAt");
    CREATE TABLE "core"."AccountCancellationRequests" (
      "id" UUID PRIMARY KEY,
      "userId" UUID NOT NULL REFERENCES "core"."Users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      "idempotencyKey" UUID NOT NULL, "requestHash" VARCHAR(64) NOT NULL,
      "status" VARCHAR(30) NOT NULL DEFAULT 'pending_review' CHECK ("status" = 'pending_review'),
      "membershipImpact" JSONB NOT NULL, "retentionSummary" JSONB NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL, "resolvedAt" TIMESTAMPTZ,
      UNIQUE ("userId", "idempotencyKey")
    );
    CREATE UNIQUE INDEX "one_pending_cancellation_per_user" ON "core"."AccountCancellationRequests" ("userId") WHERE "status" = 'pending_review';
  `, { transaction });
}

export async function down({ sequelize, transaction }) {
  // Refuse rollback once any evidence or personal choice has been recorded.
  await sequelize.query(`
    LOCK TABLE "core"."UserPersonalDatas", "core"."PrivacyConsents", "core"."PrivacyPreferences",
      "core"."PrivacyPreferenceEvents", "core"."ReauthenticationChallenges", "core"."ReauthenticationProofs",
      "core"."AccountCancellationRequests" IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "core"."UserPersonalDatas") OR
         EXISTS (SELECT 1 FROM "core"."PrivacyConsents") OR
         EXISTS (SELECT 1 FROM "core"."PrivacyPreferences") OR
         EXISTS (SELECT 1 FROM "core"."PrivacyPreferenceEvents") OR
         EXISTS (SELECT 1 FROM "core"."ReauthenticationChallenges") OR
         EXISTS (SELECT 1 FROM "core"."ReauthenticationProofs") OR
         EXISTS (SELECT 1 FROM "core"."AccountCancellationRequests") THEN
        RAISE EXCEPTION 'No se puede revertir ARCO: existen datos o evidencias.';
      END IF;
    END $$;
    DROP TABLE "core"."AccountCancellationRequests";
    DROP TABLE "core"."ReauthenticationProofs";
    DROP TABLE "core"."ReauthenticationChallenges";
    DROP TABLE "core"."PrivacyPreferenceEvents";
    DROP TABLE "core"."PrivacyPreferences";
    DROP TABLE "core"."PrivacyConsents";
    DROP TABLE "core"."UserPersonalDatas";
  `, { transaction });
}
