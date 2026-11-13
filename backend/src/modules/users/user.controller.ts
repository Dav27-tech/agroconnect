import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';

export class UserController {
  public static async getProfile(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }
    return sendSuccess(res, {
      userId: req.user.userId,
      phoneNumber: req.user.phoneNumber,
      role: req.user.role,
      country: 'CD',
      preferredCurrency: 'CDF',
    });
  }

  public static async updatePreferences(req: Request, res: Response): Promise<Response> {
    const { preferredCurrency, preferredProvince } = req.body;
    return sendSuccess(res, {
      updated: true,
      preferences: {
        preferredCurrency: preferredCurrency || 'CDF',
        preferredProvince: preferredProvince || 'Kinshasa',
      },
    }, 'Préférences mises à jour');
  }
}

