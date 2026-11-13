import { Request, Response } from 'express';
import { sendSuccess } from '../../common/response.js';

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
  public static async listServices(_req: Request, res: Response): Promise<Response> {
    return sendSuccess(res, standardSellerServices, 'Services vendeurs disponibles sur AgroConnect');
  }
}
