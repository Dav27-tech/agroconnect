import { Request, Response } from 'express';
import { Security } from '../../common/security.js';
import { sendSuccess, sendError } from '../../common/response.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import crypto from 'node:crypto';

// Référentiel utilisateur en mémoire pour initialisation (synchronisable avec Postgres)
const demoUsers = new Map<string, {
  id: string;
  phoneNumber: string;
  fullName: string;
  role: 'BUYER' | 'SELLER' | 'DELIVERY_PROVIDER' | 'DELIVERY_PERSON' | 'ADMIN';
  passwordHash: string;
  email?: string;
  createdAt: Date;
}>();

// Utilisateur administrateur par défaut pour l'initialisation
(async () => {
  const adminHash = await Security.hashPassword('AdminAgro2026!');
  demoUsers.set('+243810000001', {
    id: 'user-admin-001',
    phoneNumber: '+243810000001',
    fullName: 'Administrateur AgroConnect',
    role: 'ADMIN',
    passwordHash: adminHash,
    email: 'admin@agroconnect.cd',
    createdAt: new Date(),
  });
})();

export class AuthController {
  public static async register(req: Request<unknown, unknown, RegisterInput>, res: Response): Promise<Response> {
    const { phoneNumber, fullName, password, email, role } = req.body;

    const normalizedPhone = phoneNumber.startsWith('0') ? `+243${phoneNumber.slice(1)}` : phoneNumber;

    if (demoUsers.has(normalizedPhone)) {
      return sendError(res, 'Un compte existe déjà avec ce numéro de téléphone congolais', 409, 'USER_EXISTS');
    }

    const passwordHash = await Security.hashPassword(password);
    const userId = `usr_${crypto.randomUUID().slice(0, 10)}`;

    const newUser = {
      id: userId,
      phoneNumber: normalizedPhone,
      fullName,
      role: role || 'BUYER',
      passwordHash,
      email,
      createdAt: new Date(),
    };

    demoUsers.set(normalizedPhone, newUser);

    const token = Security.generateToken(newUser.id, newUser.phoneNumber, newUser.role);

    return sendSuccess(
      res,
      {
        user: {
          id: newUser.id,
          phoneNumber: newUser.phoneNumber,
          fullName: newUser.fullName,
          role: newUser.role,
          email: newUser.email,
        },
        token,
      },
      'Inscription réussie sur AgroConnect',
      201
    );
  }

  public static async login(req: Request<unknown, unknown, LoginInput>, res: Response): Promise<Response> {
    const { phoneNumber, password } = req.body;
    const normalizedPhone = phoneNumber.startsWith('0') ? `+243${phoneNumber.slice(1)}` : phoneNumber;

    const user = demoUsers.get(normalizedPhone);
    if (!user) {
      return sendError(res, 'Identifiants invalides (numéro de téléphone ou mot de passe incorrect)', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await Security.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return sendError(res, 'Identifiants invalides (numéro de téléphone ou mot de passe incorrect)', 401, 'INVALID_CREDENTIALS');
    }

    const token = Security.generateToken(user.id, user.phoneNumber, user.role);

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
        },
        token,
      },
      'Connexion réussie'
    );
  }

  public static async me(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    const user = demoUsers.get(req.user.phoneNumber) || {
      id: req.user.userId,
      phoneNumber: req.user.phoneNumber,
      fullName: 'Utilisateur AgroConnect',
      role: req.user.role,
    };

    return sendSuccess(res, { user }, 'Profil récupéré avec succès');
  }
}

