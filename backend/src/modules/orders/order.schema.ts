import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    offerId: z.string().min(1).max(100),
    quantity: z.number().finite().positive().max(1_000_000),
    saleType: z.enum(['RETAIL', 'WHOLESALE']),
  })).min(1).max(50),
  currency: z.enum(['CDF', 'USD']).optional(),
  deliveryProvince: z.string().min(1).max(100),
  deliveryCity: z.string().min(1).max(120),
  deliveryCommune: z.string().max(120).optional(),
  deliveryAddress: z.string().min(1).max(500),
  recipientName: z.string().min(2).max(120),
  recipientPhone: z.string().regex(/^(\+243|0)[0-9]{9}$/),
  deliveryInstructions: z.string().max(500).optional(),
});