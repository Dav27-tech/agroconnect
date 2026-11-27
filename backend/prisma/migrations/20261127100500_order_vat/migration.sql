ALTER TABLE "parent_orders"
  ADD COLUMN "vatRatePercent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "vatAmountCdf" DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE "sub_orders"
  ADD COLUMN "vatAmountCdf" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "totalAmountCdf" DECIMAL(14, 2) NOT NULL DEFAULT 0;

UPDATE "sub_orders" SET "totalAmountCdf" = "subtotalCdf";
