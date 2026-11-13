import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { SellerOfferItem } from './offer.types.js';
import { exchangeRateService } from '../../integrations/exchangeRate/ConfigExchangeRateProvider.js';

export const demoOffers: SellerOfferItem[] = [
  {
    id: 'off-manioc-kikwit-01',
    sellerId: 'seller-kikwit-01',
    sellerName: 'Coopérative Agricole du Kwilu (COOPAK)',
    sellerType: 'FARMER',
    productId: 'prod-manioc-doux',
    productName: 'Manioc Frais Doux',
    categoryName: 'Tubercules & Racines',
    unit: 'Sac 50kg',
    stockQuantity: 450,
    isAvailable: true,
    retailPriceCdf: 35000,
    retailPriceUsd: 12.28,
    retailMinQuantity: 1,
    wholesalePriceCdf: 28500,
    wholesalePriceUsd: 10.0,
    wholesaleMinQuantity: 10,
    servicesOffered: ['TRI_MANUEL', 'CONDITIONNEMENT_SAC_PISSENLIT'],
    qualityGrade: 'Grade 1 (Frais du jour)',
    originProvince: 'Kwilu',
    originCity: 'Kikwit',
  },
  {
    id: 'off-manioc-kin-reseller',
    sellerId: 'seller-kin-02',
    sellerName: 'AgroDistrib Kinshasa Express',
    sellerType: 'RESELLER',
    productId: 'prod-manioc-doux',
    productName: 'Manioc Frais Doux Lavé & Épluché',
    categoryName: 'Tubercules & Racines',
    unit: 'Sac 50kg',
    stockQuantity: 85,
    isAvailable: true,
    retailPriceCdf: 42000,
    retailPriceUsd: 14.73,
    retailMinQuantity: 1,
    wholesalePriceCdf: 36000,
    wholesalePriceUsd: 12.63,
    wholesaleMinQuantity: 5,
    servicesOffered: ['LIVRAISON_EXPRESS_KINSHASA', 'LAVAGE_EPLUCHAGE', 'GARANTIE_FRAICHEUR_48H'],
    qualityGrade: 'Prêt à la transformation',
    originProvince: 'Kinshasa',
    originCity: 'Kinshasa (Marché de la Liberté)',
  },
  {
    id: 'off-mais-katanga-01',
    sellerId: 'seller-katanga-03',
    sellerName: 'Intrants du Sud (Katanga Agro-Tech)',
    sellerType: 'SUPPLIER',
    productId: 'prod-mais-grain-jaune',
    productName: 'Maïs Grain Jaune Séché',
    categoryName: 'Céréales & Grains',
    unit: 'Sac 100kg',
    stockQuantity: 1200,
    isAvailable: true,
    retailPriceCdf: 110000,
    retailPriceUsd: 38.6,
    retailMinQuantity: 1,
    wholesalePriceCdf: 95000,
    wholesalePriceUsd: 33.33,
    wholesaleMinQuantity: 20,
    servicesOffered: ['CONTROLE_HUMIDITE_CERTIFIE', 'CHARGEMENT_CAMION_ASSISTE'],
    qualityGrade: 'Standard Minoterie',
    originProvince: 'Haut-Katanga',
    originCity: 'Lubumbashi',
  },
  {
    id: 'off-pondu-kikwit-01',
    sellerId: 'seller-kikwit-01',
    sellerName: 'Coopérative Agricole du Kwilu (COOPAK)',
    sellerType: 'FARMER',
    productId: 'prod-pondu-frais',
    productName: 'Feuilles de Manioc (Pondu)',
    categoryName: 'Légumes & Maraîchage',
    unit: 'Grande Botte',
    stockQuantity: 600,
    isAvailable: true,
    retailPriceCdf: 3000,
    retailPriceUsd: 1.05,
    retailMinQuantity: 3,
    wholesalePriceCdf: 2200,
    wholesalePriceUsd: 0.77,
    wholesaleMinQuantity: 30,
    servicesOffered: ['CUEILLETTE_DU_MATIN'],
    qualityGrade: 'Extra Frais',
    originProvince: 'Kwilu',
    originCity: 'Kikwit',
  },
];

export class OfferController {
  public static async listOffers(req: Request, res: Response): Promise<Response> {
    const { productId, sellerId, province, sellerType } = req.query;

    let results = [...demoOffers];

    if (productId && typeof productId === 'string') {
      results = results.filter((o) => o.productId === productId);
    }

    if (sellerId && typeof sellerId === 'string') {
      results = results.filter((o) => o.sellerId === sellerId);
    }

    if (province && typeof province === 'string') {
      results = results.filter((o) => o.originProvince.toLowerCase() === province.toLowerCase());
    }

    if (sellerType && typeof sellerType === 'string') {
      results = results.filter((o) => o.sellerType === sellerType.toUpperCase());
    }

    const currentRate = await exchangeRateService.getCurrentRate('USD', 'CDF');

    return sendSuccess(res, results, 'Offres commerciales des vendeurs récupérées avec succès', 200, {
      total: results.length,
      currentExchangeRate: currentRate.rate,
      exchangeRateDate: currentRate.effectiveDate,
    });
  }

  public static async getOfferById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const offer = demoOffers.find((o) => o.id === id);

    if (!offer) {
      return sendError(res, `Offre commerciale '${id}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    return sendSuccess(res, offer);
  }
}

