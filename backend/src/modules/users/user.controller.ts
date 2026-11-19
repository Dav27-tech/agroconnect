import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { dbManager } from '../../database/client.js';

export class UserController {
  public static async getProfile(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    const result = await dbManager.query<{
      id: string;
      phoneNumber: string;
      fullName: string;
      roles: string[];
      email: string | null;
      preferredLang: string;
    }>(
      'SELECT "id", "phoneNumber", "fullName", "roles", "email", "preferredLang" FROM "users" WHERE "id" = $1 LIMIT 1',
      [req.user.userId]
    );
    const user = result.rows[0];
    if (!user) {
      return sendError(res, 'Utilisateur introuvable', 404, 'USER_NOT_FOUND');
    }

    const sellerResult = await dbManager.query<{ id: string }>(
      'SELECT "id" FROM "seller_profiles" WHERE "userId" = $1 LIMIT 1',
      [user.id]
    );

    return sendSuccess(res, {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      roles: user.roles,
      email: user.email,
      sellerId: sellerResult.rows[0]?.id,
      preferredCurrency: 'CDF',
      preferredLang: user.preferredLang,
    });
  }

  public static async updatePreferences(req: Request, res: Response): Promise<Response> {
    const { preferredLang } = req.body;

    if (req.user && preferredLang) {
      await dbManager.query('UPDATE "users" SET "preferredLang" = $1, "updatedAt" = NOW() WHERE "id" = $2', [
        preferredLang,
        req.user.userId,
      ]);
    }

    return sendSuccess(
      res,
      {
        updated: true,
        preferences: {
          preferredCurrency: 'CDF',
          preferredLang: preferredLang || 'fr',
        },
      },
      'Préférences mises à jour'
    );
  }
}
