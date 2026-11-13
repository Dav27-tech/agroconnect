export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailSendResult {
  messageId: string;
  status: 'DELIVERED' | 'QUEUED' | 'FAILED';
  recipient: string;
}

export interface IEmailProvider {
  readonly providerName: string;
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;
}
