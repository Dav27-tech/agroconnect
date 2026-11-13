import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, SellerServiceRecord } from '../../database/store.js';
import crypto from 'node:crypto';

export const standardSellerServices = [
  {
    code: 'LIVRAISON_EXPRESS',
    title: 'Livraison Express Prioritaire',
    description: 'Acheminement accéléré le jour même ou sous 24h par le vendeur ou son transporteur dédié.',
    availableForRoles: ['RESELLER', 'SUPPLIER'],
  },
  {
    code: 'CONDITIONNEMENT',
    title: 'Conditionnement & Emballage Professionnel',
    description: 'Mise en sacs étanches, barquettes ou cartons calibrés pour limiter les pertes post-récolte.',
    availableForRoles: ['FARMER', 'RESELLER'],
  },
  {
    code: 'CALIBRAGE_TRI',
    title: 'Lavage, Calibrage et Tri Qualitatif',
    description: 'Sélection des calibres uniformes et élimination manuelle des impuretés.',
    availableForRoles: ['FARMER', 'RESELLER'],
  },
  {
    code: 'GARANTIE_FRAICHEUR',
    title: 'Garantie Fraîcheur & Remplacement 48h',
    description: 'Engagement de fraîcheur avec remplacement sans frais en cas de non-conformité constatée à la réception.',
    availableForRoles: ['FARMER', 'RESELLER'],
  },
  {
    code: 'ASSISTANCE_TECHNIQUE',
    title: 'Assistance Technique & Conseils Agronomiques',
    description: 'Notice d\'utilisation et accompagnement agronomique pour le semis ou l\'application d\'engrais.',
    availableForRoles: ['SUPPLIER'],
  },
];

export class SellerServicesController {
  public static async listServices(req: Request, res: Response): Promise<Response> {
    const { sellerId } = req.query;

    let sellerSpecific = Array.from(AgroStore.sellerServices.values());
    if (sellerId && typeof sellerId === 'string') {
      sellerSpecific = sellerSpecific.filter((s) => s.sellerId === sellerId);
    }

    return sendSuccess(res, {
      standardCatalogue: standardSellerServices,
      sellerServices: sellerSpecific,
    }, 'Services vendeurs disponibles sur AgroConnect');
  }

  public static async createService(req: Request, res: Response): Promise<Response> {
    const { serviceType, title, description, extraFeeCdf = 0, extraFeeUsd = 0 } = req.body;

    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    const seller = Array.from(AgroStore.sellerProfiles.values()).find((s) => s.userId === req.user!.userId);
    if (!seller) {
      return sendError(res, 'Profil vendeur requis', 403, 'SELLER_REQUIRED');
    }

    if (!serviceType || !title) {
      return sendError(res, 'Type de service et titre obligatoires', 400, 'VALIDATION_ERROR');
    }

    const newService: SellerServiceRecord = {
      id: `srv-${crypto.randomUUID().slice(0, 8)}`,
      sellerId: seller.id,
      serviceType,
      title,
      description,
      extraFeeCdf: Number(extraFeeCdf),
      extraFeeUsd: Number(extraFeeUsd),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    AgroStore.sellerServices.set(newService.id, newService);

    return sendSuccess(res, newService, 'Service vendeur ajouté avec succès', 201);
  }
}
