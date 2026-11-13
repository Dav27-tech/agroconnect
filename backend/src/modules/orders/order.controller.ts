import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import {
  AgroStore,
  ParentOrderRecord,
  SubOrderRecord,
  OrderItemRecord,
  DeliveryRecord,
  SubOrderStatus,
} from '../../database/store.js';
import { Money } from '../../common/money.js';
import { isValidDRCProvince, SupportedCurrency } from '../../config/drc.js';
import crypto from 'node:crypto';

export interface CreateOrderInput {
  items: Array<{
    offerId: string;
    quantity: number;
    saleType: 'RETAIL' | 'WHOLESALE';
  }>;
  currency?: SupportedCurrency;
  deliveryProvince: string;
  deliveryCity: string;
  deliveryCommune?: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryInstructions?: string;
}

// Export pour compatibilité
export const storedOrders = AgroStore.parentOrders;

export class OrderController {
  public static async createOrder(req: Request<unknown, unknown, CreateOrderInput>, res: Response): Promise<Response> {
    const {
      items,
      currency = 'CDF',
      deliveryProvince,
      deliveryCity,
      deliveryCommune,
      deliveryAddress,
      recipientName,
      recipientPhone,
      deliveryInstructions,
    } = req.body;

    // Règle d'exclusivité géographique : RDC uniquement
    if (!isValidDRCProvince(deliveryProvince)) {
      return sendError(
        res,
        `La province '${deliveryProvince}' n'est pas reconnue en RDC. AgroConnect opère exclusivement dans les 26 provinces de la RDC.`,
        422,
        'INVALID_DRC_REGION'
      );
    }

    if (!items || items.length === 0) {
      return sendError(res, 'Le panier de commande est vide', 400, 'EMPTY_CART');
    }

    // 1. Capture immuable du taux de change à la seconde exacte de la commande
    const activeRate = AgroStore.getActiveExchangeRate();
    const snapshotRate = activeRate.rate;

    const parentOrderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `AGC-ORD-${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const buyerId = req.user ? req.user.userId : 'usr-guest-buyer';

    // 2. Vérification préalable de la disponibilité de tous les stocks
    for (const item of items) {
      const offer = AgroStore.offers.get(item.offerId);
      if (!offer) {
        return sendError(res, `L'offre '${item.offerId}' n'existe plus`, 404, 'OFFER_NOT_FOUND');
      }

      if (offer.stockQuantity < item.quantity) {
        return sendError(
          res,
          `Stock insuffisant pour '${offer.productName}'. Stock actuel : ${offer.stockQuantity} ${offer.unit}, demandé : ${item.quantity}`,
          422,
          'INSUFFICIENT_STOCK'
        );
      }
    }

    // 3. Regroupement par vendeur et déduction de stock avec audit
    const sellerSubordersMap = new Map<string, SubOrderRecord>();
    const createdOrderItems: OrderItemRecord[] = [];
    let grandTotalCdfScaled = 0n;
    let grandTotalUsdScaled = 0n;
    let subOrderIndex = 1;

    for (const item of items) {
      const offer = AgroStore.offers.get(item.offerId)!;

      const isWholesale = item.saleType === 'WHOLESALE';
      const unitPriceCdf = isWholesale ? offer.wholesalePriceCdf || offer.retailPriceCdf : offer.retailPriceCdf;
      const unitPriceUsd = isWholesale ? offer.wholesalePriceUsd || offer.retailPriceUsd : offer.retailPriceUsd;

      const unitPriceCdfScaled = Money.toScaled(unitPriceCdf);
      const unitPriceUsdScaled = Money.toScaled(unitPriceUsd);

      const itemTotalCdfScaled = Money.multiply(unitPriceCdfScaled, item.quantity);
      const itemTotalUsdScaled = Money.multiply(unitPriceUsdScaled, item.quantity);

      grandTotalCdfScaled = Money.add(grandTotalCdfScaled, itemTotalCdfScaled);
      grandTotalUsdScaled = Money.add(grandTotalUsdScaled, itemTotalUsdScaled);

      if (!sellerSubordersMap.has(offer.sellerId)) {
        const subOrderId = `sub-${parentOrderId}-${subOrderIndex}`;
        const subOrderLetter = String.fromCharCode(64 + subOrderIndex++);
        const subOrderNumber = `${orderNumber}-${subOrderLetter}`;
        const deliveryId = `del-${subOrderId}`;

        sellerSubordersMap.set(offer.sellerId, {
          id: subOrderId,
          subOrderNumber,
          parentOrderId,
          sellerId: offer.sellerId,
          sellerName: offer.sellerName,
          status: 'PENDING',
          subtotalCdf: 0,
          subtotalUsd: 0,
          commissionRate: 5.0, // 5% standard
          commissionAmountCdf: 0,
          commissionAmountUsd: 0,
          payoutAmountCdf: 0,
          payoutAmountUsd: 0,
          payoutStatus: 'PENDING',
          deliveryId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const subOrder = sellerSubordersMap.get(offer.sellerId)!;

      const orderItem: OrderItemRecord = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        subOrderId: subOrder.id,
        offerId: offer.id,
        productName: offer.productName,
        saleType: item.saleType,
        quantity: item.quantity,
        unitPriceCdf,
        unitPriceUsd,
        subtotalCdf: Money.fromScaled(itemTotalCdfScaled),
        subtotalUsd: Money.fromScaled(itemTotalUsdScaled),
        createdAt: new Date(),
      };
      createdOrderItems.push(orderItem);

      subOrder.subtotalCdf += Money.fromScaled(itemTotalCdfScaled);
      subOrder.subtotalUsd += Money.fromScaled(itemTotalUsdScaled);

      // Règle de stock partagé : déduction automatique et audit
      AgroStore.recordStockMovement(
        offer.id,
        offer.sellerId,
        'ORDER_RESERVATION',
        -item.quantity,
        'SUB_ORDER',
        subOrder.id,
        `Réservation commande client ${orderNumber} (${item.saleType})`,
        buyerId
      );
    }

    // 4. Calcul des commissions AgroConnect et des rémunérations dues à chaque vendeur
    const subOrdersList = Array.from(sellerSubordersMap.values()).map((subOrder) => {
      const subtotalCdfScaled = Money.toScaled(subOrder.subtotalCdf);
      const subtotalUsdScaled = Money.toScaled(subOrder.subtotalUsd);

      const commissionCdfScaled = Money.calculateCommission(subtotalCdfScaled, subOrder.commissionRate);
      const commissionUsdScaled = Money.calculateCommission(subtotalUsdScaled, subOrder.commissionRate);

      const payoutCdfScaled = Money.subtract(subtotalCdfScaled, commissionCdfScaled);
      const payoutUsdScaled = Money.subtract(subtotalUsdScaled, commissionUsdScaled);

      subOrder.commissionAmountCdf = Money.fromScaled(commissionCdfScaled);
      subOrder.commissionAmountUsd = Money.fromScaled(commissionUsdScaled);
      subOrder.payoutAmountCdf = Money.fromScaled(payoutCdfScaled);
      subOrder.payoutAmountUsd = Money.fromScaled(payoutUsdScaled);

      // Sauvegarde dans le store
      AgroStore.subOrders.set(subOrder.id, subOrder);

      // Enregistrement financier de commission
      AgroStore.financialRecords.set(subOrder.id, {
        id: `fin-${subOrder.id}`,
        subOrderId: subOrder.id,
        sellerId: subOrder.sellerId,
        parentOrderId,
        grossAmountCdf: subOrder.subtotalCdf,
        grossAmountUsd: subOrder.subtotalUsd,
        commissionRate: subOrder.commissionRate,
        commissionAmountCdf: subOrder.commissionAmountCdf,
        commissionAmountUsd: subOrder.commissionAmountUsd,
        sellerEarningsCdf: subOrder.payoutAmountCdf,
        sellerEarningsUsd: subOrder.payoutAmountUsd,
        exchangeRateApplied: snapshotRate,
        status: 'PENDING',
        recordedAt: new Date(),
      });

      // Création de la livraison indépendante
      const sellerProfile = AgroStore.sellerProfiles.get(subOrder.sellerId);
      const trackingCode = `AGC-TRK-${Math.floor(100000 + Math.random() * 900000)}`;

      const delivery: DeliveryRecord = {
        id: subOrder.deliveryId,
        subOrderId: subOrder.id,
        trackingCode,
        status: 'PENDING',
        pickupProvince: sellerProfile?.province || deliveryProvince,
        pickupCity: sellerProfile?.city || deliveryCity,
        pickupAddress: sellerProfile?.address || 'Point de collecte vendeur',
        dropoffProvince: deliveryProvince,
        dropoffCity: deliveryCity,
        dropoffAddress: deliveryAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      AgroStore.deliveries.set(delivery.id, delivery);

      AgroStore.deliveryHistories.push({
        id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        deliveryId: delivery.id,
        status: 'PENDING',
        notes: `Sous-commande ${subOrder.subOrderNumber} créée, en attente de préparation par ${subOrder.sellerName}`,
        recordedBy: 'SYSTÈME',
        createdAt: new Date(),
      });

      return subOrder;
    });

    createdOrderItems.forEach((item) => AgroStore.orderItems.push(item));

    // 5. Commande Parent Finale
    const parentOrder: ParentOrderRecord = {
      id: parentOrderId,
      orderNumber,
      buyerId,
      status: 'PENDING',
      currency,
      exchangeRateSnapshot: snapshotRate,
      totalItemsCdf: Money.fromScaled(grandTotalCdfScaled),
      totalItemsUsd: Money.fromScaled(grandTotalUsdScaled),
      deliveryFeeCdf: 0,
      deliveryFeeUsd: 0,
      totalAmountCdf: Money.fromScaled(grandTotalCdfScaled),
      totalAmountUsd: Money.fromScaled(grandTotalUsdScaled),
      deliveryProvince,
      deliveryCity,
      deliveryCommune,
      deliveryAddress,
      recipientName,
      recipientPhone,
      deliveryInstructions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    AgroStore.parentOrders.set(parentOrderId, parentOrder);

    // Notification acheteur
    AgroStore.notifications.push({
      id: `notif-${Date.now()}`,
      userId: buyerId,
      title: 'Commande créée avec succès',
      message: `Votre commande ${parentOrder.orderNumber} a été initiée auprès de ${subOrdersList.length} vendeur(s).`,
      isRead: false,
      createdAt: new Date(),
    });

    return sendSuccess(
      res,
      {
        ...parentOrder,
        subOrders: subOrdersList,
        itemsCount: createdOrderItems.length,
      },
      'Commande parent et sous-commandes vendeurs générées avec succès',
      201
    );
  }

  public static async getOrderById(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const order = AgroStore.parentOrders.get(id);

    if (!order) {
      return sendError(res, `Commande '${id}' introuvable`, 404, 'ORDER_NOT_FOUND');
    }

    const subOrders = Array.from(AgroStore.subOrders.values())
      .filter((s) => s.parentOrderId === order.id)
      .map((subOrder) => {
        const items = AgroStore.orderItems.filter((i) => i.subOrderId === subOrder.id);
        const delivery = AgroStore.deliveries.get(subOrder.deliveryId);
        return {
          ...subOrder,
          items,
          delivery,
        };
      });

    return sendSuccess(res, {
      ...order,
      subOrders,
    });
  }

  /**
   * Endpoint vendeur : liste UNIQUEMENT les sous-commandes de ce vendeur
   */
  public static async getSellerSubOrders(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.sellerId;
    const sellerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';

    // Vérification d'appartenance
    if (req.user && !req.user.roles?.includes('ADMIN') && req.user.role !== 'ADMIN') {
      const userSeller = Array.from(AgroStore.sellerProfiles.values()).find((s) => s.userId === req.user!.userId);
      if (!userSeller || userSeller.id !== sellerId) {
        return sendError(
          res,
          'Accès interdit : vous ne pouvez consulter que vos propres sous-commandes',
          403,
          'FORBIDDEN_SELLER_ACCESS'
        );
      }
    }

    const subOrders = Array.from(AgroStore.subOrders.values())
      .filter((s) => s.sellerId === sellerId)
      .map((subOrder) => {
        const items = AgroStore.orderItems.filter((i) => i.subOrderId === subOrder.id);
        const delivery = AgroStore.deliveries.get(subOrder.deliveryId);
        return {
          ...subOrder,
          items,
          delivery,
        };
      });

    return sendSuccess(res, subOrders, 'Sous-commandes vendeur récupérées avec succès', 200, {
      sellerId,
      total: subOrders.length,
    });
  }

  /**
   * Endpoint vendeur : mise à jour du statut de préparation de sa sous-commande
   */
  public static async updateSubOrderStatus(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.subOrderId;
    const subOrderId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { status } = req.body;

    const subOrder = AgroStore.subOrders.get(subOrderId);
    if (!subOrder) {
      return sendError(res, `Sous-commande '${subOrderId}' introuvable`, 404, 'SUB_ORDER_NOT_FOUND');
    }

    // Contrôle d'appartenance
    if (req.user && !req.user.roles?.includes('ADMIN') && req.user.role !== 'ADMIN') {
      const userSeller = Array.from(AgroStore.sellerProfiles.values()).find((s) => s.userId === req.user!.userId);
      if (!userSeller || userSeller.id !== subOrder.sellerId) {
        return sendError(
          res,
          'Accès interdit : vous ne pouvez modifier que le statut de vos propres sous-commandes',
          403,
          'FORBIDDEN_SELLER_ACCESS'
        );
      }
    }

    const validStatuses: SubOrderStatus[] = [
      'CONFIRMED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'IN_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status)) {
      return sendError(res, `Statut '${status}' invalide pour une sous-commande`, 400, 'INVALID_STATUS');
    }

    subOrder.status = status;
    subOrder.updatedAt = new Date();

    return sendSuccess(res, subOrder, `Statut de la sous-commande mis à jour vers '${status}'`);
  }
}
