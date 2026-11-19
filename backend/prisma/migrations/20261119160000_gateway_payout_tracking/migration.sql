CREATE TYPE "PlatformPayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "platform_payments"
  ADD COLUMN "payoutStatus" "PlatformPayoutStatus",
  ADD COLUMN "payoutReference" VARCHAR(100) UNIQUE,
  ADD COLUMN "payoutProviderTransactionId" VARCHAR(150) UNIQUE,
  ADD COLUMN "payoutVerifiedAt" TIMESTAMP(3);

UPDATE "platform_payments"
SET "payoutStatus" = CASE
  WHEN "status" = 'SUCCEEDED' THEN 'SUCCEEDED'::"PlatformPayoutStatus"
  ELSE NULL
END;
