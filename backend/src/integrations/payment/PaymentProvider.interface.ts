import { SupportedCurrency, MobileMoneyProviderId } from '../../config/drc.js';

export interface PaymentInitiationRequest {
  parentOrderId: string;
  orderNumber: string;
  amount: number;
  currency: SupportedCurrency;
  customerPhoneNumber: string;
  provider: MobileMoneyProviderId | 'BANK_TRANSFER' | 'MANUAL_TEST';
  idempotencyKey: string;
  callbackUrl?: string;
}

export interface PaymentInitiationResult {
  transactionId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  providerReference: string;
  instructions: string;
  requiresCustomerPrompt: boolean;
}

export interface PaymentVerificationResult {
  transactionId: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  amountReceived: number;
  currency: SupportedCurrency;
  verifiedAt: Date;
  rawResponse?: Record<string, unknown>;
}

export interface IPaymentProvider {
  readonly providerName: string;
  initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResult>;
  verifyPayment(transactionId: string): Promise<PaymentVerificationResult>;
  refundPayment(transactionId: string, amount: number, reason: string): Promise<{ success: boolean; refundId: string }>;
}
