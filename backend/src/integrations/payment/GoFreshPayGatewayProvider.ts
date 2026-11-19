import { env } from '../../config/env.js';
import { MobileMoneyProviderId } from '../../config/drc.js';

type JsonRecord = Record<string, unknown>;

export type GoFreshPayTransactionStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export type GoFreshPayAction = 'debit' | 'credit';

export interface GoFreshPayTransaction {
  reference: string;
  transactionId?: string;
  status: GoFreshPayTransactionStatus;
  amount?: number;
  currency?: string;
  rawResponse: JsonRecord;
}

const paymentMethods: Record<MobileMoneyProviderId, string> = {
  M_PESA: 'mpesa',
  ORANGE_MONEY: 'orange',
  AIRTEL_MONEY: 'airtel',
  AFRIMONEY: 'afrimoney',
};

export class GoFreshPayError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'GoFreshPayError';
    this.statusCode = statusCode;
  }
}

export class GoFreshPayGatewayProvider {
  public async initiateTransaction(input: {
    action: GoFreshPayAction;
    amountCdf: number;
    phone: string;
    provider: MobileMoneyProviderId;
    reference: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<GoFreshPayTransaction> {
    const rawResponse = await this.request({
      action: input.action,
      method: paymentMethods[input.provider],
      amount: String(input.amountCdf),
      currency: 'CDF',
      customer_number: normalizePhone(input.phone),
      reference: input.reference,
      firstname: input.firstName ?? '',
      lastname: input.lastName ?? '',
      email: input.email ?? '',
      ...(env.GOFRESHPAY_CALLBACK_URL ? { callback_url: env.GOFRESHPAY_CALLBACK_URL } : {}),
    });

    return {
      reference: getString(rawResponse.Reference) ?? input.reference,
      transactionId: getString(rawResponse.Transaction_id),
      status: normalizeStatus(rawResponse.Status),
      amount: getNumber(rawResponse.Amount),
      currency: getString(rawResponse.Currency),
      rawResponse,
    };
  }

  public async verifyTransaction(reference: string): Promise<GoFreshPayTransaction> {
    const rawResponse = await this.request({
      action: 'verify',
      reference,
    });

    return {
      reference: getString(rawResponse.Reference) ?? reference,
      transactionId: getString(rawResponse.Transaction_id),
      status: normalizeStatus(rawResponse.Trans_Status ?? rawResponse.Status),
      amount: getNumber(rawResponse.Amount),
      currency: getString(rawResponse.Currency),
      rawResponse,
    };
  }

  private async request(payload: JsonRecord): Promise<JsonRecord> {
    if (!env.GOFRESHPAY_MERCHANT_ID.trim() || !env.GOFRESHPAY_MERCHANT_SECRET.trim()) {
      throw new GoFreshPayError('Les identifiants marchands GoFreshPay ne sont pas configurés.', 503);
    }

    const body = {
      merchant_id: env.GOFRESHPAY_MERCHANT_ID,
      merchant_secrete: env.GOFRESHPAY_MERCHANT_SECRET,
      ...payload,
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(env.GOFRESHPAY_GATEWAY_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Délai dépassé lors de la communication avec GoFreshPay.'
        : 'GoFreshPay est momentanément injoignable.';
      throw new GoFreshPayError(message, 503);
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    let parsed: unknown;
    try {
      parsed = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new GoFreshPayError('GoFreshPay a retourné une réponse JSON invalide.');
    }
    if (!isRecord(parsed)) throw new GoFreshPayError('GoFreshPay a retourné une réponse invalide.');
    if (!response.ok) {
      const providerMessage = getString(parsed.Comment) ?? getString(parsed.message) ?? getString(parsed.error);
      throw new GoFreshPayError(
        providerMessage ? `GoFreshPay : ${providerMessage}` : `La requête GoFreshPay a échoué (${response.status}).`,
        response.status >= 400 && response.status < 500 ? 400 : 502
      );
    }
    if (getString(parsed.Status)?.toLowerCase() === 'failed'
      || getString(parsed.Status)?.toLowerCase() === 'error') {
      const providerMessage = getString(parsed.Comment) ?? 'GoFreshPay a refusé la transaction.';
      throw new GoFreshPayError(providerMessage, 400);
    }
    return parsed;
  }
}

function normalizeStatus(value: unknown): GoFreshPayTransactionStatus {
  const status = getString(value)?.toLowerCase().replace(/[\s_-]+/g, '');
  if (status && ['success', 'successful', 'completed', 'paid', 'succeeded'].includes(status)) {
    return 'SUCCEEDED';
  }
  if (status && ['failed', 'failure', 'cancelled', 'canceled', 'rejected', 'expired'].includes(status)) {
    return 'FAILED';
  }
  return 'PENDING';
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}
