import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, SellerProfileRecord, SellerType } from '../../database/store.js';
import { isValidDRCProvince } from '../../config/drc.js';
import crypto from 'node:crypto';

export class SellerController {
  public static async listSellers(req: Request, res: Response): Promise<Response> {
    const { type, province } = req.query;

    let results = Array.from(AgroStore.sellerProfiles.values());

    if (type && typeof type === 'string') {
      results = results.filter((s) => s.sellerType === type.toUpperCase());
    }

    if (province && typeof province === 'string') {
      results = results.filter((s) => s.province.toLowerCase() === province.toLowerCase());
    }

    // Enrichir avec le nombre d'offres
    const enriched = results.map((seller) => {
      const sellerOffers = Array.from(AgroStore.offers.values()).filter((o) => o.sellerId === seller.id);
      return {
        ...seller,
        offersCount: sellerOffers.length,
        rating: 4.8,
        reviewsCount: 45,
      };
    });

    return sendSuccess(res, enriched, 'Liste des vendeurs récupérée avec succès', 200, {
      total: enriched.length,
      country: 'RDC',
    });
  }

  public static async getSellerById(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const seller = AgroStore.sellerProfiles.get(id);

    if (!seller) {
      return sendError(res, `Vendeur avec l'identifiant '${id}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }

    const sellerOffers = Array.from(AgroStore.offers.values()).filter((o) => o.sellerId === seller.id);
    const sellerServices = Array.from(AgroStore.sellerServices.values()).filter((s) => s.sellerId === seller.id);

    return sendSuccess(res, {
      ...seller,
      rating: 4.8,
      reviewsCount: 78,
      offers: sellerOffers,
      services: sellerServices,
    });
  }

  public static async createSellerProfile(req: Request, res: Response): Promise<Response> {
    const { businessName, sellerType, province, city, address, description } = req.body;

    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    if (!businessName || !sellerType || !province || !city) {
      return sendError(res, 'Champs obligatoires manquants (businessName, sellerType, province, city)', 400, 'VALIDATION_ERROR');
    }

    if (!isValidDRCProvince(province)) {
      return sendError(res, `La province '${province}' n'est pas reconnue en RDC`, 422, 'INVALID_DRC_PROVINCE');
    }

    // Vérifier si l'utilisateur a déjà un profil vendeur
    const existing = Array.from(AgroStore.sellerProfiles.values()).find((s) => s.userId === req.user!.userId);
    if (existing) {
      return sendError(res, 'Cet utilisateur dispose déjà d\'un profil vendeur', 409, 'SELLER_EXISTS');
    }

    const newProfile: SellerProfileRecord = {
      id: `seller-${crypto.randomUUID().slice(0, 8)}`,
      userId: req.user.userId,
      businessName,
      sellerType: sellerType as SellerType,
      description,
      province,
      city,
      address,
      verificationStatus: 'VERIFIED', // Agréé pour démo
      commissionRate: 5.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    AgroStore.sellerProfiles.set(newProfile.id, newProfile);

    // Mettre à jour les rôles de l'utilisateur pour inclure SELLER s'il ne l'a pas
    const user = AgroStore.users.get(req.user.userId);
    if (user && !user.roles.includes('SELLER')) {
      user.roles.push('SELLER');
      user.updatedAt = new Date();
    }

    return sendSuccess(res, newProfile, 'Profil vendeur créé avec succès', 201);
  }

  public static async updateSellerProfile(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const seller = AgroStore.sellerProfiles.get(id);

    if (!seller) {
      return sendError(res, `Profil vendeur '${id}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }

    const { businessName, description, province, city, address } = req.body;

    if (province && !isValidDRCProvince(province)) {
      return sendError(res, `Province '${province}' invalide en RDC`, 422, 'INVALID_DRC_PROVINCE');
    }

    if (businessName) seller.businessName = businessName;
    if (description !== undefined) seller.description = description;
    if (province) seller.province = province;
    if (city) seller.city = city;
    if (address !== undefined) seller.address = address;
    seller.updatedAt = new Date();

    return sendSuccess(res, seller, 'Profil vendeur mis à jour avec succès');
  }
}
