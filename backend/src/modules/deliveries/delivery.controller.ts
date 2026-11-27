import { Request, Response } from 'express';
import { Money } from '../../common/money.js';
import { sendError, sendSuccess } from '../../common/response.js';
import { dbManager } from '../../database/client.js';
import { publishDeliveryUpdated } from '../../common/realtime.js';
import type { DeliveryUpdatedEvent } from '../../common/realtime.js';

class DeliveryOperationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
  }
}

function respondToDeliveryError(error: unknown, res: Response): Response {
  if (error instanceof DeliveryOperationError) {
    return sendError(res, error.message, error.statusCode, error.code);
  }
  throw error;
}

export class DeliveryController {
  public static async listOperations(_req: Request, res: Response): Promise<Response> {
    const result = await dbManager.query(
      `SELECT d."id", d."trackingCode", d."status" AS "deliveryStatus", d."createdAt",
              d."pickupProvince", d."pickupCity", d."pickupAddress",
              d."dropoffProvince", d."dropoffCity", d."dropoffAddress",
              d."collectionMethod"::text AS "collectionMethod",
              d."collectedAmountCdf"::text AS "collectedAmountCdf", d."collectedAt",
              d."platformDepositReceivedAt",
              d."platformDepositAmountCdf"::text AS "platformDepositAmountCdf",
              so."id" AS "subOrderId", so."subOrderNumber",
              so."status" AS "orderStatus", so."totalAmountCdf"::text AS "amountDueCdf",
              so."commissionRate"::text AS "commissionRate",
              so."commissionAmountCdf"::text AS "commissionAmountCdf",
              so."payoutAmountCdf"::text AS "sellerEarningsCdf", so."payoutStatus",
              p."orderNumber", p."recipientName", p."recipientPhone",
              p."deliveryProvince", p."deliveryCity", p."deliveryAddress", p."deliveryInstructions",
              s."businessName" AS "sellerName", su."phoneNumber" AS "sellerPhone",
              cu."fullName" AS "courierName", cu."phoneNumber" AS "courierPhone",
              d."personnelId" AS "courierId",
              COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'productName', pr."name", 'quantity', oi."quantity", 'unitPriceCdf', oi."unitPriceCdf"
                ) ORDER BY oi."createdAt")
                FROM "order_items" oi
                JOIN "offers" o ON o."id" = oi."offerId"
                JOIN "products" pr ON pr."id" = o."productId"
                WHERE oi."subOrderId" = so."id"
              ), '[]'::json) AS "items"
       FROM "deliveries" d
       JOIN "sub_orders" so ON so."id" = d."subOrderId"
       JOIN "parent_orders" p ON p."id" = so."parentOrderId"
       JOIN "seller_profiles" s ON s."id" = so."sellerId"
       JOIN "users" su ON su."id" = s."userId"
       LEFT JOIN "delivery_profiles" dp ON dp."id" = d."personnelId"
       LEFT JOIN "users" cu ON cu."id" = dp."userId"
       WHERE so."status" NOT IN ('CANCELLED', 'REJECTED')
       ORDER BY CASE WHEN d."status" = 'DELIVERED' AND d."platformDepositReceivedAt" IS NULL THEN 0
                     WHEN so."status" = 'READY_FOR_PICKUP' AND d."status" = 'PENDING' THEN 1 ELSE 2 END,
                d."createdAt" DESC`
    );
    return sendSuccess(res, result.rows.map((row) => ({
      ...row,
      amountDueCdf: Number(row.amountDueCdf),
      commissionRate: Number(row.commissionRate),
      commissionAmountCdf: Number(row.commissionAmountCdf),
      sellerEarningsCdf: Number(row.sellerEarningsCdf),
      collectedAmountCdf: row.collectedAmountCdf === null ? null : Number(row.collectedAmountCdf),
      platformDepositAmountCdf: row.platformDepositAmountCdf === null ? null : Number(row.platformDepositAmountCdf),
    })), 'Tableau des livraisons et remises récupéré');
  }

  public static async listMine(req: Request, res: Response): Promise<Response> {
    const profileResult = await dbManager.query<{ id: string }>(
      `SELECT dp."id" FROM "delivery_profiles" dp
       JOIN "users" u ON u."id" = dp."userId"
       WHERE dp."userId" = $1 AND dp."status" = 'VERIFIED' AND u."isActive" = true
       LIMIT 1`,
      [req.user!.userId]
    );
    const profileId = profileResult.rows[0]?.id;
    if (!profileId) return sendError(res, 'Profil livreur actif introuvable.', 403, 'COURIER_PROFILE_REQUIRED');

    const result = await dbManager.query(
      `SELECT d."id", d."trackingCode", d."status" AS "deliveryStatus",
              d."pickupProvince", d."pickupCity", d."pickupAddress",
              d."dropoffProvince", d."dropoffCity", d."dropoffAddress",
              d."collectionMethod"::text AS "collectionMethod",
              d."collectedAmountCdf"::text AS "collectedAmountCdf", d."collectedAt",
              d."platformDepositReceivedAt",
              so."id" AS "subOrderId", so."subOrderNumber", so."status" AS "orderStatus",
              so."totalAmountCdf"::text AS "amountDueCdf",
              p."orderNumber", p."recipientName", p."recipientPhone", p."deliveryInstructions",
              s."businessName" AS "sellerName", su."phoneNumber" AS "sellerPhone",
              COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'productName', pr."name", 'quantity', oi."quantity", 'unitPriceCdf', oi."unitPriceCdf"
                ) ORDER BY oi."createdAt")
                FROM "order_items" oi
                JOIN "offers" o ON o."id" = oi."offerId"
                JOIN "products" pr ON pr."id" = o."productId"
                WHERE oi."subOrderId" = so."id"
              ), '[]'::json) AS "items"
       FROM "deliveries" d
       JOIN "sub_orders" so ON so."id" = d."subOrderId"
       JOIN "parent_orders" p ON p."id" = so."parentOrderId"
       JOIN "seller_profiles" s ON s."id" = so."sellerId"
       JOIN "users" su ON su."id" = s."userId"
       WHERE d."personnelId" = $1
       ORDER BY CASE WHEN d."status" IN ('DELIVERED', 'FAILED', 'CANCELLED') THEN 1 ELSE 0 END,
                d."updatedAt" DESC`,
      [profileId]
    );
    return sendSuccess(res, result.rows.map((row) => ({
      ...row,
      amountDueCdf: Number(row.amountDueCdf),
      collectedAmountCdf: row.collectedAmountCdf === null ? null : Number(row.collectedAmountCdf),
    })), 'Livraisons assignées récupérées');
  }

  public static async updateStatus(req: Request, res: Response): Promise<Response> {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const { status, notes } = req.body as { status?: unknown; notes?: unknown };
    const allowed = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'];
    if (typeof status !== 'string' || !allowed.includes(status)) {
      return sendError(res, 'Jalon attendu : PICKED_UP, IN_TRANSIT ou ARRIVED.', 400, 'INVALID_DELIVERY_STATUS');
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 300)) {
      return sendError(res, 'La note ne peut pas dépasser 300 caractères.', 400, 'INVALID_DELIVERY_NOTE');
    }
    try {
      const updated = await dbManager.transaction(async (client) => {
        const found = await client.query<{
          id: string;
          personnelId: string | null;
          status: string;
          subOrderId: string;
          subOrderStatus: string;
          profileId: string | null;
          parentOrderId: string;
          buyerId: string;
          sellerId: string;
        }>(
          `SELECT d."id", d."personnelId", d."status"::text AS "status", d."subOrderId",
                  so."status"::text AS "subOrderStatus", so."parentOrderId", so."sellerId",
                  p."buyerId", dp."id" AS "profileId"
           FROM "deliveries" d
           JOIN "sub_orders" so ON so."id" = d."subOrderId"
           JOIN "parent_orders" p ON p."id" = so."parentOrderId"
           LEFT JOIN "delivery_profiles" dp ON dp."userId" = $2
           WHERE d."id"::text = $1
           FOR UPDATE OF d, so`,
          [id, req.user!.userId]
        );
        const delivery = found.rows[0];
        if (!delivery) throw new DeliveryOperationError('Livraison introuvable.', 404, 'DELIVERY_NOT_FOUND');
        if (!delivery.profileId || delivery.personnelId !== delivery.profileId) {
          throw new DeliveryOperationError('Seul le livreur assigné peut modifier cette livraison.', 403, 'FORBIDDEN_DELIVERY_ACCESS');
        }
        const transitions: Record<string, string[]> = {
          ASSIGNED: ['PICKED_UP'],
          PICKED_UP: ['IN_TRANSIT'],
          IN_TRANSIT: ['ARRIVED'],
        };
        if (!transitions[delivery.status]?.includes(status)) {
          throw new DeliveryOperationError(`Transition de '${delivery.status}' vers '${status}' non autorisée.`, 409, 'INVALID_DELIVERY_TRANSITION');
        }
        if (status === 'PICKED_UP' && delivery.subOrderStatus !== 'READY_FOR_PICKUP') {
          throw new DeliveryOperationError('Le vendeur doit d’abord marquer la commande prête au retrait.', 409, 'ORDER_NOT_READY');
        }
        await client.query(
          `UPDATE "deliveries" SET "status" = $2::"DeliveryStatus", "updatedAt" = NOW()
           WHERE "id" = $1`,
          [delivery.id, status]
        );
        if (status === 'PICKED_UP') {
          await client.query(
            `UPDATE "sub_orders" SET "status" = 'IN_DELIVERY', "updatedAt" = NOW() WHERE "id" = $1`,
            [delivery.subOrderId]
          );
        }
        const note = typeof notes === 'string' && notes.trim()
          ? notes.trim()
          : `Jalon de livraison confirmé : ${status}`;
        await client.query(
          `INSERT INTO "delivery_status_history" ("deliveryId", "status", "notes", "recordedBy")
           VALUES ($1, $2::"DeliveryStatus", $3, $4)`,
          [delivery.id, status, note, req.user!.userId]
        );
        const orderStatus = status === 'PICKED_UP' ? 'IN_DELIVERY' : delivery.subOrderStatus;
        const event: DeliveryUpdatedEvent = {
          deliveryId: delivery.id,
          orderId: delivery.parentOrderId,
          subOrderId: delivery.subOrderId,
          buyerId: delivery.buyerId,
          sellerId: delivery.sellerId,
          courierUserId: req.user!.userId,
          status: orderStatus,
          deliveryStatus: status,
        };
        return { id: delivery.id, status, subOrderId: delivery.subOrderId, event };
      });
      publishDeliveryUpdated(updated.event);
      return sendSuccess(res, { id: updated.id, status: updated.status, subOrderId: updated.subOrderId }, 'Étape de livraison mise à jour');
    } catch (error) {
      return respondToDeliveryError(error, res);
    }
  }

  public static async assignPersonnel(req: Request, res: Response): Promise<Response> {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const personnelId = typeof req.body?.personnelId === 'string' ? req.body.personnelId : '';
    if (!personnelId) return sendError(res, 'Un profil livreur valide est requis.', 400, 'INVALID_COURIER');
    try {
      const assigned = await dbManager.transaction(async (client) => {
        const deliveryResult = await client.query<{
          id: string;
          status: string;
          subOrderId: string;
          subOrderStatus: string;
          parentOrderId: string;
          buyerId: string;
          sellerId: string;
        }>(
          `SELECT d."id", d."status"::text AS "status", d."subOrderId",
                  so."status"::text AS "subOrderStatus", so."parentOrderId", so."sellerId",
                  p."buyerId"
           FROM "deliveries" d
           JOIN "sub_orders" so ON so."id" = d."subOrderId"
           JOIN "parent_orders" p ON p."id" = so."parentOrderId"
           WHERE d."id"::text = $1
           FOR UPDATE OF d, so`,
          [id]
        );
        const delivery = deliveryResult.rows[0];
        if (!delivery) throw new DeliveryOperationError('Livraison introuvable.', 404, 'DELIVERY_NOT_FOUND');
        if (delivery.status !== 'PENDING' || delivery.subOrderStatus !== 'READY_FOR_PICKUP') {
          throw new DeliveryOperationError('Seule une commande prête au retrait peut être affectée.', 409, 'ORDER_NOT_READY_FOR_DISPATCH');
        }
        const courier = await client.query<{ id: string; companyName: string | null; userId: string }>(
          `SELECT dp."id", dp."companyName", dp."userId"
           FROM "delivery_profiles" dp
           JOIN "users" u ON u."id" = dp."userId"
           WHERE dp."id"::text = $1 AND dp."status" = 'VERIFIED'
             AND dp."isAvailable" = true AND u."isActive" = true
           LIMIT 1`,
          [personnelId]
        );
        if (!courier.rows[0]) throw new DeliveryOperationError('Le livreur est introuvable, inactif ou indisponible.', 404, 'COURIER_UNAVAILABLE');
        await client.query(
          `UPDATE "deliveries" SET "personnelId" = $2, "status" = 'ASSIGNED', "updatedAt" = NOW()
           WHERE "id" = $1`,
          [delivery.id, courier.rows[0].id]
        );
        await client.query(
          `INSERT INTO "delivery_status_history" ("deliveryId", "status", "notes", "recordedBy")
           VALUES ($1, 'ASSIGNED', $2, $3)`,
          [
            delivery.id,
            `Livraison affectée à ${courier.rows[0].companyName || 'un livreur AgroConnect'}`,
            req.user!.userId,
          ]
        );
        const event: DeliveryUpdatedEvent = {
          deliveryId: delivery.id,
          orderId: delivery.parentOrderId,
          subOrderId: delivery.subOrderId,
          buyerId: delivery.buyerId,
          sellerId: delivery.sellerId,
          courierUserId: courier.rows[0].userId,
          status: delivery.subOrderStatus,
          deliveryStatus: 'ASSIGNED',
        };
        return { deliveryId: delivery.id, courierId: courier.rows[0].id, status: 'ASSIGNED', event };
      });
      publishDeliveryUpdated(assigned.event);
      return sendSuccess(res, {
        deliveryId: assigned.deliveryId,
        courierId: assigned.courierId,
        status: assigned.status,
      }, 'Livreur affecté à la commande');
    } catch (error) {
      return respondToDeliveryError(error, res);
    }
  }

  public static async recordCollection(req: Request, res: Response): Promise<Response> {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const method = req.body?.method;
    const amount = req.body?.amountCdf;
    const reference = req.body?.reference;
    if (typeof method !== 'string' || !['CASH', 'MOBILE_MONEY_DIRECT'].includes(method)) {
      return sendError(res, 'Mode de collecte attendu : CASH ou MOBILE_MONEY_DIRECT.', 400, 'INVALID_COLLECTION_METHOD');
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0
      || Math.round(amount * 100) !== amount * 100) {
      return sendError(res, 'Le montant collecté doit être un montant CDF positif à deux décimales maximum.', 400, 'INVALID_COLLECTION_AMOUNT');
    }
    if (reference !== undefined && (typeof reference !== 'string' || reference.trim().length > 120)) {
      return sendError(res, 'La référence Mobile Money ne peut pas dépasser 120 caractères.', 400, 'INVALID_COLLECTION_REFERENCE');
    }
    try {
      const result = await dbManager.transaction(async (client) => {
        const found = await client.query<{
          id: string;
          personnelId: string | null;
          status: string;
          subOrderId: string;
          subOrderStatus: string;
          amountDueCdf: string;
          collectedAmountCdf: string | null;
          profileId: string | null;
          parentOrderId: string;
          buyerId: string;
          sellerId: string;
        }>(
          `SELECT d."id", d."personnelId", d."status"::text AS "status", d."subOrderId",
                  so."status"::text AS "subOrderStatus", so."totalAmountCdf"::text AS "amountDueCdf",
                  d."collectedAmountCdf"::text AS "collectedAmountCdf", dp."id" AS "profileId",
                  so."parentOrderId", so."sellerId", p."buyerId"
           FROM "deliveries" d
           JOIN "sub_orders" so ON so."id" = d."subOrderId"
           JOIN "parent_orders" p ON p."id" = so."parentOrderId"
           LEFT JOIN "delivery_profiles" dp ON dp."userId" = $2
           WHERE d."id"::text = $1
           FOR UPDATE OF d, so`,
          [id, req.user!.userId]
        );
        const delivery = found.rows[0];
        if (!delivery) throw new DeliveryOperationError('Livraison introuvable.', 404, 'DELIVERY_NOT_FOUND');
        if (delivery.personnelId !== delivery.profileId) {
          throw new DeliveryOperationError('Seul le livreur assigné peut confirmer la collecte.', 403, 'FORBIDDEN_DELIVERY_ACCESS');
        }
        if (delivery.status === 'DELIVERED' && delivery.collectedAmountCdf !== null) {
          if (Money.toScaled(delivery.collectedAmountCdf) === Money.toScaled(String(amount))) {
            return { deliveryId: delivery.id, status: delivery.status, amountCdf: Number(delivery.collectedAmountCdf), alreadyRecorded: true, event: null };
          }
          throw new DeliveryOperationError('La collecte de cette livraison a déjà été enregistrée avec un montant différent.', 409, 'COLLECTION_ALREADY_RECORDED');
        }
        if (delivery.status !== 'ARRIVED' || delivery.subOrderStatus !== 'IN_DELIVERY') {
          throw new DeliveryOperationError('La livraison doit être marquée comme arrivée avant de confirmer la collecte.', 409, 'DELIVERY_NOT_ARRIVED');
        }
        if (Money.toScaled(delivery.amountDueCdf) !== Money.toScaled(String(amount))) {
          throw new DeliveryOperationError(`Le montant attendu est de ${delivery.amountDueCdf} CDF.`, 409, 'COLLECTION_AMOUNT_MISMATCH');
        }
        const deliveryTime = new Date();
        await client.query(
          `UPDATE "deliveries"
           SET "status" = 'DELIVERED', "deliveredAt" = $2, "collectionMethod" = $3::"ManualCollectionMethod",
               "collectedAmountCdf" = $4, "collectionReference" = $5, "collectedAt" = $2, "updatedAt" = $2
           WHERE "id" = $1`,
          [delivery.id, deliveryTime, method, amount, typeof reference === 'string' ? reference.trim() || null : null]
        );
        await client.query(
          `UPDATE "sub_orders" SET "status" = 'DELIVERED', "updatedAt" = $2 WHERE "id" = $1`,
          [delivery.subOrderId, deliveryTime]
        );
        await client.query(
          `UPDATE "parent_orders" p
           SET "status" = CASE
             WHEN NOT EXISTS (
               SELECT 1 FROM "sub_orders" so WHERE so."parentOrderId" = p."id"
                 AND so."status" NOT IN ('DELIVERED', 'CANCELLED', 'REJECTED')
             ) THEN 'DELIVERED'::"ParentOrderStatus"
             WHEN EXISTS (
               SELECT 1 FROM "sub_orders" so WHERE so."parentOrderId" = p."id" AND so."status" = 'DELIVERED'
             ) THEN 'PARTIALLY_DELIVERED'::"ParentOrderStatus"
             ELSE p."status"
           END,
           "updatedAt" = $2
           WHERE p."id" = (SELECT "parentOrderId" FROM "sub_orders" WHERE "id" = $1)`,
          [delivery.subOrderId, deliveryTime]
        );
        await client.query(
          `INSERT INTO "delivery_status_history" ("deliveryId", "status", "notes", "recordedBy")
           VALUES ($1, 'DELIVERED', $2, $3)`,
          [
            delivery.id,
            `Client livré; collecte de ${amount} CDF par ${method === 'CASH' ? 'espèces' : 'Mobile Money direct'}`,
            req.user!.userId,
          ]
        );
        const event: DeliveryUpdatedEvent = {
          deliveryId: delivery.id,
          orderId: delivery.parentOrderId,
          subOrderId: delivery.subOrderId,
          buyerId: delivery.buyerId,
          sellerId: delivery.sellerId,
          courierUserId: req.user!.userId,
          status: 'DELIVERED',
          deliveryStatus: 'DELIVERED',
        };
        return { deliveryId: delivery.id, status: 'DELIVERED', amountCdf: amount, collectionMethod: method, alreadyRecorded: false, event };
      });
      if (result.event) publishDeliveryUpdated(result.event);
      return sendSuccess(res, {
        deliveryId: result.deliveryId,
        status: result.status,
        amountCdf: result.amountCdf,
        collectionMethod: result.collectionMethod,
        alreadyRecorded: result.alreadyRecorded,
      }, result.alreadyRecorded ? 'Collecte déjà enregistrée' : 'Livraison et collecte confirmées');
    } catch (error) {
      return respondToDeliveryError(error, res);
    }
  }

  public static async confirmPlatformDeposit(req: Request, res: Response): Promise<Response> {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const amount = req.body?.amountCdf;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0
      || Math.round(amount * 100) !== amount * 100) {
      return sendError(res, 'Le montant remis doit être un montant CDF positif à deux décimales maximum.', 400, 'INVALID_DEPOSIT_AMOUNT');
    }
    try {
      const result = await dbManager.transaction(async (client) => {
        const found = await client.query<{
          id: string;
          status: string;
          collectedAmountCdf: string | null;
          platformDepositAmountCdf: string | null;
          platformDepositReceivedAt: Date | null;
          subOrderId: string;
          parentOrderId: string;
          buyerId: string;
          sellerId: string;
          orderStatus: string;
          courierUserId: string | null;
        }>(
          `SELECT d."id", d."status"::text AS "status", d."subOrderId",
                  d."collectedAmountCdf"::text AS "collectedAmountCdf",
                  d."platformDepositAmountCdf"::text AS "platformDepositAmountCdf",
                  d."platformDepositReceivedAt", so."parentOrderId", p."buyerId", so."sellerId",
                  so."status"::text AS "orderStatus", dp."userId" AS "courierUserId"
           FROM "deliveries" d
           JOIN "sub_orders" so ON so."id" = d."subOrderId"
           JOIN "parent_orders" p ON p."id" = so."parentOrderId"
           LEFT JOIN "delivery_profiles" dp ON dp."id" = d."personnelId"
           WHERE d."id"::text = $1 FOR UPDATE OF d, so`,
          [id]
        );
        const delivery = found.rows[0];
        if (!delivery) throw new DeliveryOperationError('Livraison introuvable.', 404, 'DELIVERY_NOT_FOUND');
        if (delivery.platformDepositReceivedAt && delivery.platformDepositAmountCdf !== null) {
          if (Money.toScaled(delivery.platformDepositAmountCdf) === Money.toScaled(String(amount))) {
            return { deliveryId: delivery.id, receivedAt: delivery.platformDepositReceivedAt, amountCdf: Number(delivery.platformDepositAmountCdf), alreadyConfirmed: true, event: null };
          }
          throw new DeliveryOperationError('La remise à AgroConnect est déjà enregistrée avec un montant différent.', 409, 'DEPOSIT_ALREADY_CONFIRMED');
        }
        if (delivery.status !== 'DELIVERED' || delivery.collectedAmountCdf === null) {
          throw new DeliveryOperationError('La collecte du livreur doit être confirmée avant la remise à AgroConnect.', 409, 'COLLECTION_NOT_CONFIRMED');
        }
        if (Money.toScaled(delivery.collectedAmountCdf) !== Money.toScaled(String(amount))) {
          throw new DeliveryOperationError(`Le montant attendu est de ${delivery.collectedAmountCdf} CDF.`, 409, 'DEPOSIT_AMOUNT_MISMATCH');
        }
        const receivedAt = new Date();
        const financial = await client.query(
          `UPDATE "financial_records" SET "status" = 'APPROVED'
           WHERE "subOrderId" = $1 AND "status" = 'PENDING'
           RETURNING "id"`,
          [delivery.subOrderId]
        );
        if (!financial.rows[0]) {
          throw new DeliveryOperationError('Le règlement vendeur n’est pas dans un état pouvant être rapproché.', 409, 'PAYOUT_NOT_PENDING');
        }
        await client.query(
          `UPDATE "sub_orders" SET "payoutStatus" = 'APPROVED', "updatedAt" = $2 WHERE "id" = $1`,
          [delivery.subOrderId, receivedAt]
        );
        await client.query(
          `UPDATE "deliveries"
           SET "platformDepositAmountCdf" = $2, "platformDepositReceivedAt" = $3,
               "platformDepositReceivedByUserId" = $4, "updatedAt" = $3
           WHERE "id" = $1`,
          [delivery.id, amount, receivedAt, req.user!.userId]
        );
        await client.query(
          `INSERT INTO "delivery_status_history" ("deliveryId", "status", "notes", "recordedBy")
           VALUES ($1, 'DELIVERED', $2, $3)`,
          [delivery.id, `AgroConnect confirme la réception de ${amount} CDF`, req.user!.userId]
        );
        const event: DeliveryUpdatedEvent = {
          deliveryId: delivery.id,
          orderId: delivery.parentOrderId,
          subOrderId: delivery.subOrderId,
          buyerId: delivery.buyerId,
          sellerId: delivery.sellerId,
          courierUserId: delivery.courierUserId ?? undefined,
          status: delivery.orderStatus,
          payoutStatus: 'APPROVED',
          deliveryStatus: delivery.status,
        };
        return { deliveryId: delivery.id, receivedAt, amountCdf: amount, alreadyConfirmed: false, event };
      });
      if (result.event) publishDeliveryUpdated(result.event);
      return sendSuccess(res, {
        deliveryId: result.deliveryId,
        receivedAt: result.receivedAt,
        amountCdf: result.amountCdf,
        alreadyConfirmed: result.alreadyConfirmed,
      }, result.alreadyConfirmed ? 'Remise déjà confirmée' : 'Remise reçue par AgroConnect et règlement vendeur disponible');
    } catch (error) {
      return respondToDeliveryError(error, res);
    }
  }
}
