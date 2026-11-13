import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, DeliveryStatus } from '../../database/store.js';

export class DeliveryController {
  /**
   * Suivi public par code de tracking unique (ex: AGC-TRK-784910)
   */
  public static async trackDelivery(req: Request, res: Response): Promise<Response> {
    const rawCode = req.params.code;
    const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode) || '';

    const delivery = Array.from(AgroStore.deliveries.values()).find(
      (d) => d.trackingCode === code || d.id === code
    );

    if (!delivery) {
      return sendError(res, `Livraison avec le code '${code}' introuvable`, 404, 'DELIVERY_NOT_FOUND');
    }

    const history = AgroStore.deliveryHistories
      .filter((h) => h.deliveryId === delivery.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const subOrder = AgroStore.subOrders.get(delivery.subOrderId);
    const courier = delivery.personnelId ? AgroStore.deliveryProfiles.get(delivery.personnelId) : null;

    return sendSuccess(res, {
      id: delivery.id,
      trackingCode: delivery.trackingCode,
      subOrderId: delivery.subOrderId,
      subOrderNumber: subOrder?.subOrderNumber,
      sellerName: subOrder?.sellerName,
      status: delivery.status,
      origin: {
        province: delivery.pickupProvince,
        city: delivery.pickupCity,
        address: delivery.pickupAddress,
      },
      destination: {
        province: delivery.dropoffProvince,
        city: delivery.dropoffCity,
        address: delivery.dropoffAddress,
      },
      courier: courier
        ? {
            companyName: courier.companyName,
            vehicleType: courier.vehicleType,
            plateNumber: courier.plateNumber,
            operatingArea: courier.operatingArea,
          }
        : null,
      estimatedDeliveryAt: delivery.estimatedDeliveryAt,
      deliveredAt: delivery.deliveredAt,
      statusHistory: history,
      businessRuleNotice:
        'Le cycle de vie de livraison est un domaine métier indépendant du statut de paiement et de validation de commande.',
    });
  }

  /**
   * Mise à jour du jalon logistique par le transporteur ou l'administrateur
   */
  public static async updateStatus(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { status, location, notes } = req.body;

    const delivery = Array.from(AgroStore.deliveries.values()).find(
      (d) => d.id === id || d.trackingCode === id
    );

    if (!delivery) {
      return sendError(res, `Livraison '${id}' introuvable`, 404, 'DELIVERY_NOT_FOUND');
    }

    const validStatuses: DeliveryStatus[] = [
      'PENDING',
      'ASSIGNED',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED',
      'DELIVERED',
      'FAILED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status)) {
      return sendError(res, `Statut de livraison '${status}' invalide`, 400, 'INVALID_DELIVERY_STATUS');
    }

    delivery.status = status;
    delivery.updatedAt = new Date();
    if (status === 'DELIVERED') {
      delivery.deliveredAt = new Date();
    }

    const historyRecord = {
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      deliveryId: delivery.id,
      status: delivery.status,
      location: location || undefined,
      notes: notes || `Mise à jour logistique vers ${status}`,
      recordedBy: req.user ? req.user.phoneNumber : 'DISPATCH_LOGISTIQUE',
      createdAt: new Date(),
    };
    AgroStore.deliveryHistories.push(historyRecord);

    return sendSuccess(res, {
      delivery,
      newEvent: historyRecord,
    }, 'Jalon logistique mis à jour avec succès');
  }

  /**
   * Assigne un transporteur à une livraison
   */
  public static async assignPersonnel(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { personnelId } = req.body;

    const delivery = AgroStore.deliveries.get(id);
    if (!delivery) {
      return sendError(res, `Livraison '${id}' introuvable`, 404, 'DELIVERY_NOT_FOUND');
    }

    const personnel = AgroStore.deliveryProfiles.get(personnelId);
    if (!personnel) {
      return sendError(res, `Profil transporteur '${personnelId}' introuvable`, 404, 'PERSONNEL_NOT_FOUND');
    }

    delivery.personnelId = personnel.id;
    delivery.status = 'ASSIGNED';
    delivery.updatedAt = new Date();

    AgroStore.deliveryHistories.push({
      id: `hist-${Date.now()}`,
      deliveryId: delivery.id,
      status: 'ASSIGNED',
      notes: `Transporteur ${personnel.companyName || 'Indépendant'} assigné`,
      recordedBy: req.user ? req.user.phoneNumber : 'DISPATCH_LOGISTIQUE',
      createdAt: new Date(),
    });

    return sendSuccess(res, delivery, 'Transporteur assigné avec succès');
  }
}
