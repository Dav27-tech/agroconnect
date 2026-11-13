import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { SellerProfileData } from './seller.types.js';

// Répertoire des vendeurs initiaux en RDC
export const demoSellers: SellerProfileData[] = [
  {
    id: 'seller-kikwit-01',
    userId: 'usr_farmer_kikwit',
    businessName: 'Coopérative Agricole du Kwilu (COOPAK)',
    sellerType: 'FARMER',
    description: 'Producteurs directs de manioc doux, maïs et courges dans le Kwilu.',
    province: 'Kwilu',
    city: 'Kikwit',
    address: 'Route Nationale 1, Quartier Commercial',
    verificationStatus: 'VERIFIED',
    commissionRate: 5.0,
    rating: 4.8,
    totalSales: 342,
  },
  {
    id: 'seller-kin-02',
    userId: 'usr_reseller_kin',
    businessName: 'AgroDistrib Kinshasa Express',
    sellerType: 'RESELLER',
    description: 'Centrale d\'achat et redistribution maraîchère, conditionnement et livraison express à Kinshasa.',
    province: 'Kinshasa',
    city: 'Kinshasa',
    address: 'Marché de la Liberté, Pavillon 4',
    verificationStatus: 'VERIFIED',
    commissionRate: 5.0,
    rating: 4.6,
    totalSales: 890,
  },
  {
    id: 'seller-katanga-03',
    userId: 'usr_supplier_lshi',
    businessName: 'Intrants du Sud (Katanga Agro-Tech)',
    sellerType: 'SUPPLIER',
    description: 'Fourniture de semences certifiées, engrais NPK, pulvérisateurs et outillage agricole.',
    province: 'Haut-Katanga',
    city: 'Lubumbashi',
    address: 'Avenue Kapenda, Centre-ville',
    verificationStatus: 'VERIFIED',
    commissionRate: 5.0,
    rating: 4.9,
    totalSales: 154,
  },
];

export class SellerController {
  public static async listSellers(req: Request, res: Response): Promise<Response> {
    const { type, province } = req.query;

    let results = [...demoSellers];

    if (type && typeof type === 'string') {
      results = results.filter((s) => s.sellerType === type.toUpperCase());
    }

    if (province && typeof province === 'string') {
      results = results.filter((s) => s.province.toLowerCase() === province.toLowerCase());
    }

    return sendSuccess(res, results, 'Liste des vendeurs récupérée avec succès', 200, {
      total: results.length,
      country: 'RDC',
    });
  }

  public static async getSellerById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const seller = demoSellers.find((s) => s.id === id);

    if (!seller) {
      return sendError(res, `Vendeur avec l'identifiant '${id}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }

    return sendSuccess(res, seller);
  }
}
