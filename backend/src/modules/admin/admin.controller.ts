import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { exchangeRateService } from '../../integrations/exchangeRate/ConfigExchangeRateProvider.js';
import { DRC_PROVINCES } from '../../config/drc.js';
import { demoSellers } from '../sellers/seller.controller.js';
import { storedOrders } from '../orders/order.controller.js';

export class AdminController {
  public static async getExchangeRate(_req: Request, res: Response): Promise<Response> {
    const rateSnapshot = await exchangeRateService.getCurrentRate('USD', 'CDF');
    return sendSuccess(res, rateSnapshot, 'Taux de change actuel');
  }

  public static async updateExchangeRate(req: Request<unknown, unknown, { rate: number }>, res: Response): Promise<Response> {
    const { rate } = req.body;
    if (!rate || typeof rate !== 'number' || rate <= 0) {
      return sendError(res, 'Le taux de change doit être un nombre positif', 400, 'INVALID_RATE');
    }

    const updated = await exchangeRateService.updateRate(rate, 'ADMIN_OVERRIDE');
    return sendSuccess(
      res,
      updated,
      `Taux de change actualisé : 1 USD = ${rate} CDF. Ce nouveau taux s'appliquera aux futures commandes sans modifier les transactions historiques.`
    );
  }

  public static async getPlatformStats(_req: Request, res: Response): Promise<Response> {
    return sendSuccess(res, {
      country: 'République Démocratique du Congo',
      supportedProvincesCount: DRC_PROVINCES.length,
      activeSellersCount: demoSellers.length,
      sellersByType: {
        FARMER: demoSellers.filter((s) => s.sellerType === 'FARMER').length,
        RESELLER: demoSellers.filter((s) => s.sellerType === 'RESELLER').length,
        SUPPLIER: demoSellers.filter((s) => s.sellerType === 'SUPPLIER').length,
      },
      ordersCount: storedOrders.size,
      marketplaceIntermediaryRule: 'AgroConnect n\'achète, ne possède, ne stocke ni ne revend aucun produit agricole.',
    }, 'Statistiques globales de la plateforme AgroConnect');
  }
}
