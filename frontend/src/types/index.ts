export type SupportedCurrency = 'CDF' | 'USD';

export type UserRole = 'BUYER' | 'SELLER' | 'DELIVERY_PROVIDER' | 'DELIVERY_PERSON' | 'ADMIN';

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

export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
  roles: UserRole[];
  email?: string;
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
  minPriceUsd?: number | null;
  maxPriceUsd?: number | null;
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
  retailPriceCdf: number;
  retailPriceUsd: number;
  retailMinQuantity: number;
  wholesalePriceCdf?: number;
  wholesalePriceUsd?: number;
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
  extraFeeUsd: number;
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
  unitPriceUsd: number;
  subtotalCdf: number;
  subtotalUsd: number;
  availableStock: number;
  isStockSufficient: boolean;
}

export interface CartSellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartCalculationItem[];
  sellerSubtotalCdf: number;
  sellerSubtotalUsd: number;
}

export interface CartCalculationResult {
  sellerGroups: CartSellerGroup[];
  distinctSellersCount: number;
  totalItemsCount: number;
  hasStockShortage: boolean;
  exchangeRateSnapshot: number;
  totals: {
    totalCdf: number;
    totalUsd: number;
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
  unitPriceUsd: number;
  subtotalCdf: number;
  subtotalUsd: number;
}

export interface SubOrder {
  id: string;
  subOrderNumber: string;
  parentOrderId: string;
  sellerId: string;
  sellerName: string;
  status: SubOrderStatus;
  subtotalCdf: number;
  subtotalUsd: number;
  commissionRate: number;
  commissionAmountCdf: number;
  commissionAmountUsd: number;
  payoutAmountCdf: number;
  payoutAmountUsd: number;
  deliveryId: string;
  items?: OrderItem[];
  delivery?: DeliveryInfo;
  createdAt?: string;
}

export interface ParentOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  status: ParentOrderStatus;
  currency: SupportedCurrency;
  exchangeRateSnapshot: number;
  totalItemsCdf: number;
  totalItemsUsd: number;
  deliveryFeeCdf: number;
  deliveryFeeUsd: number;
  totalAmountCdf: number;
  totalAmountUsd: number;
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

export interface DeliveryStatusEvent {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  notes?: string;
  location?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface DeliveryInfo {
  id: string;
  trackingCode: string;
  subOrderId: string;
  subOrderNumber?: string;
  sellerName?: string;
  status: DeliveryStatus;
  origin: {
    province: string;
    city: string;
    address: string;
  };
  destination: {
    province: string;
    city: string;
    address: string;
  };
  courier?: {
    companyName?: string;
    vehicleType?: string;
    plateNumber?: string;
    operatingArea?: string;
  } | null;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  statusHistory: DeliveryStatusEvent[];
}

export interface ExchangeRateInfo {
  rate: number; // 1 USD = X CDF
  baseCurrency: 'USD';
  targetCurrency: 'CDF';
  effectiveDate: string;
}
