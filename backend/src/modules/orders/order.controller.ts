import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { demoOffers } from '../offers/offer.controller.js';
import { Money } from '../../common/money.js';
import { exchangeRateService } from '../../integrations/exchangeRate/ConfigExchangeRateProvider.js';
import { isValidDRCProvince, SupportedCurrency } from '../../config/drc.js';
import crypto from 'node:crypto';

export interface CreateOrderInput {
  items: Array<{
    offerId: string;
    quantity: number;
    saleType: 'RETAIL' | 'WHOLESALE';
  }>;
  currency: SupportedCurrency;
  deliveryProvince: string;
  deliveryCity: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryInstructions?: string;
}

export interface ParentOrderRecord {
  id: string;
  orderNumber: string;
  buyerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'DELIVERED' | 'CANCELLED';
  currency: SupportedCurrency;
  exchangeRateSnapshot: number; // Figé à la création
  totalAmountCdf: number;
  totalAmountUsd: number;
  subOrders: SubOrderRecord[];
  deliveryProvince: string;
  deliveryCity: string;
  recipientName: string;
  recipientPhone: string;
  createdAt: Date;
}

export interface SubOrderRecord {
  id: string;
  subOrderNumber: string;
  parentOrderId: string;
  sellerId: string;
  sellerName: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'IN_DELIVERY' | 'DELIVERED';
  subtotalCdf: number;
  subtotalUsd: number;
  commissionRatePercent: number;
  commissionAmountCdf: number;
  commissionAmountUsd: number;
  payoutAmountCdf: number;
  payoutAmountUsd: number;
  items: Array<{
    offerId: string;
    productName: string;
    quantity: number;
    saleType: 'RETAIL' | 'WHOLESALE';
    unitPriceCdf: number;
    unitPriceUsd: number;
    subtotalCdf: number;
    subtotalUsd: number;
  }>;
  deliveryId: string;
}

// Référentiel des commandes en mémoire (synchronisable avec PostgreSQL)
export const storedOrders = new Map<string, ParentOrderRecord>();

export class OrderController {
  public static async createOrder(req: Request<unknown, unknown, CreateOrderInput>, res: Response): Promise<Response> {
    const {
      items,
      currency = 'CDF',
      deliveryProvince,
      deliveryCity,
      deliveryAddress,
      recipientName,
      recipientPhone,
      deliveryInstructions,
    } = req.body;

    // Règle géographique : RDC uniquement
    if (!isValidDRCProvince(deliveryProvince)) {
      return sendError(
        res,
        `La province de livraison '${deliveryProvince}' n'est pas reconnue en RDC. AgroConnect opère exclusivement dans les 26 provinces de la RDC.`,
        422,
        'INVALID_DRC_REGION'
      );
    }

    if (!items || items.length === 0) {
      return sendError(res, 'Le panier est vide', 400, 'EMPTY_CART');
    }

    // Capture de l'instantané immuable du taux de change
    const rateSnapshot = await exchangeRateService.getCurrentRate('USD', 'CDF');
    const snapshotRate = rateSnapshot.rate;

    const parentOrderId = `ord_${crypto.randomUUID().slice(0, 10)}`;
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `AGC-ORD-${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const buyerId = req.user ? req.user.userId : 'usr_guest_buyer';

    // Regrouper les articles par vendeur pour créer les sous-commandes
    const sellerSubordersMap = new Map<string, SubOrderRecord>();
    let grandTotalCdfScaled = 0n;
    let grandTotalUsdScaled = 0n;

    let subOrderIndex = 1;

    for (const item of items) {
      const offer = demoOffers.find((o) => o.id === item.offerId);
      if (!offer) {
        return sendError(res, `Offre '${item.offerId}' inexistante`, 404, 'OFFER_NOT_FOUND');
      }

      // Règle de stock partagé
      if (offer.stockQuantity < item.quantity) {
        return sendError(
          res,
          `Stock insuffisant pour '${offer.productName}'. Stock disponible : ${offer.stockQuantity} ${offer.unit}, demandé : ${item.quantity}`,
          422,
          'INSUFFICIENT_STOCK'
        );
      }

      const isWholesale = item.saleType === 'WHOLESALE';
      const unitPriceCdf = isWholesale ? (offer.wholesalePriceCdf || offer.retailPriceCdf) : offer.retailPriceCdf;
      const unitPriceUsd = isWholesale ? (offer.wholesalePriceUsd || offer.retailPriceUsd) : offer.retailPriceUsd;

      const unitPriceCdfScaled = Money.toScaled(unitPriceCdf);
      const unitPriceUsdScaled = Money.toScaled(unitPriceUsd);

      const itemTotalCdfScaled = Money.multiply(unitPriceCdfScaled, item.quantity);
      const itemTotalUsdScaled = Money.multiply(unitPriceUsdScaled, item.quantity);

      grandTotalCdfScaled = Money.add(grandTotalCdfScaled, itemTotalCdfScaled);
      grandTotalUsdScaled = Money.add(grandTotalUsdScaled, itemTotalUsdScaled);

      if (!sellerSubordersMap.has(offer.sellerId)) {
        const subOrderId = `sub_${crypto.randomUUID().slice(0, 10)}`;
        const subOrderLetter = String.fromCharCode(64 + subOrderIndex++);
        const subOrderNumber = `${orderNumber}-${subOrderLetter}`;
        const deliveryId = `del_${crypto.randomUUID().slice(0, 10)}`;

        sellerSubordersMap.set(offer.sellerId, {
          id: subOrderId,
          subOrderNumber,
          parentOrderId,
          sellerId: offer.sellerId,
          sellerName: offer.sellerName,
          status: 'PENDING',
          subtotalCdf: 0,
          subtotalUsd: 0,
          commissionRatePercent: 5.0,
          commissionAmountCdf: 0,
          commissionAmountUsd: 0,
          payoutAmountCdf: 0,
          payoutAmountUsd: 0,
          items: [],
          deliveryId,
        });
      }

      const subOrder = sellerSubordersMap.get(offer.sellerId)!;
      subOrder.items.push({
        offerId: offer.id,
        productName: offer.productName,
        quantity: item.quantity,
        saleType: item.saleType,
        unitPriceCdf,
        unitPriceUsd,
        subtotalCdf: Money.fromScaled(itemTotalCdfScaled),
        subtotalUsd: Money.fromScaled(itemTotalUsdScaled),
      });

      subOrder.subtotalCdf += Money.fromScaled(itemTotalCdfScaled);
      subOrder.subtotalUsd += Money.fromScaled(itemTotalUsdScaled);
    }

    // Calcul des commissions et des montants à reverser à chaque vendeur
    const subOrdersList = Array.from(sellerSubordersMap.values()).map((subOrder) => {
      const subtotalCdfScaled = Money.toScaled(subOrder.subtotalCdf);
      const subtotalUsdScaled = Money.toScaled(subOrder.subtotalUsd);

      const commissionCdfScaled = Money.calculateCommission(subtotalCdfScaled, subOrder.commissionRatePercent);
      const commissionUsdScaled = Money.calculateCommission(subtotalUsdScaled, subOrder.commissionRatePercent);

      const payoutCdfScaled = Money.subtract(subtotalCdfScaled, commissionCdfScaled);
      const payoutUsdScaled = Money.subtract(subtotalUsdScaled, commissionUsdScaled);

      return {
        ...subOrder,
        commissionAmountCdf: Money.fromScaled(commissionCdfScaled),
        commissionAmountUsd: Money.fromScaled(commissionUsdScaled),
        payoutAmountCdf: Money.fromScaled(payoutCdfScaled),
        payoutAmountUsd: Money.fromScaled(payoutUsdScaled),
      };
    });

    const parentOrder: ParentOrderRecord = {
      id: parentOrderId,
      orderNumber,
      buyerId,
      status: 'PENDING',
      currency,
      exchangeRateSnapshot: snapshotRate,
      totalAmountCdf: Money.fromScaled(grandTotalCdfScaled),
      totalAmountUsd: Money.fromScaled(grandTotalUsdScaled),
      subOrders: subOrdersList,
      deliveryProvince,
      deliveryCity,
      recipientName,
      recipientPhone,
      createdAt: new Date(),
    };

    storedOrders.set(parentOrderId, parentOrder);

    return sendSuccess(
      res,
      parentOrder,
      'Commande parent et sous-commandes vendeurs générées avec succès',
      201
    );
  }

  public static async getOrderById(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const order = storedOrders.get(id);

    if (!order) {
      return sendError(res, `Commande '${id}' introuvable`, 404, 'ORDER_NOT_FOUND');
    }

    return sendSuccess(res, order);
  }
}
