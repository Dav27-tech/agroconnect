import { DRCProvince } from '../../config/drc.js';

export interface SellerOfferItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerType: 'FARMER' | 'RESELLER' | 'SUPPLIER';
  productId: string;
  productName: string;
  categoryName: string;
  unit: string;
  // Stock unique et partagé entre détail et gros
  stockQuantity: number;
  isAvailable: boolean;

  // Prix au détail
  retailPriceCdf: number;
  retailPriceUsd: number;
  retailMinQuantity: number;

  // Prix de gros
  wholesalePriceCdf?: number;
  wholesalePriceUsd?: number;
  wholesaleMinQuantity?: number;

  // Services et garanties offerts par ce vendeur
  servicesOffered: string[];
  qualityGrade: string;
  originProvince: DRCProvince;
  originCity: string;
}

