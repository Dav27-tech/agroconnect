import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { demoOffers } from '../offers/offer.controller.js';
import { Money } from '../../common/money.js';
import { exchangeRateService } from '../../integrations/exchangeRate/ConfigExchangeRateProvider.js';

export interface CartItemInput {
  offerId: string;
  quantity: number;
  saleType: 'RETAIL' | 'WHOLESALE';
}

export class CartController {
  public static async calculateCart(req: Request<unknown, unknown, { items: CartItemInput[] }>, res: Response): Promise<Response> {
    const { items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return sendSuccess(res, {
        sellerGroups: [],
        totalItemsCount: 0,
        totals: {
          totalCdf: 0,
          totalUsd: 0,
        },
      });
    }

    const currentRateSnapshot = await exchangeRateService.getCurrentRate('USD', 'CDF');
    const exchangeRate = currentRateSnapshot.rate;

    // Grouper par vendeur
    const sellerGroupsMap = new Map<string, {
      sellerId: string;
      sellerName: string;
      items: Array<{
        offerId: string;
        productName: string;
        unit: string;
        quantity: number;
        saleType: 'RETAIL' | 'WHOLESALE';
        unitPriceCdf: number;
        unitPriceUsd: number;
        subtotalCdf: number;
        subtotalUsd: number;
      }>;
      sellerSubtotalCdf: number;
      sellerSubtotalUsd: number;
    }>();

    let grandTotalCdfScaled = 0n;
    let grandTotalUsdScaled = 0n;
    let totalItemsCount = 0;

    for (const item of items) {
      const offer = demoOffers.find((o) => o.id === item.offerId);
      if (!offer) {
        return sendError(res, `Offre '${item.offerId}' inexistante dans le panier`, 404, 'OFFER_NOT_FOUND');
      }

      const isWholesale = item.saleType === 'WHOLESALE';
      const minQty = isWholesale ? (offer.wholesaleMinQuantity || 1) : offer.retailMinQuantity;

      if (item.quantity < minQty) {
        return sendError(
          res,
          `La quantité demandée (${item.quantity} ${offer.unit}) pour '${offer.productName}' est inférieure au minimum requis (${minQty} ${offer.unit}) en mode ${isWholesale ? 'Gros' : 'Détail'}`,
          422,
          'MIN_QUANTITY_NOT_MET'
        );
      }

      const unitPriceCdf = isWholesale ? (offer.wholesalePriceCdf || offer.retailPriceCdf) : offer.retailPriceCdf;
      const unitPriceUsd = isWholesale ? (offer.wholesalePriceUsd || offer.retailPriceUsd) : offer.retailPriceUsd;

      const unitPriceCdfScaled = Money.toScaled(unitPriceCdf);
      const unitPriceUsdScaled = Money.toScaled(unitPriceUsd);

      const itemTotalCdfScaled = Money.multiply(unitPriceCdfScaled, item.quantity);
      const itemTotalUsdScaled = Money.multiply(unitPriceUsdScaled, item.quantity);

      grandTotalCdfScaled = Money.add(grandTotalCdfScaled, itemTotalCdfScaled);
      grandTotalUsdScaled = Money.add(grandTotalUsdScaled, itemTotalUsdScaled);
      totalItemsCount += item.quantity;

      if (!sellerGroupsMap.has(offer.sellerId)) {
        sellerGroupsMap.set(offer.sellerId, {
          sellerId: offer.sellerId,
          sellerName: offer.sellerName,
          items: [],
          sellerSubtotalCdf: 0,
          sellerSubtotalUsd: 0,
        });
      }

      const group = sellerGroupsMap.get(offer.sellerId)!;
      group.items.push({
        offerId: offer.id,
        productName: offer.productName,
        unit: offer.unit,
        quantity: item.quantity,
        saleType: item.saleType,
        unitPriceCdf,
        unitPriceUsd,
        subtotalCdf: Money.fromScaled(itemTotalCdfScaled),
        subtotalUsd: Money.fromScaled(itemTotalUsdScaled),
      });

      group.sellerSubtotalCdf += Money.fromScaled(itemTotalCdfScaled);
      group.sellerSubtotalUsd += Money.fromScaled(itemTotalUsdScaled);
    }

    return sendSuccess(res, {
      exchangeRateSnapshot: {
        rate: exchangeRate,
        baseCurrency: 'USD',
        targetCurrency: 'CDF',
      },
      sellerGroups: Array.from(sellerGroupsMap.values()),
      totalDistinctSellers: sellerGroupsMap.size,
      totalItemsCount,
      totals: {
        totalCdf: Money.fromScaled(grandTotalCdfScaled),
        totalUsd: Money.fromScaled(grandTotalUsdScaled),
      },
    }, 'Calcul du panier multi-vendeurs effectué avec succès');
  }
}
