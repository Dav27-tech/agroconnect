import { z } from 'zod';

const normalizedPhoneNumberSchema = z.string().transform((phoneNumber) => phoneNumber.replace(/[\s().-]/g, ''));

export const registerSchema = z.object({
  phoneNumber: normalizedPhoneNumberSchema
    .pipe(
      z.string()
        .min(9, 'Le numéro de téléphone est trop court')
        .max(15, 'Numéro de téléphone invalide')
        .regex(/^(\+243|0)[0-9]{9}$/, 'Format congolais requis (ex: +243812345678 ou 0812345678)')
    ),
  fullName: z.string().min(2, 'Le nom complet doit comporter au moins 2 caractères'),
  password: z.string().min(10, 'Le mot de passe doit comporter au moins 10 caractères'),
  email: z.string().trim().email('Adresse email invalide').transform((email) => email.toLowerCase()),
  role: z.enum(['BUYER', 'SELLER']).default('BUYER'),
  province: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
}).superRefine((data, context) => {
  if (data.role === 'SELLER' && (!data.province || !data.city)) {
    context.addIssue({
      code: 'custom',
      path: ['province'],
      message: 'La province et la ville sont obligatoires pour un profil agriculteur',
    });
  }
});

export const loginSchema = z.object({
  email: z.string().trim().email('Adresse email invalide').transform((email) => email.toLowerCase()),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(10, 'Le nouveau mot de passe doit comporter au moins 10 caractères'),
}).superRefine((data, context) => {
  if (data.currentPassword === data.newPassword) {
    context.addIssue({
      code: 'custom',
      path: ['newPassword'],
      message: 'Le nouveau mot de passe doit être différent du mot de passe actuel',
    });
  }
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
