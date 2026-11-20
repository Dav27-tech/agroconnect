ALTER TABLE "platform_payments"
  ADD COLUMN "provider" "PaymentProviderType";

UPDATE "platform_payments" SET "provider" = 'M_PESA' WHERE "provider" IS NULL;

ALTER TABLE "platform_payments"
  ALTER COLUMN "provider" SET NOT NULL;
