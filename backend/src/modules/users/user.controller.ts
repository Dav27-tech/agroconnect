import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore } from '../../database/store.js';

export class UserController {
  public static async getProfile(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    const user = AgroStore.users.get(req.user.userId);
    if (!user) {
      return sendError(res, 'Utilisateur introuvable', 404, 'USER_NOT_FOUND');
    }

    const seller = Array.from(AgroStore.sellerProfiles.values()).find((s) => s.userId === user.id);

    return sendSuccess(res, {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      roles: user.roles,
      email: user.email,
      sellerId: seller?.id,
      preferredCurrency: 'CDF',
      preferredLang: user.preferredLang,
    });
  }

  public static async updatePreferences(req: Request, res: Response): Promise<Response> {
    const { preferredCurrency, preferredLang } = req.body;

    if (req.user) {
      const user = AgroStore.users.get(req.user.userId);
      if (user && preferredLang) {
        user.preferredLang = preferredLang;
      }
    }

    return sendSuccess(
      res,
      {
        updated: true,
        preferences: {
          preferredCurrency: preferredCurrency || 'CDF',
          preferredLang: preferredLang || 'fr',
        },
      },
      'Préférences mises à jour'
    );
  }
}
