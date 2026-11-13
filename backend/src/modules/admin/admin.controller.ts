import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, ExchangeRateConfigRecord, UserRole } from '../../database/store.js';
import { DRC_PROVINCES, SupportedCurrency } from '../../config/drc.js';
import crypto from 'node:crypto';

export class AdminController {
  public static async getExchangeRate(_req: Request, res: Response): Promise<Response> {
    const active = AgroStore.getActiveExchangeRate();
    const history = AgroStore.exchangeRates;

    return sendSuccess(res, {
      activeRate: active,
      history,
      currencies: ['CDF', 'USD'],
      historicalGuarantee:
        'Le taux actif ne modifie en aucun cas les commandes déjà créées, qui conservent leur snapshot historique.',
    }, 'Configuration du taux de change AgroConnect RDC');
  }

  public static async updateExchangeRate(
    req: Request<unknown, unknown, { rate: number; baseCurrency?: SupportedCurrency; targetCurrency?: SupportedCurrency; notes?: string }>,
    res: Response
  ): Promise<Response> {
    const { rate, baseCurrency = 'USD', targetCurrency = 'CDF', notes } = req.body;

    if (!rate || typeof rate !== 'number' || rate <= 0) {
      return sendError(res, 'Le taux de change doit être un nombre strictement positif', 400, 'INVALID_RATE');
    }

    // Désactiver les anciens taux
    AgroStore.exchangeRates.forEach((r) => {
      r.isActive = false;
    });

    const adminName = req.user?.phoneNumber || 'Administrateur National AgroConnect';
    const adminId = req.user?.userId;

    const newRateConfig: ExchangeRateConfigRecord = {
      id: `rate-cfg-${crypto.randomUUID().slice(0, 8)}`,
      baseCurrency,
      targetCurrency,
      rate,
      isActive: true,
      source: 'ADMIN_MANUAL_CONFIG',
      effectiveFrom: new Date(),
      configuredByUserId: adminId,
      configuredByName: adminName,
      notes: notes || `Mise à jour manuelle par l'administrateur (${adminName})`,
      createdAt: new Date(),
    };

    AgroStore.exchangeRates.unshift(newRateConfig);

    return sendSuccess(
      res,
      newRateConfig,
      `Taux de change actualisé : 1 ${baseCurrency} = ${rate} ${targetCurrency}. Ce taux s'applique aux nouvelles transactions sans affecter l'historique.`
    );
  }

  public static async getPlatformStats(_req: Request, res: Response): Promise<Response> {
    const sellers = Array.from(AgroStore.sellerProfiles.values());
    const offers = Array.from(AgroStore.offers.values());
    const orders = Array.from(AgroStore.parentOrders.values());
    const subOrders = Array.from(AgroStore.subOrders.values());

    return sendSuccess(
      res,
      {
        country: 'République Démocratique du Congo (RDC)',
        supportedProvincesCount: DRC_PROVINCES.length,
        provinces: DRC_PROVINCES,
        usersCount: AgroStore.users.size,
        activeSellersCount: sellers.length,
        sellersByType: {
          FARMER: sellers.filter((s) => s.sellerType === 'FARMER').length,
          RESELLER: sellers.filter((s) => s.sellerType === 'RESELLER').length,
          SUPPLIER: sellers.filter((s) => s.sellerType === 'SUPPLIER').length,
        },
        catalogueProductsCount: AgroStore.products.size,
        activeOffersCount: offers.filter((o) => o.isAvailable).length,
        parentOrdersCount: orders.length,
        subOrdersCount: subOrders.length,
        activeExchangeRate: AgroStore.getActiveExchangeRate().rate,
        marketplaceIntermediaryRule:
          'AgroConnect n\'achète, ne possède, ne stocke ni ne revend aucun produit agricole. Chaque vendeur gère ses propres stocks et sous-commandes.',
      },
      'Statistiques globales de la plateforme AgroConnect'
    );
  }

  public static async updateUserRoles(req: Request, res: Response): Promise<Response> {
    const rawUserId = req.params.userId;
    const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId) || '';
    const { roles } = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
      return sendError(res, 'Une liste de rôles non vide est requise', 400, 'INVALID_ROLES');
    }

    const user = AgroStore.users.get(userId);
    if (!user) {
      return sendError(res, `Utilisateur '${userId}' introuvable`, 404, 'USER_NOT_FOUND');
    }

    user.roles = roles as UserRole[];
    user.updatedAt = new Date();

    return sendSuccess(res, {
      id: user.id,
      fullName: user.fullName,
      roles: user.roles,
    }, 'Rôles utilisateur mis à jour avec succès');
  }
}
