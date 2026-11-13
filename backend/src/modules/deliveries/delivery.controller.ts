import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { DeliveryRecord, DeliveryStatus } from './delivery.types.js';

// Répertoire des livraisons en mémoire
export const storedDeliveries = new Map<string, DeliveryRecord>();

// Exemple initial de livraison en cours en RDC
const initialDelivery: DeliveryRecord = {
  id: 'del-kin-001',
  subOrderId: 'sub_kikwit_kin_01',
  subOrderNumber: 'AGC-ORD-202611-001-A',
  status: 'IN_TRANSIT',
  trackingCode: 'AGC-TRK-784910',
  pickupAddress: {
    province: 'Kwilu',
    city: 'Kikwit',
    address: 'Dépôt COOPAK, Route Nationale 1',
  },
  dropoffAddress: {
    province: 'Kinshasa',
    city: 'Kinshasa',
    address: 'Avenue de la Paix, Limete Résidentiel',
    recipientName: 'Kalonji Mukendi',
    recipientPhone: '+243815550011',
  },
  assignedCourierName: 'Express Agri Congo Sarl',
  assignedCourierPhone: '+243990001122',
  estimatedDeliveryDate: new Date(Date.now() + 24 * 3600 * 1000),
  statusHistory: [
    {
      status: 'PENDING',
      timestamp: new Date(Date.now() - 36 * 3600 * 1000),
      notes: 'Commande confirmée, en attente de préparation par le producteur',
    },
    {
      status: 'ASSIGNED',
      timestamp: new Date(Date.now() - 24 * 3600 * 1000),
      notes: 'Transporteur Express Agri Congo assigné au lot',
      recordedBy: 'Admin Dispatch',
    },
    {
      status: 'PICKED_UP',
      timestamp: new Date(Date.now() - 12 * 3600 * 1000),
      notes: 'Lot de 50 sacs de manioc chargé au dépôt de Kikwit',
      location: 'Kikwit (Kwilu)',
    },
    {
      status: 'IN_TRANSIT',
      timestamp: new Date(Date.now() - 4 * 3600 * 1000),
      notes: 'Camion en route sur la RN1, passage de Kenge',
      location: 'Kenge (Kwango)',
    },
  ],
  createdAt: new Date(Date.now() - 36 * 3600 * 1000),
  updatedAt: new Date(Date.now() - 4 * 3600 * 1000),
};

storedDeliveries.set(initialDelivery.id, initialDelivery);
storedDeliveries.set(initialDelivery.trackingCode, initialDelivery);

export class DeliveryController {
  public static async trackByCode(req: Request, res: Response): Promise<Response> {
    const rawCode = req.params.code;
    const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode) || '';
    const delivery = storedDeliveries.get(code);

    if (!delivery) {
      return sendError(res, `Livraison avec le code de suivi '${code}' introuvable`, 404, 'DELIVERY_NOT_FOUND');
    }

    return sendSuccess(res, delivery, 'Suivi de livraison en temps réel récupéré');
  }

  public static async updateStatus(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { status, notes, location } = req.body;

    const delivery = storedDeliveries.get(id);
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
      return sendError(res, `Statut de livraison invalide. Statuts acceptés : [${validStatuses.join(', ')}]`, 400, 'INVALID_STATUS');
    }

    delivery.status = status;
    delivery.updatedAt = new Date();
    delivery.statusHistory.push({
      status,
      timestamp: new Date(),
      notes: notes || `Mise à jour du statut vers ${status}`,
      location,
      recordedBy: req.user ? `${req.user.phoneNumber} (${req.user.role})` : 'System',
    });

    return sendSuccess(res, delivery, `Statut de livraison mis à jour vers '${status}'`);
  }
}
