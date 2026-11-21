BEGIN;

CREATE TYPE "PlatformPaymentPurpose" AS ENUM ('ORDER', 'SUBSCRIPTION', 'PROMOTION');

ALTER TABLE "parent_orders"
  ADD COLUMN "idempotencyKey" VARCHAR(128),
  ADD COLUMN "idempotencyHash" VARCHAR(64);

CREATE UNIQUE INDEX "parent_orders_buyer_idempotency_key_key"
  ON "parent_orders"("buyerId", "idempotencyKey");

ALTER TABLE "seller_profiles"
  ADD COLUMN "goFreshPaySubMerchantCode" TEXT UNIQUE,
  ADD COLUMN "goFreshPaySubMerchantPhone" VARCHAR(30);

ALTER TABLE "offers"
  ADD COLUMN "featuredUntil" TIMESTAMP(3);

CREATE TABLE "platform_settings" (
  "id" TEXT PRIMARY KEY DEFAULT 'singleton',
  "receivingPhoneNumber" VARCHAR(30),
  "goFreshPaySubMerchantCode" VARCHAR(100) UNIQUE,
  "goFreshPaySubMerchantPhone" VARCHAR(30),
  "monthlySubscriptionCdf" DECIMAL(14,2) NOT NULL DEFAULT 500.00,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_settings_singleton_check" CHECK ("id" = 'singleton'),
  CONSTRAINT "platform_settings_subscription_price_check" CHECK ("monthlySubscriptionCdf" >= 0)
);

INSERT INTO "platform_settings" ("id") VALUES ('singleton')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "promotion_packages" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(120) NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "priceCdf" DECIMAL(14,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_packages_duration_check" CHECK ("durationDays" > 0),
  CONSTRAINT "promotion_packages_price_check" CHECK ("priceCdf" > 0)
);

CREATE TABLE "platform_payments" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "purpose" "PlatformPaymentPurpose" NOT NULL,
  "reference" VARCHAR(100) NOT NULL UNIQUE,
  "idempotencyKey" VARCHAR(160) NOT NULL UNIQUE,
  "sellerId" UUID REFERENCES "seller_profiles"("id") ON DELETE SET NULL,
  "parentOrderId" UUID REFERENCES "parent_orders"("id") ON DELETE SET NULL,
  "subOrderId" UUID REFERENCES "sub_orders"("id") ON DELETE SET NULL,
  "offerId" UUID REFERENCES "offers"("id") ON DELETE SET NULL,
  "promotionPackageId" UUID REFERENCES "promotion_packages"("id") ON DELETE SET NULL,
  "promotionPackageName" VARCHAR(120),
  "promotionDurationDays" INTEGER,
  "amountCdf" DECIMAL(14,2) NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'CDF',
  "payerPhone" VARCHAR(30) NOT NULL,
  "recipientPhone" VARCHAR(30),
  "subMerchantCode" VARCHAR(100),
  "providerTransactionId" VARCHAR(150) UNIQUE,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP(3),
  "rawResponse" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_payments_amount_check" CHECK ("amountCdf" > 0),
  CONSTRAINT "platform_payments_currency_check" CHECK ("currency" = 'CDF')
);

CREATE INDEX "platform_payments_seller_purpose_status_idx"
  ON "platform_payments"("sellerId", "purpose", "status");
CREATE INDEX "platform_payments_parent_order_idx"
  ON "platform_payments"("parentOrderId");
CREATE INDEX "platform_payments_sub_order_idx"
  ON "platform_payments"("subOrderId");

CREATE TABLE "seller_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sellerId" UUID NOT NULL REFERENCES "seller_profiles"("id") ON DELETE CASCADE,
  "platformPaymentId" UUID NOT NULL UNIQUE REFERENCES "platform_payments"("id"),
  "amountCdf" DECIMAL(14,2) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_subscriptions_period_check" CHECK ("expiresAt" > "startsAt")
);
CREATE INDEX "seller_subscriptions_seller_expiry_idx"
  ON "seller_subscriptions"("sellerId", "expiresAt");

CREATE TABLE "offer_promotions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "offerId" UUID NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE,
  "sellerId" UUID NOT NULL REFERENCES "seller_profiles"("id") ON DELETE CASCADE,
  "packageId" UUID NOT NULL REFERENCES "promotion_packages"("id"),
  "platformPaymentId" UUID NOT NULL UNIQUE REFERENCES "platform_payments"("id"),
  "packageNameSnapshot" VARCHAR(120) NOT NULL,
  "amountCdf" DECIMAL(14,2) NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offer_promotions_period_check" CHECK ("expiresAt" > "startsAt"),
  CONSTRAINT "offer_promotions_amount_check" CHECK ("amountCdf" > 0)
);
CREATE INDEX "offer_promotions_offer_expiry_idx"
  ON "offer_promotions"("offerId", "expiresAt");

COMMIT;
