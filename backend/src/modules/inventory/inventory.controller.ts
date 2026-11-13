import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { demoOffers } from '../offers/offer.controller.js';

export class InventoryController {
  public static async getOfferInventory(req: Request, res: Response): Promise<Response> {
    const { offerId } = req.params;
    const offer = demoOffers.find((o) => o.id === offerId);

    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    return sendSuccess(res, {
      offerId: offer.id,
      productName: offer.productName,
      sellerId: offer.sellerId,
      unit: offer.unit,
      sharedStockQuantity: offer.stockQuantity,
      isAvailable: offer.isAvailable && offer.stockQuantity > 0,
      inventoryRule: 'Stock physique unique partagé entre les ventes en gros et au détail pour éviter tout sur-stockage ou sur-vente.',
    });
  }

  public static async checkAvailability(req: Request, res: Response): Promise<Response> {
    const { offerId, requestedQuantity } = req.body;
    const offer = demoOffers.find((o) => o.id === offerId);

    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    const qty = Number(requestedQuantity);
    const hasEnough = offer.stockQuantity >= qty;

    return sendSuccess(res, {
      offerId: offer.id,
      requestedQuantity: qty,
      availableStock: offer.stockQuantity,
      canFulfill: hasEnough,
    });
  }
}

