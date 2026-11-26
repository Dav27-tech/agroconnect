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
  // Stock unique partagé quel que soit le tarif appliqué
  stockQuantity: number;
  isAvailable: boolean;

  // Prix unitaire
  retailPriceCdf: number;
  retailMinQuantity: number;

  // Prix par quantité
  wholesalePriceCdf?: number;
  wholesaleMinQuantity?: number;

  // Services et garanties offerts par ce vendeur
  servicesOffered: string[];
  qualityGrade: string;
  originProvince: DRCProvince;
  originCity: string;
}

