export interface SmsMessage {
  to: string; // Numéro format international E.164 (ex: +243812345678)
  message: string;
  senderId?: string; // Ex: AgroConnect
}

export interface SmsSendResult {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  recipient: string;
  costEstimate?: string;
}

export interface ISmsProvider {
  readonly providerName: string;
  sendSms(message: SmsMessage): Promise<SmsSendResult>;
  sendOtp(to: string, otpCode: string): Promise<SmsSendResult>;
}
