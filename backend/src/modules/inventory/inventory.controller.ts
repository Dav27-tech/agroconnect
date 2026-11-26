import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { dbManager } from '../../database/client.js';
import { publishInventoryUpdated } from '../../common/realtime.js';
import { StockMovementType } from '../../database/store.js';

const manualMovementTypes: StockMovementType[] = [
  'RESTOCK',
  'MANUAL_ADJUSTMENT',
  'SPOILAGE_LOSS',
];

const movementSelect = `
  SELECT "id", "offerId", "sellerId", "movementType", "quantityChange",
         "previousStock", "newStock", "referenceType", "referenceId", "notes",
         "createdByUserId", "createdAt"
  FROM "stock_movements"
`;

function isAdmin(req: Request): boolean {
  return req.user?.roles?.includes('ADMIN') === true || req.user?.role === 'ADMIN';
}

function mapMovement(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    offerId: String(row.offerId),
    sellerId: String(row.sellerId),
    movementType: row.movementType as StockMovementType,
    quantityChange: Number(row.quantityChange),
    previousStock: Number(row.previousStock),
    newStock: Number(row.newStock),
    referenceType: row.referenceType ? String(row.referenceType) : undefined,
    referenceId: row.referenceId ? String(row.referenceId) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdByUserId: row.createdByUserId ? String(row.createdByUserId) : undefined,
    createdAt: row.createdAt,
  };
}

export class InventoryController {
  public static async getOfferInventory(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.offerId;
    const offerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const result = await dbManager.query(
      `SELECT o."id", o."sellerId", s."userId", p."name" AS "productName",
              o."unit", o."stockQuantity", o."isAvailable"
       FROM "offers" o
       JOIN "seller_profiles" s ON s."id" = o."sellerId"
       JOIN "products" p ON p."id" = o."productId"
       WHERE o."id"::text = $1
       LIMIT 1`,
      [offerId]
    );
    const offer = result.rows[0];

    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }
    if (!isAdmin(req) && offer.userId !== req.user?.userId) {
      return sendError(res, 'Accès interdit à cet inventaire vendeur', 403, 'FORBIDDEN_SELLER_ACCESS');
    }

    const movementsResult = await dbManager.query(
      `${movementSelect}
       WHERE "offerId" = $1
       ORDER BY "createdAt" DESC`,
      [offer.id]
    );
    const movements = movementsResult.rows.map(mapMovement);

    return sendSuccess(res, {
      offerId: offer.id,
      productName: offer.productName,
      sellerId: offer.sellerId,
      unit: offer.unit,
      sharedStockQuantity: Number(offer.stockQuantity),
      isAvailable: offer.isAvailable && Number(offer.stockQuantity) > 0,
      inventoryRule:
        'Stock physique unique partagé entre toutes les commandes pour éviter tout sur-stockage ou sur-vente.',
      movementsCount: movements.length,
      recentMovements: movements.slice(0, 5),
    });
  }

  public static async getSellerInventory(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.sellerId;
    const sellerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const sellerResult = await dbManager.query(
      'SELECT "id", "userId", "businessName" FROM "seller_profiles" WHERE "id"::text = $1 LIMIT 1',
      [sellerId]
    );
    const seller = sellerResult.rows[0];

    if (!seller) {
      return sendError(res, `Profil vendeur '${sellerId}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }
    if (!isAdmin(req) && seller.userId !== req.user?.userId) {
      return sendError(res, 'Accès interdit à cet inventaire vendeur', 403, 'FORBIDDEN_SELLER_ACCESS');
    }

    const [offersResult, movementsResult] = await Promise.all([
      dbManager.query(
        `SELECT o."id" AS "offerId", p."name" AS "productName", o."stockQuantity",
                o."unit", o."isAvailable", o."retailPriceCdf", o."wholesalePriceCdf"
         FROM "offers" o
         JOIN "products" p ON p."id" = o."productId"
         WHERE o."sellerId" = $1
         ORDER BY o."createdAt" DESC`,
        [seller.id]
      ),
      dbManager.query(
        `${movementSelect}
         WHERE "sellerId" = $1
         ORDER BY "createdAt" DESC`,
        [seller.id]
      ),
    ]);

    return sendSuccess(res, {
      sellerId: seller.id,
      businessName: seller.businessName,
      totalOffers: offersResult.rows.length,
      offers: offersResult.rows.map((offer) => ({
        offerId: offer.offerId,
        productName: offer.productName,
        stockQuantity: Number(offer.stockQuantity),
        unit: offer.unit,
        isAvailable: offer.isAvailable,
        retailPriceCdf: Number(offer.retailPriceCdf),
        wholesalePriceCdf:
          offer.wholesalePriceCdf === null ? undefined : Number(offer.wholesalePriceCdf),
      })),
      movementsLog: movementsResult.rows.map(mapMovement),
      strictIntermediaryRule:
        'AgroConnect ne possède aucun stock physique. Chaque vendeur est l\'unique propriétaire et gestionnaire de ses stocks.',
    });
  }

  public static async recordMovement(req: Request, res: Response): Promise<Response> {
    const { offerId, quantityChange, movementType, notes } = req.body;

    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }
    if (typeof offerId !== 'string' || !offerId.trim()) {
      return sendError(res, 'Sélectionnez une offre valide', 400, 'INVALID_OFFER_ID');
    }
    if (!manualMovementTypes.includes(movementType)) {
      return sendError(res, `Type de mouvement '${movementType}' invalide`, 400, 'INVALID_MOVEMENT_TYPE');
    }

    const qty = Number(quantityChange);
    if (!Number.isFinite(qty) || qty === 0) {
      return sendError(res, 'Le changement de quantité doit être un nombre non nul', 400, 'INVALID_QUANTITY');
    }
    if (movementType === 'RESTOCK' && qty < 0) {
      return sendError(res, 'Un réapprovisionnement doit augmenter le stock', 400, 'INVALID_QUANTITY_DIRECTION');
    }
    if (movementType === 'SPOILAGE_LOSS' && qty > 0) {
      return sendError(res, 'Une perte doit diminuer le stock', 400, 'INVALID_QUANTITY_DIRECTION');
    }

    const admin = isAdmin(req);
    const userId = req.user.userId;
    const result = await dbManager.transaction(async (client) => {
      const offerResult = await client.query(
        `SELECT o."id", o."sellerId", o."stockQuantity", o."unit", o."isAvailable",
                p."name" AS "productName", s."userId"
         FROM "offers" o
         JOIN "seller_profiles" s ON s."id" = o."sellerId"
         JOIN "products" p ON p."id" = o."productId"
         WHERE o."id"::text = $1
         LIMIT 1
         FOR UPDATE OF o`,
        [offerId]
      );
      const offer = offerResult.rows[0];

      if (!offer) return { status: 'not-found' as const };
      if (!admin && offer.userId !== userId) return { status: 'forbidden' as const };

      const previousStock = Number(offer.stockQuantity);
      const newStock = previousStock + qty;
      if (newStock < 0) {
        return {
          status: 'insufficient-stock' as const,
          productName: String(offer.productName),
          stock: previousStock,
          unit: String(offer.unit),
        };
      }

      const isAvailable = newStock > 0;
      await client.query(
        `UPDATE "offers"
         SET "stockQuantity" = $2, "isAvailable" = $3, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [offer.id, newStock, isAvailable]
      );
      const movementResult = await client.query(
        `INSERT INTO "stock_movements"
           ("offerId", "sellerId", "movementType", "quantityChange", "previousStock",
            "newStock", "referenceType", "notes", "createdByUserId")
         VALUES ($1, $2, $3, $4, $5, $6, 'MANUAL', $7, $8)
         RETURNING "id", "offerId", "sellerId", "movementType", "quantityChange",
                   "previousStock", "newStock", "referenceType", "referenceId", "notes",
                   "createdByUserId", "createdAt"`,
        [
          offer.id,
          offer.sellerId,
          movementType,
          qty,
          previousStock,
          newStock,
          typeof notes === 'string' && notes.trim() ? notes.trim() : null,
          userId,
        ]
      );

      return {
        status: 'success' as const,
        offer: {
          id: offer.id,
          sellerId: offer.sellerId,
          productName: offer.productName,
          stockQuantity: newStock,
          unit: offer.unit,
          isAvailable,
        },
        movement: mapMovement(movementResult.rows[0]),
      };
    });

    if (result.status === 'not-found') {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }
    if (result.status === 'forbidden') {
      return sendError(res, 'Action refusée : vous ne pouvez modifier que vos propres stocks', 403, 'FORBIDDEN_SELLER_OWNERSHIP');
    }
    if (result.status === 'insufficient-stock') {
      return sendError(
        res,
        `Stock insuffisant pour '${result.productName}'. Stock actuel : ${result.stock} ${result.unit}`,
        422,
        'STOCK_MOVEMENT_FAILED'
      );
    }

    publishInventoryUpdated([{
      offerId: result.offer.id,
      stockQuantity: result.offer.stockQuantity,
      isAvailable: result.offer.isAvailable,
    }]);

    return sendSuccess(
      res,
      {
        offer: result.offer,
        movement: result.movement,
        message: 'Mouvement de stock enregistré avec audit complet',
      },
      'Stock mis à jour avec succès',
      200
    );
  }

  public static async checkAvailability(req: Request, res: Response): Promise<Response> {
    const { offerId, requestedQuantity } = req.body;
    const result = await dbManager.query(
      `SELECT "id", "stockQuantity", "unit"
       FROM "offers"
       WHERE "id"::text = $1
       LIMIT 1`,
      [offerId]
    );
    const offer = result.rows[0];

    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    const qty = Number(requestedQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return sendError(res, 'La quantité demandée doit être supérieure à zéro', 400, 'INVALID_QUANTITY');
    }
    const availableStock = Number(offer.stockQuantity);

    return sendSuccess(res, {
      offerId: offer.id,
      requestedQuantity: qty,
      availableStock,
      unit: offer.unit,
      canFulfill: availableStock >= qty,
    });
  }
}
