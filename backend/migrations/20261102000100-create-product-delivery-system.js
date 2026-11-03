// Additive migration. Historical orders retain zero shipping and no fulfillment.
export async function up({ sequelize, transaction }) {
  await sequelize.query(`
    ALTER TABLE "core"."Orders" ADD COLUMN "shippingTotal" DECIMAL(12,2) NOT NULL DEFAULT 0
      CHECK ("shippingTotal" >= 0);
    CREATE TABLE "core"."UserAddresses" (
      "id" UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES "core"."Users"("id") ON DELETE CASCADE,
      "recipientName" VARCHAR(120) NOT NULL, "phone" VARCHAR(25) NOT NULL,
      "postalCode" VARCHAR(5) NOT NULL CHECK ("postalCode" ~ '^[0-9]{5}$'),
      "state" VARCHAR(100) NOT NULL, "municipality" VARCHAR(100) NOT NULL,
      "neighborhood" VARCHAR(120) NOT NULL, "street" VARCHAR(160) NOT NULL,
      "exteriorNumber" VARCHAR(30) NOT NULL, "interiorNumber" VARCHAR(30), "references" VARCHAR(500) NOT NULL,
      "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX "user_addresses_user_idx" ON "core"."UserAddresses" ("userId");
    CREATE UNIQUE INDEX "user_addresses_one_default" ON "core"."UserAddresses" ("userId") WHERE "isDefault";
    CREATE TABLE "core"."ShippingRates" (
      "id" UUID PRIMARY KEY, "name" VARCHAR(120) NOT NULL,
      "postalCodeFrom" VARCHAR(5) NOT NULL CHECK ("postalCodeFrom" ~ '^[0-9]{5}$'),
      "postalCodeTo" VARCHAR(5) NOT NULL CHECK ("postalCodeTo" ~ '^[0-9]{5}$'),
      "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" >= 0),
      "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN' CHECK ("currency" = 'MXN'),
      "active" BOOLEAN NOT NULL DEFAULT TRUE,
      "updatedBy" UUID REFERENCES "core"."Users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK ("postalCodeFrom" <= "postalCodeTo")
    );
    CREATE INDEX "shipping_rates_coverage_idx" ON "core"."ShippingRates" ("postalCodeFrom", "postalCodeTo") WHERE "active";
    CREATE TABLE "core"."OrderFulfillments" (
      "id" UUID PRIMARY KEY, "orderId" UUID NOT NULL UNIQUE REFERENCES "core"."Orders"("id") ON DELETE RESTRICT,
      "method" VARCHAR(20) NOT NULL CHECK ("method" IN ('pickup','delivery')),
      "status" VARCHAR(30) NOT NULL DEFAULT 'awaiting_payment'
        CHECK ("status" IN ('awaiting_payment','payment_confirmed','preparing','ready_for_pickup','picked_up','packed','shipped','delivered','incident','delivery_failed','cancelled')),
      "resumeStatus" VARCHAR(30), "recipientName" VARCHAR(120) NOT NULL, "phone" VARCHAR(25) NOT NULL,
      "addressSnapshot" JSONB, "pickupLocationSnapshot" JSONB,
      "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK ("shippingCost" >= 0), "rateSnapshot" JSONB,
      "carrier" VARCHAR(120), "trackingNumber" VARCHAR(120),
      "preparedAt" TIMESTAMPTZ, "readyAt" TIMESTAMPTZ, "packedAt" TIMESTAMPTZ,
      "shippedAt" TIMESTAMPTZ, "deliveredAt" TIMESTAMPTZ, "pickedUpAt" TIMESTAMPTZ, "cancelledAt" TIMESTAMPTZ,
      "confirmedBy" UUID REFERENCES "core"."Users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (("method" = 'pickup' AND "shippingCost" = 0 AND "addressSnapshot" IS NULL AND "pickupLocationSnapshot" IS NOT NULL)
          OR ("method" = 'delivery' AND "addressSnapshot" IS NOT NULL AND "rateSnapshot" IS NOT NULL)),
      CHECK (("method" = 'pickup' AND "status" NOT IN ('packed','shipped','delivered','delivery_failed'))
          OR ("method" = 'delivery' AND "status" NOT IN ('ready_for_pickup','picked_up')))
    );
    CREATE INDEX "fulfillment_method_status_idx" ON "core"."OrderFulfillments" ("method", "status");
    CREATE TABLE "core"."FulfillmentEvents" (
      "id" UUID PRIMARY KEY, "sequence" BIGSERIAL NOT NULL UNIQUE,
      "fulfillmentId" UUID NOT NULL REFERENCES "core"."OrderFulfillments"("id") ON DELETE RESTRICT,
      "fromStatus" VARCHAR(30), "toStatus" VARCHAR(30) NOT NULL,
      "actorId" UUID REFERENCES "core"."Users"("id") ON DELETE SET NULL,
      "notes" VARCHAR(1000), "details" JSONB, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX "fulfillment_events_history_idx" ON "core"."FulfillmentEvents" ("fulfillmentId", "createdAt");
  `, { transaction });
}

export async function down({ sequelize, transaction }) {
  // Never discard addresses, fulfillment history or shipping totals after use.
  await sequelize.query(`
    LOCK TABLE "core"."Orders", "core"."UserAddresses", "core"."ShippingRates",
      "core"."OrderFulfillments", "core"."FulfillmentEvents" IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "core"."OrderFulfillments")
        OR EXISTS (SELECT 1 FROM "core"."UserAddresses")
        OR EXISTS (SELECT 1 FROM "core"."ShippingRates")
        OR EXISTS (SELECT 1 FROM "core"."Orders" WHERE "shippingTotal" <> 0) THEN
        RAISE EXCEPTION 'Delivery data exists. Roll back application code and retain the additive schema.';
      END IF;
    END $$;
    DROP TABLE "core"."FulfillmentEvents";
    DROP TABLE "core"."OrderFulfillments";
    DROP TABLE "core"."ShippingRates";
    DROP TABLE "core"."UserAddresses";
    ALTER TABLE "core"."Orders" DROP COLUMN "shippingTotal";
  `, { transaction });
}
