import { Request, Response } from 'express';
import { Security, UserRoleType } from '../../common/security.js';
import { sendSuccess, sendError } from '../../common/response.js';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schema.js';
import { dbManager } from '../../database/client.js';
import { UserRole } from '../../database/store.js';

interface UserRow {
  id: string;
  phoneNumber: string;
  email: string | null;
  fullName: string;
  roles: UserRole[];
  passwordHash: string;
  isActive: boolean;
  mustChangePassword: boolean;
  preferredLang: string;
}

export class AuthController {
  public static async register(req: Request<unknown, unknown, RegisterInput>, res: Response): Promise<Response> {
    const { phoneNumber, fullName, password, email, role, province, city } = req.body;

    const normalizedPhone = phoneNumber.startsWith('0') ? `+243${phoneNumber.slice(1)}` : phoneNumber;

    // Vérifier l'unicité
    const existingUser = await dbManager.query(
      'SELECT "id" FROM "users" WHERE "phoneNumber" = $1 OR LOWER("email") = $2 LIMIT 1',
      [normalizedPhone, email]
    );
    if (existingUser.rowCount) {
      return sendError(res, 'Un compte existe déjà avec ce numéro de téléphone ou cet email', 409, 'USER_EXISTS');
    }

    const passwordHash = await Security.hashPassword(password);
    const assignedRoles = [role] as UserRole[];
    let newUser: UserRow;
    let sellerId: string | undefined;
    try {
      const registration = await dbManager.transaction(async (client) => {
        const result = await client.query<UserRow>(
          `INSERT INTO "users" ("phoneNumber", "email", "passwordHash", "fullName", "roles")
           VALUES ($1, $2, $3, $4, $5::"UserRole"[])
           RETURNING "id", "phoneNumber", "email", "fullName", "roles"::text[] AS "roles",
                     "passwordHash", "isActive", "mustChangePassword", "preferredLang"`,
          [normalizedPhone, email, passwordHash, fullName, assignedRoles]
        );
        const user = result.rows[0];

        if (role === 'SELLER') {
          const profile = await client.query<{ id: string }>(
            `INSERT INTO "seller_profiles" ("userId", "sellerType", "businessName", "province", "city")
             VALUES ($1, 'FARMER', $2, $3, $4)
             RETURNING "id"`,
            [user.id, fullName, province, city]
          );
          return { user, sellerId: profile.rows[0].id };
        }

        return { user, sellerId: undefined };
      });
      newUser = registration.user;
      sellerId = registration.sellerId;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        return sendError(res, 'Un compte existe déjà avec ce numéro de téléphone ou cet email', 409, 'USER_EXISTS');
      }
      throw error;
    }

    const token = Security.generateToken(newUser.id, newUser.phoneNumber, newUser.roles as UserRoleType[], sellerId);

    return sendSuccess(
      res,
      {
        user: {
          id: newUser.id,
          phoneNumber: newUser.phoneNumber,
          fullName: newUser.fullName,
          roles: newUser.roles,
          role: newUser.roles[0],
          email: newUser.email,
          sellerId,
          mustChangePassword: newUser.mustChangePassword,
        },
        token,
      },
      'Inscription réussie sur AgroConnect RDC',
      201
    );
  }

  public static async login(req: Request<unknown, unknown, LoginInput>, res: Response): Promise<Response> {
    const { email, password } = req.body;

    const result = await dbManager.query<UserRow>(
      'SELECT "id", "phoneNumber", "email", "fullName", "roles"::text[] AS "roles", "passwordHash", "isActive", "mustChangePassword", "preferredLang" FROM "users" WHERE LOWER("email") = $1 LIMIT 1',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return sendError(res, 'Identifiants invalides (email ou mot de passe erroné)', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      return sendError(res, 'Ce compte est désactivé', 403, 'ACCOUNT_DISABLED');
    }

    if (!(await Security.verifyPassword(password, user.passwordHash))) {
      return sendError(res, 'Identifiants invalides (email ou mot de passe erroné)', 401, 'INVALID_CREDENTIALS');
    }

    const sellerResult = await dbManager.query<{ id: string }>(
      'SELECT "id" FROM "seller_profiles" WHERE "userId" = $1 LIMIT 1',
      [user.id]
    );
    const sellerId = sellerResult.rows[0]?.id;
    const token = Security.generateToken(user.id, user.phoneNumber, user.roles as UserRoleType[], sellerId);

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          roles: user.roles,
          role: user.roles[0],
          email: user.email,
          sellerId,
          mustChangePassword: user.mustChangePassword,
        },
        token,
      },
      'Connexion réussie à AgroConnect RDC'
    );
  }

  public static async me(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    const result = await dbManager.query<UserRow>(
      'SELECT "id", "phoneNumber", "email", "fullName", "roles"::text[] AS "roles", "passwordHash", "isActive", "mustChangePassword", "preferredLang" FROM "users" WHERE "id" = $1 AND "isActive" = true LIMIT 1',
      [req.user.userId]
    );
    const user = result.rows[0];
    if (!user) {
      return sendError(res, 'Utilisateur introuvable', 404, 'USER_NOT_FOUND');
    }

    const [sellerResult, deliveryResult] = await Promise.all([
      dbManager.query('SELECT * FROM "seller_profiles" WHERE "userId" = $1 LIMIT 1', [user.id]),
      dbManager.query('SELECT * FROM "delivery_profiles" WHERE "userId" = $1 LIMIT 1', [user.id]),
    ]);

    return sendSuccess(res, {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      roles: user.roles,
      email: user.email,
      sellerId: sellerResult.rows[0]?.id,
      sellerProfile: sellerResult.rows[0] || null,
      deliveryProfile: deliveryResult.rows[0] || null,
      preferredLang: user.preferredLang,
      mustChangePassword: user.mustChangePassword,
    });
  }

  public static async changePassword(
    req: Request<unknown, unknown, ChangePasswordInput>,
    res: Response
  ): Promise<Response> {
    if (!req.user) return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');

    const result = await dbManager.query<{ passwordHash: string }>(
      'SELECT "passwordHash" FROM "users" WHERE "id" = $1 AND "isActive" = true LIMIT 1',
      [req.user.userId]
    );
    const user = result.rows[0];
    if (!user) return sendError(res, 'Utilisateur introuvable', 404, 'USER_NOT_FOUND');
    if (!(await Security.verifyPassword(req.body.currentPassword, user.passwordHash))) {
      return sendError(res, 'Le mot de passe actuel est incorrect.', 400, 'CURRENT_PASSWORD_INVALID');
    }

    const passwordHash = await Security.hashPassword(req.body.newPassword);
    await dbManager.query(
      'UPDATE "users" SET "passwordHash" = $2, "mustChangePassword" = false, "updatedAt" = NOW() WHERE "id" = $1',
      [req.user.userId, passwordHash]
    );
    return sendSuccess(res, { mustChangePassword: false }, 'Mot de passe modifié avec succès.');
  }
}
