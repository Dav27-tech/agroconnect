import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, PaymentRecord } from '../../database/store.js';
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

    const order = AgroStore.parentOrders.get(parentOrderId);
    if (!order) {
      return sendError(res, `Commande parent '${parentOrderId}' introuvable`, 404, 'ORDER_NOT_FOUND');
    }

    if (order.status !== 'PENDING') {
      return sendError(res, `La commande est déjà dans l'état '${order.status}'`, 400, 'INVALID_ORDER_STATUS');
    }

    const amount = order.currency === 'CDF' ? order.totalAmountCdf : order.totalAmountUsd;
    const idempotencyKey = `PAY-${parentOrderId}-${crypto.randomUUID().slice(0, 6)}`;

    // Appel à l'adaptateur de paiement
    const result = await defaultPaymentProvider.initiatePayment({
      parentOrderId,
      orderNumber: order.orderNumber,
      amount,
      currency: order.currency,
      customerPhoneNumber,
      provider,
      idempotencyKey,
    });

    // Enregistrement de la transaction de paiement dans le store
    const paymentRecord: PaymentRecord = {
      id: result.transactionId,
      parentOrderId,
      provider,
      providerTransactionId: result.providerReference,
      idempotencyKey,
      amountCdf: order.totalAmountCdf,
      amountUsd: order.totalAmountUsd,
      currency: order.currency,
      status: result.status,
      verifiedAt: result.status === 'SUCCEEDED' ? new Date() : undefined,
      rawResponse: JSON.stringify(result),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    AgroStore.payments.set(paymentRecord.id, paymentRecord);

    // Mise à jour de la commande sur vérification backend
    if (result.status === 'SUCCEEDED') {
      order.status = 'CONFIRMED';
      order.updatedAt = new Date();

      Array.from(AgroStore.subOrders.values())
        .filter((so) => so.parentOrderId === order.id)
        .forEach((so) => {
          so.status = 'CONFIRMED';
          so.updatedAt = new Date();
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
      'Paiement initié et vérifié par le backend AgroConnect'
    );
  }

  public static async verifyPayment(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.transactionId;
    const transactionId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';

    const payment = AgroStore.payments.get(transactionId);
    if (!payment) {
      return sendError(res, `Transaction '${transactionId}' introuvable`, 404, 'PAYMENT_NOT_FOUND');
    }

    return sendSuccess(res, payment, 'Statut de paiement vérifié');
  }
}
