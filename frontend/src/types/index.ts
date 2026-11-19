export type SupportedCurrency = 'CDF';

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN';

export type SellerType = 'FARMER' | 'RESELLER' | 'SUPPLIER';

export type SaleType = 'RETAIL' | 'WHOLESALE';

export type StockMovementType =
  | 'INITIAL_STOCK'
  | 'RESTOCK'
  | 'ORDER_RESERVATION'
  | 'ORDER_FULFILLMENT'
  | 'ORDER_CANCELLED_RESTORE'
  | 'MANUAL_ADJUSTMENT'
  | 'SPOILAGE_LOSS';

export type ParentOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED';

export type SubOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

export interface PaymentAttempt {
  transactionId: string;
  reference: string;
  purpose: 'ORDER' | 'SUBSCRIPTION' | 'PROMOTION';
  orderNumber?: string;
  amountCdf?: number;
  currency: 'CDF';
  status: PaymentStatus;
  payoutStatus?: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  payoutReference?: string;
  providerTransactionId?: string;
  verifiedAt?: string;
}

export interface SellerSubscriptionStatus {
  startsAt: string | null;
  expiresAt: string | null;
  amountCdf?: number;
  monthlyPriceCdf?: number;
  currency?: 'CDF';
  current: boolean;
}

export interface PromotionPackage {
  id: string;
  name: string;
  durationDays: number;
  priceCdf: number;
  isActive?: boolean;
}

export interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
  roles: UserRole[];
  email: string;
  sellerId?: string;
  preferredLang?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  itemCount: number;
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  standardUnit: string;
  scientificName?: string;
  offersCount: number;
  minPriceCdf?: number | null;
  maxPriceCdf?: number | null;
}

export interface SellerOfferItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerType: SellerType;
  productId: string;
  productName: string;
  categoryName: string;
  unit: string;
  stockQuantity: number;
  isAvailable: boolean;
  isFeatured?: boolean;
  retailPriceCdf: number;
  retailMinQuantity: number;
  wholesalePriceCdf?: number;
  wholesaleMinQuantity?: number;
  servicesOffered: string[];
  qualityGrade: string;
  originProvince: string;
  originCity: string;
  imageUrl?: string;
}

export type SellerOffer = SellerOfferItem;

export interface SellerProfile {
  id: string;
  userId?: string;
  sellerType: SellerType;
  businessName: string;
  description?: string;
  province: string;
  city: string;
  address?: string;
  phone?: string;
  phoneNumber?: string;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  commissionRate?: number;
  rating?: number;
  reviewsCount?: number;
  offersCount?: number;
  totalSales?: number;
  joinDate?: string;
  avatarUrl?: string;
  coverUrl?: string;
  specialties?: string[];
  badges?: string[];
  offers?: SellerOfferItem[];
  services?: SellerService[];
}

export interface SellerService {
  id: string;
  sellerId: string;
  serviceType: string;
  title: string;
  description?: string;
  extraFeeCdf: number;
  isActive: boolean;
}

export interface StockMovement {
  id: string;
  offerId: string;
  sellerId: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdAt: string | Date;
}

export interface CartCalculationItem {
  offerId: string;
  productName: string;
  unit: string;
  quantity: number;
  saleType: SaleType;
  unitPriceCdf: number;
  subtotalCdf: number;
  availableStock: number;
  isStockSufficient: boolean;
}

export interface CartSellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartCalculationItem[];
  sellerSubtotalCdf: number;
}

export interface CartCalculationResult {
  sellerGroups: CartSellerGroup[];
  distinctSellersCount: number;
  totalItemsCount: number;
  hasStockShortage: boolean;
  totals: {
    totalCdf: number;
  };
}

export interface OrderItem {
  id: string;
  subOrderId: string;
  offerId: string;
  productName: string;
  saleType: SaleType;
  quantity: number;
  unitPriceCdf: number;
  subtotalCdf: number;
}

export interface SubOrder {
  id: string;
  subOrderNumber: string;
  parentOrderId: string;
  sellerId: string;
  sellerName: string;
  status: SubOrderStatus;
  subtotalCdf: number;
  commissionRate: number;
  commissionAmountCdf: number;
  payoutAmountCdf: number;
  items?: OrderItem[];
  createdAt?: string;
}

export interface ParentOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  status: ParentOrderStatus;
  currency: 'CDF';
  totalItemsCdf: number;
  deliveryFeeCdf: number;
  totalAmountCdf: number;
  deliveryProvince: string;
  deliveryCity: string;
  deliveryCommune?: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryInstructions?: string;
  createdAt: string;
  subOrders: SubOrder[];
}
