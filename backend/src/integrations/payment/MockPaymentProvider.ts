import {
  IPaymentProvider,
  PaymentInitiationRequest,
  PaymentInitiationResult,
  PaymentVerificationResult,
} from './PaymentProvider.interface.js';
import crypto from 'node:crypto';

/**
 * Adaptateur de paiement simulé (Mock / In-Memory)
 * Respecte strictement la frontière d'intégration sans appel externe.
 */
export class MockPaymentProvider implements IPaymentProvider {
  public readonly providerName = 'Mock-DRC-MobileMoney';
  private transactions = new Map<string, PaymentInitiationRequest & { status: 'PENDING' | 'SUCCEEDED' | 'FAILED' }>();

  public async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResult> {
    const transactionId = `TX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const providerReference = `MM-DRC-${Date.now().toString().slice(-6)}`;

    this.transactions.set(transactionId, {
      ...request,
      status: 'SUCCEEDED', // En mode simulation dev, réussi automatiquement
    });

    return {
      transactionId,
      status: 'SUCCEEDED',
      providerReference,
      instructions: `Simulation Mobile Money (${request.provider}) envoyée au ${request.customerPhoneNumber}`,
      requiresCustomerPrompt: false,
    };
  }

  public async verifyPayment(transactionId: string): Promise<PaymentVerificationResult> {
    const tx = this.transactions.get(transactionId);
    if (!tx) {
      return {
        transactionId,
        status: 'FAILED',
        amountReceived: 0,
        currency: 'CDF',
        verifiedAt: new Date(),
        rawResponse: { error: 'Transaction non trouvée' },
      };
    }

    return {
      transactionId,
      status: tx.status,
      amountReceived: tx.amount,
      currency: tx.currency,
      verifiedAt: new Date(),
      rawResponse: { provider: tx.provider, simulated: true },
    };
  }

  public async refundPayment(transactionId: string, amount: number, reason: string) {
    return {
      success: true,
      refundId: `REF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    };
  }
}

export const defaultPaymentProvider = new MockPaymentProvider();

