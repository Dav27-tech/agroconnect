export type SupportedCurrency = 'CDF' | 'USD';

export type UserRole = 'BUYER' | 'SELLER' | 'DELIVERY_PROVIDER' | 'DELIVERY_PERSON' | 'ADMIN';

export type SellerType = 'FARMER' | 'RESELLER' | 'SUPPLIER';

export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

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
  description: string;
  standardUnit: string;
  scientificName?: string;
  offersCount: number;
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

export interface ExchangeRateInfo {
  rate: number; // 1 USD = X CDF
  baseCurrency: 'USD';
  targetCurrency: 'CDF';
  effectiveDate: string;
}
