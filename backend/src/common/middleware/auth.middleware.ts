import { Request, Response, NextFunction } from 'express';
import { Security, TokenPayload, UserRoleType } from '../security.js';
import { UnauthorizedError, ForbiddenError } from '../errors.js';
import { sendError } from '../response.js';
import { dbManager } from '../../database/client.js';

// Extension de l'interface Request Express pour injecter l'utilisateur authentifié
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware vérifiant la présence et la validité d'un token Bearer
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Accès refusé. Jeton d\'authentification manquant'));
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next(new UnauthorizedError('Jeton d\'authentification malformé'));
    return;
  }

  const payload = Security.verifyToken(token);
  if (!payload) {
    next(new UnauthorizedError('Jeton invalide ou expiré'));
    return;
  }

  try {
    const currentUser = await getCurrentUserPayload(payload);
    if (!currentUser) {
      next(new UnauthorizedError('Compte introuvable ou désactivé'));
      return;
    }

    req.user = currentUser;
    const requestPath = req.originalUrl.split('?')[0];
    const isPasswordManagementRoute =
      requestPath === '/api/v1/auth/me' || requestPath === '/api/v1/auth/change-password';
    if (currentUser.mustChangePassword && !isPasswordManagementRoute) {
      sendError(res, 'Vous devez modifier votre mot de passe avant de continuer.', 403, 'PASSWORD_CHANGE_REQUIRED');
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware optionnel : peuple req.user si un token valide est fourni, sinon continue sans bloquer
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      const payload = Security.verifyToken(token);
      try {
        const currentUser = payload ? await getCurrentUserPayload(payload) : null;
        if (currentUser) {
          if (currentUser.mustChangePassword) {
            sendError(res, 'Vous devez modifier votre mot de passe avant de continuer.', 403, 'PASSWORD_CHANGE_REQUIRED');
            return;
          }
          req.user = currentUser;
        }
      } catch (error) {
        next(error);
        return;
      }
    }
  }
  next();
}

async function getCurrentUserPayload(payload: TokenPayload): Promise<TokenPayload | null> {
  const result = await dbManager.query<{
    id: string;
    phoneNumber: string;
    roles: UserRoleType[];
    isActive: boolean;
    mustChangePassword: boolean;
  }>(
    'SELECT "id", "phoneNumber", "roles"::text[] AS "roles", "isActive", "mustChangePassword" FROM "users" WHERE "id" = $1 LIMIT 1',
    [payload.userId]
  );
  const user = result.rows[0];
  if (!user || !user.isActive) return null;

  const sellerResult = await dbManager.query<{ id: string }>(
    'SELECT "id" FROM "seller_profiles" WHERE "userId" = $1 LIMIT 1',
    [user.id]
  );
  const roles = [...user.roles];

  return {
    ...payload,
    phoneNumber: user.phoneNumber,
    roles,
    role: roles[0] || 'BUYER',
    sellerId: sellerResult.rows[0]?.id,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * Vérifie si l'utilisateur possède un rôle donné parmi ses rôles assignés
 */
export function userHasRole(user: TokenPayload | undefined, role: UserRoleType): boolean {
  if (!user) return false;
  if (user.roles && user.roles.includes(role)) return true;
  return user.role === role;
}

/**
 * Middleware autorisant uniquement les rôles explicitement permis.
 */
export function requireRole(allowedRoles: UserRoleType[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Utilisateur non authentifié'));
      return;
    }

    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    const hasPermission = userRoles.some((r) => allowedRoles.includes(r));

    if (!hasPermission) {
      next(
        new ForbiddenError(
          `Accès réservé aux rôles : [${allowedRoles.join(', ')}]. Vos rôles actuels sont : [${userRoles.join(', ')}]`
        )
      );
      return;
    }

    next();
  };
}

/**
 * Middleware de vérification d'appartenance vendeur (Ownership check)
 * Un vendeur ne peut modifier que ses propres ressources (offres, stocks, sous-commandes).
 * Les administrateurs disposent d'un droit de supervision global.
 */
export function requireSellerOwnership(
  sellerIdExtractor: (req: Request) => string | undefined | Promise<string | undefined>
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Utilisateur non authentifié'));
      return;
    }

    // Un administrateur passe toujours
    if (userHasRole(req.user, 'ADMIN')) {
      return next();
    }

    // L'utilisateur doit avoir le rôle SELLER
    if (!userHasRole(req.user, 'SELLER')) {
      next(new ForbiddenError('Opération réservée aux vendeurs enregistrés'));
      return;
    }

    let targetSellerId: string | undefined;
    try {
      targetSellerId = await sellerIdExtractor(req);
    } catch (error) {
      next(error);
      return;
    }
    if (!targetSellerId) {
      next(new ForbiddenError('Identifiant vendeur manquant'));
      return;
    }

    let sellerProfile: { id: string } | undefined;
    try {
      const result = await dbManager.query<{ id: string }>(
        'SELECT "id" FROM "seller_profiles" WHERE "userId" = $1 LIMIT 1',
        [req.user.userId]
      );
      sellerProfile = result.rows[0];
    } catch (error) {
      next(error);
      return;
    }
    if (!sellerProfile || sellerProfile.id !== targetSellerId) {
      next(
        new ForbiddenError('Accès interdit : vous ne pouvez gérer que les ressources de votre propre profil vendeur')
      );
      return;
    }

    next();
  };
}
