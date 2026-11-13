import { DRCProvince } from '../../config/drc.js';

export interface SellerProfileData {
  id: string;
  userId: string;
  businessName: string;
  sellerType: 'FARMER' | 'RESELLER' | 'SUPPLIER';
  description: string;
  province: DRCProvince;
  city: string;
  address?: string;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED';
  commissionRate: number; // En %
  rating: number;
  totalSales: number;
}
