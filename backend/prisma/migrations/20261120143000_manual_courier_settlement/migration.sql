CREATE TYPE "ManualCollectionMethod" AS ENUM ('CASH', 'MOBILE_MONEY_DIRECT');

ALTER TABLE "platform_settings"
  ADD COLUMN "commissionRatePercent" DECIMAL(5, 2) NOT NULL DEFAULT 10.00;

ALTER TABLE "platform_settings"
  ADD CONSTRAINT "platform_settings_commission_rate_check"
  CHECK ("commissionRatePercent" >= 0 AND "commissionRatePercent" < 100);

INSERT INTO "platform_settings" ("id", "commissionRatePercent")
VALUES ('singleton', 10.00)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "deliveries"
  ADD COLUMN "collectionMethod" "ManualCollectionMethod",
  ADD COLUMN "collectedAmountCdf" DECIMAL(14, 2),
  ADD COLUMN "collectionReference" TEXT,
  ADD COLUMN "collectedAt" TIMESTAMP(3),
  ADD COLUMN "platformDepositAmountCdf" DECIMAL(14, 2),
  ADD COLUMN "platformDepositReceivedAt" TIMESTAMP(3),
  ADD COLUMN "platformDepositReceivedByUserId" UUID;

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_collected_amount_check"
  CHECK ("collectedAmountCdf" IS NULL OR "collectedAmountCdf" >= 0),
  ADD CONSTRAINT "deliveries_platform_deposit_amount_check"
  CHECK ("platformDepositAmountCdf" IS NULL OR "platformDepositAmountCdf" >= 0);

CREATE INDEX "deliveries_personnel_status_idx"
  ON "deliveries"("personnelId", "status");
