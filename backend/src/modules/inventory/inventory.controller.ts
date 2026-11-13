import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, StockMovementType } from '../../database/store.js';

export class InventoryController {
  public static async getOfferInventory(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.offerId;
    const offerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const offer = AgroStore.offers.get(offerId);

    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    const movements = AgroStore.stockMovements.filter((m) => m.offerId === offer.id);

    return sendSuccess(res, {
      offerId: offer.id,
      productName: offer.productName,
      sellerId: offer.sellerId,
      unit: offer.unit,
      sharedStockQuantity: offer.stockQuantity,
      isAvailable: offer.isAvailable && offer.stockQuantity > 0,
      inventoryRule:
        'Stock physique unique partagé entre les ventes en gros et au détail pour éviter tout sur-stockage ou sur-vente.',
      movementsCount: movements.length,
      recentMovements: movements.slice(-5),
    });
  }

  public static async getSellerInventory(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.sellerId;
    const sellerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const seller = AgroStore.sellerProfiles.get(sellerId);

    if (!seller) {
      return sendError(res, `Profil vendeur '${sellerId}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }

    const sellerOffers = Array.from(AgroStore.offers.values()).filter((o) => o.sellerId === seller.id);
    const movements = AgroStore.stockMovements.filter((m) => m.sellerId === seller.id);

    return sendSuccess(res, {
      sellerId: seller.id,
      businessName: seller.businessName,
      totalOffers: sellerOffers.length,
      offers: sellerOffers.map((o) => ({
        offerId: o.id,
        productName: o.productName,
        stockQuantity: o.stockQuantity,
        unit: o.unit,
        isAvailable: o.isAvailable,
        retailPriceCdf: o.retailPriceCdf,
        wholesalePriceCdf: o.wholesalePriceCdf,
      })),
      movementsLog: movements,
      strictIntermediaryRule: 'AgroConnect ne possède aucun stock physique. Chaque vendeur est l\'unique propriétaire et gestionnaire de ses stocks.',
    });
  }

  public static async recordMovement(req: Request, res: Response): Promise<Response> {
    const { offerId, quantityChange, movementType, notes, referenceType, referenceId } = req.body;

    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    const offer = AgroStore.offers.get(offerId);
    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    // Vérification d'appartenance : L'utilisateur doit être le propriétaire ou ADMIN
    const userSeller = Array.from(AgroStore.sellerProfiles.values()).find((s) => s.userId === req.user!.userId);
    const isAdmin = req.user.roles?.includes('ADMIN') || req.user.role === 'ADMIN';

    if (!isAdmin && (!userSeller || userSeller.id !== offer.sellerId)) {
      return sendError(
        res,
        'Action refusée : vous ne pouvez modifier que les stocks de votre propre profil vendeur',
        403,
        'FORBIDDEN_SELLER_OWNERSHIP'
      );
    }

    const validMovementTypes: StockMovementType[] = [
      'RESTOCK',
      'MANUAL_ADJUSTMENT',
      'SPOILAGE_LOSS',
      'ORDER_RESERVATION',
      'ORDER_CANCELLED_RESTORE',
    ];

    if (!validMovementTypes.includes(movementType)) {
      return sendError(res, `Type de mouvement '${movementType}' invalide`, 400, 'INVALID_MOVEMENT_TYPE');
    }

    const qty = Number(quantityChange);
    if (isNaN(qty) || qty === 0) {
      return sendError(res, 'Le changement de quantité doit être un nombre non nul', 400, 'INVALID_QUANTITY');
    }

    const result = AgroStore.recordStockMovement(
      offer.id,
      offer.sellerId,
      movementType,
      qty,
      referenceType || 'MANUAL',
      referenceId,
      notes,
      req.user.userId
    );

    if (!result.success) {
      return sendError(res, result.error || 'Erreur lors du mouvement de stock', 422, 'STOCK_MOVEMENT_FAILED');
    }

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
    const offer = AgroStore.offers.get(offerId);

    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    const qty = Number(requestedQuantity);
    const hasEnough = offer.stockQuantity >= qty;

    return sendSuccess(res, {
      offerId: offer.id,
      requestedQuantity: qty,
      availableStock: offer.stockQuantity,
      unit: offer.unit,
      canFulfill: hasEnough,
    });
  }
}
