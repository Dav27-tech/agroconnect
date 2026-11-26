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
import { isValidDRCProvince } from '../../config/drc.js';
import crypto from 'node:crypto';
import { dbManager } from '../../database/client.js';
import { publishOrderCreated, publishOrderUpdated } from '../../common/realtime.js';
import type { InventoryUpdate } from '../../common/realtime.js';
import { getSellerAccountActiveStatus } from '../../common/seller-status.js';

class OrderCreationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'OrderCreationError';
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export interface CreateOrderInput {
  items: Array<{
    offerId: string;
    quantity: number;
    saleType: 'RETAIL' | 'WHOLESALE';
  }>;
  currency?: 'CDF';
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

function subOrderForApi(subOrder: SubOrderRecord) {
  const {
    deliveryId: _deliveryId,
    subtotalUsd: _subtotalUsd,
    commissionAmountUsd: _commissionAmountUsd,
    payoutAmountUsd: _payoutAmountUsd,
    ...publicSubOrder
  } = subOrder;
  return publicSubOrder;
}

function orderItemForApi(item: OrderItemRecord) {
  const { unitPriceUsd: _unitPriceUsd, subtotalUsd: _subtotalUsd, ...publicItem } = item;
  return publicItem;
}

function orderForApi(order: ParentOrderRecord) {
  const {
    totalItemsUsd: _totalItemsUsd,
    deliveryFeeUsd: _deliveryFeeUsd,
    totalAmountUsd: _totalAmountUsd,
    ...publicOrder
  } = order;
  return publicOrder;
}

export class OrderController {
  public static async getMyOrders(req: Request, res: Response): Promise<Response> {
    const result = await dbManager.query(
      `SELECT p."id", p."orderNumber", p."buyerId", p."status", p."currency",
              p."totalItemsCdf", p."deliveryFeeCdf", p."totalAmountCdf", p."deliveryProvince", p."deliveryCity",
              p."deliveryCommune", p."deliveryAddress", p."recipientName", p."recipientPhone",
              p."deliveryInstructions", p."createdAt",
              COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                'id', so."id", 'subOrderNumber', so."subOrderNumber", 'parentOrderId', so."parentOrderId",
                'sellerId', so."sellerId", 'sellerName', s."businessName", 'status', so."status",
                'subtotalCdf', so."subtotalCdf",
                'commissionRate', so."commissionRate", 'commissionAmountCdf', so."commissionAmountCdf",
                'payoutAmountCdf', so."payoutAmountCdf", 'payoutStatus', so."payoutStatus",
                'deliveryStatus', d."status", 'deliveredAt', d."deliveredAt"
              )) FILTER (WHERE so."id" IS NOT NULL), '[]'::json) AS "subOrders"
       FROM "parent_orders" p
       LEFT JOIN "sub_orders" so ON so."parentOrderId" = p."id"
       LEFT JOIN "seller_profiles" s ON s."id" = so."sellerId"
       LEFT JOIN "deliveries" d ON d."subOrderId" = so."id"
       WHERE p."buyerId" = $1
       GROUP BY p."id"
       ORDER BY p."createdAt" DESC`,
      [req.user!.userId]
    );

    return sendSuccess(res, result.rows.map((order) => ({
      ...order,
      totalItemsCdf: Number(order.totalItemsCdf),
      deliveryFeeCdf: Number(order.deliveryFeeCdf),
      totalAmountCdf: Number(order.totalAmountCdf),
      subOrders: order.subOrders.map((subOrder: Record<string, unknown>) => Object.fromEntries(
        Object.entries(subOrder).map(([key, value]) => [key, typeof value === 'string' && key !== 'id' && (key.endsWith('Cdf') || key === 'commissionRate') ? Number(value) : value])
      )),
    })), 'Commandes du compte récupérées depuis la base de données');
  }

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

    const parentOrderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `AGC-ORD-${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const buyerId = req.user!.userId;
    const idempotencyKey = req.get('Idempotency-Key');
    if (!idempotencyKey || !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      return sendError(res, 'Un en-tête Idempotency-Key valide est requis', 400, 'INVALID_IDEMPOTENCY_KEY');
    }

    const idempotencyScope = `${buyerId}:${idempotencyKey}`;
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
    const previousRequest = AgroStore.orderIdempotency.get(idempotencyScope);
    if (previousRequest && previousRequest.requestHash !== requestHash) {
      return sendError(res, 'Cette clé idempotente a déjà été utilisée avec un contenu différent', 409, 'IDEMPOTENCY_KEY_REUSED');
    }

    if (previousRequest) {
      const previousOrder = AgroStore.parentOrders.get(previousRequest.orderId);
      if (!previousOrder) {
        return sendError(res, 'La requête de commande est en cours de récupération', 409, 'ORDER_RETRY_IN_PROGRESS');
      }
      const previousSubOrders = Array.from(AgroStore.subOrders.values())
        .filter((subOrder) => subOrder.parentOrderId === previousOrder.id)
        .map((subOrder) => ({
          ...subOrderForApi(subOrder),
          items: AgroStore.orderItems
            .filter((item) => item.subOrderId === subOrder.id)
            .map(orderItemForApi),
        }));
      return sendSuccess(res, {
        ...orderForApi(previousOrder),
        subOrders: previousSubOrders,
        itemsCount: previousSubOrders.reduce((count, subOrder) => count + subOrder.items.length, 0),
      }, 'Commande déjà créée pour cette clé idempotente', 200);
    }

    if (items.every((item) => isUuid(item.offerId))) {
      return OrderController.createDatabaseOrder(req, res, {
        items,
        currency,
        deliveryProvince,
        deliveryCity,
        deliveryCommune,
        deliveryAddress,
        recipientName,
        recipientPhone,
        deliveryInstructions,
        idempotencyKey,
        requestHash,
      });
    }
    // 2. Vérification préalable de la disponibilité de tous les stocks
    const requestedByOffer = new Map<string, number>();
    for (const item of items) {
      requestedByOffer.set(item.offerId, (requestedByOffer.get(item.offerId) || 0) + item.quantity);
    }

    for (const [offerId, requestedQuantity] of requestedByOffer) {
      const offer = AgroStore.offers.get(offerId);
      if (!offer) {
        return sendError(res, `L'offre '${offerId}' n'existe plus`, 404, 'OFFER_NOT_FOUND');
      }
      if (req.user?.sellerId && req.user.sellerId === offer.sellerId) {
        return sendError(res, 'Vous ne pouvez pas acheter votre propre marchandise.', 403, 'OWN_OFFER_PURCHASE');
      }
      if (!offer.isAvailable) {
        return sendError(res, `L’offre '${offer.productName}' n’est plus disponible.`, 404, 'OFFER_NOT_AVAILABLE');
      }
      if (await getSellerAccountActiveStatus(offer.sellerId) === false) {
        return sendError(res, `Le vendeur de l’offre '${offer.productName}' est désactivé.`, 403, 'SELLER_DISABLED');
      }

      if (offer.stockQuantity < requestedQuantity) {
        return sendError(
          res,
          `Stock insuffisant pour '${offer.productName}'. Stock actuel : ${offer.stockQuantity} ${offer.unit}, demandé : ${requestedQuantity}`,
          422,
          'INSUFFICIENT_STOCK'
        );
      }
    }

    // 3. Regroupement par vendeur et déduction de stock avec audit
    const sellerSubordersMap = new Map<string, SubOrderRecord>();
    const createdOrderItems: OrderItemRecord[] = [];
    let grandTotalCdfScaled = 0n;
    let subOrderIndex = 1;

    for (const item of items) {
      const offer = AgroStore.offers.get(item.offerId)!;

      const isWholesale = item.saleType === 'WHOLESALE';
      const unitPriceCdf = isWholesale ? offer.wholesalePriceCdf || offer.retailPriceCdf : offer.retailPriceCdf;

      const unitPriceCdfScaled = Money.toScaled(unitPriceCdf);

      const itemTotalCdfScaled = Money.multiply(unitPriceCdfScaled, item.quantity);

      grandTotalCdfScaled = Money.add(grandTotalCdfScaled, itemTotalCdfScaled);

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
          commissionRate: AgroStore.commissionRatePercent,
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
        unitPriceUsd: 0,
        subtotalCdf: Money.fromScaled(itemTotalCdfScaled),
        subtotalUsd: 0,
        createdAt: new Date(),
      };
      createdOrderItems.push(orderItem);

      subOrder.subtotalCdf += Money.fromScaled(itemTotalCdfScaled);

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

      const commissionCdfScaled = Money.calculateCommission(subtotalCdfScaled, subOrder.commissionRate);

      const payoutCdfScaled = Money.subtract(subtotalCdfScaled, commissionCdfScaled);

      subOrder.commissionAmountCdf = Money.fromScaled(commissionCdfScaled);
      subOrder.commissionAmountUsd = 0;
      subOrder.payoutAmountCdf = Money.fromScaled(payoutCdfScaled);
      subOrder.payoutAmountUsd = 0;

      // Sauvegarde dans le store
      AgroStore.subOrders.set(subOrder.id, subOrder);

      // Enregistrement financier de commission
      AgroStore.financialRecords.set(subOrder.id, {
        id: `fin-${subOrder.id}`,
        subOrderId: subOrder.id,
        sellerId: subOrder.sellerId,
        parentOrderId,
        grossAmountCdf: subOrder.subtotalCdf,
        grossAmountUsd: 0,
        commissionRate: subOrder.commissionRate,
        commissionAmountCdf: subOrder.commissionAmountCdf,
        commissionAmountUsd: 0,
        sellerEarningsCdf: subOrder.payoutAmountCdf,
        sellerEarningsUsd: 0,
        status: 'PENDING',
        recordedAt: new Date(),
      });

      // Création de la livraison indépendante
      const sellerProfile = AgroStore.sellerProfiles.get(subOrder.sellerId);
      const trackingCode = `AGC-TRK-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

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
      totalItemsCdf: Money.fromScaled(grandTotalCdfScaled),
      totalItemsUsd: 0,
      deliveryFeeCdf: 0,
      deliveryFeeUsd: 0,
      totalAmountCdf: Money.fromScaled(grandTotalCdfScaled),
      totalAmountUsd: 0,
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
    AgroStore.orderIdempotency.set(idempotencyScope, { orderId: parentOrderId, requestHash });

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
        ...orderForApi(parentOrder),
        subOrders: subOrdersList.map(subOrderForApi),
        itemsCount: createdOrderItems.length,
      },
      'Commande parent et sous-commandes vendeurs générées avec succès',
      201
    );
  }

  private static async createDatabaseOrder(
    req: Request<unknown, unknown, CreateOrderInput>,
    res: Response,
    input: CreateOrderInput & { idempotencyKey: string; requestHash: string }
  ): Promise<Response> {
    const buyerId = req.user!.userId;
    const existing = await dbManager.query<{ id: string; idempotencyHash: string | null }>(
      `SELECT "id", "idempotencyHash" FROM "parent_orders"
       WHERE "buyerId" = $1 AND "idempotencyKey" = $2 LIMIT 1`,
      [buyerId, input.idempotencyKey]
    );
    if (existing.rows[0]) {
      if (existing.rows[0].idempotencyHash !== input.requestHash) {
        return sendError(res, 'Cette clé idempotente a déjà été utilisée avec un contenu différent', 409, 'IDEMPOTENCY_KEY_REUSED');
      }
      const previous = await dbManager.query(
        `SELECT p."id", p."orderNumber", p."status", p."totalAmountCdf",
                COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                  'id', so."id", 'sellerId', so."sellerId", 'sellerName', s."businessName",
                  'status', so."status", 'subtotalCdf', so."subtotalCdf"
                )) FILTER (WHERE so."id" IS NOT NULL), '[]'::json) AS "subOrders"
         FROM "parent_orders" p
         LEFT JOIN "sub_orders" so ON so."parentOrderId" = p."id"
         LEFT JOIN "seller_profiles" s ON s."id" = so."sellerId
         WHERE p."id" = $1 GROUP BY p."id"`,
        [existing.rows[0].id]
      );
      return sendSuccess(res, previous.rows[0], 'Commande déjà créée pour cette clé idempotente', 200);
    }

    const requestedByOffer = new Map<string, number>();
    input.items.forEach((item) => requestedByOffer.set(
      item.offerId,
      (requestedByOffer.get(item.offerId) ?? 0) + item.quantity
    ));
    const parentOrderId = crypto.randomUUID();
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const orderNumber = `AGC-ORD-${datePrefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    let order: {
      duplicate: boolean;
      response?: {
        id: string;
        orderNumber: string;
        buyerId: string;
        subOrders: Array<{ id: string; sellerId: string; status: string }>;
        [key: string]: unknown;
      };
      inventoryUpdates?: InventoryUpdate[];
    };
    try {
      order = await dbManager.transaction(async (client) => {
        const offerIds = Array.from(requestedByOffer.keys()).sort();
        const offersResult = await client.query<{
          id: string;
          sellerId: string;
          sellerName: string;
          sellerProvince: string;
          sellerCity: string;
          sellerAddress: string | null;
          sellerActive: boolean;
          productName: string;
          stockQuantity: string;
          isAvailable: boolean;
          retailPriceCdf: string;
          wholesalePriceCdf: string | null;
        }>(
          `SELECT o."id", o."sellerId", s."businessName" AS "sellerName",
                  s."province" AS "sellerProvince", s."city" AS "sellerCity", s."address" AS "sellerAddress",
                  u."isActive" AS "sellerActive", p."name" AS "productName",
                  o."stockQuantity"::text AS "stockQuantity", o."isAvailable",
                  o."retailPriceCdf"::text AS "retailPriceCdf",
                  o."wholesalePriceCdf"::text AS "wholesalePriceCdf"
           FROM "offers" o
           JOIN "seller_profiles" s ON s."id" = o."sellerId"
           JOIN "users" u ON u."id" = s."userId"
           JOIN "products" p ON p."id" = o."productId"
           WHERE o."id" = ANY($1::uuid[]) ORDER BY o."id" FOR UPDATE OF o`,
          [offerIds]
        );
        if (offersResult.rows.length !== offerIds.length) {
          throw new OrderCreationError('Une ou plusieurs offres n’existent plus', 404, 'OFFER_NOT_FOUND');
        }
        const offers = new Map(offersResult.rows.map((offer) => [offer.id, offer]));

        for (const [offerId, quantity] of requestedByOffer) {
          const offer = offers.get(offerId)!;
          if (offer.sellerId === req.user?.sellerId) {
            throw new OrderCreationError('Vous ne pouvez pas acheter votre propre marchandise.', 403, 'OWN_OFFER_PURCHASE');
          }
          if (!offer.sellerActive) throw new OrderCreationError('Le compte vendeur est désactivé', 403, 'SELLER_DISABLED');
          if (!offer.isAvailable) throw new OrderCreationError(`L’offre '${offer.productName}' n’est plus disponible`, 404, 'OFFER_NOT_AVAILABLE');
          if (Number(offer.stockQuantity) < quantity) {
            throw new OrderCreationError(`Stock insuffisant pour '${offer.productName}'`, 422, 'INSUFFICIENT_STOCK');
          }
        }

        const sellerGroups = new Map<string, {
          seller: typeof offersResult.rows[number];
          lines: Array<{ offer: typeof offersResult.rows[number]; item: CreateOrderInput['items'][number] }>;
          subtotal: bigint;
        }>();
        let total = 0n;
        for (const item of input.items) {
          const offer = offers.get(item.offerId)!;
          const unitPrice = item.saleType === 'WHOLESALE'
            ? offer.wholesalePriceCdf ?? offer.retailPriceCdf
            : offer.retailPriceCdf;
          const lineTotal = Money.multiply(Money.toScaled(unitPrice), item.quantity);
          total = Money.add(total, lineTotal);
          const group = sellerGroups.get(offer.sellerId) ?? { seller: offer, lines: [], subtotal: 0n };
          group.lines.push({ offer, item });
          group.subtotal = Money.add(group.subtotal, lineTotal);
          sellerGroups.set(offer.sellerId, group);
        }

        const totalCdf = Money.fromScaled(total);
        const commissionSettings = await client.query<{ rate: string }>(
          `SELECT "commissionRatePercent"::text AS "rate"
           FROM "platform_settings" WHERE "id" = 'singleton' LIMIT 1`
        );
        if (!commissionSettings.rows[0]) {
          throw new OrderCreationError('Le taux de commission AgroConnect n’est pas configuré.', 503, 'COMMISSION_RATE_NOT_CONFIGURED');
        }
        const commissionRate = Number(commissionSettings.rows[0].rate);
        if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate >= 100) {
          throw new OrderCreationError('Le taux de commission AgroConnect configuré est invalide.', 503, 'INVALID_COMMISSION_RATE');
        }
        const parentInsert = await client.query(
          `INSERT INTO "parent_orders"
             ("id", "orderNumber", "idempotencyKey", "idempotencyHash", "buyerId", "exchangeRateSnapshot",
              "currency", "totalItemsCdf", "totalItemsUsd", "deliveryFeeCdf", "deliveryFeeUsd",
              "totalAmountCdf", "totalAmountUsd", "deliveryProvince", "deliveryCity", "deliveryCommune",
              "deliveryAddress", "recipientName", "recipientPhone", "deliveryInstructions")
           VALUES ($1, $2, $3, $4, $5, 1, 'CDF', $6, 0, 0, 0, $6, 0, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT ("buyerId", "idempotencyKey") DO NOTHING
           RETURNING "id"`,
          [
            parentOrderId, orderNumber, input.idempotencyKey, input.requestHash, buyerId,
            totalCdf, input.deliveryProvince, input.deliveryCity, input.deliveryCommune ?? null,
            input.deliveryAddress, input.recipientName, input.recipientPhone, input.deliveryInstructions ?? null,
          ]
        );
        if (!parentInsert.rows[0]) return { duplicate: true };

        const subOrders: Array<{ id: string; sellerId: string; status: string; [key: string]: unknown }> = [];
        const inventoryUpdates: InventoryUpdate[] = [];
        let sellerIndex = 0;
        for (const [sellerId, group] of sellerGroups) {
          sellerIndex += 1;
          const subOrderId = crypto.randomUUID();
          const subOrderNumber = `${orderNumber}-${String.fromCharCode(64 + sellerIndex)}`;
          const subtotalCdf = Money.fromScaled(group.subtotal);
          const commissionCdf = Money.fromScaled(Money.calculateCommission(group.subtotal, commissionRate));
          const sellerEarningsCdf = Money.fromScaled(Money.subtract(group.subtotal, Money.toScaled(commissionCdf)));
          await client.query(
            `INSERT INTO "sub_orders"
               ("id", "subOrderNumber", "parentOrderId", "sellerId", "status",
                "subtotalCdf", "subtotalUsd", "commissionRate", "commissionAmountCdf",
                "commissionAmountUsd", "payoutAmountCdf", "payoutAmountUsd", "payoutStatus")
             VALUES ($1, $2, $3, $4, 'PENDING', $5, 0, $6, $7, 0, $8, 0, 'PENDING')`,
            [subOrderId, subOrderNumber, parentOrderId, sellerId, subtotalCdf, commissionRate, commissionCdf, sellerEarningsCdf]
          );
          await client.query(
            `INSERT INTO "deliveries"
               ("subOrderId", "trackingCode", "pickupProvince", "pickupCity", "pickupAddress",
                "dropoffProvince", "dropoffCity", "dropoffAddress")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              subOrderId,
              `AGC-TRK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
              group.seller.sellerProvince,
              group.seller.sellerCity,
              group.seller.sellerAddress ?? 'Point de collecte vendeur',
              input.deliveryProvince,
              input.deliveryCity,
              input.deliveryAddress,
            ]
          );

          for (const { offer, item } of group.lines) {
            const unitPrice = item.saleType === 'WHOLESALE'
              ? offer.wholesalePriceCdf ?? offer.retailPriceCdf
              : offer.retailPriceCdf;
            const lineTotal = Money.fromScaled(Money.multiply(Money.toScaled(unitPrice), item.quantity));
            await client.query(
              `INSERT INTO "order_items"
                 ("subOrderId", "offerId", "saleType", "quantity", "unitPriceCdf", "unitPriceUsd", "subtotalCdf", "subtotalUsd")
               VALUES ($1, $2, $3::"SaleType", $4, $5, 0, $6, 0)`,
              [subOrderId, offer.id, item.saleType, item.quantity, unitPrice, lineTotal]
            );
          }

          for (const [offerId, quantity] of requestedByOffer) {
            const offer = offers.get(offerId)!;
            if (offer.sellerId !== sellerId) continue;
            const previousStock = Number(offer.stockQuantity);
            const nextStock = previousStock - quantity;
            const updatedOffer = await client.query<{ stockQuantity: string; isAvailable: boolean }>(
              `UPDATE "offers" SET "stockQuantity" = $2::numeric, "isAvailable" = ($2::numeric > 0::numeric), "updatedAt" = NOW()
               WHERE "id" = $1
               RETURNING "stockQuantity"::text AS "stockQuantity", "isAvailable"`,
              [offerId, nextStock]
            );
            inventoryUpdates.push({
              offerId,
              stockQuantity: Number(updatedOffer.rows[0].stockQuantity),
              isAvailable: updatedOffer.rows[0].isAvailable,
            });
            await client.query(
              `INSERT INTO "stock_movements"
                 ("offerId", "sellerId", "movementType", "quantityChange", "previousStock", "newStock",
                  "referenceType", "referenceId", "notes", "createdByUserId")
               VALUES ($1, $2, 'ORDER_RESERVATION', $3, $4, $5, 'SUB_ORDER', $6, $7, $8)`,
              [offerId, sellerId, -quantity, previousStock, nextStock, subOrderId, `Réservation ${orderNumber}`, buyerId]
            );
          }
          await client.query(
            `INSERT INTO "financial_records"
               ("subOrderId", "sellerId", "parentOrderId", "grossAmountCdf", "grossAmountUsd",
                "commissionRate", "commissionAmountCdf", "commissionAmountUsd", "sellerEarningsCdf",
                "sellerEarningsUsd", "exchangeRateApplied", "status")
             VALUES ($1, $2, $3, $4, 0, $5, $6, 0, $7, 0, 1, 'PENDING')`,
            [subOrderId, sellerId, parentOrderId, subtotalCdf, commissionRate, commissionCdf, sellerEarningsCdf]
          );
          subOrders.push({
            id: subOrderId,
            subOrderNumber,
            parentOrderId,
            sellerId,
            sellerName: group.seller.sellerName,
            status: 'PENDING',
            subtotalCdf,
            commissionRate,
            commissionAmountCdf: commissionCdf,
            payoutAmountCdf: sellerEarningsCdf,
            payoutStatus: 'PENDING',
            items: group.lines.map(({ offer, item }) => ({
              offerId: offer.id,
              productName: offer.productName,
              saleType: item.saleType,
              quantity: item.quantity,
            })),
          });
        }
        return {
          duplicate: false,
          response: {
            id: parentOrderId,
            orderNumber,
            buyerId,
            status: 'PENDING',
            currency: 'CDF',
            totalItemsCdf: totalCdf,
            deliveryFeeCdf: 0,
            totalAmountCdf: totalCdf,
            deliveryProvince: input.deliveryProvince,
            deliveryCity: input.deliveryCity,
            deliveryCommune: input.deliveryCommune,
            deliveryAddress: input.deliveryAddress,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            deliveryInstructions: input.deliveryInstructions,
            subOrders,
            itemsCount: input.items.length,
          },
          inventoryUpdates,
        };
      });
    } catch (error) {
      if (error instanceof OrderCreationError) {
        return sendError(res, error.message, error.statusCode, error.code);
      }
      throw error;
    }

    if (order.duplicate) {
      const duplicate = await dbManager.query<{ id: string; idempotencyHash: string | null }>(
        `SELECT "id", "idempotencyHash" FROM "parent_orders"
         WHERE "buyerId" = $1 AND "idempotencyKey" = $2 LIMIT 1`,
        [buyerId, input.idempotencyKey]
      );
      const previousOrder = duplicate.rows[0];
      if (!previousOrder) return sendError(res, 'La requête de commande est en cours de récupération', 409, 'ORDER_RETRY_IN_PROGRESS');
      if (previousOrder.idempotencyHash !== input.requestHash) {
        return sendError(res, 'Cette clé idempotente a déjà été utilisée avec un contenu différent', 409, 'IDEMPOTENCY_KEY_REUSED');
      }
      return sendSuccess(res, { id: previousOrder.id }, 'Commande déjà créée pour cette clé idempotente', 200);
    }
    if (order.response) {
      publishOrderCreated({
        orderId: order.response.id,
        orderNumber: order.response.orderNumber,
        buyerId: order.response.buyerId,
        subOrders: order.response.subOrders,
      }, order.inventoryUpdates ?? []);
    }
    return sendSuccess(res, order.response, 'Commande enregistrée et stock réservé', 201);
  }

  public static async getOrderById(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    if (isUuid(id)) {
      const persisted = await dbManager.query<{
        id: string;
        buyerId: string;
        orderNumber: string;
        status: string;
        currency: string;
        totalItemsCdf: string;
        deliveryFeeCdf: string;
        totalAmountCdf: string;
        deliveryProvince: string;
        deliveryCity: string;
        deliveryCommune: string | null;
        deliveryAddress: string;
        recipientName: string;
        recipientPhone: string;
        deliveryInstructions: string | null;
        createdAt: Date;
      }>(
        `SELECT "id", "buyerId", "orderNumber", "status", "currency",
                "totalItemsCdf"::text AS "totalItemsCdf", "deliveryFeeCdf"::text AS "deliveryFeeCdf",
                "totalAmountCdf"::text AS "totalAmountCdf", "deliveryProvince", "deliveryCity",
                "deliveryCommune", "deliveryAddress", "recipientName", "recipientPhone",
                "deliveryInstructions", "createdAt"
         FROM "parent_orders" WHERE "id" = $1 LIMIT 1`,
        [id]
      );
      const storedOrder = persisted.rows[0];
      if (storedOrder) {
        const isAdmin = (req.user?.roles?.includes('ADMIN') || req.user?.role === 'ADMIN');
        if (!isAdmin && storedOrder.buyerId !== req.user?.userId) {
          return sendError(res, 'Accès interdit à cette commande', 403, 'FORBIDDEN_ORDER_ACCESS');
        }
        const subOrders = await dbManager.query(
          `SELECT so."id", so."subOrderNumber", so."parentOrderId", so."sellerId",
                  s."businessName" AS "sellerName", so."status", so."subtotalCdf",
                  so."commissionRate", so."commissionAmountCdf", so."payoutAmountCdf",
                  so."payoutStatus", d."status" AS "deliveryStatus",
                  d."collectionMethod", d."collectedAmountCdf", d."platformDepositReceivedAt",
                  fr."status" AS "sellerPayoutStatus", fr."paidAt" AS "sellerConfirmedAt",
                  COALESCE((
                    SELECT JSON_AGG(JSON_BUILD_OBJECT(
                      'id', oi."id", 'subOrderId', oi."subOrderId", 'offerId', oi."offerId",
                      'productName', p."name", 'saleType', oi."saleType", 'quantity', oi."quantity",
                      'unitPriceCdf', oi."unitPriceCdf", 'subtotalCdf', oi."subtotalCdf"
                    ) ORDER BY oi."createdAt")
                    FROM "order_items" oi
                    JOIN "offers" o ON o."id" = oi."offerId"
                    JOIN "products" p ON p."id" = o."productId"
                    WHERE oi."subOrderId" = so."id"
                  ), '[]'::json) AS "items"
           FROM "sub_orders" so JOIN "seller_profiles" s ON s."id" = so."sellerId"
           LEFT JOIN "deliveries" d ON d."subOrderId" = so."id"
           LEFT JOIN "financial_records" fr ON fr."subOrderId" = so."id"
           WHERE so."parentOrderId" = $1 ORDER BY so."createdAt"`,
          [id]
        );
        return sendSuccess(res, {
          ...storedOrder,
          totalItemsCdf: Number(storedOrder.totalItemsCdf),
          deliveryFeeCdf: Number(storedOrder.deliveryFeeCdf),
          totalAmountCdf: Number(storedOrder.totalAmountCdf),
          subOrders: subOrders.rows.map((subOrder) => ({
            ...subOrder,
            subtotalCdf: Number(subOrder.subtotalCdf),
            commissionRate: Number(subOrder.commissionRate),
            commissionAmountCdf: Number(subOrder.commissionAmountCdf),
            payoutAmountCdf: Number(subOrder.payoutAmountCdf),
            collectedAmountCdf: subOrder.collectedAmountCdf === null ? null : Number(subOrder.collectedAmountCdf),
          })),
        });
      }
    }

    const order = AgroStore.parentOrders.get(id);

    if (!order) {
      return sendError(res, `Commande '${id}' introuvable`, 404, 'ORDER_NOT_FOUND');
    }

    const isAdmin = req.user?.roles?.includes('ADMIN') || req.user?.role === 'ADMIN';
    if (!isAdmin && order.buyerId !== req.user?.userId) {
      return sendError(res, 'Accès interdit à cette commande', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    const subOrders = Array.from(AgroStore.subOrders.values())
      .filter((s) => s.parentOrderId === order.id)
      .map((subOrder) => {
        const items = AgroStore.orderItems
          .filter((i) => i.subOrderId === subOrder.id)
          .map(orderItemForApi);
        return {
          ...subOrderForApi(subOrder),
          items,
        };
      });

    return sendSuccess(res, {
      ...orderForApi(order),
      subOrders,
    });
  }

  /**
   * Endpoint vendeur : liste UNIQUEMENT les sous-commandes de ce vendeur
   */
  public static async getSellerSubOrders(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.sellerId;
    const sellerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';

    const isAdmin = req.user?.roles?.includes('ADMIN') || req.user?.role === 'ADMIN';
    if (!isAdmin && req.user?.sellerId !== sellerId) {
      return sendError(
        res,
        'Accès interdit : vous ne pouvez consulter que vos propres sous-commandes',
        403,
        'FORBIDDEN_SELLER_ACCESS'
      );
    }

    const persisted = await dbManager.query<{
      id: string;
      subOrderNumber: string;
      parentOrderId: string;
      sellerId: string;
      sellerName: string;
      status: string;
      subtotalCdf: string;
      commissionRate: string;
      commissionAmountCdf: string;
      payoutAmountCdf: string;
      payoutStatus: string;
      deliveryStatus: string | null;
      collectionMethod: string | null;
      collectedAmountCdf: string | null;
      platformDepositReceivedAt: Date | null;
      sellerPayoutStatus: string | null;
      sellerConfirmedAt: Date | null;
      items: Array<Record<string, unknown>>;
    }>(
      `SELECT so."id", so."subOrderNumber", so."parentOrderId", so."sellerId",
              s."businessName" AS "sellerName", so."status",
              so."subtotalCdf"::text AS "subtotalCdf",
              so."commissionRate"::text AS "commissionRate",
              so."commissionAmountCdf"::text AS "commissionAmountCdf",
              so."payoutAmountCdf"::text AS "payoutAmountCdf",
              so."payoutStatus",
              d."status" AS "deliveryStatus", d."collectionMethod"::text AS "collectionMethod",
              d."collectedAmountCdf"::text AS "collectedAmountCdf", d."platformDepositReceivedAt",
              fr."status" AS "sellerPayoutStatus", fr."paidAt" AS "sellerConfirmedAt",
              COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'id', oi."id", 'subOrderId', oi."subOrderId", 'offerId', oi."offerId",
                  'productName', p."name", 'saleType', oi."saleType", 'quantity', oi."quantity",
                  'unitPriceCdf', oi."unitPriceCdf", 'subtotalCdf', oi."subtotalCdf"
                ) ORDER BY oi."createdAt")
                FROM "order_items" oi
                JOIN "offers" o ON o."id" = oi."offerId"
                JOIN "products" p ON p."id" = o."productId"
                WHERE oi."subOrderId" = so."id"
              ), '[]'::json) AS "items"
       FROM "sub_orders" so
       JOIN "seller_profiles" s ON s."id" = so."sellerId"
       LEFT JOIN "deliveries" d ON d."subOrderId" = so."id"
       LEFT JOIN "financial_records" fr ON fr."subOrderId" = so."id"
       WHERE so."sellerId"::text = $1
       ORDER BY so."createdAt" DESC`,
      [sellerId]
    );
    if (persisted.rows.length) {
      const dbSubOrders = persisted.rows.map((subOrder) => ({
        ...subOrder,
        subtotalCdf: Number(subOrder.subtotalCdf),
        commissionRate: Number(subOrder.commissionRate),
        commissionAmountCdf: Number(subOrder.commissionAmountCdf),
        payoutAmountCdf: Number(subOrder.payoutAmountCdf),
        collectedAmountCdf: subOrder.collectedAmountCdf === null ? null : Number(subOrder.collectedAmountCdf),
      }));
      return sendSuccess(res, dbSubOrders, 'Sous-commandes vendeur récupérées depuis la base de données', 200, {
        sellerId,
        total: dbSubOrders.length,
      });
    }

    const subOrders = Array.from(AgroStore.subOrders.values())
      .filter((s) => s.sellerId === sellerId)
      .map((subOrder) => {
        const items = AgroStore.orderItems
          .filter((i) => i.subOrderId === subOrder.id)
          .map(orderItemForApi);
        return {
          ...subOrderForApi(subOrder),
          items,
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
    const allowedTransitions: Partial<Record<SubOrderStatus, SubOrderStatus[]>> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
    };

    if (isUuid(subOrderId)) {
      const persisted = await dbManager.query<{
        id: string;
        sellerId: string;
        status: SubOrderStatus;
        parentOrderId: string;
        buyerId: string;
      }>(
        `SELECT so."id", so."sellerId", so."status", so."parentOrderId", p."buyerId"
         FROM "sub_orders" so
         JOIN "parent_orders" p ON p."id" = so."parentOrderId"
         WHERE so."id" = $1 LIMIT 1`,
        [subOrderId]
      );
      const storedSubOrder = persisted.rows[0];
      if (storedSubOrder) {
        const isAdmin = req.user?.roles?.includes('ADMIN') || req.user?.role === 'ADMIN';
        if (!isAdmin && req.user?.sellerId !== storedSubOrder.sellerId) {
          return sendError(res, 'Accès interdit : vous ne pouvez modifier que le statut de vos propres sous-commandes', 403, 'FORBIDDEN_SELLER_ACCESS');
        }
        if (typeof status !== 'string' || !allowedTransitions[storedSubOrder.status]?.includes(status as SubOrderStatus)) {
          return sendError(
            res,
            `Transition de '${storedSubOrder.status}' vers '${String(status)}' non autorisée`,
            409,
            'INVALID_STATUS_TRANSITION'
          );
        }
        const updated = await dbManager.query(
          `UPDATE "sub_orders" SET "status" = $2::"SubOrderStatus", "updatedAt" = NOW()
           WHERE "id" = $1 AND "status" = $3::"SubOrderStatus"
           RETURNING "id", "subOrderNumber", "parentOrderId", "sellerId", "status", "subtotalCdf"`,
          [subOrderId, status, storedSubOrder.status]
        );
        if (!updated.rows[0]) {
          return sendError(res, 'Le statut a changé; rechargez la sous-commande avant de réessayer.', 409, 'ORDER_STATUS_CONFLICT');
        }
        publishOrderUpdated({
          orderId: storedSubOrder.parentOrderId,
          subOrderId,
          buyerId: storedSubOrder.buyerId,
          sellerId: storedSubOrder.sellerId,
          status: String(status),
        });
        return sendSuccess(res, updated.rows[0], `Statut de la sous-commande mis à jour vers '${status}'`);
      }
    }

    const subOrder = AgroStore.subOrders.get(subOrderId);
    if (!subOrder) {
      return sendError(res, `Sous-commande '${subOrderId}' introuvable`, 404, 'SUB_ORDER_NOT_FOUND');
    }

    const isAdmin = req.user?.roles?.includes('ADMIN') || req.user?.role === 'ADMIN';
    if (!isAdmin && req.user?.sellerId !== subOrder.sellerId) {
      return sendError(
        res,
        'Accès interdit : vous ne pouvez modifier que le statut de vos propres sous-commandes',
        403,
        'FORBIDDEN_SELLER_ACCESS'
      );
    }

    if (!allowedTransitions[subOrder.status]?.includes(status)) {
      return sendError(
        res,
        `Transition de '${subOrder.status}' vers '${status}' non autorisée`,
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }

    subOrder.status = status;
    subOrder.updatedAt = new Date();

    const parentOrder = AgroStore.parentOrders.get(subOrder.parentOrderId);
    if (parentOrder) {
      publishOrderUpdated({
        orderId: subOrder.parentOrderId,
        subOrderId,
        buyerId: parentOrder.buyerId,
        sellerId: subOrder.sellerId,
        status: String(status),
      });
    }
    return sendSuccess(res, subOrder, `Statut de la sous-commande mis à jour vers '${status}'`);
  }

  public static async confirmSellerPayout(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.subOrderId;
    const subOrderId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const record = await dbManager.query<{
      sellerId: string;
      orderStatus: string;
      payoutStatus: string;
      platformDepositReceivedAt: Date | null;
      paidAt: Date | null;
      parentOrderId: string;
      buyerId: string;
    }>(
      `SELECT fr."sellerId", so."status" AS "orderStatus", fr."status" AS "payoutStatus",
              d."platformDepositReceivedAt", fr."paidAt", so."parentOrderId", p."buyerId"
       FROM "financial_records" fr
       JOIN "sub_orders" so ON so."id" = fr."subOrderId"
       JOIN "parent_orders" p ON p."id" = so."parentOrderId"
       LEFT JOIN "deliveries" d ON d."subOrderId" = so."id"
       WHERE fr."subOrderId" = $1 LIMIT 1`,
      [subOrderId]
    );
    const row = record.rows[0];
    if (!row) return sendError(res, `Règlement de la sous-commande '${subOrderId}' introuvable`, 404, 'FINANCIAL_RECORD_NOT_FOUND');
    if (req.user?.sellerId !== row.sellerId) {
      return sendError(res, 'Vous ne pouvez confirmer que le règlement de vos propres commandes.', 403, 'FORBIDDEN_SELLER_ACCESS');
    }
    if (row.payoutStatus === 'COMPLETED' && row.paidAt) {
      return sendSuccess(res, { subOrderId, payoutStatus: row.payoutStatus, sellerConfirmedAt: row.paidAt }, 'Réception déjà confirmée');
    }
    if (row.orderStatus !== 'DELIVERED' || !row.platformDepositReceivedAt || row.payoutStatus !== 'APPROVED') {
      return sendError(res, 'La livraison et la remise des fonds à AgroConnect doivent être confirmées avant ce règlement.', 409, 'SELLER_PAYOUT_NOT_READY');
    }

    const updated = await dbManager.transaction(async (client) => {
      const financial = await client.query(
        `UPDATE "financial_records" SET "status" = 'COMPLETED', "paidAt" = NOW()
         WHERE "subOrderId" = $1 AND "status" = 'APPROVED'
         RETURNING "paidAt"`,
        [subOrderId]
      );
      if (!financial.rows[0]) return null;
      await client.query(
        `UPDATE "sub_orders" SET "payoutStatus" = 'COMPLETED', "updatedAt" = NOW()
         WHERE "id" = $1`,
        [subOrderId]
      );
      return financial.rows[0];
    });
    if (!updated) return sendError(res, 'Le statut du règlement a changé; rechargez la commande.', 409, 'SELLER_PAYOUT_CONFLICT');
    publishOrderUpdated({
      orderId: row.parentOrderId,
      subOrderId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      status: row.orderStatus,
      payoutStatus: 'COMPLETED',
    });
    return sendSuccess(res, { subOrderId, payoutStatus: 'COMPLETED', sellerConfirmedAt: updated.paidAt }, 'Réception du règlement confirmée');
  }
}
