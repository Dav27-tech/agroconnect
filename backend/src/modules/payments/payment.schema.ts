import { z } from 'zod';

export const checkoutSchema = z.object({
  parentOrderId: z.string().min(1).max(100),
  provider: z.enum(['M_PESA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'AFRIMONEY', 'BANK_TRANSFER', 'MANUAL_TEST']),
  customerPhoneNumber: z.string().regex(/^(\+243|0)[0-9]{9}$/),
});