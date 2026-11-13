import { Request, Response } from 'express';
import { sendSuccess } from '../../common/response.js';
import { exchangeRateService } from '../../integrations/exchangeRate/ConfigExchangeRateProvider.js';

export class FinanceController {
  public static async getCommissionRates(_req: Request, res: Response): Promise<Response> {
    const rateSnapshot = await exchangeRateService.getCurrentRate('USD', 'CDF');

    return sendSuccess(res, {
      platformCommissionPercent: 5.0,
      description: 'Commission prélevée sur chaque sous-commande vendeur pour financer la plateforme et la sécurisation des transactions.',
      currentExchangeRateSnapshot: {
        rate: rateSnapshot.rate,
        currencyPair: 'USD/CDF',
        date: rateSnapshot.effectiveDate,
      },
      payoutRule: 'Les reversements aux vendeurs sont débloqués après confirmation de la livraison (DELIVERED) par le client ou le transporteur.',
    });
  }

  public static async listSellerPayouts(req: Request, res: Response): Promise<Response> {
    const sellerId = req.query.sellerId as string;

    const payouts = [
      {
        id: 'pay-001',
        sellerId: sellerId || 'seller-kikwit-01',
        subOrderNumber: 'AGC-ORD-202611-001-A',
        amountCdf: 33250,
        amountUsd: 11.66,
        status: 'PENDING_DELIVERY_CONFIRMATION',
        createdAt: new Date(),
      },
    ];

    return sendSuccess(res, payouts, 'Relevé des règlements vendeurs');
  }
}

