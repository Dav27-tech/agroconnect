import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, NotificationRecord } from '../../database/store.js';

export class NotificationController {
  public static async listNotifications(req: Request, res: Response): Promise<Response> {
    const userId = req.user ? req.user.userId : 'usr-buyer-patrick';
    const notifs = AgroStore.notifications.filter(
      (n) => n.userId === userId || n.userId === 'all'
    );
    return sendSuccess(res, notifs, 'Notifications récupérées avec succès');
  }

  public static async markAsRead(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';

    const notif = AgroStore.notifications.find((n) => n.id === id);
    if (!notif) {
      return sendError(res, `Notification '${id}' introuvable`, 404, 'NOT_FOUND');
    }

    notif.isRead = true;
    return sendSuccess(res, notif, 'Notification marquée comme lue');
  }

  public static async createNotification(req: Request, res: Response): Promise<Response> {
    const { userId, title, message, link } = req.body;

    if (!userId || !title || !message) {
      return sendError(res, 'Champs userId, title et message requis', 400, 'VALIDATION_ERROR');
    }

    const newNotif: NotificationRecord = {
      id: `notif-${Date.now()}`,
      userId,
      title,
      message,
      link,
      isRead: false,
      createdAt: new Date(),
    };

    AgroStore.notifications.push(newNotif);
    return sendSuccess(res, newNotif, 'Notification envoyée avec succès', 201);
  }
}
