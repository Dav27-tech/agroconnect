import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { storedOrders } from '../orders/order.controller.js';
import { defaultPaymentProvider } from '../../integrations/payment/MockPaymentProvider.js';
import { MobileMoneyProviderId } from '../../config/drc.js';
import crypto from 'node:crypto';

export interface CheckoutInput {
  parentOrderId: string;
  provider: MobileMoneyProviderId | 'BANK_TRANSFER' | 'MANUAL_TEST';
  customerPhoneNumber: string;
}

export class PaymentController {
  public static async initiateCheckout(req: Request<unknown, unknown, CheckoutInput>, res: Response): Promise<Response> {
    const { parentOrderId, provider, customerPhoneNumber } = req.body;

    const order = storedOrders.get(parentOrderId);
    if (!order) {
      return sendError(res, `Commande parent '${parentOrderId}' introuvable`, 404, 'ORDER_NOT_FOUND');
    }

    if (order.status !== 'PENDING') {
      return sendError(res, `La commande est déjà dans l'état '${order.status}'`, 400, 'INVALID_ORDER_STATUS');
    }

    const amount = order.currency === 'CDF' ? order.totalAmountCdf : order.totalAmountUsd;
    const idempotencyKey = `PAY-${parentOrderId}-${crypto.randomUUID().slice(0, 6)}`;

    // Appel à l'adaptateur de paiement (Mock)
    const result = await defaultPaymentProvider.initiatePayment({
      parentOrderId,
      orderNumber: order.orderNumber,
      amount,
      currency: order.currency,
      customerPhoneNumber,
      provider,
      idempotencyKey,
    });

    // Mise à jour de la commande sur vérification backend
    if (result.status === 'SUCCEEDED') {
      order.status = 'CONFIRMED';
      order.subOrders.forEach((so) => {
        so.status = 'CONFIRMED';
      });
    }

    return sendSuccess(
      res,
      {
        transactionId: result.transactionId,
        orderNumber: order.orderNumber,
        status: result.status,
        providerReference: result.providerReference,
        amount,
        currency: order.currency,
        verificationStatus: 'VERIFIED_ON_BACKEND',
        instructions: result.instructions,
      },
      'Paiement initié et vérifié par le backend'
    );
  }

  public static async verifyTransaction(req: Request, res: Response): Promise<Response> {
    const rawTxId = req.params.transactionId;
    const transactionId = (Array.isArray(rawTxId) ? rawTxId[0] : rawTxId) || '';

    // Règle critique : la vérification s'opère STRICTEMENT côté backend
    const verification = await defaultPaymentProvider.verifyPayment(transactionId);

    return sendSuccess(res, verification, 'Statut de paiement certifié par le serveur');
  }
}
