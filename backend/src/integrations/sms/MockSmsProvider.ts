import { ISmsProvider, SmsMessage, SmsSendResult } from './SmsProvider.interface.js';
import crypto from 'node:crypto';

/**
 * Adaptateur SMS simulé (Préparation pour Africa's Talking)
 * Aucun appel externe, fonctionnement local autonome.
 */
export class MockSmsProvider implements ISmsProvider {
  public readonly providerName = 'Mock-AfricasTalking-DRC';

  public async sendSms(message: SmsMessage): Promise<SmsSendResult> {
    const messageId = `SMS-${crypto.randomUUID().slice(0, 8)}`;
    console.log(`📱 [SMS SIMULATION] Vers: ${message.to} | Message: "${message.message}"`);
    return {
      messageId,
      status: 'SENT',
      recipient: message.to,
      costEstimate: '0.03 USD',
    };
  }

  public async sendOtp(to: string, otpCode: string): Promise<SmsSendResult> {
    return this.sendSms({
      to,
      message: `Votre code d'authentification AgroConnect est : ${otpCode}. Valable 10 minutes.`,
    });
  }
}

export const defaultSmsProvider = new MockSmsProvider();
