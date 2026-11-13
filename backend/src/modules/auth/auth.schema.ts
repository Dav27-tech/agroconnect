import { z } from 'zod';

export const registerSchema = z.object({
  phoneNumber: z
    .string()
    .min(9, 'Le numéro de téléphone est trop court')
    .max(15, 'Numéro de téléphone invalide')
    .regex(/^(\+243|0)[0-9]{9}$/, 'Format congolais requis (ex: +243812345678 ou 0812345678)'),
  fullName: z.string().min(2, 'Le nom complet doit comporter au moins 2 caractères'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
  email: z.string().email('Adresse email invalide').optional(),
  role: z.enum(['BUYER', 'SELLER', 'DELIVERY_PROVIDER', 'DELIVERY_PERSON']).default('BUYER'),
});

export const loginSchema = z.object({
  phoneNumber: z.string().min(5, 'Numéro de téléphone requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
