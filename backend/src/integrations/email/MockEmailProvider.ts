import { IEmailProvider, EmailMessage, EmailSendResult } from './EmailProvider.interface.js';
import crypto from 'node:crypto';

export class MockEmailProvider implements IEmailProvider {
  public readonly providerName = 'Mock-Email-Adapter';

  public async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const messageId = `EMAIL-${crypto.randomUUID().slice(0, 8)}`;
    console.log(`✉️ [EMAIL SIMULATION] Vers: ${message.to} | Sujet: "${message.subject}"`);
    return {
      messageId,
      status: 'DELIVERED',
      recipient: message.to,
    };
  }
}

export const defaultEmailProvider = new MockEmailProvider();

