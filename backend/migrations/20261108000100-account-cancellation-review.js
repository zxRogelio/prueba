export async function up({ sequelize, transaction }) {
  await sequelize.query(`
    ALTER TABLE "core"."Users" ADD COLUMN "deletionCompletedAt" TIMESTAMPTZ;
    ALTER TABLE "core"."AccountCancellationRequests" DROP CONSTRAINT "AccountCancellationRequests_status_check";
    ALTER TABLE "core"."AccountCancellationRequests"
      ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
      ADD COLUMN "resolutionCode" VARCHAR(80),
      ADD CONSTRAINT "AccountCancellationRequests_status_check"
        CHECK ("status" IN ('pending_review','under_review','awaiting_policy','rejected','completed'));
    DROP INDEX "core"."one_pending_cancellation_per_user";
    CREATE UNIQUE INDEX "one_pending_cancellation_per_user" ON "core"."AccountCancellationRequests" ("userId")
      WHERE "status" IN ('pending_review','under_review','awaiting_policy');
    CREATE TABLE "core"."AccountCancellationEvents" (
      "id" UUID PRIMARY KEY,
      "requestId" UUID NOT NULL REFERENCES "core"."AccountCancellationRequests" ("id") ON DELETE RESTRICT,
      "actorId" UUID NOT NULL REFERENCES "core"."Users" ("id") ON DELETE RESTRICT,
      "idempotencyKey" UUID NOT NULL, "commandHash" VARCHAR(64) NOT NULL,
      "fromStatus" VARCHAR(30) NOT NULL, "toStatus" VARCHAR(30) NOT NULL,
      "reasonCode" VARCHAR(80) NOT NULL, "policyId" VARCHAR(100),
      "policySha256" VARCHAR(64) CHECK ("policySha256" IS NULL OR "policySha256" ~ '^[a-f0-9]{64}$'),
      "version" INTEGER NOT NULL CHECK ("version" > 1), "recordedAt" TIMESTAMPTZ NOT NULL,
      UNIQUE ("requestId","idempotencyKey"), UNIQUE ("requestId","version")
    );
    CREATE FUNCTION "core"."cancellation_event_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Cancellation audit events are immutable'; END;
    $$;
    CREATE TRIGGER "cancellation_event_immutable" BEFORE UPDATE OR DELETE ON "core"."AccountCancellationEvents"
      FOR EACH ROW EXECUTE FUNCTION "core"."cancellation_event_immutable"();
  `, { transaction });
}

export async function down({ sequelize, transaction }) {
  // Never erase an administrative decision or undo an effective deletion.
  await sequelize.query(`
    LOCK TABLE "core"."AccountCancellationEvents", "core"."AccountCancellationRequests", "core"."Users" IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "core"."AccountCancellationEvents") OR
         EXISTS (SELECT 1 FROM "core"."Users" WHERE "deletionCompletedAt" IS NOT NULL) OR
         EXISTS (SELECT 1 FROM "core"."AccountCancellationRequests" WHERE "status" <> 'pending_review')
      THEN RAISE EXCEPTION 'Cancellation review contains evidence; rollback refused'; END IF;
    END $$;
    DROP TABLE "core"."AccountCancellationEvents";
    DROP FUNCTION "core"."cancellation_event_immutable"();
    DROP INDEX "core"."one_pending_cancellation_per_user";
    ALTER TABLE "core"."AccountCancellationRequests" DROP CONSTRAINT "AccountCancellationRequests_status_check",
      DROP COLUMN "version", DROP COLUMN "resolutionCode";
    ALTER TABLE "core"."AccountCancellationRequests" ADD CHECK ("status" = 'pending_review');
    CREATE UNIQUE INDEX "one_pending_cancellation_per_user" ON "core"."AccountCancellationRequests" ("userId") WHERE "status" = 'pending_review';
    ALTER TABLE "core"."Users" DROP COLUMN "deletionCompletedAt";
  `, { transaction });
}
