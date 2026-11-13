import { Request, Response } from 'express';
import { sendSuccess } from '../../common/response.js';

export const demoNotifications = [
  {
    id: 'notif-1',
    userId: 'usr_guest_buyer',
    title: 'Bienvenue sur AgroConnect RDC !',
    message: 'Découvrez les productions agricoles locales directes de producteurs et revendeurs agréés.',
    isRead: false,
    createdAt: new Date(),
  },
  {
    id: 'notif-2',
    userId: 'usr_farmer_kikwit',
    title: 'Nouvelle commande enregistrée',
    message: 'Votre sous-commande AGC-ORD-202611-001-A a été confirmée par le client.',
    isRead: false,
    createdAt: new Date(),
  },
];

export class NotificationController {
  public static async listNotifications(req: Request, res: Response): Promise<Response> {
    const userId = req.user ? req.user.userId : 'usr_guest_buyer';
    const userNotifs = demoNotifications.filter((n) => n.userId === userId || n.userId === 'all');
    return sendSuccess(res, userNotifs, 'Notifications récupérées avec succès');
  }
}
