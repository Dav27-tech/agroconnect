-- ==============================================================================
-- AGROCONNECT RDC — POSTGRESQL INITIAL DATABASE MIGRATION
-- Plateforme d'intermédiation agricole multi-acteurs en RDC
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE "UserRole" AS ENUM (
    'BUYER',
    'SELLER',
    'DELIVERY_PROVIDER',
    'DELIVERY_PERSON',
    'ADMIN'
);

CREATE TYPE "SellerType" AS ENUM (
    'FARMER',
    'RESELLER',
    'SUPPLIER'
);

CREATE TYPE "VerificationStatus" AS ENUM (
    'PENDING',
    'UNDER_REVIEW',
    'VERIFIED',
    'REJECTED'
);

CREATE TYPE "Currency" AS ENUM (
    'CDF',
    'USD'
);

CREATE TYPE "UnitOfMeasure" AS ENUM (
    'KG',
    'SAC_25KG',
    'SAC_50KG',
    'SAC_100KG',
    'BOTTE',
    'TONNE',
    'PIECE',
    'LITRE',
    'BIDON_20L',
    'CARTON',
    'CASIER'
);

CREATE TYPE "SaleType" AS ENUM (
    'RETAIL',
    'WHOLESALE'
);

CREATE TYPE "StockMovementType" AS ENUM (
    'INITIAL_STOCK',
    'RESTOCK',
    'ORDER_RESERVATION',
    'ORDER_FULFILLMENT',
    'ORDER_CANCELLED_RESTORE',
    'MANUAL_ADJUSTMENT',
    'SPOILAGE_LOSS'
);

CREATE TYPE "ParentOrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'CANCELLED'
);

CREATE TYPE "SubOrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'IN_DELIVERY',
    'DELIVERED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE "PaymentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'REFUNDED'
);

CREATE TYPE "PaymentProviderType" AS ENUM (
    'M_PESA',
    'ORANGE_MONEY',
    'AIRTEL_MONEY',
    'AFRIMONEY',
    'BANK_TRANSFER',
    'MANUAL_TEST'
);

CREATE TYPE "DeliveryStatus" AS ENUM (
    'PENDING',
    'ASSIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'ARRIVED',
    'DELIVERED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE "PayoutStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

-- 3. TABLES

-- Table: users
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "phoneNumber" VARCHAR(30) NOT NULL UNIQUE,
    "email" VARCHAR(255) UNIQUE,
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "roles" "UserRole"[] DEFAULT ARRAY['BUYER'::"UserRole"],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferredLang" VARCHAR(10) NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: seller_profiles
CREATE TABLE "seller_profiles" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "sellerType" "SellerType" NOT NULL,
    "businessName" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "province" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "address" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: delivery_profiles
CREATE TABLE "delivery_profiles" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "companyName" VARCHAR(200),
    "vehicleType" VARCHAR(100),
    "plateNumber" VARCHAR(50),
    "operatingArea" VARCHAR(200) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: categories
CREATE TABLE "categories" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(150) NOT NULL UNIQUE,
    "slug" VARCHAR(150) NOT NULL UNIQUE,
    "description" TEXT,
    "imageUrl" TEXT,
    "icon" VARCHAR(50),
    "parentId" UUID REFERENCES "categories"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: products (Catalogue commun - Pas de stock propriétaire AgroConnect)
CREATE TABLE "products" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL UNIQUE,
    "description" TEXT,
    "standardUnit" "UnitOfMeasure" NOT NULL DEFAULT 'KG',
    "scientificName" VARCHAR(200),
    "imageUrl" TEXT,
    "categoryId" UUID NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: offers (Offres spécifiques vendeurs avec stock partagé)
CREATE TABLE "offers" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sellerId" UUID NOT NULL REFERENCES "seller_profiles"("id") ON DELETE CASCADE,
    "productId" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "stockQuantity" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "unit" "UnitOfMeasure" NOT NULL DEFAULT 'KG',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "retailPriceCdf" DECIMAL(14,2) NOT NULL,
    "retailPriceUsd" DECIMAL(14,2) NOT NULL,
    "retailMinQuantity" DECIMAL(14,2) NOT NULL DEFAULT 1.00,
    "wholesalePriceCdf" DECIMAL(14,2),
    "wholesalePriceUsd" DECIMAL(14,2),
    "wholesaleMinQuantity" DECIMAL(14,2),
    "harvestDate" TIMESTAMP(3),
    "originProvince" VARCHAR(100) NOT NULL,
    "originCity" VARCHAR(100),
    "qualityGrade" VARCHAR(100),
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: seller_services
CREATE TABLE "seller_services" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sellerId" UUID NOT NULL REFERENCES "seller_profiles"("id") ON DELETE CASCADE,
    "serviceType" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "extraFeeCdf" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "extraFeeUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: offer_services
CREATE TABLE "offer_services" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "offerId" UUID NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE,
    "serviceId" UUID NOT NULL REFERENCES "seller_services"("id") ON DELETE CASCADE,
    CONSTRAINT "offer_services_unique" UNIQUE ("offerId", "serviceId")
);

-- Table: stock_movements (Audit exhaustif des mouvements de stock par vendeur)
CREATE TABLE "stock_movements" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "offerId" UUID NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE,
    "sellerId" UUID NOT NULL REFERENCES "seller_profiles"("id") ON DELETE CASCADE,
    "movementType" "StockMovementType" NOT NULL,
    "quantityChange" DECIMAL(14,2) NOT NULL,
    "previousStock" DECIMAL(14,2) NOT NULL,
    "newStock" DECIMAL(14,2) NOT NULL,
    "referenceType" VARCHAR(100),
    "referenceId" VARCHAR(100),
    "notes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: carts
CREATE TABLE "carts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "sessionId" VARCHAR(100) UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: cart_items
CREATE TABLE "cart_items" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cartId" UUID NOT NULL REFERENCES "carts"("id") ON DELETE CASCADE,
    "offerId" UUID NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE,
    "saleType" "SaleType" NOT NULL DEFAULT 'RETAIL',
    "quantity" DECIMAL(14,2) NOT NULL DEFAULT 1.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_items_unique_offer" UNIQUE ("cartId", "offerId", "saleType")
);

-- Table: parent_orders (Commande globale client avec snapshot du taux de change)
CREATE TABLE "parent_orders" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "orderNumber" VARCHAR(50) NOT NULL UNIQUE,
    "buyerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "status" "ParentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "exchangeRateSnapshot" DECIMAL(14,4) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'CDF',
    "totalItemsCdf" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalItemsUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "deliveryFeeCdf" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "deliveryFeeUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalAmountCdf" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalAmountUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "deliveryProvince" VARCHAR(100) NOT NULL,
    "deliveryCity" VARCHAR(100) NOT NULL,
    "deliveryCommune" VARCHAR(100),
    "deliveryAddress" TEXT NOT NULL,
    "recipientName" VARCHAR(150) NOT NULL,
    "recipientPhone" VARCHAR(30) NOT NULL,
    "deliveryInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: sub_orders (Sous-commandes spécifiques à chaque vendeur)
CREATE TABLE "sub_orders" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "subOrderNumber" VARCHAR(60) NOT NULL UNIQUE,
    "parentOrderId" UUID NOT NULL REFERENCES "parent_orders"("id") ON DELETE CASCADE,
    "sellerId" UUID NOT NULL REFERENCES "seller_profiles"("id") ON DELETE RESTRICT,
    "status" "SubOrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotalCdf" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "subtotalUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "commissionAmountCdf" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "commissionAmountUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "payoutAmountCdf" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "payoutAmountUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: order_items
CREATE TABLE "order_items" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "subOrderId" UUID NOT NULL REFERENCES "sub_orders"("id") ON DELETE CASCADE,
    "offerId" UUID NOT NULL REFERENCES "offers"("id") ON DELETE RESTRICT,
    "saleType" "SaleType" NOT NULL DEFAULT 'RETAIL',
    "quantity" DECIMAL(14,2) NOT NULL,
    "unitPriceCdf" DECIMAL(14,2) NOT NULL,
    "unitPriceUsd" DECIMAL(14,2) NOT NULL,
    "subtotalCdf" DECIMAL(14,2) NOT NULL,
    "subtotalUsd" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: payment_transactions
CREATE TABLE "payment_transactions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "parentOrderId" UUID NOT NULL REFERENCES "parent_orders"("id") ON DELETE CASCADE,
    "provider" "PaymentProviderType" NOT NULL,
    "providerTransactionId" VARCHAR(100) UNIQUE,
    "idempotencyKey" VARCHAR(100) NOT NULL UNIQUE,
    "amountCdf" DECIMAL(14,2) NOT NULL,
    "amountUsd" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: deliveries (Cycle de vie indépendant de la commande)
CREATE TABLE "deliveries" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "subOrderId" UUID NOT NULL UNIQUE REFERENCES "sub_orders"("id") ON DELETE CASCADE,
    "personnelId" UUID REFERENCES "delivery_profiles"("id") ON DELETE SET NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "trackingCode" VARCHAR(50) NOT NULL UNIQUE,
    "pickupProvince" VARCHAR(100) NOT NULL,
    "pickupCity" VARCHAR(100) NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "dropoffProvince" VARCHAR(100) NOT NULL,
    "dropoffCity" VARCHAR(100) NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "estimatedDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: delivery_status_history
CREATE TABLE "delivery_status_history" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "deliveryId" UUID NOT NULL REFERENCES "deliveries"("id") ON DELETE CASCADE,
    "status" "DeliveryStatus" NOT NULL,
    "notes" TEXT,
    "location" VARCHAR(200),
    "recordedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: exchange_rate_configs
CREATE TABLE "exchange_rate_configs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "baseCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "targetCurrency" "Currency" NOT NULL DEFAULT 'CDF',
    "rate" DECIMAL(14,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(100) NOT NULL DEFAULT 'MANUAL_CONFIG',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configuredByUserId" UUID,
    "configuredByName" VARCHAR(150),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: financial_records (Comptabilité commissions & rémunérations vendeurs)
CREATE TABLE "financial_records" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "subOrderId" UUID NOT NULL UNIQUE REFERENCES "sub_orders"("id") ON DELETE CASCADE,
    "sellerId" UUID NOT NULL REFERENCES "seller_profiles"("id") ON DELETE RESTRICT,
    "parentOrderId" UUID NOT NULL,
    "grossAmountCdf" DECIMAL(14,2) NOT NULL,
    "grossAmountUsd" DECIMAL(14,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmountCdf" DECIMAL(14,2) NOT NULL,
    "commissionAmountUsd" DECIMAL(14,2) NOT NULL,
    "sellerEarningsCdf" DECIMAL(14,2) NOT NULL,
    "sellerEarningsUsd" DECIMAL(14,2) NOT NULL,
    "exchangeRateApplied" DECIMAL(14,4) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payoutRef" VARCHAR(100),
    "paidAt" TIMESTAMP(3)
);

-- Table: seller_payouts
CREATE TABLE "seller_payouts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sellerId" UUID NOT NULL REFERENCES "seller_profiles"("id") ON DELETE RESTRICT,
    "subOrderId" UUID NOT NULL REFERENCES "sub_orders"("id") ON DELETE RESTRICT,
    "amountCdf" DECIMAL(14,2) NOT NULL,
    "amountUsd" DECIMAL(14,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "reference" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: notifications
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. INDEXES POUR PERFORMANCE ET TRAÇABILITÉ
CREATE INDEX "idx_seller_profiles_province" ON "seller_profiles"("province");
CREATE INDEX "idx_products_category" ON "products"("categoryId");
CREATE INDEX "idx_offers_seller" ON "offers"("sellerId");
CREATE INDEX "idx_offers_product" ON "offers"("productId");
CREATE INDEX "idx_stock_movements_offer" ON "stock_movements"("offerId");
CREATE INDEX "idx_stock_movements_seller" ON "stock_movements"("sellerId");
CREATE INDEX "idx_sub_orders_parent" ON "sub_orders"("parentOrderId");
CREATE INDEX "idx_sub_orders_seller" ON "sub_orders"("sellerId");
CREATE INDEX "idx_deliveries_tracking" ON "deliveries"("trackingCode");
CREATE INDEX "idx_delivery_history" ON "delivery_status_history"("deliveryId");
CREATE INDEX "idx_financial_seller" ON "financial_records"("sellerId");
CREATE INDEX "idx_notifications_user" ON "notifications"("userId");

