import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, OfferRecord } from '../../database/store.js';
import { isValidDRCProvince } from '../../config/drc.js';
import crypto from 'node:crypto';

// Export pour compatibilité
export const demoOffers = Array.from(AgroStore.offers.values());

export class OfferController {
  public static async listOffers(req: Request, res: Response): Promise<Response> {
    const { category, province, sellerId, productId, search } = req.query;

    let offers = Array.from(AgroStore.offers.values()).filter((o) => o.isAvailable);

    if (category && typeof category === 'string') {
      offers = offers.filter((o) => o.categoryName.toLowerCase().includes(category.toLowerCase()));
    }

    if (province && typeof province === 'string') {
      offers = offers.filter((o) => o.originProvince.toLowerCase() === province.toLowerCase());
    }

    if (sellerId && typeof sellerId === 'string') {
      offers = offers.filter((o) => o.sellerId === sellerId);
    }

    if (productId && typeof productId === 'string') {
      offers = offers.filter((o) => o.productId === productId);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      offers = offers.filter(
        (o) =>
          o.productName.toLowerCase().includes(q) ||
          o.sellerName.toLowerCase().includes(q) ||
          o.originProvince.toLowerCase().includes(q)
      );
    }

    const currentRate = AgroStore.getActiveExchangeRate();

    return sendSuccess(res, offers, 'Offres agricoles récupérées avec succès', 200, {
      total: offers.length,
      currentExchangeRate: currentRate.rate,
      baseCurrency: currentRate.baseCurrency,
      targetCurrency: currentRate.targetCurrency,
    });
  }

  public static async getOfferById(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const offer = AgroStore.offers.get(id);

    if (!offer) {
      return sendError(res, `Offre agricole '${id}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    const seller = AgroStore.sellerProfiles.get(offer.sellerId);
    const product = AgroStore.products.get(offer.productId);

    return sendSuccess(res, {
      ...offer,
      seller,
      product,
    });
  }

  public static async createOffer(req: Request, res: Response): Promise<Response> {
    const {
      productId,
      stockQuantity,
      unit,
      retailPriceCdf,
      retailPriceUsd,
      retailMinQuantity = 1,
      wholesalePriceCdf,
      wholesalePriceUsd,
      wholesaleMinQuantity,
      originProvince,
      originCity,
      qualityGrade,
      servicesOffered = [],
    } = req.body;

    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    const seller = Array.from(AgroStore.sellerProfiles.values()).find((s) => s.userId === req.user!.userId);
    if (!seller) {
      return sendError(res, 'Aucun profil vendeur associé à cet utilisateur', 403, 'SELLER_PROFILE_REQUIRED');
    }

    const product = AgroStore.products.get(productId);
    if (!product) {
      return sendError(res, `Produit catalogue '${productId}' introuvable`, 404, 'PRODUCT_NOT_FOUND');
    }

    if (!originProvince || !isValidDRCProvince(originProvince)) {
      return sendError(res, `Province d'origine '${originProvince}' invalide en RDC`, 422, 'INVALID_DRC_PROVINCE');
    }

    if (stockQuantity === undefined || stockQuantity < 0) {
      return sendError(res, 'La quantité en stock doit être un nombre positif', 400, 'INVALID_STOCK');
    }

    const category = AgroStore.categories.get(product.categoryId);
    const offerId = `off-${crypto.randomUUID().slice(0, 8)}`;

    const newOffer: OfferRecord = {
      id: offerId,
      sellerId: seller.id,
      sellerName: seller.businessName,
      sellerType: seller.sellerType,
      productId: product.id,
      productName: product.name,
      categoryName: category?.name || 'Filière Agricole',
      stockQuantity: Number(stockQuantity),
      unit: unit || product.standardUnit,
      isAvailable: Number(stockQuantity) > 0,
      retailPriceCdf: Number(retailPriceCdf),
      retailPriceUsd: Number(retailPriceUsd),
      retailMinQuantity: Number(retailMinQuantity),
      wholesalePriceCdf: wholesalePriceCdf ? Number(wholesalePriceCdf) : undefined,
      wholesalePriceUsd: wholesalePriceUsd ? Number(wholesalePriceUsd) : undefined,
      wholesaleMinQuantity: wholesaleMinQuantity ? Number(wholesaleMinQuantity) : undefined,
      originProvince,
      originCity,
      qualityGrade,
      servicesOffered: Array.isArray(servicesOffered) ? servicesOffered : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    AgroStore.offers.set(offerId, newOffer);

    // Mouvement de stock initial
    AgroStore.stockMovements.push({
      id: `mvt-init-${offerId}`,
      offerId,
      sellerId: seller.id,
      movementType: 'INITIAL_STOCK',
      quantityChange: Number(stockQuantity),
      previousStock: 0,
      newStock: Number(stockQuantity),
      referenceType: 'OFFER_CREATION',
      referenceId: offerId,
      notes: 'Initialisation de l\'offre commerciale par le vendeur',
      createdByUserId: req.user.userId,
      createdAt: new Date(),
    });

    return sendSuccess(res, newOffer, 'Offre agricole créée avec succès', 201);
  }

  public static async updateOffer(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const offer = AgroStore.offers.get(id);

    if (!offer) {
      return sendError(res, `Offre '${id}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    const {
      retailPriceCdf,
      retailPriceUsd,
      retailMinQuantity,
      wholesalePriceCdf,
      wholesalePriceUsd,
      wholesaleMinQuantity,
      isAvailable,
      qualityGrade,
    } = req.body;

    if (retailPriceCdf !== undefined) offer.retailPriceCdf = Number(retailPriceCdf);
    if (retailPriceUsd !== undefined) offer.retailPriceUsd = Number(retailPriceUsd);
    if (retailMinQuantity !== undefined) offer.retailMinQuantity = Number(retailMinQuantity);
    if (wholesalePriceCdf !== undefined) offer.wholesalePriceCdf = Number(wholesalePriceCdf);
    if (wholesalePriceUsd !== undefined) offer.wholesalePriceUsd = Number(wholesalePriceUsd);
    if (wholesaleMinQuantity !== undefined) offer.wholesaleMinQuantity = Number(wholesaleMinQuantity);
    if (isAvailable !== undefined) offer.isAvailable = Boolean(isAvailable);
    if (qualityGrade !== undefined) offer.qualityGrade = qualityGrade;
    offer.updatedAt = new Date();

    return sendSuccess(res, offer, 'Offre mise à jour avec succès');
  }
}
