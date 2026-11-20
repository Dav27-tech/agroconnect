BEGIN;

ALTER TABLE "seller_profiles"
  ALTER COLUMN "commissionRate" SET DEFAULT 0.00;

UPDATE "seller_profiles"
SET "commissionRate" = 0.00;

ALTER TABLE "sub_orders"
  ALTER COLUMN "commissionRate" SET DEFAULT 0.00;

COMMIT;
